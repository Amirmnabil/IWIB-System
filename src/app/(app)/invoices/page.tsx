'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { Receipt, Building2, Calendar, Edit, Trash2 } from "lucide-react";
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
import { sampleInvoices, sampleCompanies, samplePolicies } from "@/lib/data";
import type { Invoice, Company, Policy } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

const INVOICE_TYPES = ["premium", "endorsement", "commission", "other"];
const INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "cancelled"];

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
  amount_paid: 0,
  status: "draft",
  payment_terms: "",
  notes: ""
};

export default function Invoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();

  const invoices = sampleInvoices;
  const companies = sampleCompanies;
  const policies = samplePolicies;
  const isLoading = false;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

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
      amount_due: (invoice.amount_due || "").toString(),
      amount_paid: invoice.amount_paid || 0,
      status: invoice.status || "draft",
      payment_terms: invoice.payment_terms || "",
      notes: invoice.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInvoice) {
      toast({ title: "Invoice updated successfully" });
    } else {
      toast({ title: "Invoice created successfully" });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    toast({ title: "Invoice deleted successfully" });
    setDeleteDialogOpen(false);
    setSelectedInvoice(null);
  }

  const columns = [
    {
      header: "Invoice",
      accessorKey: "invoice_number",
      cell: ({row}: any) => {
        const invoice = row.original as Invoice;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
              <p className="text-sm text-slate-500 capitalize">{invoice.invoice_type}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Client",
      accessorKey: "client_company_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>{row.original.client_company_name}</span>
        </div>
      )
    },
    {
      header: "Amount",
      accessorKey: "amount_due",
      cell: ({row}: any) => {
        const invoice = row.original as Invoice;
        return (
          <div>
            <p className="font-medium">EGP {(invoice.amount_due || 0).toLocaleString()}</p>
            <div className="w-24 mt-1">
              <Progress 
                value={invoice.amount_due > 0 ? ((invoice.amount_paid || 0) / invoice.amount_due) * 100 : 0} 
                className="h-1.5" 
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Paid: EGP {(invoice.amount_paid || 0).toLocaleString()}
            </p>
          </div>
        )
      }
    },
    {
      header: "Issue Date",
      accessorKey: "issue_date",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{row.original.issue_date ? format(new Date(row.original.issue_date), 'MMM d, yyyy') : '-'}</span>
        </div>
      )
    },
    {
      header: "Due Date",
      accessorKey: "due_date",
      cell: ({row}: any) => (
        <span className={row.original.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
          {row.original.due_date ? format(new Date(row.original.due_date), 'MMM d, yyyy') : '-'}
        </span>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => {
        const invoice = row.original as Invoice;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(invoice); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
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

  const table = useReactTable({
      data: invoices,
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
    <div>
      <PageHeader
        title="Invoices"
        
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Create Invoice"
        ActionIcon={Receipt}
      />

      <Card>
        <CardContent className="p-6">
          {invoices.length === 0 && !isLoading ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Create Invoice"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search invoices..."
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
        title={selectedInvoice ? "Edit Invoice" : "Create Invoice"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Number *</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="INV-2024-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Type</Label>
              <Select value={formData.invoice_type} onValueChange={(v) => setFormData({ ...formData, invoice_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client Company *</Label>
              <Select 
                value={formData.client_company_id} 
                onValueChange={(v) => {
                  const company = companies.find((c: Company) => c.id === v);
                  if (company) {
                    setFormData({ 
                      ...formData, 
                      client_company_id: v,
                      client_company_name: company.name || ""
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c: Company) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
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
                      ...formData, 
                      policy_id: v,
                      policy_number: policy.policy_number || ""
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p: Policy) => (
                    <SelectItem key={p.id} value={p.id}>{p.policy_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Due (EGP) *</Label>
              <Input
                type="number"
                value={formData.amount_due}
                onChange={(e) => setFormData({ ...formData, amount_due: e.target.value })}
                placeholder="Total amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid (EGP)</Label>
              <Input
                type="number"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value as any })}
                placeholder="Paid amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="Net 30, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {selectedInvoice ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
