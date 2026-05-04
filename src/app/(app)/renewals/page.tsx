
'use client';
import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { ClipboardList, Calendar, DollarSign, TrendingUp, TrendingDown, Edit, Trash2, Bell } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase, addDoc, collection, deleteDoc, doc, updateDoc } from "@/firebase";
import type { Renewal, Policy, User as AppUser } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

const RENEWAL_STATUSES = ["upcoming", "preparing_proposal", "proposal_sent", "negotiating", "renewed", "lost"];

const emptyForm: Omit<Renewal, 'id' | 'created_at'> = {
  policy_number: "",
  policy_id: "",
  client_company_name: "",
  client_company_id: "",
  current_premium: 0,
  proposed_premium: 0,
  renewal_term_start: "",
  renewal_term_end: "",
  renewal_status: "upcoming",
  renewal_probability: 0,
  assigned_user_name: "",
  notes: ""
};

export default function Renewals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<Renewal | null>(null);
  const [formData, setFormData] = useState<Omit<Renewal, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const firestore = useFirestore();

  const renewalsRef = useMemoFirebase(() => collection(firestore!, 'renewals'), [firestore]);
  const { data: renewalsData, isLoading } = useCollection<Renewal>(renewalsRef);
  const renewals = renewalsData || [];
  
  const policiesRef = useMemoFirebase(() => collection(firestore!, 'policies'), [firestore]);
  const { data: policiesData } = useCollection<Policy>(policiesRef);
  const policies = policiesData || [];
  
  const usersRef = useMemoFirebase(() => collection(firestore!, 'users'), [firestore]);
  const { data: usersData } = useCollection<AppUser>(usersRef);
  const users = usersData || [];
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedRenewal(null);
  };

  const handleEdit = (renewal: Renewal) => {
    setSelectedRenewal(renewal);
    setFormData({
      policy_number: renewal.policy_number || "",
      policy_id: renewal.policy_id || "",
      client_company_name: renewal.client_company_name || "",
      client_company_id: renewal.client_company_id || "",
      current_premium: renewal.current_premium || 0,
      proposed_premium: renewal.proposed_premium || 0,
      renewal_term_start: renewal.renewal_term_start || "",
      renewal_term_end: renewal.renewal_term_end || "",
      renewal_status: renewal.renewal_status || "upcoming",
      renewal_probability: renewal.renewal_probability || 0,
      assigned_user_name: renewal.assigned_user_name || "",
      notes: renewal.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    try {
      const renewalData = { ...formData, created_at: selectedRenewal?.created_at || new Date().toISOString() };
      if (selectedRenewal) {
        await updateDoc(doc(firestore, "renewals", selectedRenewal.id), renewalData);
        toast({ title: "Renewal updated successfully" });
      } else {
        await addDoc(collection(firestore, "renewals"), renewalData);
        toast({ title: "Renewal created successfully" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error submitting renewal:", error);
      toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedRenewal && firestore) {
      try {
        await deleteDoc(doc(firestore, "renewals", selectedRenewal.id));
        toast({ title: "Renewal deleted successfully" });
      } catch (error) {
        console.error("Error deleting renewal:", error);
        toast({ title: "An error occurred while deleting.", variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedRenewal(null);
  }

  // Stats
  const upcomingCount = renewals.filter(r => ['upcoming', 'preparing_proposal', 'proposal_sent', 'negotiating'].includes(r.renewal_status)).length;
  const renewedCount = renewals.filter(r => r.renewal_status === 'renewed').length;
  const lostCount = renewals.filter(r => r.renewal_status === 'lost').length;
  const renewalRate = (renewedCount + lostCount) > 0 ? ((renewedCount / (renewedCount + lostCount)) * 100) || 0 : 0;

  const columns = [
    {
      header: "Policy",
      accessorKey: "policy_number",
      cell: ({row}: any) => {
        const renewal = row.original as Renewal;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              renewal.renewal_status === 'renewed' ? 'bg-emerald-100' :
              renewal.renewal_status === 'lost' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <ClipboardList className={`w-5 h-5 ${
                renewal.renewal_status === 'renewed' ? 'text-emerald-600' :
                renewal.renewal_status === 'lost' ? 'text-red-600' : 'text-amber-600'
              }`} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{renewal.policy_number}</p>
              <p className="text-sm text-slate-500">{renewal.client_company_name}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Renewal Date",
      accessorKey: "renewal_term_start",
      cell: ({row}: any) => {
        const renewal = row.original as Renewal;
        const daysLeft = renewal.renewal_term_start ? differenceInDays(new Date(renewal.renewal_term_start), new Date()) : null;
        return (
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{renewal.renewal_term_start ? format(new Date(renewal.renewal_term_start), 'MMM d, yyyy') : '-'}</span>
            </div>
            {daysLeft !== null && daysLeft >= 0 && (
              <p className={`text-xs mt-1 ${daysLeft <= 30 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                {daysLeft} days left
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: "Current Premium",
      accessorKey: "current_premium",
      cell: ({row}: any) => (
        <span className="font-medium">EGP {(row.original.current_premium || 0).toLocaleString()}</span>
      )
    },
    {
      header: "Proposed",
      accessorKey: "proposed_premium",
      cell: ({row}: any) => {
        const renewal = row.original as Renewal;
        const change = renewal.premium_change_percent || 0;
        return (
          <div>
            <span className="font-medium">EGP {(renewal.proposed_premium || 0).toLocaleString()}</span>
            {change !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${change > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change.toFixed(1)}%
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Probability",
      accessorKey: "renewal_probability",
      cell: ({row}: any) => (
        <div className="w-20">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>{row.original.renewal_probability || 0}%</span>
          </div>
          <Progress value={row.original.renewal_probability || 0} className="h-1.5" />
        </div>
      )
    },
    {
      header: "Status",
      accessorKey: "renewal_status",
      cell: ({row}: any) => <StatusBadge status={row.original.renewal_status} />
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => {
        const renewal = row.original as Renewal;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(renewal); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedRenewal(renewal);
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
      data: renewals,
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
        title="Renewals"
        description="Track policy renewals and retention"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Renewal"
        ActionIcon={ClipboardList}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Renewals"
          value={upcomingCount}
          icon={Bell}
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          title="Renewed"
          value={renewedCount}
          icon={ClipboardList}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Lost"
          value={lostCount}
          icon={ClipboardList}
          color="bg-red-500"
          loading={isLoading}
        />
        <StatCard
          title="Renewal Rate"
          value={`${renewalRate.toFixed(0)}%`}
          icon={TrendingUp}
          color="bg-indigo-500"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {renewals.length === 0 && !isLoading ? (
            <EmptyState
              icon={ClipboardList}
              title="No renewals yet"
              description="Start by adding renewal records for your policies."
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add Renewal"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search renewals..."
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
        title={selectedRenewal ? "Edit Renewal" : "Add Renewal"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      client_company_name: policy.client_company_name || "",
                      current_premium: policy.premium_total || 0,
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
              <Label>Status</Label>
              <Select value={formData.renewal_status} onValueChange={(v) => setFormData({ ...formData, renewal_status: v as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {RENEWAL_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Premium (EGP)</Label>
              <Input
                type="number"
                value={formData.current_premium}
                onChange={(e) => setFormData({ ...formData, current_premium: Number(e.target.value) })}
                placeholder="Current premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Proposed Premium (EGP)</Label>
              <Input
                type="number"
                value={formData.proposed_premium}
                onChange={(e) => setFormData({ ...formData, proposed_premium: Number(e.target.value) })}
                placeholder="Proposed premium"
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal Term Start *</Label>
              <Input
                type="date"
                value={formData.renewal_term_start}
                onChange={(e) => setFormData({ ...formData, renewal_term_start: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal Term End *</Label>
              <Input
                type="date"
                value={formData.renewal_term_end}
                onChange={(e) => setFormData({ ...formData, renewal_term_end: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.renewal_probability}
                onChange={(e) => setFormData({ ...formData, renewal_probability: Number(e.target.value) })}
                placeholder="0-100"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={formData.assigned_user_name} onValueChange={(v) => setFormData({ ...formData, assigned_user_name: v })}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                      {users.map(u => (
                          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
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
              {selectedRenewal ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Renewal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this renewal record? This action cannot be undone.
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
