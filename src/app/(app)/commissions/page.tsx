'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState } from "react";
import { format } from "date-fns";
import { PiggyBank, Edit, Trash2, Percent } from "lucide-react";
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
import { StatCard } from "@/components/shared/stat-card";
import { useToast } from "@/lib/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import type { Commission, Policy, InsuranceCompany } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

// Supabase & React Query Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useQueryClient } from "@tanstack/react-query";

const COMMISSION_STATUSES = ["expected", "accrued", "invoiced", "paid", "disputed"];

const emptyForm: Omit<Commission, 'id' | 'created_at'> = {
  policy_number: "",
  policy_id: "",
  client_company_name: "",
  client_company_id: "",
  insurer_name: "",
  insurer_id: "",
  commission_rate: 0,
  premium_amount: 0,
  expected_commission: 0,
  accrued_commission: 0,
  paid_commission: 0,
  commission_status: "expected",
  period_start: "",
  period_end: "",
  payment_date: "",
  notes: ""
};

export default function Commissions() {
  const { t, isRtl } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const { toast } = useToast();

  // Supabase Queries
  const { data: commissionsData, isLoading } = useSupabaseCollection<Commission>('commissions');
  const commissions = commissionsData || [];

  const { data: policiesData } = useSupabaseCollection<Policy>('policies');
  const policies = policiesData || [];

  const { data: insurersData } = useSupabaseCollection<any>('insurance_companies');
  const insurers = insurersData || [];
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedCommission(null);
  };

  const handleEdit = (commission: Commission) => {
    setSelectedCommission(commission);
    setFormData({
      policy_number: commission.policy_number || "",
      policy_id: commission.policy_id || "",
      client_company_name: commission.client_company_name || "",
      client_company_id: commission.client_company_id || "",
      insurer_name: commission.insurer_name || "",
      insurer_id: commission.insurer_id || "",
      commission_rate: (commission.commission_rate || "").toString(),
      premium_amount: (commission.premium_amount || "").toString(),
      expected_commission: (commission.expected_commission || "").toString(),
      accrued_commission: commission.accrued_commission || 0,
      paid_commission: commission.paid_commission || 0,
      commission_status: commission.commission_status || "expected",
      period_start: commission.period_start || "",
      period_end: commission.period_end || "",
      payment_date: commission.payment_date || "",
      notes: commission.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload = {
          policy_number: formData.policy_number,
          policy_id: formData.policy_id || null,
          client_company_name: formData.client_company_name,
          client_company_id: formData.client_company_id || null,
          insurer_name: formData.insurer_name,
          insurer_id: formData.insurer_id || null,
          commission_rate: parseFloat(formData.commission_rate) || 0,
          premium_amount: parseFloat(formData.premium_amount) || 0,
          expected_commission: parseFloat(formData.expected_commission) || 0,
          accrued_commission: parseFloat(formData.accrued_commission) || 0,
          paid_commission: parseFloat(formData.paid_commission) || 0,
          commission_status: formData.commission_status || "expected",
          period_start: formData.period_start || null,
          period_end: formData.period_end || null,
          payment_date: formData.payment_date || null,
          notes: formData.notes || "",
          created_at: selectedCommission?.created_at || new Date().toISOString()
        };

        if (selectedCommission) {
            const { error } = await supabase
              .from("commissions")
              .update(payload)
              .eq("id", selectedCommission.id);

            if (error) throw error;
            toast({ title: t('commissionUpdated') || "Commission updated successfully" });
        } else {
            const { error } = await supabase
              .from("commissions")
              .insert(sanitizeUUIDs(payload));

            if (error) throw error;
            toast({ title: t('commissionCreated') || "Commission record created successfully" });
        }
        queryClient.invalidateQueries({ queryKey: ['supabase', 'commissions'] });
        setDialogOpen(false);
        resetForm();
    } catch(error: any) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedCommission) {
        try {
            const { error } = await supabase
              .from("commissions")
              .delete()
              .eq("id", selectedCommission.id);

            if (error) throw error;
            toast({ title: t('commissionDeleted') || "Commission deleted successfully" });
            queryClient.invalidateQueries({ queryKey: ['supabase', 'commissions'] });
        } catch (error: any) {
            console.error("Error deleting document: ", error);
            toast({ title: "An error occurred while deleting.", description: error.message, variant: "destructive" });
        }
    }
    setDeleteDialogOpen(false);
    setSelectedCommission(null);
  }

  // Calculate totals
  const totalExpected = commissions.reduce((sum, c) => sum + (parseFloat(c.expected_commission as any) || 0), 0);
  const totalAccrued = commissions.reduce((sum, c) => sum + (parseFloat(c.accrued_commission as any) || 0), 0);
  const totalPaid = commissions.reduce((sum, c) => sum + (parseFloat(c.paid_commission as any) || 0), 0);
  const totalPending = totalExpected - totalPaid;

  const columns = [
    {
      header: t('policies'),
      accessorKey: "policy_number",
      cell: ({row}: any) => {
        const commission = row.original as Commission;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">{commission.policy_number}</p>
              <p className="text-sm text-muted-foreground">{commission.client_company_name}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: t('insurers'),
      accessorKey: "insurer_name",
    },
    {
      header: t('premiumAmount') || "Premium",
      accessorKey: "premium_amount",
      cell: ({row}: any) => (
        <span className="font-medium">{t('egp')} {(row.original.premium_amount || 0).toLocaleString()}</span>
      )
    },
    {
      header: t('commissionRate') || "Rate",
      accessorKey: "commission_rate",
      cell: ({row}: any) => (
        <div className="flex items-center gap-1">
          <Percent className="w-4 h-4 text-slate-400" />
          <span>{row.original.commission_rate || 0}%</span>
        </div>
      )
    },
    {
      header: t('expectedCommission') || "Expected",
      accessorKey: "expected_commission",
      cell: ({row}: any) => (
        <span className="font-medium text-success">{t('egp')} {(row.original.expected_commission || 0).toLocaleString()}</span>
      )
    },
    {
      header: t('paidCommission') || "Paid",
      accessorKey: "paid_commission",
      cell: ({row}: any) => (
        <span className="text-muted-foreground">{t('egp')} {(row.original.paid_commission || 0).toLocaleString()}</span>
      )
    },
    {
      header: t('status'),
      accessorKey: "commission_status",
      cell: ({row}: any) => <StatusBadge status={row.original.commission_status} />
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({row}: any) => {
        const commission = row.original as Commission;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(commission); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedCommission(commission);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )
      }
    }
  ];

  const table = useReactTable({
      data: commissions,
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
        title={t('commissions')}
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel={t('addCommission')}
        ActionIcon={PiggyBank}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t('totalExpected') || "Total Expected"}
          value={`${t('egp')} ${(totalExpected / 1000).toFixed(0)}K`}
          icon={PiggyBank}
          color="bg-primary"
          loading={isLoading}
        />
        <StatCard
          title={t('totalAccrued') || "Total Accrued"}
          value={`${t('egp')} ${(totalAccrued / 1000).toFixed(0)}K`}
          icon={PiggyBank}
          color="bg-orange-500"
          loading={isLoading}
        />
        <StatCard
          title={t('totalPaid') || "Total Paid"}
          value={`${t('egp')} ${(totalPaid / 1000).toFixed(0)}K`}
          icon={PiggyBank}
          color="bg-success/100"
          loading={isLoading}
        />
        <StatCard
          title={t('pending') || "Pending"}
          value={`${t('egp')} ${(totalPending / 1000).toFixed(0)}K`}
          icon={PiggyBank}
          color="bg-violet-500"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {commissions.length === 0 && !isLoading ? (
            <EmptyState
              icon={PiggyBank}
              title={t('noCommissionsYet') || "No commissions yet"}
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel={t('addCommission')}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder={t('searchPlaceholder') || "Search..."}
              onRowClick={handleEdit}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedCommission ? t('edit') || "Edit Commission" : t('addCommission')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('policies')} *</Label>
              <Select 
                value={formData.policy_id} 
                onValueChange={(v) => {
                  const policy = policies.find((p:Policy) => p.id === v);
                  if(policy) {
                    setFormData({ 
                      ...formData, 
                      policy_id: v,
                      policy_number: policy.policy_number || "",
                      client_company_name: policy.client_company_name || "",
                      client_company_id: policy.client_company_id || "",
                      insurer_name: policy.insurer_name || "",
                      premium_amount: (policy.premium_total || "").toString()
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPolicy') || "Select policy"} />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p: Policy) => (
                    <SelectItem key={p.id} value={p.id}>{p.policy_number} - {p.client_company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('insurers')} *</Label>
              <Select 
                value={formData.insurer_id} 
                onValueChange={(v) => {
                  const insurer = insurers.find(i => i.id === v);
                  setFormData({ 
                    ...formData, 
                    insurer_id: v,
                    insurer_name: insurer?.companyName || insurer?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectInsurer') || "Select insurer"} />
                </SelectTrigger>
                <SelectContent>
                  {insurers.map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>{i.companyName || i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('premiumAmount') || "Premium Amount"} ({t('egp')})</Label>
              <Input
                type="number"
                value={formData.premium_amount}
                onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                placeholder="Policy premium"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('commissionRate') || "Commission Rate"} (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                placeholder="e.g., 7.5"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('expectedCommission') || "Expected Commission"} ({t('egp')}) *</Label>
              <Input
                type="number"
                value={formData.expected_commission}
                onChange={(e) => setFormData({ ...formData, expected_commission: e.target.value })}
                placeholder="Expected amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('accruedCommission') || "Accrued Commission"} ({t('egp')})</Label>
              <Input
                type="number"
                value={formData.accrued_commission}
                onChange={(e) => setFormData({ ...formData, accrued_commission: e.target.value })}
                placeholder="Accrued amount"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('paidCommission') || "Paid Commission"} ({t('egp')})</Label>
              <Input
                type="number"
                value={formData.paid_commission}
                onChange={(e) => setFormData({ ...formData, paid_commission: e.target.value })}
                placeholder="Paid amount"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select value={formData.commission_status} onValueChange={(v) => setFormData({ ...formData, commission_status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus') || "Select status"} />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('periodStart') || "Period Start"}</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('periodEnd') || "Period End"}</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('paymentDate') || "Payment Date"}</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
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
              {selectedCommission ? t('save') : t('create')}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCommission') || "Delete Commission"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteCommission') || "Are you sure you want to delete this commission record? This action cannot be undone."}
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
    </div>
  );
}
