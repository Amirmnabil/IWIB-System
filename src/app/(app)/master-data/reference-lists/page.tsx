
'use client';
import React, { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import {
  ListTree, Building2, MapPin, Layers,
  Plus, Edit, Trash2, CheckCircle2, AlertTriangle, Loader2,
  ChevronRight, Search, Activity, FileText, ClipboardList,
  Shield, Receipt, DollarSign, Target, Briefcase, Heart, Stethoscope,
  CalendarDays, Phone, LayoutList, Users as UsersIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import FormDialog from "@/components/shared/FormDialog";
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
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

export default function ReferenceListsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('industries');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", name_ar: "", code: "", month_number: "", role_category: "Client", sub_role_en: "", sub_role_ar: "" });
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define stable empty array to prevent unnecessary re-renders
  const EMPTY_ARRAY = useMemo(() => [], []);

  const collectionPath = activeCategory === 'contact_roles' ? 'contact_roles' : `master_${activeCategory}`;
  const { data: recordsData, isLoading } = useSupabaseCollection<any>(collectionPath);
  const records = recordsData || EMPTY_ARRAY;

  const categories = useMemo(() => [
    { id: 'industries', label: t('industries'), icon: Building2 },
    { id: 'departments', label: t('departments'), icon: Layers },
    { id: 'locations', label: t('locations'), icon: MapPin },
    { id: 'months', label: t('months'), icon: CalendarDays },
    { id: 'company_statuses', label: t('companyStatuses'), icon: Activity },
    { id: 'priorities', label: t('priorities'), icon: AlertTriangle },
    { id: 'product_types', label: t('productTypes'), icon: Briefcase },
    { id: 'product_subtypes', label: t('productSubtypes') || 'Product Subtypes', icon: Briefcase },
    { id: 'client_types', label: t('clientTypes') || 'Client Types', icon: Briefcase },
    { id: 'activity_types', label: t('activityTypes'), icon: Phone },
    { id: 'activity_statuses', label: t('activityStatuses'), icon: CheckCircle2 },
    { id: 'claim_types', label: t('claimTypes'), icon: ClipboardList },
    { id: 'claim_statuses', label: t('claimStatuses'), icon: ClipboardList },
    { id: 'endorsement_types', label: t('endorsementTypes'), icon: FileText },
    { id: 'invoice_types', label: t('invoiceTypes'), icon: Receipt },
    { id: 'kyc_document_types', label: t('documentTypes'), icon: FileText },
    { id: 'payment_methods', label: t('paymentMethods'), icon: DollarSign },
    { id: 'pipeline_stages', label: t('pipelineStages'), icon: Target },
    { id: 'provider_types', label: t('providerTypes'), icon: Stethoscope },
    { id: 'benefit_classes', label: t('benefitClasses'), icon: Shield },
    { id: 'network_types', label: t('networkTypes'), icon: ListTree },
    { id: 'related_types', label: t('relatedEntityTypes'), icon: LayoutList },
    { id: 'company_sizes', label: t('companySizes'), icon: UsersIcon },
    { id: 'sources', label: t('leadSources'), icon: Target },
    { id: 'currencies', label: 'Currencies', icon: DollarSign },
    { id: 'payment_frequencies', label: 'Payment Frequencies', icon: CalendarDays },
    { id: 'contact_roles', label: 'Contact Roles', icon: UsersIcon }
  ], [t]);

  const handleEdit = useCallback((record: any) => {
    if (isPending) return; // Prevent rapid triggers

    startTransition(() => {
      setSelectedRecord(record);
      setFormData({
        name: activeCategory === 'contact_roles' ? record.role_name_en : (record.subcategory_en || record.name_en || record.name || ""),
        name_ar: activeCategory === 'contact_roles' ? record.role_name_ar : (record.subcategory_ar || record.name_ar || ""),
        code: record.code || "",
        month_number: record.month_number ? String(record.month_number) : "",
        role_category: record.role_category || "Client",
        sub_role_en: record.sub_role_en || "",
        sub_role_ar: record.sub_role_ar || ""
      });
      setDialogOpen(true);
    });
  }, [isPending]);

  const handleAddNew = useCallback(() => {
    if (isPending) return;

    startTransition(() => {
      setSelectedRecord(null);
      setFormData({ name: "", name_ar: "", code: "", month_number: "", role_category: "Client", sub_role_en: "", sub_role_ar: "" });
      setDialogOpen(true);
    });
  }, [isPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data: any = {
        code: formData.code,
        updated_at: new Date().toISOString(),
      };

      if (activeCategory === 'months') {
        data.month_number = formData.month_number ? parseInt(formData.month_number, 10) : null;
      }

      if (activeCategory === 'contact_roles') {
        data.role_name_en = formData.name;
        data.role_name_ar = formData.name_ar;
        data.role_category = formData.role_category;
        data.sub_role_en = formData.sub_role_en;
        data.sub_role_ar = formData.sub_role_ar;
        // Don't override code if it's contact roles unless you want to
        delete data.code; 
        if (!selectedRecord) data.created_at = new Date().toISOString();
      } else {
        if (selectedRecord) {
          if (selectedRecord.subcategory_en !== undefined) data.subcategory_en = formData.name;
          else if (selectedRecord.name_en !== undefined) data.name_en = formData.name;
          else data.name = formData.name;

          if (selectedRecord.subcategory_ar !== undefined) data.subcategory_ar = formData.name_ar;
          else data.name_ar = formData.name_ar;
        } else {
          data.name = formData.name;
          data.name_ar = formData.name_ar;
          data.created_at = new Date().toISOString();
        }
      }

      if (selectedRecord) {
        const { error } = await supabase.from(collectionPath).update(data).eq('id', selectedRecord.id);
        if (error) throw error;
        toast({ title: "Updated successfully" });
      } else {
        const { error } = await supabase.from(collectionPath).insert(data);
        if (error) throw error;
        toast({ title: "Added successfully" });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Operation failed", description: err.message || "An error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from(collectionPath).delete().eq('id', selectedRecord.id);
      if (error) throw error;
      toast({ title: "Record deleted" });
      setDeleteDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message || "An error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => [
    {
      header: "Name (EN)",
      accessorFn: (row: any) => activeCategory === 'contact_roles' ? row.role_name_en : (row.subcategory_en || row.name_en || row.name || '-'),
      id: "name",
      cell: ({ row }: any) => <span className="font-bold text-slate-900">{activeCategory === 'contact_roles' ? row.original.role_name_en : (row.original.subcategory_en || row.original.name_en || row.original.name || '-')}</span>
    },
    {
      header: "Name (AR)",
      accessorFn: (row: any) => activeCategory === 'contact_roles' ? row.role_name_ar : (row.subcategory_ar || row.name_ar || '-'),
      id: "name_ar",
      cell: ({ row }: any) => <span className="font-arabic text-right">{activeCategory === 'contact_roles' ? row.original.role_name_ar : (row.original.subcategory_ar || row.original.name_ar || '-')}</span>
    },
    {
      header: activeCategory === 'contact_roles' ? "Category" : (activeCategory === 'industries' ? "Category (EN)" : "Category"),
      accessorFn: (row: any) => activeCategory === 'contact_roles' ? row.role_category : (row.category_en || row.category || '-'),
      id: "category",
      cell: ({ row }: any) => <span className="text-xs text-slate-500">{activeCategory === 'contact_roles' ? row.original.role_category : (row.original.category_en || row.original.category || '-')}</span>
    },
    {
      header: activeCategory === 'months' ? "Month No." : "Code",
      accessorFn: (row: any) => activeCategory === 'months' ? row.month_number : row.code,
      id: activeCategory === 'months' ? "month_number" : "code",
      cell: ({ row }: any) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{activeCategory === 'months' ? row.original.month_number || '-' : row.original.code || '-'}</code>
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={isPending} onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
            <Edit className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" disabled={isPending} className="text-red-400 hover:text-red-600" onClick={(e) => {
            e.stopPropagation();
            startTransition(() => {
              setSelectedRecord(row.original);
              setDeleteDialogOpen(true);
            });
          }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ], [activeCategory, t, handleEdit, isPending]);

  useEffect(() => {
    if (activeCategory === 'months') {
      setSorting(prev => prev.length === 1 && prev[0].id === 'month_number' ? prev : [{ id: 'month_number', desc: false }]);
    } else {
      setSorting(prev => prev.length === 0 ? prev : []);
    }
  }, [activeCategory]);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('referenceLists')}

        onAction={handleAddNew}
        actionLabel={t('add')}
      />

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v)} className="space-y-6">
        <TabsList className="bg-white border-2 rounded-2xl w-full justify-start h-auto p-1.5 shadow-sm overflow-x-auto">
          {categories.map(cat => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all gap-2 whitespace-nowrap"
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory}>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                {(() => {
                  const cat = categories.find(c => c.id === activeCategory);
                  if (cat) {
                    return (
                      <>
                        <cat.icon className="w-5 h-5 text-indigo-600" />
                        {cat.label} Reference List
                      </>
                    );
                  }
                  return null;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DataTable
                table={table}
                columns={columns}
                isLoading={isLoading}
                searchPlaceholder={`Search...`}
                onRowClick={handleEdit}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${selectedRecord ? t('edit') : t('add')} Record`}
      >
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="space-y-2">
            <Label>Name (English) *</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Active / Hospital / Medical" />
          </div>
          <div className="space-y-2">
            <Label>Name (Arabic)</Label>
            <Input value={formData.name_ar} onChange={e => setFormData({ ...formData, name_ar: e.target.value })} className="font-arabic" dir="rtl" />
          </div>
          {activeCategory === 'months' ? (
            <div className="space-y-2">
              <Label>Month Number (1-12) *</Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={formData.month_number}
                onChange={e => setFormData({ ...formData, month_number: e.target.value })}
                required
                placeholder="e.g. 1 for January"
              />
            </div>
          ) : activeCategory === 'contact_roles' ? (
            <>
              <div className="space-y-2">
                <Label>Role Category *</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.role_category}
                  onChange={e => setFormData({ ...formData, role_category: e.target.value })}
                  required
                >
                  <option value="Client">Client</option>
                  <option value="Insurer">Insurer</option>
                  <option value="TPA">TPA</option>
                  <option value="Provider">Provider</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sub Role (EN)</Label>
                <Input value={formData.sub_role_en} onChange={e => setFormData({ ...formData, sub_role_en: e.target.value })} placeholder="Optional sub role" />
              </div>
              <div className="space-y-2">
                <Label>Sub Role (AR)</Label>
                <Input value={formData.sub_role_ar} onChange={e => setFormData({ ...formData, sub_role_ar: e.target.value })} className="font-arabic" dir="rtl" />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Code (Optional)</Label>
              <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g. ACT / HSP / MED" />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-900 font-bold px-8 shadow-lg">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Record
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove "{selectedRecord?.name}"? This will affect all records using this reference.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
