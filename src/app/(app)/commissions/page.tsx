
'use client';
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
import { useToast } from "@/hooks/use-toast";
import type { Commission, Policy, InsuranceCompany } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useCollection, useFirestore, useMemoFirebase, addDoc, collection, deleteDoc, doc, updateDoc } from "@/firebase";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const { toast } = useToast();
  const firestore = useFirestore();

  const commissionsRef = useMemoFirebase(() => collection(firestore!, 'commissions'), [firestore]);
  const policiesRef = useMemoFirebase(() => collection(firestore!, 'policies'), [firestore]);
  const insurersRef = useMemoFirebase(() => collection(firestore!, 'insurance_companies'), [firestore]);

  const { data: commissionsData, isLoading } = useCollection<Commission>(commissionsRef);
  const commissions = commissionsData || [];
  const { data: policiesData } = useCollection<Policy>(policiesRef);
  const policies = policiesData || [];
  const { data: insurersData } = useCollection<InsuranceCompany>(insurersRef);
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
    if (!firestore) return;
    try {
        const commissionData = { ...formData, created_at: selectedCommission?.created_at || new Date().toISOString() };
        if (selectedCommission) {
            await updateDoc(doc(firestore, "commissions", selectedCommission.id), commissionData);
            toast({ title: "Commission updated successfully" });
        } else {
            await addDoc(collection(firestore, "commissions"), commissionData);
            toast({ title: "Commission record created successfully" });
        }
        setDialogOpen(false);
        resetForm();
    } catch(error) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedCommission && firestore) {
        try {
            await deleteDoc(doc(firestore, "commissions", selectedCommission.id));
            toast({ title: "Commission deleted successfully" });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: "An error occurred while deleting.", variant: "destructive" });
        }
    }
    setDeleteDialogOpen(false);
    setSelectedCommission(null);
  }

  // Calculate totals
  const totalExpected = commissions.reduce((sum, c) => sum + (c.expected_commission || 0), 0);
  const totalAccrued = commissions.reduce((sum, c) => sum + (c.accrued_commission || 0), 0);
  const totalPaid = commissions.reduce((sum, c) => sum + (c.paid_commission || 0), 0);
  const totalPending = totalExpected - totalPaid;

  const columns = [
    {
      header: "Policy",
      accessorKey: "policy_number",
      cell: ({row}: any) => {
        const commission = row.original as Commission;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{commission.policy_number}</p>
              <p className="text-sm text-slate-500">{commission.client_company_name}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Insurer",
      accessorKey: "insurer_name",
    },
    {
      header: "Premium",
      accessorKey: "premium_amount",
      cell: ({row}: any) => (
        <span className="font-medium">EGP {(row.original.premium_amount || 0).toLocaleString()}</span>
      )
    },
    {
      header: "Rate",
      accessorKey: "commission_rate",
      cell: ({row}: any) => (
        <div className="flex items-center gap-1">
          <Percent className="w-4 h-4 text-slate-400" />
          <span>{row.original.commission_rate || 0}%</span>
        </div>
      )
    },
    {
      header: "Expected",
      accessorKey: "expected_commission",
      cell: ({row}: any) => (
        <span className="font-medium text-emerald-600">EGP {(row.original.expected_commission || 0).toLocaleString()}</span>
      )
    },
    {
      header: "Paid",
      accessorKey: "paid_commission",
      cell: ({row}: any) => (
        <span className="text-slate-600">EGP {(row.original.paid_commission || 0).toLocaleString()}</span>
      )
    },
    {
      header: "Status",
      accessorKey: "commission_status",
      cell: ({row}: any) => <StatusBadge status={row.original.commission_status} />
    },
    {
      id: "actions",
      header: "Actions",
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
              className="text-red-600 hover:text-red-700"
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
        title="Commissions"
        description="Track commission earnings and payments"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Commission"
        ActionIcon={PiggyBank}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Expected"
          value={`EGP ${(totalExpected / 1000).toFixed(0)}K`}
          icon={PiggyBank}
          color="bg-indigo-500"
          loading={isLoading}
        />
        <StatCard
          title="Total Accrued"
          value={`EGP ${(totalAccrued / 1000).toFixed(0)}K`}
          icon={PiggyBank}
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          title="Total Paid"
          value={`EGP ${(totalPaid / 1000).toFixed(0)}K`}
          icon={PiggyBank}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Pending"
          value={`EGP ${(totalPending / 1000).toFixed(0)}K`}
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
              title="No commissions yet"
              description="Start by adding commission records for your policies."
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add Commission"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search commissions..."
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
        title={selectedCommission ? "Edit Commission" : "Add Commission"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Policy *</Label>
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
                      insurer_name: policy.insurer_name || "",
                      premium_amount: (policy.premium_total || "").toString()
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
              <Label>Insurer *</Label>
              <Select 
                value={formData.insurer_id} 
                onValueChange={(v) => {
                  const insurer = insurers.find(i => i.id === v);
                  setFormData({ 
                    ...formData, 
                    insurer_id: v,
                    insurer_name: insurer?.companyName || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select insurer" />
                </SelectTrigger>
                <SelectContent>
                  {insurers.map((i: InsuranceCompany) => (
                    <SelectItem key={i.id} value={i.id}>{i.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Premium Amount (EGP)</Label>
              <Input
                type="number"
                value={formData.premium_amount}
                onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                placeholder="Policy premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                placeholder="e.g., 7.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Commission (EGP) *</Label>
              <Input
                type="number"
                value={formData.expected_commission}
                onChange={(e) => setFormData({ ...formData, expected_commission: e.target.value })}
                placeholder="Expected amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Accrued Commission (EGP)</Label>
              <Input
                type="number"
                value={formData.accrued_commission}
                onChange={(e) => setFormData({ ...formData, accrued_commission: e.target.value as any })}
                placeholder="Accrued amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Paid Commission (EGP)</Label>
              <Input
                type="number"
                value={formData.paid_commission}
                onChange={(e) => setFormData({ ...formData, paid_commission: e.target.value as any })}
                placeholder="Paid amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.commission_status} onValueChange={(v) => setFormData({ ...formData, commission_status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
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
              {selectedCommission ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Commission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this commission record? This action cannot be undone.
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
