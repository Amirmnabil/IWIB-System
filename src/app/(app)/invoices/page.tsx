'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { Receipt, Building2, Calendar, Edit, Trash2, Layers, DollarSign, PieChart, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/lib/hooks/use-toast";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from '@tanstack/react-query';
import type { Invoice, Company, Policy } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { formatCompactNumber } from "@/lib/utils";
import { generateInvoicesForAllPolicies } from "@/lib/invoiceUtils";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

const INVOICE_TYPES = ["premium", "commission", "sharing", "other"];
const INVOICE_STATUSES = ["draft", "issued", "partial", "paid", "cancelled"];

const emptyForm = {
  invoice_number: "",
  client_company_name: "",
  client_company_id: "",
  policy_number: "",
  policy_id: "",
  invoice_type: "premium",
  issue_date: "",
  due_date: "",
  amount_due: "",
  net_amount: "",
  tax_amount: "",
  gross_amount: "",
  amount_paid: 0,
  status: "draft",
  payment_terms: "",
  notes: ""
};

export default function Invoices() {
  const { t, isRtl, lang } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoicesData, isLoading } = useSupabaseCollection<Invoice>('invoices');
  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const { data: policiesData } = useSupabaseCollection<Policy>('policies');

  const invoices = invoicesData || [];
  const companies = companiesData || [];
  const policies = policiesData || [];

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const premiumInvoices = invoices.filter(i => i.invoice_type === 'premium');
  const commissionInvoices = invoices.filter(i => i.invoice_type === 'commission');
  const sharingInvoices = invoices.filter(i => i.invoice_type === 'sharing');

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedInvoice(null);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      invoice_number: invoice.invoice_number || "",
      client_company_name: invoice.client_company_name || "",
      client_company_id: invoice.client_company_id || "",
      policy_number: invoice.policy_number || "",
      policy_id: invoice.policy_id || "",
      invoice_type: invoice.invoice_type || "premium",
      issue_date: invoice.issue_date || "",
      due_date: invoice.due_date || "",
      amount_due: (invoice.amount_due || 0).toString(),
      net_amount: (invoice.net_amount || 0).toString(),
      tax_amount: (invoice.tax_amount || 0).toString(),
      gross_amount: (invoice.gross_amount || 0).toString(),
      amount_paid: invoice.amount_paid || 0,
      status: invoice.status || "draft",
      payment_terms: invoice.payment_terms || "",
      notes: invoice.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount_due: Number(formData.amount_due),
        net_amount: Number(formData.net_amount),
        tax_amount: Number(formData.tax_amount),
        gross_amount: Number(formData.gross_amount),
        amount_paid: Number(formData.amount_paid)
      };

      if (selectedInvoice) {
        await supabase.from('invoices').update(payload).eq('id', selectedInvoice.id);
        toast({ title: t('invoiceUpdatedSuccessfully' as any) || "Invoice updated successfully" });
      } else {
        await supabase.from('invoices').insert({ ...payload, created_at: new Date().toISOString() });
        toast({ title: t('invoiceCreatedSuccessfully' as any) || "Invoice created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('syncFailed' as any) || "Error saving invoice", description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    try {
      await supabase.from('invoices').delete().eq('id', selectedInvoice.id);
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      toast({ title: t('invoiceDeletedSuccessfully' as any) || "Invoice deleted successfully" });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('syncFailed' as any) || "Error deleting invoice", description: err.message });
    }
    setDeleteDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handleSyncOldPolicies = async () => {
    setIsSyncing(true);
    toast({ title: t('syncing' as any) || "Syncing...", description: t('generatingInvoicesForPolicies' as any) || "Generating invoices for all policies." });
    try {
      const { count } = await generateInvoicesForAllPolicies();
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      toast({ title: t('syncComplete' as any) || "Sync Complete", description: `${t('processed' as any) || "Processed"} ${count} ${t('newInvoices' as any) || "new invoices"}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('syncFailed' as any) || "Sync Failed", description: e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const createColumns = () => [
    {
      header: t('invoice' as any) || "Invoice",
      accessorKey: "invoice_number",
      cell: ({ row }: any) => {
        const invoice = row.original as Invoice;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">{invoice.invoice_number}</p>
              <p className="text-xs text-muted-foreground">{invoice.policy_number}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: t('clientInsurer' as any) || "Client / Insurer",
      accessorKey: "client_company_name",
      cell: ({ row }: any) => (
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.original.client_company_name || '-'}</span>
          </div>
          {row.original.insurer_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span>{row.original.insurer_name}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: t('breakdown' as any) || "Breakdown",
      accessorKey: "amount_due",
      cell: ({ row }: any) => {
        const invoice = row.original as Invoice;
        return (
          <div className="text-sm">
            <div className="flex justify-between items-center gap-4 mb-1 border-b border-slate-100 pb-1">
              <span className="text-muted-foreground text-xs">{t('net' as any) || "Net"}</span>
              <span className="font-medium">{formatCompactNumber(invoice.net_amount || invoice.amount_due || 0)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 mb-1 border-b border-slate-100 pb-1">
              <span className="text-muted-foreground text-xs">{t('tax' as any) || "Tax"}</span>
              <span className="font-medium text-amber-600">+{formatCompactNumber(invoice.tax_amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 font-bold text-indigo-700">
              <span className="text-xs">{t('gross' as any) || "Gross"}</span>
              <span>{formatCompactNumber(invoice.gross_amount || invoice.amount_due || 0)}</span>
            </div>
          </div>
        )
      }
    },
    {
      header: t('paymentProgress' as any) || "Payment Progress",
      accessorKey: "amount_paid",
      cell: ({ row }: any) => {
        const invoice = row.original as Invoice;
        const total = invoice.gross_amount || invoice.amount_due || 0;
        const paid = invoice.amount_paid || 0;
        const pct = total > 0 ? (paid / total) * 100 : 0;
        return (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-emerald-600">{formatCompactNumber(paid)} {t('paid' as any) || "Paid"}</span>
              <span className="text-muted-foreground">{formatCompactNumber(total - paid)} {t('left' as any) || "Left"}</span>
            </div>
            <Progress value={pct} className="h-1.5 bg-slate-100" />
          </div>
        )
      }
    },
    {
      header: t('dueDate' as any) || "Due Date",
      accessorKey: "due_date",
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-1">
          <span className={row.original.status === 'overdue' ? 'text-destructive font-medium text-sm' : 'text-sm'}>
            {row.original.due_date ? format(new Date(row.original.due_date), lang === 'ar' ? 'dd-MM-yyyy' : 'MMM d, yyyy') : '-'}
          </span>
          <StatusBadge status={row.original.status} />
        </div>
      )
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const invoice = row.original as Invoice;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(invoice); }}>
              <Edit className="w-4 h-4 text-slate-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInvoice(invoice);
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

  const TableInstance = ({ data }: { data: Invoice[] }) => {
    const table = useReactTable({
      data,
      columns: createColumns(),
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      autoResetPageIndex: false,
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      onGlobalFilterChange: setGlobalFilter,
      getFilteredRowModel: getFilteredRowModel(),
      state: { sorting, globalFilter },
      initialState: { pagination: { pageSize: 10 } },
    });

    if (data.length === 0 && !isLoading) {
      return (
        <EmptyState
          icon={Receipt}
          title={t('noInvoicesFound' as any) || "No invoices found"}
          onAction={() => { resetForm(); setDialogOpen(true); }}
          actionLabel={t('createInvoice' as any) || "Create Invoice"}
        />
      );
    }

    return (
      <DataTable
        table={table}
        columns={createColumns()}
        isLoading={isLoading}
        searchPlaceholder={t('searchInvoices' as any) || "Search invoices..."}
        onRowClick={handleEdit}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t('invoiceEngine' as any) || "Invoice Engine"}
          onAction={() => { resetForm(); setDialogOpen(true); }}
          actionLabel={t('createInvoice' as any) || "Create Invoice"}
          ActionIcon={Receipt}
        />
        <Button variant="outline" onClick={handleSyncOldPolicies} disabled={isSyncing} className="shadow-sm">
          <RefreshCw className={cn("w-4 h-4", isSyncing ? "animate-spin" : "", isRtl ? "ml-2" : "mr-2")} />
          {t('syncAllPolicies' as any) || "Sync All Policies"}
        </Button>
      </div>

      <Tabs defaultValue="premium" className="w-full">
        <TabsList className="bg-white border shadow-sm p-1 h-auto mb-6 flex flex-wrap">
          <TabsTrigger value="premium" className="px-6 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 rounded-md">
            <Layers className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
            {t('contractValueInvoices' as any) || "Contract Value Invoices"}
            <span className={cn("bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs", isRtl ? "mr-2" : "ml-2")}>{premiumInvoices.length}</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="px-6 py-2.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 rounded-md">
            <PieChart className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
            {t('commissionInvoices' as any) || "Commission Invoices"}
            <span className={cn("bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs", isRtl ? "mr-2" : "ml-2")}>{commissionInvoices.length}</span>
          </TabsTrigger>
          <TabsTrigger value="sharing" className="px-6 py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-md">
            <DollarSign className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
            {t('sharingInvoices' as any) || "Sharing Invoices"}
            <span className={cn("bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-full text-xs", isRtl ? "mr-2" : "ml-2")}>{sharingInvoices.length}</span>
          </TabsTrigger>
        </TabsList>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <TabsContent value="premium" className="m-0 p-6">
              <TableInstance data={premiumInvoices} />
            </TabsContent>
            <TabsContent value="commission" className="m-0 p-6">
              <TableInstance data={commissionInvoices} />
            </TabsContent>
            <TabsContent value="sharing" className="m-0 p-6">
              <TableInstance data={sharingInvoices} />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedInvoice ? (t('editInvoice' as any) || "Edit Invoice") : (t('createInvoice' as any) || "Create Invoice")}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 col-span-1">
              <h3 className="font-semibold text-sm border-b pb-2">{t('generalDetails' as any) || "General Details"}</h3>
              <div className="space-y-2">
                <Label>{t('invoiceNumber' as any) || "Invoice Number"} *</Label>
                <Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('invoiceType' as any) || "Invoice Type"}</Label>
                <Select value={formData.invoice_type} onValueChange={(v) => setFormData({ ...formData, invoice_type: v })}>
                  <SelectTrigger><SelectValue placeholder={t('selectType' as any) || "Select type"} /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPES.map(tOption => <SelectItem key={tOption} value={tOption}>{tOption.charAt(0).toUpperCase() + tOption.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('relatedPolicy' as any) || "Related Policy"}</Label>
                <Select
                  value={formData.policy_id}
                  onValueChange={(v) => {
                    const policy = policies.find((p: Policy) => p.id === v);
                    if (policy) {
                      setFormData({
                        ...formData, policy_id: v, policy_number: policy.policy_number,
                        client_company_id: policy.client_company_id, client_company_name: policy.client_company_name,
                        insurer_id: policy.insurer_id, insurer_name: policy.insurer_name
                      });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={t('selectPolicy' as any) || "Select policy"} /></SelectTrigger>
                  <SelectContent>
                    {policies.map((p: Policy) => <SelectItem key={p.id} value={p.id}>{p.policy_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('status') || "Status"}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue placeholder={t('selectStatusPlaceholder' as any) || "Select status"} /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map(sOption => <SelectItem key={sOption} value={sOption}>{sOption.charAt(0).toUpperCase() + sOption.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 col-span-1 md:col-span-2">
              <h3 className="font-semibold text-sm border-b pb-2">{t('financialBreakdown' as any) || "Financial Breakdown"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('netAmount' as any) || "Net Amount"}</Label>
                  <Input type="number" step="0.01" value={formData.net_amount} onChange={(e) => setFormData({ ...formData, net_amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('taxAmount' as any) || "Tax Amount"}</Label>
                  <Input type="number" step="0.01" value={formData.tax_amount} onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('grossAmount' as any) || "Gross Amount (Total Due)"} *</Label>
                  <Input type="number" step="0.01" value={formData.gross_amount} onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value, amount_due: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('amountPaid' as any) || "Amount Paid"}</Label>
                  <Input type="number" step="0.01" value={formData.amount_paid} onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('issueDate' as any) || "Issue Date"}</Label>
                  <Input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('dueDate' as any) || "Due Date"}</Label>
                  <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Label>{t('notes' as any) || "Notes"}</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={t('calculationNotesPlaceholder' as any) || "Calculation notes or additional info..."} rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel' as any) || "Cancel"}</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700">{selectedInvoice ? (t('updateInvoice' as any) || "Update Invoice") : (t('createInvoice' as any) || "Create Invoice")}</Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteInvoice' as any) || "Delete Invoice"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteInvoiceConfirm' as any) || "Are you sure you want to delete invoice"} "{selectedInvoice?.invoice_number}"? {t('actionCannotBeUndone' as any) || "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel' as any) || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('delete' as any) || "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
