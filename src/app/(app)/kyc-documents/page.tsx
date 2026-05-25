
'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { FileCheck, Building2, Calendar, Edit, Trash2, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
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
import type { KYC, Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";

const DOCUMENT_TYPES = ["cr_copy", "tax_certificate", "id_copy", "passport", "bank_statement", "financial_statement", "authorization_letter", "other"];
const STATUSES = ["pending", "verified", "rejected", "expired"];

const emptyForm: Omit<KYC, 'id' | 'created_at'> = {
  company_name: "",
  company_id: "",
  contact_name: "",
  document_type: "cr_copy",
  document_number: "",
  file_url: "",
  expiry_date: "",
  status: "pending",
  verified_by_name: "",
  rejection_reason: "",
  notes: ""
};

export default function KYCDocuments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKYC, setSelectedKYC] = useState<KYC | null>(null);
  const [formData, setFormData] = useState<Omit<KYC, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const { data: kycDocsData, isLoading } = useSupabaseCollection<KYC>('kyc-documents');
  const kycDocs = kycDocsData || [];
  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const companies = companiesData || [];
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedKYC(null);
  };

  const handleEdit = (kyc: KYC) => {
    setSelectedKYC(kyc);
    setFormData({
      company_name: kyc.company_name || "",
      company_id: kyc.company_id || "",
      contact_name: kyc.contact_name || "",
      document_type: kyc.document_type || "cr_copy",
      document_number: kyc.document_number || "",
      file_url: kyc.file_url || "",
      expiry_date: kyc.expiry_date || "",
      status: kyc.status || "pending",
      verified_by_name: kyc.verified_by_name || "",
      rejection_reason: kyc.rejection_reason || "",
      notes: kyc.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const kycData = { ...formData, created_at: selectedKYC?.created_at || new Date().toISOString() };
        if (selectedKYC) {
            await supabase.from("kyc-documents").update(kycData).eq("id", selectedKYC.id);
            toast({ title: "KYC document updated successfully" });
        } else {
            await supabase.from("kyc-documents").insert(kycData);
            toast({ title: "KYC document added successfully" });
        }
        setDialogOpen(false);
        resetForm();
    } catch(error) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedKYC) {
        try {
            await supabase.from("kyc-documents").delete().eq("id", selectedKYC.id);
            toast({ title: "KYC document deleted successfully" });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: "An error occurred while deleting.", variant: "destructive" });
        }
    }
    setDeleteDialogOpen(false);
    setSelectedKYC(null);
  }

  // Stats
  const pendingCount = kycDocs.filter(k => k.status === 'pending').length;
  const verifiedCount = kycDocs.filter(k => k.status === 'verified').length;
  const expiredCount = kycDocs.filter(k => k.status === 'expired').length;
  const rejectedCount = kycDocs.filter(k => k.status === 'rejected').length;

  const columns = [
    {
      header: "Document",
      accessorKey: "document_type",
      cell: ({row}: any) => {
        const kyc = row.original as KYC;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              kyc.status === 'verified' ? 'bg-emerald-100' :
              kyc.status === 'rejected' ? 'bg-red-100' :
              kyc.status === 'expired' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              {kyc.status === 'verified' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : kyc.status === 'rejected' ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Clock className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-slate-900">{kyc.document_type?.replace(/_/g, ' ')}</p>
              <p className="text-sm text-slate-500">{kyc.document_number || '-'}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Company",
      accessorKey: "company_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>{row.original.company_name || row.original.contact_name || '-'}</span>
        </div>
      )
    },
    {
      header: "Expiry Date",
      accessorKey: "expiry_date",
      cell: ({row}: any) => {
        const kyc = row.original as KYC;
        const isExpired = kyc.expiry_date && new Date(kyc.expiry_date) < new Date();
        return (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className={isExpired ? 'text-red-600' : ''}>
              {kyc.expiry_date ? format(new Date(kyc.expiry_date), 'MMM d, yyyy') : '-'}
            </span>
          </div>
        );
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: "Verified By",
      accessorKey: "verified_by_name",
      cell: ({row}: any) => row.original.verified_by_name || '-'
    },
    {
      header: "File",
      accessorKey: "file_url",
      cell: ({row}: any) => row.original.file_url ? (
        <a 
          href={row.original.file_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
          View
        </a>
      ) : '-'
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => {
        const kyc = row.original as KYC;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(kyc); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedKYC(kyc);
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
      data: kycDocs,
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
        title="KYC Documents"
        
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Document"
        ActionIcon={FileCheck}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Review"
          value={pendingCount}
          icon={Clock}
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Verified"
          value={verifiedCount}
          icon={CheckCircle}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Expired"
          value={expiredCount}
          icon={Calendar}
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          icon={XCircle}
          color="bg-red-500"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {kycDocs.length === 0 && !isLoading ? (
            <EmptyState
              icon={FileCheck}
              title="No KYC documents yet"
              
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add Document"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search documents..."
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
        title={selectedKYC ? "Edit KYC Document" : "Add KYC Document"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select 
                value={formData.company_id} 
                onValueChange={(v) => {
                  const company = companies.find((c: Company) => c.id === v);
                  if (company) {
                    setFormData({ ...formData, company_id: v, company_name: company.name || "" });
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
              <Label>Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="If individual"
              />
            </div>
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Number</Label>
              <Input
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                placeholder="ID/CR number"
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
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
              <Label>File URL</Label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Verified By</Label>
              <Input
                value={formData.verified_by_name}
                onChange={(e) => setFormData({ ...formData, verified_by_name: e.target.value })}
              />
            </div>
          </div>

          {formData.status === 'rejected' && (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={formData.rejection_reason}
                onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                placeholder="Reason for rejection..."
                rows={2}
              />
            </div>
          )}

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
              {selectedKYC ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KYC Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this KYC document?
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
