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
        toast({ title: "Invoice updated successfully" });
      } else {
        await supabase.from('invoices').insert({ ...payload, created_at: new Date().toISOString() });
        toast({ title: "Invoice created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error saving invoice", description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    try {
      await supabase.from('invoices').delete().eq('id', selectedInvoice.id);
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      toast({ title: "Invoice deleted successfully" });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error deleting invoice", description: err.message });
    }
    setDeleteDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handleSyncOldPolicies = async () => {
    setIsSyncing(true);
    toast({ title: "Syncing...", description: "Generating invoices for all policies." });
    try {
      const { count } = await generateInvoicesForAllPolicies();
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      toast({ title: "Sync Complete", description: `Processed ${count} new invoices.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Sync Failed", description: e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const createColumns = () => [
    {
      header: "Invoice",
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
      header: "Client / Insurer",
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
      header: "Breakdown",
      accessorKey: "amount_due",
      cell: ({ row }: any) => {
        const invoice = row.original as Invoice;
        return (
          <div className="text-sm">
            <div className="flex justify-between items-center gap-4 mb-1 border-b border-slate-100 pb-1">
              <span className="text-muted-foreground text-xs">Net</span>
              <span className="font-medium">{formatCompactNumber(invoice.net_amount || invoice.amount_due || 0)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 mb-1 border-b border-slate-100 pb-1">
              <span className="text-muted-foreground text-xs">Tax</span>
              <span className="font-medium text-amber-600">+{formatCompactNumber(invoice.tax_amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 font-bold text-indigo-700">
              <span className="text-xs">Gross</span>
              <span>{formatCompactNumber(invoice.gross_amount || invoice.amount_due || 0)}</span>
            </div>
          </div>
        )
      }
    },
    {
      header: "Payment Progress",
      accessorKey: "amount_paid",
      cell: ({ row }: any) => {
        const invoice = row.original as Invoice;
        const total = invoice.gross_amount || invoice.amount_due || 0;
        const paid = invoice.amount_paid || 0;
        const pct = total > 0 ? (paid / total) * 100 : 0;
        return (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-emerald-600">{formatCompactNumber(paid)} Paid</span>
              <span className="text-muted-foreground">{formatCompactNumber(total - paid)} Left</span>
            </div>
            <Progress value={pct} className="h-1.5 bg-slate-100" />
          </div>
        )
      }
    },
    {
      header: "Due Date",
      accessorKey: "due_date",
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-1">
          <span className={row.original.status === 'overdue' ? 'text-destructive font-medium text-sm' : 'text-sm'}>
            {row.original.due_date ? format(new Date(row.original.due_date), 'MMM d, yyyy') : '-'}
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
          title="No invoices found"
          onAction={() => { resetForm(); setDialogOpen(true); }}
          actionLabel="Create Invoice"
        />
      );
    }

    return (
      <DataTable
        table={table}
        columns={createColumns()}
        isLoading={isLoading}
        searchPlaceholder="Search invoices..."
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
          title="Invoice Engine"
          onAction={() => { resetForm(); setDialogOpen(true); }}
          actionLabel="Create Invoice"
          ActionIcon={Receipt}
        />
        <Button variant="outline" onClick={handleSyncOldPolicies} disabled={isSyncing} className="shadow-sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          Sync All Policies
        </Button>
      </div>

      <Tabs defaultValue="premium" className="w-full">
        <TabsList className="bg-white border shadow-sm p-1 h-auto mb-6">
          <TabsTrigger value="premium" className="px-6 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 rounded-md">
            <Layers className="w-4 h-4 mr-2" />
            Contract Value Invoices
            <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">{premiumInvoices.length}</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="px-6 py-2.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 rounded-md">
            <PieChart className="w-4 h-4 mr-2" />
            Commission Invoices
            <span className="ml-2 bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs">{commissionInvoices.length}</span>
          </TabsTrigger>
          <TabsTrigger value="sharing" className="px-6 py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-md">
            <DollarSign className="w-4 h-4 mr-2" />
            Sharing Invoices
            <span className="ml-2 bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-full text-xs">{sharingInvoices.length}</span>
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
        title={selectedInvoice ? "Edit Invoice" : "Create Invoice"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 col-span-1">
              <h3 className="font-semibold text-sm border-b pb-2">General Details</h3>
              <div className="space-y-2">
                <Label>Invoice Number *</Label>
                <Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Invoice Type</Label>
                <Select value={formData.invoice_type} onValueChange={(v) => setFormData({ ...formData, invoice_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Related Policy</Label>
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
                  <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                  <SelectContent>
                    {policies.map((p: Policy) => <SelectItem key={p.id} value={p.id}>{p.policy_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 col-span-1 md:col-span-2">
              <h3 className="font-semibold text-sm border-b pb-2">Financial Breakdown</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Net Amount</Label>
                  <Input type="number" step="0.01" value={formData.net_amount} onChange={(e) => setFormData({ ...formData, net_amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tax Amount</Label>
                  <Input type="number" step="0.01" value={formData.tax_amount} onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Gross Amount (Total Due) *</Label>
                  <Input type="number" step="0.01" value={formData.gross_amount} onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value, amount_due: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid</Label>
                  <Input type="number" step="0.01" value={formData.amount_paid} onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Calculation notes or additional info..." rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700">{selectedInvoice ? "Update Invoice" : "Create Invoice"}</Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice "{selectedInvoice?.invoice_number}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
