
'use client';
import React, { useState } from "react";
import { FileText } from "lucide-react";
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
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import type { InsuranceCompany } from "@/lib/types";
import { useCollection, useFirestore, useMemoFirebase, collection } from "@/firebase";

const PRODUCT_TYPES = ["medical", "life", "dental", "optical"];
const BENEFIT_CLASSES = ["VIP", "A", "B", "C", "D"];
const NETWORK_TYPES = ["PPO", "HMO", "EPO", "POS"];

const emptyForm = {
  name: "",
  code: "",
  insurer_name: "",
  insurer_id: "",
  product_type: "medical",
  benefit_class: "",
  annual_limit: "",
  network_type: "",
  coverage_details: {
    inpatient_limit: "",
    outpatient_limit: "",
    maternity_limit: "",
    dental_limit: "",
    optical_limit: "",
    emergency_limit: ""
  },
  deductible: "",
  copay_percentage: "",
  waiting_period_days: "",
  exclusions: "",
  effective_from: "",
  effective_to: "",
  status: "active",
  notes: ""
};

export default function BenefitSchedules() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();
  const firestore = useFirestore();

  const schedules: any[] = [];
  
  const insurersRef = useMemoFirebase(() => collection(firestore!, 'insurance_companies'), [firestore]);
  const { data: insurersData, isLoading: insurersLoading } = useCollection<InsuranceCompany>(insurersRef);
  const insurers = insurersData || [];
  
  const isLoading = false;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedSchedule(null);
  };

  const handleEdit = (schedule: any) => {
    setSelectedSchedule(schedule);
    setFormData({
      name: schedule.name || "",
      code: schedule.code || "",
      insurer_name: schedule.insurer_name || "",
      insurer_id: schedule.insurer_id || "",
      product_type: schedule.product_type || "medical",
      benefit_class: schedule.benefit_class || "",
      annual_limit: schedule.annual_limit || "",
      network_type: schedule.network_type || "",
      coverage_details: schedule.coverage_details || emptyForm.coverage_details,
      deductible: schedule.deductible || "",
      copay_percentage: schedule.copay_percentage || "",
      waiting_period_days: schedule.waiting_period_days || "",
      exclusions: schedule.exclusions || "",
      effective_from: schedule.effective_from || "",
      effective_to: schedule.effective_to || "",
      status: schedule.status || "active",
      notes: schedule.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSchedule) {
      toast({ title: "Benefit schedule updated successfully" });
    } else {
      toast({ title: "Benefit schedule created successfully" });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    toast({ title: "Benefit schedule deleted successfully" });
    setDeleteDialogOpen(false);
    setSelectedSchedule(null);
  }

  const columns = [
    {
      header: "Schedule",
      accessorKey: "name",
      cell: ({row}: any) => {
        const schedule = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{schedule.name}</p>
              <p className="text-sm text-slate-500">{schedule.code}</p>
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
      header: "Product",
      accessorKey: "product_type",
      cell: ({row}: any) => <StatusBadge status={row.original.product_type} />
    },
    {
      header: "Class",
      accessorKey: "benefit_class",
      cell: ({row}: any) => row.original.benefit_class ? (
        <span className="font-medium">{row.original.benefit_class}</span>
      ) : '-'
    },
    {
      header: "Annual Limit",
      accessorKey: "annual_limit",
      cell: ({row}: any) => (
        <span className="font-medium">EGP {(row.original.annual_limit || 0).toLocaleString()}</span>
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
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
              <FileText className="w-4 h-4" />
            </Button>
          </div>
        )
      }
    }
  ];

  const table = useReactTable({
      data: schedules,
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
        title="Benefit Schedules"
        description="Manage benefit plans and coverage"
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Schedule"
        ActionIcon={FileText}
      />

      <Card>
        <CardContent className="p-6">
          {schedules.length === 0 && !isLoading ? (
            <EmptyState
              icon={FileText}
              title="No benefit schedules yet"
              description="Start by creating your first benefit schedule."
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel="Add Schedule"
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search schedules..."
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
        title={selectedSchedule ? "Edit Benefit Schedule" : "Add Benefit Schedule"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Schedule Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Insurer</Label>
              <Select 
                value={formData.insurer_id} 
                onValueChange={(v) => {
                  const insurer = insurers.find((i: InsuranceCompany) => i.id === v);
                  setFormData({ ...formData, insurer_id: v, insurer_name: insurer?.companyName || "" });
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
              <Label>Product Type *</Label>
              <Select value={formData.product_type} onValueChange={(v) => setFormData({ ...formData, product_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Benefit Class</Label>
              <Select value={formData.benefit_class} onValueChange={(v) => setFormData({ ...formData, benefit_class: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {BENEFIT_CLASSES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Network Type</Label>
              <Select value={formData.network_type} onValueChange={(v) => setFormData({ ...formData, network_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORK_TYPES.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Annual Limit (EGP)</Label>
              <Input
                type="number"
                value={formData.annual_limit}
                onChange={(e) => setFormData({ ...formData, annual_limit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deductible (EGP)</Label>
              <Input
                type="number"
                value={formData.deductible}
                onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Copay (%)</Label>
              <Input
                type="number"
                value={formData.copay_percentage}
                onChange={(e) => setFormData({ ...formData, copay_percentage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Waiting Period (days)</Label>
              <Input
                type="number"
                value={formData.waiting_period_days}
                onChange={(e) => setFormData({ ...formData, waiting_period_days: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective To</Label>
              <Input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-slate-900 mb-4">Coverage Limits (EGP)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Inpatient</Label>
                <Input
                  type="number"
                  value={formData.coverage_details.inpatient_limit}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    coverage_details: { ...formData.coverage_details, inpatient_limit: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Outpatient</Label>
                <Input
                  type="number"
                  value={formData.coverage_details.outpatient_limit}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    coverage_details: { ...formData.coverage_details, outpatient_limit: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Maternity</Label>
                <Input
                  type="number"
                  value={formData.coverage_details.maternity_limit}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    coverage_details: { ...formData.coverage_details, maternity_limit: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dental</Label>
                <Input
                  type="number"
                  value={formData.coverage_details.dental_limit}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    coverage_details: { ...formData.coverage_details, dental_limit: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Optical</Label>
                <Input
                  type="number"
                  value={formData.coverage_details.optical_limit}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    coverage_details: { ...formData.coverage_details, optical_limit: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency</Label>
                <Input
                  type="number"
                  value={formData.coverage_details.emergency_limit}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    coverage_details: { ...formData.coverage_details, emergency_limit: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Exclusions</Label>
            <Textarea
              value={formData.exclusions}
              onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
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
              {selectedSchedule ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Benefit Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSchedule?.name}"?
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
