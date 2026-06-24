'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatCompactNumber } from "@/lib/utils";
import { Briefcase, Calendar, DollarSign, Edit, Trash2, FileSignature, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Target, Activity } from "lucide-react";
import { useI18n } from "@/components/i18n-context";
import type { Prospect, Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

// Supabase Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";

const emptyForm: Omit<Prospect, 'id' | 'created_at'> = {
  company_name: "",
  company_id: "",
  lead_id: "",
  pipeline_stage: "qualification",
  probability: 0,
  estimated_value: 0,
  expected_close_date: "",
  assigned_user_name: "",
  assigned_user_id: "",
  current_insurer: "",
  current_tpa: "",
  requested_products: [],
  notes: ""
};

export default function Prospects() {
  const { t } = useI18n();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState<Omit<Prospect, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);
  const [converting, setConverting] = useState(false);

  // Supabase Collections
  const { data: prospectsData, isLoading } = useSupabaseCollection<any>('prospects');
  const prospects = prospectsData || [];

  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const companies = companiesData || [];

  const { data: usersData } = useSupabaseCollection<any>('users');
  const users = usersData || [];

  const { data: pipelineStagesData } = useSupabaseCollection<any>('master_pipeline_stages');
  const pipelineStages = pipelineStagesData || [];

  const { data: productsData } = useSupabaseCollection<any>('master_product_types');
  const products = productsData || [];

  const { data: tpasData } = useSupabaseCollection<any>('tpas');
  const tpas = tpasData || [];

  const { data: insurersData } = useSupabaseCollection<any>('insurance_companies');
  const insurers = insurersData || [];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedProspect(null);
  };

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setFormData({
      company_name: prospect.company_name || "",
      company_id: prospect.company_id || "",
      lead_id: prospect.lead_id || "",
      pipeline_stage: prospect.pipeline_stage || "qualification",
      probability: prospect.probability || 0,
      estimated_value: prospect.estimated_value || 0,
      expected_close_date: prospect.expected_close_date || "",
      assigned_user_name: prospect.assigned_user_name || "",
      assigned_user_id: prospect.assigned_user_id || "",
      current_insurer: prospect.current_insurer || "",
      current_tpa: prospect.current_tpa || "",
      requested_products: prospect.requested_products || [],
      notes: prospect.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const prospectPayload = {
        company_name: formData.company_name,
        company_id: formData.company_id ? formData.company_id : null,
        pipeline_stage: formData.pipeline_stage || "qualification",
        probability: formData.probability || 0,
        estimated_value: formData.estimated_value || 0,
        expected_close_date: formData.expected_close_date || null,
        assigned_user_name: formData.assigned_user_name || "",
        assigned_user_id: formData.assigned_user_id ? formData.assigned_user_id : null,
        current_insurer: formData.current_insurer || "",
        current_tpa: formData.current_tpa || "",
        requested_products: formData.requested_products || [],
        notes: formData.notes || ""
      };

      if (selectedProspect) {
        const { error } = await supabase
          .from("prospects")
          .update(prospectPayload)
          .eq("id", selectedProspect.id);

        if (error) throw error;
        toast({ title: t('prospectUpdated') || "Prospect updated successfully" });
      } else {
        const { error } = await supabase
          .from("prospects")
          .insert(sanitizeUUIDs({
            ...prospectPayload,
            created_at: new Date().toISOString()
          }));

        if (error) throw error;
        toast({ title: t('prospectCreated') || "Prospect created successfully" });
      }

      // Keep company profile status synchronized to 'prospect'
      if (formData.company_id) {
        await supabase
          .from("companies")
          .update({ status: 'prospect', updated_at: new Date().toISOString() })
          .eq("id", formData.company_id);
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error submitting form: ", error);
      toast({
        title: t('persistenceError') || "An error occurred.",
        description: error?.message || error?.details || JSON.stringify(error) || String(error),
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (selectedProspect) {
      try {
        const { error } = await supabase
          .from("prospects")
          .delete()
          .eq("id", selectedProspect.id);

        if (error) throw error;
        toast({ title: t('prospectDeleted') || "Prospect deleted successfully" });
      } catch (error) {
        console.error("Error deleting document: ", error);
        toast({ title: t('persistenceError') || "An error occurred while deleting.", variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedProspect(null);
  };

  const handleConvertToPolicy = async () => {
    if (!convertingProspect) return;
    setConverting(true);
    try {
      // Update prospect stage to 'closed_won'
      const { error: convertError } = await supabase.from('prospects').update({
        pipeline_stage: 'closed_won'
      }).eq('id', convertingProspect.id);

      if (convertError) throw convertError;

      // Update company status to 'client'
      if (convertingProspect.company_id) {
        await supabase.from('companies').update({
          status: 'client',
          updated_at: new Date().toISOString()
        }).eq('id', convertingProspect.company_id);
      }

      // Automatically create a policy (contract) draft pre-filled with prospect details
      let insurerId = null;
      let insurerName = convertingProspect.current_insurer || "";
      if (insurerName) {
        const { data: matchedInsurers } = await supabase
          .from('insurance_companies')
          .select('id, companyName')
          .ilike('companyName', insurerName)
          .limit(1);
        if (matchedInsurers && matchedInsurers.length > 0) {
          insurerId = matchedInsurers[0].id;
          insurerName = matchedInsurers[0].companyName;
        }
      }

      let tpaId = null;
      let tpaName = convertingProspect.current_tpa || "";

      // Match policy type to one of: medical, life, motor, property, liability, travel
      const VALID_POLICY_TYPES = ["medical", "life", "motor", "property", "liability", "travel"];
      const reqProduct = convertingProspect.requested_products?.[0]?.toLowerCase() || "";
      const policyType = VALID_POLICY_TYPES.includes(reqProduct) ? reqProduct : "medical";

      // Generate a draft policy number
      const cleanName = (convertingProspect.company_name || "CO")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 3)
        .toUpperCase();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const generatedPolicyNumber = `POL-DRAFT-${cleanName}-${rand}`;

      // Insert policy record into Supabase
      const { data: insertedPolicy, error: policyError } = await supabase.from('policies').insert(sanitizeUUIDs({
        policy_number: generatedPolicyNumber,
        client_company_name: convertingProspect.company_name,
        client_company_id: convertingProspect.company_id || null,
        insurer_name: insurerName,
        insurer_id: insurerId,
        tpa_name: tpaName || null,
        tpa_id: null,
        policy_type: policyType,
        premium_total: convertingProspect.estimated_value || 0,
        premium_gross: convertingProspect.estimated_value || 0,
        contract_net: convertingProspect.estimated_value || 0,
        sales_person: convertingProspect.assigned_user_name || "",
        policy_status: 'draft',
        created_at: new Date().toISOString()
      })).select('id').single();

      if (policyError) throw policyError;

      toast({
        title: '✅ Prospect Converted & Policy Created!',
        description: `Draft policy ${generatedPolicyNumber} has been created for ${convertingProspect.company_name}.`,
      });
      setConvertDialogOpen(false);
      setConvertingProspect(null);
      if (insertedPolicy) {
        router.push(`/policies/${insertedPolicy.id}`);
      } else {
        router.push('/policies');
      }
    } catch (err: any) {
      console.error("Conversion failed:", err);
      toast({ variant: 'destructive', title: 'Conversion failed', description: err?.message || String(err) });
    } finally {
      setConverting(false);
    }
  };

  const columns = [
    {
      header: t('companies'),
      accessorKey: "company_name",
      cell: ({ row }: any) => {
        const prospect = row.original as Prospect;
        const companyId = prospect.company_id || prospect.id;
        const name = prospect.company_name || "Unknown";
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center text-violet-700 font-bold shadow-sm border border-violet-200 shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/companies/${companyId}`);
                }}
                className="font-bold text-indigo-900 hover:text-primary hover:underline cursor-pointer transition-colors"
              >
                {name}
              </span>
              <span className="text-xs text-muted-foreground">{prospect.current_insurer || 'No current insurer'}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: t('status'),
      accessorKey: "pipeline_stage",
      cell: ({ row }: any) => <StatusBadge status={row.original.pipeline_stage} />
    },
    {
      header: t('estimatedValue') || "Value",
      accessorKey: "estimated_value",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-[13px]">{row.original.estimated_value ? formatCompactNumber(row.original.estimated_value) : '-'}</span>
        </div>
      )
    },
    {
      header: t('probability') || "Probability",
      accessorKey: "probability",
      cell: ({ row }: any) => (
        <div className="w-20">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span>{row.original.probability || 0}%</span>
          </div>
          <Progress value={row.original.probability || 0} className="h-1" />
        </div>
      )
    },
    {
      header: t('expectedCloseDate') || "Close Date",
      accessorKey: "expected_close_date",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[13px]">{row.original.expected_close_date ? format(new Date(row.original.expected_close_date), 'MMM d, yyyy') : '-'}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({ row }: any) => {
        const prospect = row.original as Prospect;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:text-emerald-700 hover:bg-success/10"
              title="Convert to Policy"
              onClick={(e) => {
                e.stopPropagation();
                setConvertingProspect(prospect);
                setConvertDialogOpen(true);
              }}
            >
              <FileSignature className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleEdit(prospect); }}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProspect(prospect);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      }
    }
  ];

  const table = useReactTable({
    data: prospects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
    <div className="space-y-6">
      <PageHeader
        title={t('prospects')}
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel={t('addProspect')}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-violet-500 to-violet-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="space-y-1">
              <p className="text-violet-100 text-[11px] font-black uppercase tracking-widest">{t('totalProspects') || 'Total Prospects'}</p>
              <p className="text-4xl font-black">{prospects.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-card overflow-hidden relative border-t-4 border-t-emerald-500">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <DollarSign className="w-16 h-16 text-success" />
          </div>
          <CardContent className="p-6 relative z-10">
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">{t('pipelineValue') || 'Pipeline Value'}</p>
             <p className="text-3xl font-black text-foreground">
               {prospects.reduce((sum: number, p: any) => sum + (Number(p.estimated_value) || 0), 0).toLocaleString()}
             </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden relative border-t-4 border-t-amber-500">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity className="w-16 h-16 text-amber-500" />
          </div>
          <CardContent className="p-6 relative z-10">
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">{t('hotProspects') || 'Hot Prospects (>70%)'}</p>
             <p className="text-3xl font-black text-foreground">{prospects.filter((p: any) => (p.probability || 0) >= 70).length}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden relative border-t-4 border-t-blue-500">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </div>
          <CardContent className="p-6 relative z-10">
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">{t('closedWon') || 'Closed Won'}</p>
             <p className="text-3xl font-black text-foreground">{prospects.filter((p: any) => p.pipeline_stage === 'closed_won').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {prospects.length === 0 && !isLoading ? (
            <div className="p-8">
              <EmptyState
                icon={Briefcase}
                title={t('noProspectsYet') || "No prospects yet"}
              />
            </div>
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder={t('searchPlaceholder') || "Search prospects..."}
              onRowClick={handleEdit}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedProspect ? t('edit') || "Edit Prospect" : t('addProspect')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('companies')} *</Label>
              {selectedProspect ? (
                <Input value={formData.company_name} readOnly disabled />
              ) : (
                <Select
                  value={formData.company_id}
                  onValueChange={(v) => {
                    const company = companies.find(c => c.id === v);
                    setFormData({ 
                      ...formData, 
                      company_id: v, 
                      company_name: company?.name || "",
                      current_insurer: company?.current_insurer || formData.current_insurer
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={t('selectClient')} /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('pipelineStage') || "Pipeline Stage"} *</Label>
              <Select value={formData.pipeline_stage} onValueChange={(v) => setFormData({ ...formData, pipeline_stage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus') || "Select stage"} />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map(s => (
                    <SelectItem key={s.id} value={s.code?.toLowerCase() || s.name.toLowerCase()}>{s.name}</SelectItem>
                  ))}
                  {pipelineStages.length === 0 && <SelectItem value="qualification">{t('qualification') || "Qualification"}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('estimatedValue') || "Estimated Value"}</Label>
              <Input
                type="number"
                value={formData.estimated_value ?? ''}
                onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                placeholder="Deal value"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('probability') || "Probability"} (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.probability ?? ''}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                placeholder="0-100"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('expectedCloseDate') || "Expected Close Date"}</Label>
              <Input
                type="date"
                value={formData.expected_close_date || ''}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('assignedTo') || "Assigned To"}</Label>
              <Select
                value={formData.assigned_user_name}
                onValueChange={(v) => {
                  const user = users.find(u => u.name === v);
                  setFormData({ ...formData, assigned_user_name: v, assigned_user_id: user?.id || "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('currentInsurer') || "Current Insurer"}</Label>
              <Select value={formData.current_insurer} onValueChange={(v) => setFormData({ ...formData, current_insurer: v })}>
                <SelectTrigger><SelectValue placeholder="Select Insurer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {insurers.map((i: any) => <SelectItem key={i.id} value={i.companyName || i.name}>{i.companyName || i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('currentTpa') || "Current TPA"}</Label>
              <Select value={formData.current_tpa} onValueChange={(v) => setFormData({ ...formData, current_tpa: v })}>
                <SelectTrigger><SelectValue placeholder="Select TPA" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {tpas.map((t: any) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('requestedProducts') || "Requested Products"}</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {products.map(product => (
                <label key={product.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-background">
                  <input
                    type="checkbox"
                    checked={formData.requested_products.includes(product.name)}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setFormData((prev: any) => ({
                        ...prev,
                        requested_products: checked
                          ? [...prev.requested_products, product.name]
                          : prev.requested_products.filter((p: string) => p !== product.name)
                      }));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{product.name}</span>
                </label>
              ))}
              {products.length === 0 && (
                <p className="text-xs text-slate-400 italic">No products defined in Master Data.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('internalNotes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-indigo-700"
            >
              {selectedProspect ? t('save') : t('create')}
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProspect') || "Delete Prospect"}</AlertDialogTitle>
            <AlertDialogDescription>
              {(t('confirmDeleteProspect') || 'Are you sure you want to delete the prospect for "{name}"? This action cannot be undone.').replace('{name}', selectedProspect?.company_name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Policy Confirmation Dialog */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-success" />
              Convert Prospect to Policy
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <span>You are about to convert <strong>{convertingProspect?.company_name}</strong> from a prospect to a client.</span>
                <br /><br />
                This will:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Set the prospect stage to <strong>Closed Won</strong></li>
                  <li>Update the company status to <strong>Client</strong></li>
                  <li>Redirect you to Policies to issue the policy</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertToPolicy}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              disabled={converting}
            >
              <CheckCircle2 className="w-4 h-4" />
              {converting ? 'Converting...' : 'Confirm & Go to Policies'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
