
'use client';
import React, { useState, useMemo } from "react";
import { 
  ListTree, Building2, MapPin, Layers, 
  Plus, Edit, Trash2, CheckCircle2, AlertTriangle, Loader2,
  ChevronRight, Search, Activity, FileText, ClipboardList, 
  Shield, Receipt, DollarSign, Target, Briefcase, Heart, Stethoscope,
  CalendarDays, Phone, LayoutList, Users as UsersIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { addDoc, collection, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

export default function ReferenceListsPage() {
  const { t } = useI18n();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeCategory, setActiveCategory] = useState<string>('industries');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", name_ar: "", code: "" });
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const collectionPath = useMemo(() => `master_${activeCategory}`, [activeCategory]);
  const collectionRef = useMemoFirebase(() => collection(firestore!, collectionPath), [firestore, collectionPath]);
  const { data: recordsData, isLoading } = useCollection<any>(collectionRef);
  const records = recordsData || [];

  const categories = [
    { id: 'industries', label: t('industries'), icon: Building2 },
    { id: 'departments', label: t('departments'), icon: Layers },
    { id: 'locations', label: t('locations'), icon: MapPin },
    { id: 'months', label: t('months'), icon: CalendarDays },
    { id: 'company_statuses', label: t('companyStatuses'), icon: Activity },
    { id: 'priorities', label: t('priorities'), icon: AlertTriangle },
    { id: 'product_types', label: t('productTypes'), icon: Briefcase },
    { id: 'activity_types', label: t('activityTypes'), icon: Phone },
    { id: 'activity_statuses', label: 'Activity Statuses', icon: CheckCircle2 },
    { id: 'claim_types', label: t('claimTypes'), icon: ClipboardList },
    { id: 'claim_statuses', label: 'Claim Statuses', icon: ClipboardList },
    { id: 'endorsement_types', label: t('endorsementTypes'), icon: FileText },
    { id: 'invoice_types', label: t('invoiceTypes'), icon: Receipt },
    { id: 'kyc_document_types', label: t('documentTypes'), icon: FileText },
    { id: 'payment_methods', label: t('paymentMethods'), icon: DollarSign },
    { id: 'pipeline_stages', label: t('pipelineStages'), icon: Target },
    { id: 'provider_types', label: t('providerTypes'), icon: Stethoscope },
    { id: 'benefit_classes', label: t('benefitClasses'), icon: Shield },
    { id: 'network_types', label: t('networkTypes'), icon: ListTree },
    { id: 'related_types', label: 'Related Entity Types', icon: LayoutList },
    { id: 'company_sizes', label: 'Company Sizes', icon: UsersIcon }
  ];

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setFormData({ 
      name: record.name || "", 
      name_ar: record.name_ar || "", 
      code: record.code || "" 
    });
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedRecord(null);
    setFormData({ name: "", name_ar: "", code: "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    const data = {
      ...formData,
      updated_at: serverTimestamp(),
    };

    try {
      if (selectedRecord) {
        await updateDoc(doc(firestore, collectionPath, selectedRecord.id), data);
        toast({ title: "Updated successfully" });
      } else {
        await addDoc(collection(firestore, collectionPath), { ...data, created_at: serverTimestamp() });
        toast({ title: "Added successfully" });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Operation failed" });
    }
  };

  const handleDelete = async () => {
    if (selectedRecord && firestore) {
      try {
        await deleteDoc(doc(firestore, collectionPath, selectedRecord.id));
        toast({ title: "Record deleted" });
      } catch (err) {
        toast({ variant: "destructive", title: "Delete failed" });
      }
    }
    setDialogOpen(false);
  };

  const columns = [
    {
      header: "Name (EN)",
      accessorKey: "name",
      cell: ({ row }: any) => <span className="font-bold text-slate-900">{row.original.name}</span>
    },
    {
      header: "Name (AR)",
      accessorKey: "name_ar",
      cell: ({ row }: any) => <span className="font-arabic text-right">{row.original.name_ar || '-'}</span>
    },
    {
      header: "Code",
      accessorKey: "code",
      cell: ({ row }: any) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{row.original.code || '-'}</code>
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Edit className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => { setSelectedRecord(row.original); setDeleteDialogOpen(true); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

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
        description="Manage the master reference lists used throughout the system."
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

        {categories.map(cat => (
          <TabsContent key={cat.id} value={cat.id}>
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <cat.icon className="w-5 h-5 text-indigo-600" />
                  {cat.label} Reference List
                </CardTitle>
                <CardDescription>Single source of truth for {cat.label.toLowerCase()} in the system.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <DataTable
                  table={table}
                  columns={columns}
                  isLoading={isLoading}
                  searchPlaceholder={`Search ${cat.label.toLowerCase()}...`}
                  onRowClick={handleEdit}
                  globalFilter={globalFilter}
                  setGlobalFilter={setGlobalFilter}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <FormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        title={`${selectedRecord ? t('edit') : t('add')} Record`}
      >
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="space-y-2">
            <Label>Name (English) *</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Active / Hospital / Medical" />
          </div>
          <div className="space-y-2">
            <Label>Name (Arabic)</Label>
            <Input value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})} className="font-arabic" dir="rtl" />
          </div>
          <div className="space-y-2">
            <Label>Code (Optional)</Label>
            <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. ACT / HSP / MED" />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-indigo-900 font-bold px-8 shadow-lg">Save Record</Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove "{selectedRecord?.name}"? This will affect all records using this reference.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
