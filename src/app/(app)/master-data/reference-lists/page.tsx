'use client';
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useMemo, useCallback, useTransition, useEffect, useRef } from "react";
import {
  ListTree, Building2, MapPin, Layers,
  Plus, Edit, Trash2, CheckCircle2, AlertTriangle, Loader2,
  ChevronRight, Search, Activity, FileText, ClipboardList,
  Shield, Receipt, DollarSign, Target, Briefcase, Heart, Stethoscope,
  CalendarDays, Phone, LayoutList, Users as UsersIcon, Database,
  Car, Calculator, Download, Upload, Table as TableIcon, FileCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import FormDialog from "@/components/shared/FormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useToast } from "@/lib/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

import { SME_PLANS } from "@/lib/plans-data";
import { PLAN_PRICING_STYLE_MAP, getPremium } from "@/lib/pricing-matrix";
import { CAR_BRANDS } from "@/lib/car-data";
import { sampleInsuranceCompanies, sampleTPAs } from "@/lib/data";

const CENSUS_HEADERS = [
  "Insurance Company Name", "Insurance company Code", "insurance line", "Policy Name",
  "Policy Number", "TPA Name", "Start Date", "Expiry Date", "Member Ins Code", "Staff Code",
  "Member TPA Code", "Head Family Code", "Member Full Name", "Nationality", "National ID", "Date Of Birth",
  "Gender", "Relation", "Category", "Branch", "Area", "Department", "Job Title",
  "Salary", "Premium", "Addition Date", "Deletion Date", "Mobile Number", "Notes"
];

export default function SystemDatabaseManagerPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [activeCollection, setActiveCollection] = useState<string>('industries');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  // Dynamic form data
  const [formData, setFormData] = useState<any>({});
  
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Excel states
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controlled pagination state to prevent page index state reset loops
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const LOOKUP_LISTS = useMemo(() => [
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

  const APP_DATABASES = useMemo(() => [
    { id: 'companies', label: t('companies'), icon: Building2 },
    { id: 'contacts', label: t('contacts'), icon: UsersIcon },
    { id: 'activities', label: t('activities'), icon: FileText },
    { id: 'census', label: t('census'), icon: UsersIcon },
    { id: 'policies', label: t('policies'), icon: FileCheck },
    { id: 'claims', label: t('allClaims'), icon: AlertTriangle },
    { id: 'insurance_companies', label: t('insuranceCompanies'), icon: Building2 },
    { id: 'tpas', label: t('tpas'), icon: Shield },
    { id: 'invoices', label: t('invoices'), icon: Receipt },
    { id: 'payments', label: t('payments'), icon: DollarSign },
    { id: 'commissions', label: t('commissions'), icon: DollarSign },
    { id: 'kyc-documents', label: t('kycDocs'), icon: FileCheck },
    { id: 'sme_plans', label: t('insurancePlans'), icon: FileText },
    { id: 'sme_premiums', label: t('planPremiums'), icon: DollarSign },
    { id: 'motor_brands', label: t('motorBrands'), icon: Car },
    { id: 'motor_models', label: t('motorModels'), icon: Car },
    { id: 'motor_plans', label: t('motorPlans'), icon: Calculator },
    { id: 'sme_quotations', label: t('smeQuotations'), icon: Calculator },
    { id: 'motor_quotations', label: t('motorQuotations'), icon: Car },
  ], [t]);

  const isLookupList = LOOKUP_LISTS.some(c => c.id === activeCollection);
  const collectionPath = (isLookupList && activeCollection !== 'contact_roles') ? `master_${activeCollection}` : activeCollection;

  const queryFilter = useCallback((q: any) => q.limit(100), []);
  const { data: recordsData, isLoading } = useSupabaseCollection<any>(collectionPath, queryFilter);
  // Memoize records array reference to prevent columns and table recreation on every render
  const records = useMemo(() => recordsData || [], [recordsData]);

  const handleEdit = useCallback((record: any) => {
    if (isPending) return;
    startTransition(() => {
      setSelectedRecord(record);
      if (isLookupList) {
        setFormData({
          name: activeCollection === 'contact_roles' ? record.role_name_en : (record.subcategory_en || record.name_en || record.name || ""),
          name_ar: activeCollection === 'contact_roles' ? record.role_name_ar : (record.subcategory_ar || record.name_ar || ""),
          code: record.code || "",
          month_number: record.month_number ? String(record.month_number) : "",
          role_category: record.role_category || "Client",
          sub_role_en: record.sub_role_en || "",
          sub_role_ar: record.sub_role_ar || ""
        });
      } else {
        setFormData({ ...record });
      }
      setDialogOpen(true);
    });
  }, [isPending, isLookupList, activeCollection]);

  const handleAddNew = useCallback(() => {
    if (isPending) return;
    startTransition(() => {
      setSelectedRecord(null);
      if (isLookupList) {
        setFormData({ name: "", name_ar: "", code: "", month_number: "", role_category: "Client", sub_role_en: "", sub_role_ar: "" });
      } else {
        // For app databases, we initialize an empty object with the keys from the first record if available
        const template: any = {};
        if (records.length > 0) {
          Object.keys(records[0]).forEach(k => {
            if (!['id', 'created_at', 'updated_at'].includes(k)) {
              template[k] = "";
            }
          });
        }
        setFormData(template);
      }
      setDialogOpen(true);
    });
  }, [isPending, isLookupList, records]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isLookupList) {
        const data: any = {
          code: formData.code,
          updated_at: new Date().toISOString(),
        };

        if (activeCollection === 'months') {
          data.month_number = formData.month_number ? parseInt(formData.month_number, 10) : null;
        }

        if (activeCollection === 'contact_roles') {
          data.role_name_en = formData.name;
          data.role_name_ar = formData.name_ar;
          data.role_category = formData.role_category;
          data.sub_role_en = formData.sub_role_en;
          data.sub_role_ar = formData.sub_role_ar;
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
          const { error } = await supabase.from(collectionPath).insert(sanitizeUUIDs(data));
          if (error) throw error;
          toast({ title: "Added successfully" });
        }
      } else {
        // App Database generic save
        if (selectedRecord?.id) {
          const { error } = await supabase.from(collectionPath).update(formData).eq("id", selectedRecord.id);
          if (error) throw error;
          toast({ title: t('recordUpdated') || "Record updated successfully" });
        } else {
          const { error } = await supabase.from(collectionPath).insert(sanitizeUUIDs(formData));
          if (error) throw error;
          toast({ title: "Record created successfully" });
        }
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

  const columns = useMemo(() => {
    if (isLookupList) {
      return [
        {
          header: "Name (EN)",
          accessorFn: (row: any) => activeCollection === 'contact_roles' ? row.role_name_en : (row.subcategory_en || row.name_en || row.name || '-'),
          id: "name",
          cell: ({ row }: any) => <span className="font-bold text-foreground">{activeCollection === 'contact_roles' ? row.original.role_name_en : (row.original.subcategory_en || row.original.name_en || row.original.name || '-')}</span>
        },
        {
          header: "Name (AR)",
          accessorFn: (row: any) => activeCollection === 'contact_roles' ? row.role_name_ar : (row.subcategory_ar || row.name_ar || '-'),
          id: "name_ar",
          cell: ({ row }: any) => <span className="font-arabic text-right">{activeCollection === 'contact_roles' ? row.original.role_name_ar : (row.original.subcategory_ar || row.original.name_ar || '-')}</span>
        },
        {
          header: activeCollection === 'contact_roles' ? "Category" : (activeCollection === 'industries' ? "Category (EN)" : "Category"),
          accessorFn: (row: any) => activeCollection === 'contact_roles' ? row.role_category : (row.category_en || row.category || '-'),
          id: "category",
          cell: ({ row }: any) => <span className="text-xs text-muted-foreground">{activeCollection === 'contact_roles' ? row.original.role_category : (row.original.category_en || row.original.category || '-')}</span>
        },
        {
          header: activeCollection === 'months' ? "Month No." : "Code",
          accessorFn: (row: any) => activeCollection === 'months' ? row.month_number : row.code,
          id: activeCollection === 'months' ? "month_number" : "code",
          cell: ({ row }: any) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-muted-foreground">{activeCollection === 'months' ? row.original.month_number || '-' : row.original.code || '-'}</code>
        },
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }: any) => (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" disabled={isPending} onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
                <Edit className="w-4 h-4 text-slate-400" />
              </Button>
              <Button variant="ghost" size="icon" disabled={isPending} className="text-red-400 hover:text-destructive" onClick={(e) => {
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
      ];
    } else {
      // Dynamic Database columns
      if (records.length === 0) {
        return [
          { header: "ID", accessorKey: "id" },
          { header: "Info", accessorKey: "info", cell: () => <span className="text-slate-400 italic">No data yet</span> }
        ];
      }

      const firstRecord = records[0];
      const cols: any[] = Object.keys(firstRecord)
        .filter(key => !['id', 'created_at', 'updated_at', 'user_id'].includes(key))
        .slice(0, 6) 
        .map(key => ({
          header: key.replace(/_/g, ' ').toUpperCase(),
          id: key,
          accessorFn: (row: any) => row[key],
          enableGlobalFilter: typeof firstRecord[key] === 'string' || typeof firstRecord[key] === 'number',
          cell: ({ row }: any) => {
            const val = row.original[key];
            if (typeof val === 'object' && val !== null) return <Badge variant="outline">Object</Badge>;
            return <span className="truncate max-w-[150px] inline-block">{String(val || '-')}</span>;
          }
        }));

      cols.push({
        id: "actions",
        header: "Actions",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={isPending} onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
              <Edit className="w-4 h-4 text-slate-400" />
            </Button>
            <Button variant="ghost" size="icon" disabled={isPending} className="text-destructive hover:text-red-700" onClick={(e) => { 
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
      });

      return cols;
    }
  }, [isLookupList, activeCollection, records, t, handleEdit, isPending]);

  useEffect(() => {
    if (activeCollection === 'months') {
      setSorting(prev => prev.length === 1 && prev[0].id === 'month_number' ? prev : [{ id: 'month_number', desc: false }]);
    } else {
      setSorting(prev => prev.length === 0 ? prev : []);
    }
    // Reset page index on database collection switch
    setPagination({ pageIndex: 0, pageSize: 10 });
  }, [activeCollection]);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: { sorting, globalFilter, pagination },
  });

  // Export / Import Logic
  const handleDownload = async () => {
    const XLSX = await import('xlsx');
    let data: any[] = [];
    let fileName = `${activeCollection}_export.xlsx`;

    if (activeCollection === 'census') {
      data = [{}];
      fileName = "Census_Data_Export.xlsx";
      const ws = XLSX.utils.json_to_sheet(data, { header: CENSUS_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Census");
      XLSX.writeFile(wb, fileName);
      toast({ title: "Template Generated" });
      return;
    }

    if (activeCollection === 'sme_plans') {
      data = SME_PLANS.map(({ expiryDate, ...rest }: any) => rest);
      fileName = "SME_Insurance_Plans.xlsx";
    } else if (activeCollection === 'sme_premiums') {
      const allPlanIds = Object.keys(PLAN_PRICING_STYLE_MAP);
      data = allPlanIds.flatMap(planId => {
        const style = PLAN_PRICING_STYLE_MAP[planId];
        const points = [];
        for (let age = 1; age <= 65; age++) {
          points.push({
            planId,
            age,
            emp: getPremium(style, age, 'Employee'),
            spouse: getPremium(style, age, 'Spouse'),
            child: getPremium(style, age, 'Child'),
            expiryDate: "2025-12-31"
          });
        }
        return points;
      });
      fileName = "SME_Plan_Premiums.xlsx";
    } else if (activeCollection === 'motor_brands') {
      data = CAR_BRANDS.map(b => ({ id: b.name.toLowerCase().replace(/\s+/g, '_'), name: b.name }));
      fileName = "Motor_Brands.xlsx";
    } else if (activeCollection === 'motor_models') {
      data = CAR_BRANDS.flatMap(b => b.models.map(m => ({
        id: `${b.name.toLowerCase().replace(/\s+/g, '_')}_${m.toLowerCase().replace(/\s+/g, '_')}`,
        brandId: b.name.toLowerCase().replace(/\s+/g, '_'),
        name: m
      })));
      fileName = "Motor_Models.xlsx";
    } else if (activeCollection === 'motor_plans') {
      data = sampleInsuranceCompanies.map((insurer, idx) => ({
        id: insurer.id,
        insurerId: insurer.id,
        insurerName: insurer.name,
        name: "Comprehensive Plan",
        baseRate: 0.025 + (idx % 5) * 0.005,
        tplLimit: 10000 + (idx % 3) * 5000,
        deductible: idx % 4 === 0 ? "Zero" : "500 EGP",
        agencyRepair: idx % 2 === 0,
        naturalPerils: true,
        roadsideAssistance: true,
        totalLoss: true,
        theft: true,
        expiryDate: "2025-12-31"
      }));
      fileName = "Motor_Insurance_Plans.xlsx";
    } else {
      try {
        const { data: dbRecords, error } = await supabase.from(collectionPath).select('*');
        if (error) throw error;

        if (!dbRecords || dbRecords.length === 0) {
          toast({ title: "No Data Found", description: `There are no records in the ${activeCollection} table to export.` });
          return;
        }

        data = dbRecords;
        fileName = `${activeCollection.charAt(0).toUpperCase() + activeCollection.slice(1)}_Export.xlsx`;
      } catch (err: any) {
        console.error(`Export failed for ${activeCollection}:`, err);
        toast({ variant: "destructive", title: "Export Failed", description: err.message || "Failed to fetch database records." });
        return;
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    XLSX.writeFile(wb, fileName);
    toast({ title: "Export Successful" });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCollection) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast({ variant: "destructive", title: "Upload Failed", description: "The Excel sheet is empty." });
          setIsProcessing(false);
          return;
        }

        toast({ title: `Uploading ${activeCollection.replace('_', ' ')}`, description: `Processing ${data.length} records...` });

        // Upsert to Supabase
        if (activeCollection === 'census') {
          const mappedData = data.map(item => ({
            insurance_company_name: item["Insurance Company Name"] || "",
            insurance_company_code: item["Insurance company Code"] || "",
            insurance_line: item["insurance line"] || "Medical",
            policy_name: item["Policy Name"] || "",
            policy_number: item["Policy Number"] || "",
            tpa_name: item["TPA Name"] || "",
            start_date: item["Start Date"] ? new Date(item["Start Date"]).toISOString() : null,
            expiry_date: item["Expiry Date"] ? new Date(item["Expiry Date"]).toISOString() : null,
            member_code: item["Member Ins Code"] || "",
            staff_code: item["Staff Code"] || "",
            member_tpa_code: item["Member TPA Code"] || "",
            head_family_code: item["Head Family Code"] || "",
            member_full_name: item["Member Full Name"] || "",
            nationality: item["Nationality"] || "",
            national_id: item["National ID"] || "",
            date_of_birth: item["Date Of Birth"] ? new Date(item["Date Of Birth"]).toISOString() : null,
            gender: item["Gender"] || "Male",
            relation: item["Relation"] || "Employee",
            category: item["Category"] || "",
            branch: item["Branch"] || "",
            area: item["Area"] || "",
            department: item["Department"] || "",
            job_title: item["Job Title"] || "",
            salary: Number(item["Salary"]) || 0,
            premium: Number(item["Premium"]) || 0,
            addition_date: item["Addition Date"] ? new Date(item["Addition Date"]).toISOString() : null,
            deletion_date: item["Deletion Date"] ? new Date(item["Deletion Date"]).toISOString() : null,
            mobile_number: item["Mobile Number"] || "",
            notes: item["Notes"] || "",
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }));
          const { error } = await supabase.from("census").insert(sanitizeUUIDs(mappedData));
          if (error) throw error;
        } else {
          const finalData = data.map(item => ({
            ...item,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          const { error } = await supabase.from(collectionPath).insert(sanitizeUUIDs(finalData));
          if (error) throw error;
        }

        toast({ title: "Upload Successful", description: `${data.length} records processed.` });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: err.message || "An error occurred during import." });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getCollectionMeta = () => {
    return LOOKUP_LISTS.find(c => c.id === activeCollection) || APP_DATABASES.find(c => c.id === activeCollection);
  };
  const activeMeta = getCollectionMeta();

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Databases"
        description="Manage master data, lookup lists, and system databases"
      />

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-background/50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select value={activeCollection} onValueChange={setActiveCollection}>
              <SelectTrigger className="w-[300px] h-12 bg-card rounded-xl shadow-sm border-border">
                <SelectValue placeholder="Select Database" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-xs font-bold text-muted-foreground tracking-wider">APP DATABASES</SelectLabel>
                  {APP_DATABASES.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <c.icon className="w-4 h-4 text-slate-400" />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-xs font-bold text-muted-foreground tracking-wider mt-2 border-t pt-2">LOOKUP LISTS</SelectLabel>
                  {LOOKUP_LISTS.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <c.icon className="w-4 h-4 text-slate-400" />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {activeMeta && (
              <Badge variant="outline" className="bg-card px-3 py-1.5 h-auto text-standard">
                {isLookupList ? "Lookup List" : "Core Database"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 border-indigo-200 text-indigo-700 bg-primary/10 hover:bg-indigo-100" onClick={handleDownload} disabled={isProcessing}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" className="h-10 border-indigo-200 text-indigo-700 bg-primary/10 hover:bg-indigo-100" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Import
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            <Button onClick={handleAddNew} className="h-10 bg-primary hover:bg-indigo-700 shadow-sm" disabled={isProcessing}>
              <Plus className="w-4 h-4 mr-2" />
              {t('add')} Record
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <DataTable
            table={table}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder={`Search ${activeMeta?.label || ''}...`}
            onRowClick={handleEdit}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
          />
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${selectedRecord ? t('edit') : t('add')} ${activeMeta?.label}`}
        size={isLookupList ? "default" : "lg"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {isLookupList ? (
            <>
              <div className="space-y-2">
                <Label>Name (English) *</Label>
                <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Name (Arabic)</Label>
                <Input value={formData.name_ar || ''} onChange={e => setFormData({ ...formData, name_ar: e.target.value })} className="font-arabic" dir="rtl" />
              </div>
              {activeCollection === 'months' ? (
                <div className="space-y-2">
                  <Label>Month Number (1-12) *</Label>
                  <Input type="number" min="1" max="12" value={formData.month_number || ''} onChange={e => setFormData({ ...formData, month_number: e.target.value })} required />
                </div>
              ) : activeCollection === 'contact_roles' ? (
                <>
                  <div className="space-y-2">
                    <Label>Role Category *</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3" value={formData.role_category || 'Client'} onChange={e => setFormData({ ...formData, role_category: e.target.value })} required>
                      <option value="Client">Client</option>
                      <option value="Insurer">Insurer</option>
                      <option value="TPA">TPA</option>
                      <option value="Provider">Provider</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Role (EN)</Label>
                    <Input value={formData.sub_role_en || ''} onChange={e => setFormData({ ...formData, sub_role_en: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Role (AR)</Label>
                    <Input value={formData.sub_role_ar || ''} onChange={e => setFormData({ ...formData, sub_role_ar: e.target.value })} className="font-arabic" dir="rtl" />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Code (Optional)</Label>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} />
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(formData).filter(k => k !== 'id').map(key => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                  {typeof formData[key] === 'boolean' ? (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                      <Switch checked={formData[key]} onCheckedChange={(val) => setFormData({ ...formData, [key]: val })} />
                      <span className="text-sm">{formData[key] ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  ) : typeof formData[key] === 'object' && formData[key] !== null ? (
                    <Textarea
                      value={JSON.stringify(formData[key], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setFormData({ ...formData, [key]: parsed });
                        } catch (err) {}
                      }}
                      rows={4}
                      className="font-mono text-xs bg-background"
                    />
                  ) : (
                    <Input value={formData[key] || ''} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-indigo-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {t('save')}
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('confirmPermanentDeletion')}
            </AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this record? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('deletePermanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
