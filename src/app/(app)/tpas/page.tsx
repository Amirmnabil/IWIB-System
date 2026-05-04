
'use client';
import React, { useState, useEffect, useRef } from "react";
import { Heart, Globe, Mail, Clock, Edit, Trash2 } from "lucide-react";
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
import { sampleTPAs } from "@/lib/data";
import type { TPA, InsuranceCompany } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useCollection, useFirestore, useMemoFirebase, addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from "@/firebase";

const emptyForm: Omit<TPA, 'id' | 'created_at'> = {
  name: "",
  code: "",
  primary_contact_name: "",
  primary_contact_email: "",
  primary_contact_phone: "",
  portal_url: "",
  sla_approval_hours: 0,
  sla_response_hours: 0,
  network_strength_score: 0,
  associated_insurers: [],
  status: "active",
  address: "",
  notes: ""
};

export default function TPAs() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTPA, setSelectedTPA] = useState<TPA | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const { toast } = useToast();
  const firestore = useFirestore();
  const hasSeeded = useRef(false);

  const tpasRef = useMemoFirebase(() => collection(firestore!, 'tpas'), [firestore]);
  const insurersRef = useMemoFirebase(() => collection(firestore!, 'insurance_companies'), [firestore]);

  const { data: tpasData, isLoading } = useCollection<TPA>(tpasRef);
  const { data: insurersData } = useCollection<InsuranceCompany>(insurersRef);
  
  const tpas = tpasData || [];
  const insurers = insurersData || [];
  
  useEffect(() => {
    if (!isLoading && tpas.length === 0 && firestore && !hasSeeded.current) {
      hasSeeded.current = true;
      const seedData = async () => {
        try {
          const batch = writeBatch(firestore);
          sampleTPAs.forEach(tpa => {
            const docRef = doc(collection(firestore, 'tpas'));
            batch.set(docRef, tpa);
          });
          await batch.commit();
          toast({ title: "TPAs seeded", description: "Sample data has been added to Firestore." });
        } catch (error) {
          console.error("Error seeding TPAs:", error);
          toast({ title: "Seeding failed", variant: 'destructive' });
        }
      };
      seedData();
    }
  }, [isLoading, tpas, firestore, toast]);

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')


  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedTPA(null);
  };

  const handleEdit = (tpa: TPA) => {
    setSelectedTPA(tpa);
    setFormData({
      name: tpa.name || "",
      code: tpa.code || "",
      primary_contact_name: tpa.primary_contact_name || "",
      primary_contact_email: tpa.primary_contact_email || "",
      primary_contact_phone: tpa.primary_contact_phone || "",
      portal_url: tpa.portal_url || "",
      sla_approval_hours: (tpa.sla_approval_hours || "").toString(),
      sla_response_hours: (tpa.sla_response_hours || "").toString(),
      network_strength_score: (tpa.network_strength_score || "").toString(),
      associated_insurers: tpa.associated_insurers || [],
      status: tpa.status || "active",
      address: tpa.address || "",
      notes: tpa.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    try {
        const tpaData = { ...formData, created_at: selectedTPA?.created_at || new Date().toISOString() };
        if (selectedTPA) {
            await updateDoc(doc(firestore, "tpas", selectedTPA.id), tpaData);
            toast({ title: "TPA updated successfully" });
        } else {
            await addDoc(collection(firestore, "tpas"), tpaData);
            toast({ title: "TPA created successfully" });
        }
        setDialogOpen(false);
        resetForm();
    } catch(error) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedTPA && firestore) {
        try {
            await deleteDoc(doc(firestore, "tpas", selectedTPA.id));
            toast({ title: "TPA deleted successfully" });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: "An error occurred while deleting.", variant: "destructive" });
        }
    }
    setDeleteDialogOpen(false);
    setSelectedTPA(null);
  }

  const columns = [
    {
      header: "TPA",
      accessorKey: "name",
      cell: ({row}: any) => {
        const tpa = row.original as TPA;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{tpa.name}</p>
              <p className="text-sm text-slate-500">{tpa.code}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: "Network Score",
      accessorKey: "network_strength_score",
      cell: ({row}: any) => (
        <div className="w-24">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{row.original.network_strength_score || 0}/10</span>
          </div>
          <Progress value={(row.original.network_strength_score || 0) * 10} className="h-2" />
        </div>
      )
    },
    {
      header: "SLA",
      accessorKey: "sla_approval_hours",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{row.original.sla_approval_hours || '-'}h approval</span>
        </div>
      )
    },
    {
      header: "Portal",
      accessorKey: "portal_url",
      cell: ({row}: any) => row.original.portal_url ? (
        <a 
          href={row.original.portal_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
          onClick={(e) => e.stopPropagation()}
        >
          <Globe className="w-4 h-4" />
          Portal
        </a>
      ) : '-'
    },
    {
      header: "Contact",
      accessorKey: "primary_contact_email",
      cell: ({row}: any) => {
        const tpa = row.original as TPA;
        return (
          <div className="space-y-1">
            {tpa.primary_contact_name && (
              <p className="text-sm font-medium">{tpa.primary_contact_name}</p>
            )}
            {tpa.primary_contact_email && (
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Mail className="w-3 h-3" />
                {tpa.primary_contact_email}
              </div>
            )}
          </div>
        )
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => {
        const tpa = row.original as TPA;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(tpa); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedTPA(tpa);
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
      data: tpas,
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
        title="TPA Companies"
        description="Manage Third Party Administrators"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add TPA"
        ActionIcon={Heart}
      />

      <Card>
        <CardContent className="p-6">
          {tpas.length === 0 && !isLoading ? (
            <EmptyState
              icon={Heart}
              title="No TPAs yet"
              description="Start by adding your first Third Party Administrator."
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add TPA"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search TPAs..."
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
        title={selectedTPA ? "Edit TPA" : "Add TPA"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>TPA Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="TPA company name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Short code"
              />
            </div>
            <div className="space-y-2">
              <Label>Portal URL</Label>
              <Input
                value={formData.portal_url}
                onChange={(e) => setFormData({ ...formData, portal_url: e.target.value })}
                placeholder="https://portal.tpa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SLA - Approval Time (hours)</Label>
              <Input
                type="number"
                value={formData.sla_approval_hours}
                onChange={(e) => setFormData({ ...formData, sla_approval_hours: e.target.value })}
                placeholder="e.g., 24"
              />
            </div>
            <div className="space-y-2">
              <Label>SLA - Response Time (hours)</Label>
              <Input
                type="number"
                value={formData.sla_response_hours}
                onChange={(e) => setFormData({ ...formData, sla_response_hours: e.target.value })}
                placeholder="e.g., 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Network Strength Score (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.network_strength_score}
                onChange={(e) => setFormData({ ...formData, network_strength_score: e.target.value })}
                placeholder="1-10"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-slate-900 mb-4">Primary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.primary_contact_name}
                  onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.primary_contact_email}
                  onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                  placeholder="email@tpa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.primary_contact_phone}
                  onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Associated Insurers</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {insurers.map(insurer => (
                <label key={insurer.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.associated_insurers.includes(insurer.companyName)}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setFormData((prev: any) => ({
                        ...prev,
                        associated_insurers: checked 
                          ? [...prev.associated_insurers, insurer.companyName] 
                          : prev.associated_insurers.filter((i: string) => i !== insurer.companyName)
                      }));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{insurer.companyName}</span>
                </label>
              ))}
              {insurers.length === 0 && (
                <p className="text-sm text-slate-500 col-span-2 text-center py-4">No insurers available</p>
              )}
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
              {selectedTPA ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete TPA</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTPA?.name}"? This action cannot be undone.
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
