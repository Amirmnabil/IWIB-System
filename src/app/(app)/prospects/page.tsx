
'use client';
import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Briefcase, Building2, Calendar, DollarSign, User, Edit, Trash2, Percent } from "lucide-react";
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
import { useI18n } from "@/components/i18n-context";
import type { Prospect, Company, User as AppUser } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useCollection, useFirestore, useMemoFirebase, addDoc, collection, deleteDoc, doc, updateDoc } from "@/firebase";

const emptyForm: Omit<Prospect, 'id' | 'created_at'> = {
  company_name: "",
  company_id: "",
  lead_id: "",
  pipeline_stage: "qualification",
  probability: 0,
  estimated_value: 0,
  expected_close_date: "",
  assigned_user_name: "",
  assigned_user_id: "",
  current_insurer: "",
  current_tpa: "",
  requested_products: [],
  notes: ""
};

export default function Prospects() {
  const { t, isRtl } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [formData, setFormData] = useState<Omit<Prospect, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const firestore = useFirestore();

  const prospectsRef = useMemoFirebase(() => collection(firestore!, 'prospects'), [firestore]);
  const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);
  const usersRef = useMemoFirebase(() => collection(firestore!, 'users'), [firestore]);

  // Master Data
  const stagesRef = useMemoFirebase(() => collection(firestore!, 'master_pipeline_stages'), [firestore]);
  const { data: pipelineStagesData } = useCollection<any>(stagesRef);
  const pipelineStages = pipelineStagesData || [];

  const productsRef = useMemoFirebase(() => collection(firestore!, 'master_product_types'), [firestore]);
  const { data: productsData } = useCollection<any>(productsRef);
  const products = productsData || [];

  const { data: prospectsData, isLoading } = useCollection<Prospect>(prospectsRef);
  const { data: companiesData } = useCollection<Company>(companiesRef);
  const { data: usersData } = useCollection<AppUser>(usersRef);

  const prospects = prospectsData || [];
  const companies = companiesData || [];
  const users = usersData || [];
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedProspect(null);
  };

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setFormData({
      company_name: prospect.company_name || "",
      company_id: prospect.company_id || "",
      lead_id: prospect.lead_id || "",
      pipeline_stage: prospect.pipeline_stage || "qualification",
      probability: prospect.probability || 0,
      estimated_value: prospect.estimated_value || 0,
      expected_close_date: prospect.expected_close_date || "",
      assigned_user_name: prospect.assigned_user_name || "",
      assigned_user_id: prospect.assigned_user_id || "",
      current_insurer: prospect.current_insurer || "",
      current_tpa: prospect.current_tpa || "",
      requested_products: prospect.requested_products || [],
      notes: prospect.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    try {
        const prospectData = { ...formData, created_at: selectedProspect?.created_at || new Date().toISOString() };
        
        if (selectedProspect) {
            const prospectRef = doc(firestore, "prospects", selectedProspect.id);
            await updateDoc(prospectRef, prospectData);
            toast({ title: t('prospectUpdated') || "Prospect updated successfully" });
        } else {
            await addDoc(collection(firestore, "prospects"), prospectData);
            toast({ title: t('prospectCreated') || "Prospect created successfully" });
        }

        setDialogOpen(false);
        resetForm();
    } catch(error) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedProspect && firestore) {
        try {
            const prospectRef = doc(firestore, "prospects", selectedProspect.id);
            await deleteDoc(prospectRef);
            toast({ title: t('prospectDeleted') || "Prospect deleted successfully" });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: "An error occurred while deleting.", variant: "destructive" });
        }
    }
    setDeleteDialogOpen(false);
    setSelectedProspect(null);
  }

  const columns = [
    {
      header: t('companies'),
      accessorKey: "company_name",
      cell: ({row}: any) => {
        const prospect = row.original as Prospect;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{prospect.company_name}</p>
              <p className="text-sm text-slate-500">{prospect.current_insurer || 'No current insurer'}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: t('status'),
      accessorKey: "pipeline_stage",
      cell: ({row}: any) => <StatusBadge status={row.original.pipeline_stage} />
    },
    {
      header: t('estimatedValue') || "Value",
      accessorKey: "estimated_value",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{row.original.estimated_value ? `${t('egp')} ${Number(row.original.estimated_value).toLocaleString()}` : '-'}</span>
        </div>
      )
    },
    {
      header: t('probability') || "Probability",
      accessorKey: "probability",
      cell: ({row}: any) => (
        <div className="w-20">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{row.original.probability || 0}%</span>
          </div>
          <Progress value={row.original.probability || 0} className="h-1.5" />
        </div>
      )
    },
    {
      header: t('expectedCloseDate') || "Close Date",
      accessorKey: "expected_close_date",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{row.original.expected_close_date ? format(new Date(row.original.expected_close_date), 'MMM d, yyyy') : '-'}</span>
        </div>
      )
    },
    {
      header: t('assignedTo') || "Assigned To",
      accessorKey: "assigned_user_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <span>{row.original.assigned_user_name || '-'}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({row}: any) => {
        const prospect = row.original as Prospect;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(prospect); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProspect(prospect);
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
      data: prospects,
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
        title={t('prospects')}
        
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel={t('addProspect')}
      />

      <Card>
        <CardContent className="p-6">
          {prospects.length === 0 && !isLoading ? (
            <EmptyState
              icon={Briefcase}
              title={t('noProspectsYet') || "No prospects yet"}
              
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder={t('searchPlaceholder') || "Search..."}
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
        title={selectedProspect ? t('edit') || "Edit Prospect" : t('addProspect')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('companies')} *</Label>
              {selectedProspect ? (
                <Input value={formData.company_name} readOnly disabled />
              ) : (
                <Select 
                  value={formData.company_id} 
                  onValueChange={(v) => {
                    const company = companies.find(c => c.id === v);
                    setFormData({ ...formData, company_id: v, company_name: company?.name || "" });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={t('selectClient')} /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('pipelineStage') || "Pipeline Stage"} *</Label>
              <Select value={formData.pipeline_stage} onValueChange={(v) => setFormData({ ...formData, pipeline_stage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus') || "Select stage"} />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map(s => (
                    <SelectItem key={s.id} value={s.code?.toLowerCase() || s.name.toLowerCase()}>{s.name}</SelectItem>
                  ))}
                  {pipelineStages.length === 0 && <SelectItem value="qualification">{t('qualification') || "Qualification"}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('estimatedValue') || "Estimated Value"} ({t('egp')})</Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                placeholder="Deal value"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('probability') || "Probability"} (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                placeholder="0-100"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('expectedCloseDate') || "Expected Close Date"}</Label>
              <Input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('assignedTo') || "Assigned To"}</Label>
              <Select value={formData.assigned_user_name} onValueChange={(v) => setFormData({ ...formData, assigned_user_name: v })}>
                  <SelectTrigger>
                      <SelectValue placeholder={t('selectUser')} />
                  </SelectTrigger>
                  <SelectContent>
                      {users.map(u => (
                          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('currentInsurer') || "Current Insurer"}</Label>
              <Input
                value={formData.current_insurer}
                onChange={(e) => setFormData({ ...formData, current_insurer: e.target.value })}
                placeholder="Current insurance company"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('currentTpa') || "Current TPA"}</Label>
              <Input
                value={formData.current_tpa}
                onChange={(e) => setFormData({ ...formData, current_tpa: e.target.value })}
                placeholder="Current TPA"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('requestedProducts') || "Requested Products"}</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {products.map(product => (
                <label key={product.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.requested_products.includes(product.name)}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setFormData((prev: any) => ({
                        ...prev,
                        requested_products: checked
                          ? [...prev.requested_products, product.name]
                          : prev.requested_products.filter((p: string) => p !== product.name)
                      }));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{product.name}</span>
                </label>
              ))}
              {products.length === 0 && (
                <p className="text-xs text-slate-400 italic">No products defined in Master Data.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('internalNotes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {selectedProspect ? t('save') : t('create')}
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProspect') || "Delete Prospect"}</AlertDialogTitle>
            <AlertDialogDescription>
              {(t('confirmDeleteProspect') || 'Are you sure you want to delete the prospect for "{name}"? This action cannot be undone.').replace('{name}', selectedProspect?.company_name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
