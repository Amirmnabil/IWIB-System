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
import { TrendingUp, Target, Activity } from "lucide-react";
import { useI18n } from "@/components/i18n-context";
import type { Prospect, Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

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
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState<Omit<Prospect, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);
  const [converting, setConverting] = useState(false);

  // Supabase Collections — explicit column projections to reduce over-fetching
  const { data: prospectsData, isLoading } = useSupabaseCollection<any>('prospects', undefined, {
    filterKey: 'prospects-all',
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
    </div>
  );
}
