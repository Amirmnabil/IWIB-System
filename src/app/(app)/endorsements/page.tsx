'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { FileText, Calendar, Edit, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { samplePolicies } from "@/lib/data";
import type { Endorsement, Policy } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

const ENDORSEMENT_TYPES = ["addition", "deletion", "correction", "upgrade", "downgrade", "reinstatement"];
const STATUSES = ["pending", "approved", "applied", "rejected"];

const emptyForm = {
  endorsement_number: "",
  policy_id: "",
  policy_number: "",
  client_company_name: "",
  endorsement_type: "addition",
  effective_date: "",
  members_added: 0,
  members_deleted: 0,
  premium_adjustment: "",
  details: "",
  status: "pending",
  requested_by_name: "",
  notes: ""
};

export default function Endorsements() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEndorsement, setSelectedEndorsement] = useState<Endorsement | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();

  const endorsements: Endorsement[] = [];
  const isLoading = false;
  const policies = samplePolicies;

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedEndorsement(null);
  };

  const handleEdit = (endorsement: Endorsement) => {
    setSelectedEndorsement(endorsement);
    setFormData({
      endorsement_number: endorsement.endorsement_number || "",
      policy_id: endorsement.policy_id || "",
      policy_number: endorsement.policy_number || "",
      client_company_name: endorsement.client_company_name || "",
      endorsement_type: endorsement.endorsement_type || "addition",
      effective_date: endorsement.effective_date || "",
      members_added: endorsement.members_added || 0,
      members_deleted: endorsement.members_deleted || 0,
      premium_adjustment: (endorsement.premium_adjustment || "").toString(),
      details: endorsement.details || "",
      status: endorsement.status || "pending",
      requested_by_name: endorsement.requested_by_name || "",
      notes: endorsement.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEndorsement) {
      toast({ title: "Endorsement updated successfully" });
    } else {
      toast({ title: "Endorsement created successfully" });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    toast({ title: "Endorsement deleted successfully" });
    setDeleteDialogOpen(false);
    setSelectedEndorsement(null);
  }

  const columns = [
    {
      header: "Endorsement",
      accessorKey: "endorsement_number",
      cell: ({row}: any) => {
        const endorsement = row.original as Endorsement;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              endorsement.endorsement_type === 'addition' ? 'bg-emerald-100' :
              endorsement.endorsement_type === 'deletion' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <FileText className={`w-5 h-5 ${
                endorsement.endorsement_type === 'addition' ? 'text-emerald-600' :
                endorsement.endorsement_type === 'deletion' ? 'text-red-600' : 'text-amber-600'
              }`} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{endorsement.endorsement_number || 'N/A'}</p>
              <p className="text-sm text-slate-500">{endorsement.policy_number}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Type",
      accessorKey: "endorsement_type",
      cell: ({row}: any) => <StatusBadge status={row.original.endorsement_type} />
    },
    {
      header: "Client",
      accessorKey: "client_company_name",
    },
    {
      header: "Effective Date",
      accessorKey: "effective_date",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{row.original.effective_date ? format(new Date(row.original.effective_date), 'MMM d, yyyy') : '-'}</span>
        </div>
      )
    },
    {
      header: "Members",
      accessorKey: "members_added",
      cell: ({row}: any) => {
        const endorsement = row.original as Endorsement;
        const membersAdded = endorsement.members_added || 0;
        const membersDeleted = endorsement.members_deleted || 0;
        return (
          <div className="text-sm">
            {membersAdded > 0 && <span className="text-emerald-600">+{membersAdded}</span>}
            {membersAdded > 0 && membersDeleted > 0 && ' / '}
            {membersDeleted > 0 && <span className="text-red-600">-{membersDeleted}</span>}
            {membersAdded === 0 && membersDeleted === 0 && '-'}
          </div>
        )
      }
    },
    {
      header: "Premium Adj.",
      accessorKey: "premium_adjustment",
      cell: ({row}: any) => {
        const endorsement = row.original as Endorsement;
        const adjustment = endorsement.premium_adjustment || 0;
        return adjustment !== 0 ? (
          <span className={adjustment > 0 ? 'text-emerald-600' : 'text-red-600'}>
            {adjustment > 0 ? '+' : ''}EGP {adjustment.toLocaleString()}
          </span>
        ) : '-'
      }
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
        const endorsement = row.original as Endorsement;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(endorsement); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedEndorsement(endorsement);
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
      data: endorsements,
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
        title="Endorsements"
        description="Manage policy endorsements and changes"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Endorsement"
        ActionIcon={FileText}
      />

      <Card>
        <CardContent className="p-6">
          {endorsements.length === 0 && !isLoading ? (
            <EmptyState
              icon={FileText}
              title="No endorsements yet"
              description="Start by creating your first endorsement."
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add Endorsement"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search endorsements..."
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
        title={selectedEndorsement ? "Edit Endorsement" : "Add Endorsement"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Endorsement Number</Label>
              <Input
                value={formData.endorsement_number}
                onChange={(e) => setFormData({ ...formData, endorsement_number: e.target.value })}
                placeholder="END-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Policy *</Label>
              <Select 
                value={formData.policy_id} 
                onValueChange={(v) => {
                  const policy = policies.find((p: Policy) => p.id === v);
                  if (policy) {
                    setFormData({ 
                      ...formData, 
                      policy_id: v,
                      policy_number: policy.policy_number || "",
                      client_company_name: policy.client_company_name || ""
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p: Policy) => (
                    <SelectItem key={p.id} value={p.id}>{p.policy_number} - {p.client_company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Endorsement Type *</Label>
              <Select value={formData.endorsement_type} onValueChange={(v) => setFormData({ ...formData, endorsement_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENDORSEMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Effective Date *</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Members Added</Label>
              <Input
                type="number"
                value={formData.members_added}
                onChange={(e) => setFormData({ ...formData, members_added: e.target.value as any })}
              />
            </div>
            <div className="space-y-2">
              <Label>Members Deleted</Label>
              <Input
                type="number"
                value={formData.members_deleted}
                onChange={(e) => setFormData({ ...formData, members_deleted: e.target.value as any})}
              />
            </div>
            <div className="space-y-2">
              <Label>Premium Adjustment (EGP)</Label>
              <Input
                type="number"
                value={formData.premium_adjustment}
                onChange={(e) => setFormData({ ...formData, premium_adjustment: e.target.value })}
                placeholder="Can be positive or negative"
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
              <Label>Requested By</Label>
              <Input
                value={formData.requested_by_name}
                onChange={(e) => setFormData({ ...formData, requested_by_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder="Endorsement details..."
              rows={3}
            />
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
              {selectedEndorsement ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Endorsement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this endorsement? This action cannot be undone.
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
