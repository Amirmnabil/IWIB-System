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
import { useToast } from "@/lib/hooks/use-toast";
import { sampleInvoices } from "@/lib/data";
import type { Payment, Invoice } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { formatCompactNumber } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";

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
  const { t, isRtl, lang } = useI18n();
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
      toast({ title: t('paymentUpdatedSuccessfully' as any) || "Payment updated successfully" });
    } else {
      toast({ title: t('paymentRecordedSuccessfully' as any) || "Payment recorded successfully" });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    toast({ title: t('paymentDeletedSuccessfully' as any) || "Payment deleted successfully" });
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
      header: t('payment' as any) || "Payment",
      accessorKey: "payment_number",
      cell: ({row}: any) => {
        const payment = row.original as Payment;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">{payment.payment_number}</p>
              <p className="text-sm text-muted-foreground">{payment.payment_method?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: t('client' as any) || "Client",
      accessorKey: "client_company_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>{row.original.client_company_name || '-'}</span>
        </div>
      )
    },
    {
      header: t('invoice' as any) || "Invoice",
      accessorKey: "invoice_number",
    },
    {
      header: t('amount' as any) || "Amount",
      accessorKey: "amount",
      cell: ({row}: any) => (
        <span className="font-medium text-success">{formatCompactNumber(row.original.amount || 0)}</span>
      )
    },
    {
      header: t('date' as any) || "Date",
      accessorKey: "payment_date",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{row.original.payment_date ? format(new Date(row.original.payment_date), lang === 'ar' ? 'dd-MM-yyyy' : 'MMM d, yyyy') : '-'}</span>
        </div>
      )
    },
    {
      header: t('reference' as any) || "Reference",
      accessorKey: "reference_number",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-400" />
          <span className="text-sm">{row.original.reference_number || '-'}</span>
        </div>
      )
    },
    {
      header: t('status') || "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      id: "actions",
      header: t('action' as any) || "Actions",
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
              className="text-destructive hover:text-red-700"
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
        title={t('payments' as any) || "Payments"}
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel={t('recordPayment' as any) || "Record Payment"}
        ActionIcon={CreditCard}
      />
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t('totalReceived' as any) || "Total Received"}
          value={formatCompactNumber(totalReceived)}
          icon={DollarSign}
          color="bg-success/100"
          loading={isLoading}
        />
        <StatCard
          title={t('pending' as any) || "Pending"}
          value={formatCompactNumber(pendingPayments)}
          icon={DollarSign}
          color="bg-orange-500"
          loading={isLoading}
        />
        <StatCard
          title={t('thisMonth' as any) || "This Month"}
          value={formatCompactNumber(thisMonth)}
          icon={DollarSign}
          color="bg-primary"
          loading={isLoading}
        />
      </div>
      <Card>
        <CardContent className="p-6">
          {payments.length === 0 && !isLoading ? (
            <EmptyState
              icon={CreditCard}
              title={t('noPaymentsYet' as any) || "No payments yet"}
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel={t('recordPayment' as any) || "Record Payment"}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder={t('searchPayments' as any) || "Search payments..."}
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
        title={selectedPayment ? (t('editPayment' as any) || "Edit Payment") : (t('recordPayment' as any) || "Record Payment")}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('paymentNumber' as any) || "Payment Number"} *</Label>
              <Input
                value={formData.payment_number}
                onChange={(e) => setFormData({ ...formData, payment_number: e.target.value })}
                placeholder="PAY-2024-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('relatedInvoice' as any) || "Related Invoice"}</Label>
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
                  <SelectValue placeholder={t('selectInvoicePlaceholder' as any) || "Select invoice"} />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((i: Invoice) => (
                    <SelectItem key={i.id} value={i.id}>{i.invoice_number} - {i.client_company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('paymentDate' as any) || "Payment Date"} *</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('amount' as any) || "Amount"} *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={t('amount' as any) || "Payment amount"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('paymentMethod' as any) || "Payment Method"}</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectMethodPlaceholder' as any) || "Select method"} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('referenceNumber' as any) || "Reference Number"}</Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Check/Transfer reference"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('bankName' as any) || "Bank Name"}</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('status') || "Status"}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatusPlaceholder' as any) || "Select status"} />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('receivedBy' as any) || "Received By"}</Label>
              <Input
                value={formData.received_by_name}
                onChange={(e) => setFormData({ ...formData, received_by_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('notes' as any) || "Notes"}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel' as any) || "Cancel"}
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-indigo-700"
            >
              {selectedPayment ? (t('update' as any) || "Update") : (t('record' as any) || "Record")}
            </Button>
          </div>
        </form>
      </FormDialog>
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deletePayment' as any) || "Delete Payment"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deletePaymentConfirm' as any) || "Are you sure you want to delete payment"} "{selectedPayment?.payment_number}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel' as any) || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete' as any) || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
