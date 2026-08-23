'use client';

import React, { useState, useMemo } from "react";
import { 
  FileText, Plus, Shield, ListTree, Users, DollarSign, 
  Settings, Clock, Percent, ClipboardList, HelpCircle, 
  Stethoscope, Eye, Edit2, Trash2, CheckCircle2, AlertTriangle, 
  Loader2, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/lib/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import type { InsuranceCompany } from "@/lib/types";

const BENEFIT_CLASSES = ["VIP", "Class A", "Class B", "Class C", "Class D"];
const NETWORK_TYPES = ["PPO", "HMO", "EPO", "POS"];
const COVERAGE_TYPES = [
  { value: "FULL", label: "Full Coverage (تغطية كاملة)" },
  { value: "PERCENTAGE", label: "Percentage (نسبة مئوية)" },
  { value: "LIMIT", label: "Limit Value (حد أقصى)" }
];
const ELIGIBILITY_TYPES = [
  { value: "ALL", label: "All Employees (كل الموظفين)" },
  { value: "PERCENTAGE", label: "Percentage (%) of Staff" },
  { value: "FIXED_COUNT", label: "Fixed Count of Staff" }
];
const RULE_TYPES = [
  { value: "PRE_APPROVAL", label: "Requires Pre-approval" },
  { value: "WAITING_PERIOD", label: "Waiting Period (days)" },
  { value: "MAX_USAGE", label: "Maximum Usage Limits" }
];

const emptyForm = {
  plan_name: "",
  benefit_class: "Class A",
  network_type: "PPO",
  annual_limit: "",
  insurer_id: "",
  insurer_name: "",
  status: "active",
  details: {
    categories: {
      INPATIENT: { is_covered: true, coverage_type: 'FULL', limit_value: '', coverage_percentage: 100, copay_percentage: 0, deductible: 0, network_coverage: 'In-Network', requires_approval: true, waiting_period_days: 0 },
      OUTPATIENT: { is_covered: true, coverage_type: 'PERCENTAGE', limit_value: '', coverage_percentage: 80, copay_percentage: 20, deductible: 0, network_coverage: 'In-Network', requires_approval: false, waiting_period_days: 0 },
      CHRONIC: { is_covered: true, coverage_type: 'LIMIT', limit_value: 50000, coverage_percentage: 100, copay_percentage: 0, deductible: 0, network_coverage: 'In-Network', requires_approval: true, waiting_period_days: 0 },
      PRE_EXISTING: { is_covered: true, coverage_type: 'LIMIT', limit_value: 30000, coverage_percentage: 100, copay_percentage: 0, deductible: 0, network_coverage: 'In-Network', requires_approval: true, waiting_period_days: 0 },
      MATERNITY: { is_covered: true, coverage_type: 'LIMIT', limit_value: 15000, coverage_percentage: 100, copay_percentage: 0, deductible: 0, network_coverage: 'In-Network', requires_approval: true, waiting_period_days: 300 },
      DENTAL: { is_covered: true, coverage_type: 'LIMIT', limit_value: 5000, coverage_percentage: 100, copay_percentage: 0, deductible: 0, network_coverage: 'In-Network', requires_approval: false, waiting_period_days: 0 },
      OPTICAL: { is_covered: true, coverage_type: 'LIMIT', limit_value: 2000, coverage_percentage: 100, copay_percentage: 0, deductible: 0, network_coverage: 'In-Network', requires_approval: false, waiting_period_days: 0 },
      EMERGENCY: { is_covered: true, coverage_type: 'FULL', limit_value: '', coverage_percentage: 100, copay_percentage: 0, deductible: 0, network_coverage: 'In-Network', requires_approval: false, waiting_period_days: 0 }
    },
    pre_existing: { is_covered: true, waiting_period_days: 0, coverage_percentage: 100, sub_limit: 30000, requires_approval: true },
    chronic: { is_covered: true, coverage_percentage: 100, sub_limit: 50000, requires_approval: true },
    exception_pool: { total_amount: 100000, remaining_amount: 100000, approval_required: true },
    doctor_on_site: { enabled: false, visits_per_week: 1, max_visits_per_day: 10, provider_count: 1, coverage_type: 'FULL', limit_value: 0, eligibility_type: 'ALL', eligibility_value: 0 },
    additional_services: [
      { name_en: 'Ambulance', name_ar: 'سيارة إسعاف', coverage_type: 'FULL', limit_value: 0, eligibility_type: 'ALL', eligibility_value: 0, requires_approval: false },
      { name_en: 'Vaccination', name_ar: 'تطعيمات', coverage_type: 'LIMIT', limit_value: 1000, eligibility_type: 'ALL', eligibility_value: 0, requires_approval: false },
      { name_en: 'Annual Check-up', name_ar: 'فحص سنوي', coverage_type: 'LIMIT', limit_value: 2000, eligibility_type: 'ALL', eligibility_value: 0, requires_approval: true },
      { name_en: 'Home Care', name_ar: 'رعاية منزلية', coverage_type: 'LIMIT', limit_value: 5000, eligibility_type: 'ALL', eligibility_value: 0, requires_approval: true },
      { name_en: 'Telemedicine', name_ar: 'الطب عن بعد', coverage_type: 'FULL', limit_value: 0, eligibility_type: 'ALL', eligibility_value: 0, requires_approval: false }
    ],
    rules: [
      { rule_type: 'PRE_APPROVAL', benefit_item: 'MRI Scan', value: 1, notes: 'Requires medical justification' },
      { rule_type: 'WAITING_PERIOD', benefit_item: 'Maternity', value: 300, notes: 'Waiting period applies from enrolment date' },
      { rule_type: 'MAX_USAGE', benefit_item: 'ICU Stay', value: 15, notes: 'Maximum 15 days per year' }
    ]
  }
};

export default function BenefitSchedules() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Fetch Insurers
  const { data: insurers = [], isLoading: insurersLoading } = useQuery({
    queryKey: ['insuranceCompaniesList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('status', 'Active');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch Benefit Schedules
  const { data: schedules = [], isLoading: isSchedulesLoading, refetch } = useQuery({
    queryKey: ['benefitSchedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('benefit_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedSchedule(null);
  };

  const handleEdit = (schedule: any) => {
    setSelectedSchedule(schedule);
    const details = schedule.details || emptyForm.details;
    
    // Ensure all nested fields exist to avoid uncontrolled inputs
    setFormData({
      plan_name: schedule.plan_name || "",
      benefit_class: schedule.benefit_class || "Class A",
      network_type: schedule.network_type || "PPO",
      annual_limit: schedule.annual_limit || "",
      insurer_id: schedule.insurer_id || "",
      insurer_name: schedule.insurer_name || "",
      status: schedule.status || "active",
      details: {
        categories: { ...emptyForm.details.categories, ...details.categories },
        pre_existing: { ...emptyForm.details.pre_existing, ...details.pre_existing },
        chronic: { ...emptyForm.details.chronic, ...details.chronic },
        exception_pool: { ...emptyForm.details.exception_pool, ...details.exception_pool },
        doctor_on_site: { ...emptyForm.details.doctor_on_site, ...details.doctor_on_site },
        additional_services: details.additional_services || emptyForm.details.additional_services,
        rules: details.rules || emptyForm.details.rules
      }
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        plan_name: formData.plan_name,
        benefit_class: formData.benefit_class,
        network_type: formData.network_type,
        inpatient_limit: Number(formData.details.categories.INPATIENT.limit_value) || 0,
        outpatient_limit: Number(formData.details.categories.OUTPATIENT.limit_value) || 0,
        dental_limit: Number(formData.details.categories.DENTAL.limit_value) || 0,
        optical_limit: Number(formData.details.categories.OPTICAL.limit_value) || 0,
        maternity_limit: Number(formData.details.categories.MATERNITY.limit_value) || 0,
        annual_limit: Number(formData.annual_limit) || 0,
        insurer_id: formData.insurer_id || null,
        insurer_name: formData.insurer_name || "",
        details: formData.details
      };

      if (selectedSchedule) {
        const { error } = await supabase
          .from('benefit_schedules')
          .update(payload)
          .eq('id', selectedSchedule.id);
        if (error) throw error;
        toast({ title: "Plan updated successfully!" });
      } else {
        const { error } = await supabase
          .from('benefit_schedules')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Plan created successfully!" });
      }
      setDialogOpen(false);
      refetch();
      resetForm();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Save failed", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    try {
      const { error } = await supabase
        .from('benefit_schedules')
        .delete()
        .eq('id', selectedSchedule.id);
      if (error) throw error;
      toast({ title: "Benefit plan deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedSchedule(null);
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Delete failed", description: err.message });
    }
  };

  // Categories helper to map over
  const categoriesList = [
    { key: "INPATIENT", label: "Inpatient (علاج داخلي)" },
    { key: "OUTPATIENT", label: "Outpatient (علاج خارجي)" },
    { key: "CHRONIC", label: "Chronic Conditions (أمراض مزمنة)" },
    { key: "PRE_EXISTING", label: "Pre-existing (حالات سابقة)" },
    { key: "MATERNITY", label: "Maternity (حمل وولادة)" },
    { key: "DENTAL", label: "Dental (أسنان)" },
    { key: "OPTICAL", label: "Optical (نظارات)" },
    { key: "EMERGENCY", label: "Emergency (طوارئ)" }
  ];

  const columns = [
    {
      header: "Plan Name",
      accessorKey: "plan_name",
      cell: ({ row }: any) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 dark:bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-foreground">{p.plan_name}</p>
              <p className="text-xs text-muted-foreground">{p.insurer_name || "Custom"}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: "Class",
      accessorKey: "benefit_class",
      cell: ({ row }: any) => (
        <Badge variant="secondary" className="font-semibold text-indigo-700 bg-indigo-50 border-indigo-100">
          {row.original.benefit_class}
        </Badge>
      )
    },
    {
      header: "Network",
      accessorKey: "network_type",
      cell: ({ row }: any) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.network_type || "PPO"}
        </Badge>
      )
    },
    {
      header: "Annual Limit",
      accessorKey: "annual_limit",
      cell: ({ row }: any) => (
        <span className="font-bold font-mono">
          EGP {Math.round(row.original.annual_limit || 0).toLocaleString()}
        </span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const schedule = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 hover:bg-slate-50"
              onClick={(e) => { e.stopPropagation(); handleEdit(schedule); }}
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); setSelectedSchedule(schedule); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        );
      }
    }
  ];

  const table = useReactTable({
    data: schedules,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Benefit Schedules"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Create Plan"
        ActionIcon={Plus}
      />

      <Card className="border border-border/80 shadow-sm">
        <CardContent className="p-6">
          {schedules.length === 0 && !isSchedulesLoading ? (
            <EmptyState
              icon={Shield}
              title="No Benefit Schedules Available"
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Create Benefit Plan"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isSchedulesLoading}
              searchPlaceholder="Search plans..."
              onRowClick={handleEdit}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>

      {/* Plan Builder Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedSchedule ? "Configure Benefit Plan" : "Create Benefit Plan"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-100/60 p-1 border rounded-lg h-10 mb-6">
              <TabsTrigger value="basic" className="text-xs font-semibold py-1">Basic Details</TabsTrigger>
              <TabsTrigger value="categories" className="text-xs font-semibold py-1">Benefit categories</TabsTrigger>
              <TabsTrigger value="conditions" className="text-xs font-semibold py-1">Pre-existing & Chronic</TabsTrigger>
              <TabsTrigger value="additional" className="text-xs font-semibold py-1">Additional Services</TabsTrigger>
              <TabsTrigger value="rules" className="text-xs font-semibold py-1">Rules & Exceptions</TabsTrigger>
            </TabsList>

            {/* TAB 1: BASIC DETAILS */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Name *</Label>
                  <Input
                    placeholder="e.g. VIP Platinum Medical Care"
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Insurer Name</Label>
                  <Select 
                    value={formData.insurer_id} 
                    onValueChange={(v) => {
                      const insurer = insurers.find((i: any) => i.id === v);
                      setFormData({ ...formData, insurer_id: v, insurer_name: insurer?.companyName || "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Insurer" />
                    </SelectTrigger>
                    <SelectContent>
                      {insurers.map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>{i.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Benefit Class</Label>
                  <Select 
                    value={formData.benefit_class} 
                    onValueChange={(v) => setFormData({ ...formData, benefit_class: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BENEFIT_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Network Type</Label>
                  <Select 
                    value={formData.network_type} 
                    onValueChange={(v) => setFormData({ ...formData, network_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NETWORK_TYPES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Annual Limit (EGP)</Label>
                  <Input
                    type="number"
                    value={formData.annual_limit}
                    onChange={(e) => setFormData({ ...formData, annual_limit: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: BENEFIT CATEGORIES */}
            <TabsContent value="categories" className="space-y-4 mt-0 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {categoriesList.map((cat) => {
                const item = formData.details.categories[cat.key];
                return (
                  <div key={cat.key} className="p-4 border rounded-xl bg-slate-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className={`w-4.5 h-4.5 ${item.is_covered ? "text-emerald-500" : "text-slate-300"}`} />
                        {cat.label}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Covered</Label>
                        <Switch
                          checked={item.is_covered}
                          onCheckedChange={(checked) => {
                            const newCategories = { ...formData.details.categories };
                            newCategories[cat.key].is_covered = checked;
                            setFormData({
                              ...formData,
                              details: { ...formData.details, categories: newCategories }
                            });
                          }}
                        />
                      </div>
                    </div>

                    {item.is_covered && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Coverage Type</Label>
                          <Select 
                            value={item.coverage_type} 
                            onValueChange={(v) => {
                              const newCategories = { ...formData.details.categories };
                              newCategories[cat.key].coverage_type = v;
                              setFormData({
                                ...formData,
                                details: { ...formData.details, categories: newCategories }
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COVERAGE_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {item.coverage_type !== 'FULL' && (
                          <div className="space-y-1">
                            <Label className="text-[10px]">Limit (EGP)</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              value={item.limit_value}
                              onChange={(e) => {
                                const newCategories = { ...formData.details.categories };
                                newCategories[cat.key].limit_value = e.target.value;
                                setFormData({
                                  ...formData,
                                  details: { ...formData.details, categories: newCategories }
                                });
                              }}
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-[10px]">Copay (%)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={item.copay_percentage}
                            onChange={(e) => {
                              const newCategories = { ...formData.details.categories };
                              newCategories[cat.key].copay_percentage = Number(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                details: { ...formData.details, categories: newCategories }
                              });
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px]">Deductible (fixed)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={item.deductible}
                            onChange={(e) => {
                              const newCategories = { ...formData.details.categories };
                              newCategories[cat.key].deductible = Number(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                details: { ...formData.details, categories: newCategories }
                              });
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px]">Waiting Period (days)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={item.waiting_period_days}
                            onChange={(e) => {
                              const newCategories = { ...formData.details.categories };
                              newCategories[cat.key].waiting_period_days = Number(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                details: { ...formData.details, categories: newCategories }
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            {/* TAB 3: PRE-EXISTING & CHRONIC */}
            <TabsContent value="conditions" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pre-existing Conditions */}
                <Card className="border p-4 bg-slate-50/40">
                  <h4 className="font-bold text-sm mb-4">Pre-existing Conditions</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Covered</Label>
                      <Switch
                        checked={formData.details.pre_existing.is_covered}
                        onCheckedChange={(v) => {
                          const newPre = { ...formData.details.pre_existing, is_covered: v };
                          setFormData({ ...formData, details: { ...formData.details, pre_existing: newPre } });
                        }}
                      />
                    </div>
                    {formData.details.pre_existing.is_covered && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Waiting Period (days)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={formData.details.pre_existing.waiting_period_days}
                            onChange={(e) => {
                              const newPre = { ...formData.details.pre_existing, waiting_period_days: Number(e.target.value) || 0 };
                              setFormData({ ...formData, details: { ...formData.details, pre_existing: newPre } });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Sub-Limit (EGP)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={formData.details.pre_existing.sub_limit}
                            onChange={(e) => {
                              const newPre = { ...formData.details.pre_existing, sub_limit: Number(e.target.value) || 0 };
                              setFormData({ ...formData, details: { ...formData.details, pre_existing: newPre } });
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                {/* Chronic Conditions */}
                <Card className="border p-4 bg-slate-50/40">
                  <h4 className="font-bold text-sm mb-4">Chronic Conditions</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Covered</Label>
                      <Switch
                        checked={formData.details.chronic.is_covered}
                        onCheckedChange={(v) => {
                          const newChr = { ...formData.details.chronic, is_covered: v };
                          setFormData({ ...formData, details: { ...formData.details, chronic: newChr } });
                        }}
                      />
                    </div>
                    {formData.details.chronic.is_covered && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Sub-Limit (EGP)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={formData.details.chronic.sub_limit}
                            onChange={(e) => {
                              const newChr = { ...formData.details.chronic, sub_limit: Number(e.target.value) || 0 };
                              setFormData({ ...formData, details: { ...formData.details, chronic: newChr } });
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 4: ADDITIONAL & CORPORATE SERVICES */}
            <TabsContent value="additional" className="space-y-4 mt-0 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {/* Doctor On-site Corporate Service */}
              <Card className="border p-4 bg-slate-50/40">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm">Doctor On-Site Program</h4>
                    <p className="text-[10px] text-muted-foreground">Configure corporate program details</p>
                  </div>
                  <Switch
                    checked={formData.details.doctor_on_site.enabled}
                    onCheckedChange={(v) => {
                      const newDoc = { ...formData.details.doctor_on_site, enabled: v };
                      setFormData({ ...formData, details: { ...formData.details, doctor_on_site: newDoc } });
                    }}
                  />
                </div>

                {formData.details.doctor_on_site.enabled && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Visits/Week</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={formData.details.doctor_on_site.visits_per_week}
                        onChange={(e) => {
                          const newDoc = { ...formData.details.doctor_on_site, visits_per_week: Number(e.target.value) || 0 };
                          setFormData({ ...formData, details: { ...formData.details, doctor_on_site: newDoc } });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Max Patients/Day</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={formData.details.doctor_on_site.max_visits_per_day}
                        onChange={(e) => {
                          const newDoc = { ...formData.details.doctor_on_site, max_visits_per_day: Number(e.target.value) || 0 };
                          setFormData({ ...formData, details: { ...formData.details, doctor_on_site: newDoc } });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Eligibility Mode</Label>
                      <Select 
                        value={formData.details.doctor_on_site.eligibility_type}
                        onValueChange={(v) => {
                          const newDoc = { ...formData.details.doctor_on_site, eligibility_type: v };
                          setFormData({ ...formData, details: { ...formData.details, doctor_on_site: newDoc } });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ELIGIBILITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.details.doctor_on_site.eligibility_type !== 'ALL' && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">Eligibility Value</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={formData.details.doctor_on_site.eligibility_value}
                          onChange={(e) => {
                            const newDoc = { ...formData.details.doctor_on_site, eligibility_value: Number(e.target.value) || 0 };
                            setFormData({ ...formData, details: { ...formData.details, doctor_on_site: newDoc } });
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Additional Services Grid */}
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-widest mt-4 mb-2">Additional Services Coverage</h4>
              <div className="space-y-3">
                {formData.details.additional_services.map((svc: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg bg-white grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{svc.name_en}</p>
                      <p className="text-[10px] text-muted-foreground">{svc.name_ar}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Coverage Type</Label>
                      <Select
                        value={svc.coverage_type}
                        onValueChange={(v) => {
                          const newSvcs = [...formData.details.additional_services];
                          newSvcs[index].coverage_type = v;
                          setFormData({ ...formData, details: { ...formData.details, additional_services: newSvcs } });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">Full</SelectItem>
                          <SelectItem value="LIMIT">Limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {svc.coverage_type === 'LIMIT' && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">Limit (EGP)</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={svc.limit_value}
                          onChange={(e) => {
                            const newSvcs = [...formData.details.additional_services];
                            newSvcs[index].limit_value = Number(e.target.value) || 0;
                            setFormData({ ...formData, details: { ...formData.details, additional_services: newSvcs } });
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 md:col-start-4">
                      <Label className="text-[10px]">Pre-Approval</Label>
                      <Switch
                        checked={svc.requires_approval}
                        onCheckedChange={(v) => {
                          const newSvcs = [...formData.details.additional_services];
                          newSvcs[index].requires_approval = v;
                          setFormData({ ...formData, details: { ...formData.details, additional_services: newSvcs } });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 5: RULES ENGINE & EXCEPTION POOL */}
            <TabsContent value="rules" className="space-y-4 mt-0 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {/* Exception Pool */}
              <Card className="border p-4 bg-slate-50/40">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-1">
                  <Info className="w-4 h-4 text-indigo-500" />
                  Shared Exception Pool
                </h4>
                <p className="text-[10px] text-muted-foreground mb-4">Dedicated shared pool used for exceeding limits and exceptional approvals.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Total Exception Pool Amount (EGP)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={formData.details.exception_pool.total_amount}
                      onChange={(e) => {
                        const newPool = { ...formData.details.exception_pool, total_amount: Number(e.target.value) || 0, remaining_amount: Number(e.target.value) || 0 };
                        setFormData({ ...formData, details: { ...formData.details, exception_pool: newPool } });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Label className="text-[10px]">Requires Approval</Label>
                    <Switch
                      checked={formData.details.exception_pool.approval_required}
                      onCheckedChange={(v) => {
                        const newPool = { ...formData.details.exception_pool, approval_required: v };
                        setFormData({ ...formData, details: { ...formData.details, exception_pool: newPool } });
                      }}
                    />
                  </div>
                </div>
              </Card>

              {/* Rules Engine Constructor */}
              <Card className="border p-4 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Custom Rules Engine</h4>
                    <p className="text-[10px] text-muted-foreground">Construct plan pre-approvals, waiting periods, and caps.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newRules = [...formData.details.rules, { rule_type: 'PRE_APPROVAL', benefit_item: '', value: 0, notes: '' }];
                      setFormData({ ...formData, details: { ...formData.details, rules: newRules } });
                    }}
                  >
                    Add Custom Rule
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.details.rules.map((rule: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg bg-slate-50/50 grid grid-cols-1 md:grid-cols-4 gap-3 relative">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Rule Type</Label>
                        <Select
                          value={rule.rule_type}
                          onValueChange={(v) => {
                            const newRules = [...formData.details.rules];
                            newRules[index].rule_type = v;
                            setFormData({ ...formData, details: { ...formData.details, rules: newRules } });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Benefit Item</Label>
                        <Input
                          placeholder="e.g. MRI, ICU Stay"
                          className="h-8 text-xs"
                          value={rule.benefit_item}
                          onChange={(e) => {
                            const newRules = [...formData.details.rules];
                            newRules[index].benefit_item = e.target.value;
                            setFormData({ ...formData, details: { ...formData.details, rules: newRules } });
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Value (days / EGP)</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={rule.value}
                          onChange={(e) => {
                            const newRules = [...formData.details.rules];
                            newRules[index].value = Number(e.target.value) || 0;
                            setFormData({ ...formData, details: { ...formData.details, rules: newRules } });
                          }}
                        />
                      </div>

                      <div className="flex gap-2 items-end">
                        <div className="space-y-1 flex-1">
                          <Label className="text-[10px]">Notes</Label>
                          <Input
                            placeholder="Reasoning"
                            className="h-8 text-xs"
                            value={rule.notes}
                            onChange={(e) => {
                              const newRules = [...formData.details.rules];
                              newRules[index].notes = e.target.value;
                              setFormData({ ...formData, details: { ...formData.details, rules: newRules } });
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                          onClick={() => {
                            const newRules = formData.details.rules.filter((_: any, idx: number) => idx !== index);
                            setFormData({ ...formData, details: { ...formData.details, rules: newRules } });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700 text-white font-bold" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : selectedSchedule ? (
                "Update Plan"
              ) : (
                "Create Plan"
              )}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Benefit Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the plan "{selectedSchedule?.plan_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
