'use client';;
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatCompactNumber } from "@/lib/utils";
import { Briefcase, Calendar, DollarSign, Edit, Trash2, FileSignature, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/metric-card";
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
import { useToast } from "@/lib/hooks/use-toast";
import { Target, Activity } from "lucide-react";
import { useI18n } from "@/components/i18n-context";
import type { Prospect, Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import {
  MoreVertical,
  XCircle,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";

// Supabase & Service Imports
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { ProspectService } from "@/services/prospect.service";
import { ProspectForm } from "@/components/crm/ProspectForm";

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
  const trans = (key: string) => t(key as any) || key;
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState<Omit<Prospect, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);
  const [converting, setConverting] = useState(false);
  const queryClient = useQueryClient();

  // Quick Action Dialog States
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [wonPremium, setWonPremium] = useState(0);
  const [wonCommission, setWonCommission] = useState(0);
  const [wonInsurer, setWonInsurer] = useState("");
  const [wonNotes, setWonNotes] = useState("");



  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [pricingVersions, setPricingVersions] = useState<any[]>([]);
  // Pricing variant form input states
  const [newOptionTitle, setNewOptionTitle] = useState("");
  const [newOptionInsurer, setNewOptionInsurer] = useState("");
  const [newOptionPremium, setNewOptionPremium] = useState(0);
  const [newOptionStatus, setNewOptionStatus] = useState("Draft");

  // Supabase Collections — fetch prospect_details 1-to-1 relations in a single query
  const { data: prospectsData, isLoading } = useSupabaseCollection<any>('prospects', undefined, {
    select: '*, prospect_details(*)',
    filterKey: 'prospects-all-with-details',
  });
  const prospects = prospectsData || [];

  // Companies: only id/name needed for linking
  const { data: companiesData } = useSupabaseCollection<any>('companies', undefined, {
    select: 'id, name, insurance_type',
    filterKey: 'companies-prospects-lookup',
  });
  const companies = companiesData || [];

  // Users: only id/name for assignment
  const { data: usersData } = useSupabaseCollection<any>('users', undefined, {
    select: 'id, name',
    filterKey: 'users-dropdown',
  });
  const users = usersData || [];

  const { data: pipelineStagesData } = useSupabaseCollection<any>('master_pipeline_stages', undefined, {
    select: 'id, name, name_ar, order',
    filterKey: 'master-pipeline-stages',
  });
  const pipelineStages = pipelineStagesData || [];

  const { data: productsData } = useSupabaseCollection<any>('master_product_types', undefined, {
    select: 'id, name, name_ar',
    filterKey: 'master-product-types',
  });
  const products = productsData || [];

  // TPAs: only id/name for dropdown
  const { data: tpasData } = useSupabaseCollection<any>('tpas', undefined, {
    select: 'id, name',
    filterKey: 'tpas-dropdown',
  });
  const tpas = tpasData || [];

  // Insurers: only id/companyName for dropdown
  const { data: insurersData } = useSupabaseCollection<any>('insurance_companies', undefined, {
    select: 'id, companyName',
    filterKey: 'insurers-dropdown',
  });
  const insurers = insurersData || [];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedProspect(null);
  };

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    const details = Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {});
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
      current_insurer: details.insurance_company || prospect.current_insurer || "",
      current_tpa: prospect.current_tpa || "",
      requested_products: prospect.requested_products || [],
      notes: details.notes || prospect.notes || ""
    });
    setDialogOpen(true);
  };

  // Quick Action Submits
  const handleQuickWon = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    const details = Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {});
    setWonPremium(details.final_premium || prospect.estimated_value || 0);
    setWonCommission(details.commission || 0);
    setWonInsurer(details.insurance_company || prospect.current_insurer || "");
    setWonNotes("");
    setWonDialogOpen(true);
  };

  const submitQuickWon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProspect) return;
    setConverting(true);
    try {
      const result = await ProspectService.convertToPolicy(selectedProspect, {
        final_premium: wonPremium,
        insurance_company: wonInsurer,
        commission: wonCommission,
        details: wonNotes
      });

      queryClient.invalidateQueries({ queryKey: ['supabase'] });
      toast({
        title: '✅ Prospect Converted & Policy Created!',
        description: `Draft policy ${result.generatedPolicyNumber} has been created for ${selectedProspect.company_name}.`,
      });
      setWonDialogOpen(false);
      setSelectedProspect(null);
      if (result.policyId) {
        router.push(`/policies/${result.policyId}`);
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



  const handleQuickPricing = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    const details = Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {});
    setPricingVersions(details.proposal_versions || []);
    setNewOptionTitle("");
    setNewOptionInsurer(details.insurance_company || prospect.current_insurer || "");
    setNewOptionPremium(prospect.estimated_value || 0);
    setNewOptionStatus("Draft");
    setPricingDialogOpen(true);
  };

  const addPricingOption = () => {
    if (!newOptionTitle) return;
    const newOption = {
      id: Math.random().toString(36).substring(2, 9),
      title: newOptionTitle,
      insurer: newOptionInsurer,
      premium: newOptionPremium,
      status: newOptionStatus,
      created_at: new Date().toISOString()
    };
    setPricingVersions(prev => [...prev, newOption]);
    setNewOptionTitle("");
  };

  const deletePricingOption = (optId: string) => {
    setPricingVersions(prev => prev.filter(o => o.id !== optId));
  };

  const selectPricingOption = async (option: any) => {
    if (!selectedProspect) return;
    try {
      const details = Array.isArray(selectedProspect.prospect_details) ? selectedProspect.prospect_details[0] : (selectedProspect.prospect_details || {});
      const updatedVersions = pricingVersions.map(o => ({
        ...o,
        status: o.id === option.id ? 'Selected' : (o.status === 'Selected' ? 'Active' : o.status)
      }));
      setPricingVersions(updatedVersions);

      await supabase.from('prospects').update({ estimated_value: option.premium }).eq('id', selectedProspect.id);
      await supabase.from('prospect_details').upsert(sanitizeUUIDs({
        prospect_id: selectedProspect.id,
        company_id: selectedProspect.company_id || null,
        final_premium: option.premium,
        insurance_company: option.insurer,
        proposal_versions: updatedVersions,
        updated_at: new Date().toISOString()
      }), { onConflict: 'prospect_id' });

      queryClient.invalidateQueries({ queryKey: ['supabase'] });
      toast({ title: "Pricing Option Selected", description: `Active premium set to ${option.premium} EGP.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update failed' });
    }
  };

  const savePricingVersions = async () => {
    if (!selectedProspect) return;
    try {
      await supabase.from('prospect_details').upsert(sanitizeUUIDs({
        prospect_id: selectedProspect.id,
        company_id: selectedProspect.company_id || null,
        proposal_versions: pricingVersions,
        updated_at: new Date().toISOString()
      }), { onConflict: 'prospect_id' });

      queryClient.invalidateQueries({ queryKey: ['supabase'] });
      toast({ title: "Pricing Options Saved successfully" });
      setPricingDialogOpen(false);
      setSelectedProspect(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const prospectPayload = {
        company_name: formData.company_name,
        company_id: formData.company_id || undefined,
        pipeline_stage: formData.pipeline_stage || "qualification",
        probability: formData.probability || 0,
        estimated_value: formData.estimated_value || 0,
        expected_close_date: formData.expected_close_date || undefined,
        assigned_user_name: formData.assigned_user_name || "",
        assigned_user_id: formData.assigned_user_id || undefined,
        current_insurer: formData.current_insurer || "",
        current_tpa: formData.current_tpa || "",
        requested_products: formData.requested_products || [],
        notes: formData.notes || ""
      };

      if (selectedProspect) {
        await ProspectService.updateProspect(selectedProspect.id, prospectPayload);
        toast({ title: t('prospectUpdated') || "Prospect updated successfully" });
      } else {
        await ProspectService.createProspect(prospectPayload);
        toast({ title: t('prospectCreated') || "Prospect created successfully" });
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
        await ProspectService.deleteProspect(selectedProspect.id);
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
      const result = await ProspectService.convertToPolicy(convertingProspect);

      toast({
        title: '✅ Prospect Converted & Policy Created!',
        description: `Draft policy ${result.generatedPolicyNumber} has been created for ${convertingProspect.company_name}.`,
      });
      setConvertDialogOpen(false);
      setConvertingProspect(null);
      if (result.policyId) {
        router.push(`/policies/${result.policyId}`);
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
        const details = Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {});
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
              <span className="text-xs text-muted-foreground mt-0.5 font-medium">
                {details.insurance_company || prospect.current_insurer || 'No current insurer'}
              </span>
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
      header: "Value Details",
      cell: ({ row }: any) => {
        const prospect = row.original;
        const details = Array.isArray(prospect.prospect_details) ? prospect.prospect_details[0] : (prospect.prospect_details || {});
        const finalPrem = details.final_premium || 0;
        const estValue = prospect.estimated_value || 0;
        return (
          <div className="flex flex-col text-xs space-y-1">
            <span className="font-medium text-slate-700 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Est: {formatCompactNumber(estValue)} EGP
            </span>
            {finalPrem > 0 && (
              <span className="font-black text-indigo-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Final: {formatCompactNumber(finalPrem)} EGP
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Decision Maker",
      cell: ({ row }: any) => {
        const details = Array.isArray(row.original.prospect_details) ? row.original.prospect_details[0] : (row.original.prospect_details || {});
        return <span className="text-xs font-semibold text-slate-700">{details.decision_maker || <span className="text-slate-400 italic">Not set</span>}</span>;
      }
    },
    {
      header: "Competitors",
      cell: ({ row }: any) => {
        const details = Array.isArray(row.original.prospect_details) ? row.original.prospect_details[0] : (row.original.prospect_details || {});
        const comps = details.competitors || [];
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {comps.length > 0 ? (
              comps.map((c: string) => (
                <Badge key={c} variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-600 font-bold px-1.5 py-0">
                  {c}
                </Badge>
              ))
            ) : (
              <span className="text-slate-400 italic text-xs">None</span>
            )}
          </div>
        );
      }
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-indigo-200 text-primary hover:bg-primary/10 font-bold gap-1 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickWon(prospect);
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Won (Policy)
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()} className="h-8 w-8 hover:bg-slate-100 rounded-lg">
                  <MoreVertical className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-md rounded-xl p-1">
                <DropdownMenuItem onClick={() => handleEdit(prospect)} className="rounded-lg font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Edit className="w-4 h-4 mr-2 text-indigo-500" /> {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickPricing(prospect)} className="rounded-lg font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <FileText className="w-4 h-4 mr-2 text-amber-500" /> Pricing Options
                </DropdownMenuItem>

                <DropdownMenuItem className="rounded-lg font-semibold text-xs text-destructive focus:text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => { setSelectedProspect(prospect); setDeleteDialogOpen(true); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
    <div className="space-y-6">
      <PageHeader
        title={t('prospects')}
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel={t('addProspect')}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title={t('totalProspects') || 'Total Prospects'}
          value={prospects.length}
          icon={Target}
          color="purple"
          loading={isLoading}
        />
        <KPICard
          title={t('pipelineValue') || 'Pipeline Value'}
          value={prospects.reduce((sum: number, p: any) => sum + (Number(p.estimated_value) || 0), 0)}
          icon={DollarSign}
          color="green"
          format="compact"
          loading={isLoading}
        />
        <KPICard
          title={t('hotProspects') || 'Hot Prospects'}
          value={prospects.filter((p: any) => (p.probability || 0) >= 70).length}
          icon={Activity}
          color="orange"
          loading={isLoading}
        />
        <KPICard
          title={t('closedWon') || 'Closed Won'}
          value={prospects.filter((p: any) => p.pipeline_stage === 'closed_won').length}
          icon={CheckCircle2}
          color="blue"
          loading={isLoading}
        />
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
        <ProspectForm
          formData={formData}
          setFormData={setFormData}
          companies={companies}
          pipelineStages={pipelineStages}
          users={users}
          insurers={insurers}
          tpas={tpas}
          products={products}
          selectedProspect={selectedProspect}
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
        />
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

      {/* QUICK ACTIONS WON / LOST / PRICING MODALS */}
      {/* 1. Mark as Won (Convert to Policy) Dialog */}
      <Dialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Close Deal: Mark as Won
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitQuickWon} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Final Premium (EGP) *</Label>
                <Input
                  type="number"
                  value={wonPremium}
                  onChange={e => setWonPremium(Number(e.target.value))}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  value={wonCommission}
                  onChange={e => setWonCommission(Number(e.target.value))}
                  placeholder="e.g. 10"
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Winning Insurer *</Label>
              <Select value={wonInsurer} onValueChange={setWonInsurer}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Insurer" />
                </SelectTrigger>
                <SelectContent>
                  {insurers.map((i: any) => (
                    <SelectItem key={i.id} value={i.companyName || i.name}>
                      {i.companyName || i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Closing Notes / Details</Label>
              <Textarea
                value={wonNotes}
                onChange={e => setWonNotes(e.target.value)}
                placeholder="Details of the win, special terms, etc..."
                rows={3}
                className="bg-background"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setWonDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={converting} className="bg-success text-white hover:bg-emerald-600">
                {converting ? "Processing..." : "Create Draft Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      {/* 3. Pricing Options / Proposal Versions Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Pricing & Quotation Options
            </DialogTitle>
          </DialogHeader>

          {/* Active Options Table */}
          <div className="border rounded-xl overflow-hidden mb-4 bg-slate-50/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-border">
                  <th className="p-2.5">Option Title</th>
                  <th className="p-2.5">Insurer</th>
                  <th className="p-2.5">Premium (EGP)</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pricingVersions.length > 0 ? (
                  pricingVersions.map((opt: any) => (
                    <tr key={opt.id} className="border-b border-border hover:bg-white transition-colors">
                      <td className="p-2.5 font-bold text-slate-800">{opt.title}</td>
                      <td className="p-2.5 text-slate-600">{opt.insurer}</td>
                      <td className="p-2.5 font-black text-indigo-900">{formatCompactNumber(opt.premium)}</td>
                      <td className="p-2.5">
                        <Badge variant={opt.status === 'Selected' ? 'secondary' : 'outline'} className={`text-[9px] font-black uppercase py-0.5 ${opt.status === 'Selected' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}`}>
                          {opt.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right space-x-1.5">
                        {opt.status !== 'Selected' && (
                          <Button size="sm" variant="outline" className="h-6 px-2 border-indigo-200 text-primary text-[10px] font-bold" onClick={() => selectPricingOption(opt)}>
                            Select
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-red-50" onClick={() => deletePricingOption(opt.id)}>
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">No pricing versions logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add Option Form */}
          <div className="border border-indigo-50 p-4 rounded-xl bg-indigo-50/20 space-y-3">
            <h5 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Add Pricing Variant</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Variant Title *</Label>
                <Input value={newOptionTitle} onChange={e => setNewOptionTitle(e.target.value)} placeholder="e.g. Plan A Gold" className="bg-background h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Insurer *</Label>
                <Select value={newOptionInsurer} onValueChange={setNewOptionInsurer}>
                  <SelectTrigger className="bg-background h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {insurers.map((i: any) => <SelectItem key={i.id} value={i.companyName || i.name}>{i.companyName || i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Premium (EGP) *</Label>
                <Input type="number" value={newOptionPremium || ""} onChange={e => setNewOptionPremium(Number(e.target.value))} placeholder="Premium amount" className="bg-background h-9 text-xs" />
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" className="w-full bg-primary hover:bg-indigo-700 h-9 font-bold text-xs" onClick={addPricingOption}>
                  + Add Variant Option
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setPricingDialogOpen(false)}>Close</Button>
            <Button type="button" className="bg-primary hover:bg-indigo-700" onClick={savePricingVersions}>Save Quotation Options</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
