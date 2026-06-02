'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { CreditCard, Building2, Calendar, DollarSign, Edit, Trash2, Hash } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { sampleInvoices } from "@/lib/data";
import type { Payment, Invoice } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { formatCompactNumber } from "@/lib/utils";

const PAYMENT_METHODS = ["bank_transfer", "check", "cash", "credit_card", "online"];
const STATUSES = ["pending", "confirmed", "failed", "refunded"];

const emptyForm = {
  payment_number: "",
  invoice_id: "",
  invoice_number: "",
  policy_number: "",
  client_company_name: "",
  payment_date: "",
  amount: "",
  payment_method: "bank_transfer",
  reference_number: "",
  bank_name: "",
  status: "pending",
  received_by_name: "",
  notes: ""
};

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();

  const payments: Payment[] = [];
  const invoices = sampleInvoices;
  const isLoading = false;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedPayment(null);
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormData({
      payment_number: payment.payment_number || "",
      invoice_id: payment.invoice_id || "",
      invoice_number: payment.invoice_number || "",
      policy_number: payment.policy_number || "",
      client_company_name: payment.client_company_name || "",
      payment_date: payment.payment_date || "",
      amount: (payment.amount || "").toString(),
      payment_method: payment.payment_method || "bank_transfer",
      reference_number: payment.reference_number || "",
      bank_name: payment.bank_name || "",
      status: payment.status || "pending",
      received_by_name: payment.received_by_name || "",
      notes: payment.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayment) {
      toast({ title: "Payment updated successfully" });
    } else {
      toast({ title: "Payment recorded successfully" });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    toast({ title: "Payment deleted successfully" });
    setDeleteDialogOpen(false);
    setSelectedPayment(null);
  }

  // Stats
  const totalReceived = payments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);
  const thisMonth = payments.filter(p => {
    const paymentDate = new Date(p.payment_date);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + (p.amount || 0), 0);

  const columns = [
    {
      header: "Payment",
      accessorKey: "payment_number",
      cell: ({row}: any) => {
        const payment = row.original as Payment;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{payment.payment_number}</p>
              <p className="text-sm text-slate-500">{payment.payment_method?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: "Client",
      accessorKey: "client_company_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>{row.original.client_company_name || '-'}</span>
        </div>
      )
    },
    {
      header: "Invoice",
      accessorKey: "invoice_number",
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: ({row}: any) => (
        <span className="font-medium text-emerald-600">{formatCompactNumber(row.original.amount || 0)}</span>
      )
    },
    {
      header: "Date",
      accessorKey: "payment_date",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{row.original.payment_date ? format(new Date(row.original.payment_date), 'MMM d, yyyy') : '-'}</span>
        </div>
      )
    },
    {
      header: "Reference",
      accessorKey: "reference_number",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-400" />
          <span className="text-sm">{row.original.reference_number || '-'}</span>
        </div>
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
        const payment = row.original as Payment;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(payment); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedPayment(payment);
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
      data: payments,
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
        title="Payments"
        
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Record Payment"
        ActionIcon={CreditCard}
      />
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Received"
          value={formatCompactNumber(totalReceived)}
          icon={DollarSign}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Pending"
          value={formatCompactNumber(pendingPayments)}
          icon={DollarSign}
          color="bg-orange-500"
          loading={isLoading}
        />
        <StatCard
          title="This Month"
          value={formatCompactNumber(thisMonth)}
          icon={DollarSign}
          color="bg-blue-600"
          loading={isLoading}
        />
      </div>
      <Card>
        <CardContent className="p-6">
          {payments.length === 0 && !isLoading ? (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Record Payment"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search payments..."
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
        title={selectedPayment ? "Edit Payment" : "Record Payment"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Number *</Label>
              <Input
                value={formData.payment_number}
                onChange={(e) => setFormData({ ...formData, payment_number: e.target.value })}
                placeholder="PAY-2024-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Related Invoice</Label>
              <Select 
                value={formData.invoice_id} 
                onValueChange={(v) => {
                  const invoice = invoices.find((i: Invoice) => i.id === v);
                  if (invoice) {
                    setFormData({ 
                      ...formData, 
                      invoice_id: v,
                      invoice_number: invoice.invoice_number || "",
                      client_company_name: invoice.client_company_name || "",
                      policy_number: invoice.policy_number || ""
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((i: Invoice) => (
                    <SelectItem key={i.id} value={i.id}>{i.invoice_number} - {i.client_company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Payment amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Check/Transfer reference"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Received By</Label>
              <Input
                value={formData.received_by_name}
                onChange={(e) => setFormData({ ...formData, received_by_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
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
              {selectedPayment ? "Update" : "Record"}
            </Button>
          </div>
        </form>
      </FormDialog>
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete payment "{selectedPayment?.payment_number}"?
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
