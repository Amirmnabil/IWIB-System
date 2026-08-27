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
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

import { SME_PLANS } from "@/lib/plans-data";
import { PLAN_PRICING_STYLE_MAP, getPremium } from "@/lib/pricing-matrix";
import { CAR_BRANDS } from "@/lib/car-data";
import { sampleInsuranceCompanies, sampleTPAs } from "@/lib/data";

const CENSUS_HEADERS = [
  "Insurance Company Name", "Insurance company Code", "insurance line", "Policy Name",
  "Policy Number", "TPA Name", "Start Date", "Expiry Date", "Insurer ID", "Staff ID",
  "Individual ID", "Principal ID", "Beneficiary Full Name", "Nationality", "National ID", "Date Of Birth",
  "Gender", "Relation", "Category", "Branch", "Area", "Department", "Job Title",
  "Salary", "Premium", "Addition Date", "Deletion Date", "Mobile Number", "Notes"
];

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const DEFAULT_TEMPLATE_HEADERS: Record<string, string[]> = {
  industries: ['code', 'name', 'name_ar', 'category'],
  departments: ['code', 'name', 'name_ar'],
  locations: ['code', 'name', 'name_ar'],
  months: ['name', 'name_ar', 'month_number'],
  company_statuses: ['code', 'name', 'name_ar'],
  priorities: ['code', 'name', 'name_ar'],
  product_types: ['code', 'name', 'name_ar'],
  product_subtypes: ['code', 'name', 'name_ar'],
  client_types: ['code', 'name', 'name_ar'],
  activity_types: ['code', 'name', 'name_ar'],
  activity_statuses: ['code', 'name', 'name_ar'],
  claim_types: ['code', 'name', 'name_ar'],
  claim_statuses: ['code', 'name', 'name_ar'],
  endorsement_types: ['code', 'name', 'name_ar'],
  invoice_types: ['code', 'name', 'name_ar'],
  kyc_document_types: ['code', 'name', 'name_ar'],
  payment_methods: ['code', 'name', 'name_ar'],
  pipeline_stages: ['code', 'name', 'name_ar'],
  provider_types: ['code', 'name', 'name_ar'],
  benefit_classes: ['code', 'name', 'name_ar'],
  network_types: ['code', 'name', 'name_ar'],
  related_types: ['code', 'name', 'name_ar'],
  company_sizes: ['code', 'name', 'name_ar'],
  sources: ['code', 'name', 'name_ar'],
  currencies: ['code', 'name', 'name_ar'],
  payment_frequencies: ['code', 'name', 'name_ar'],
  contact_roles: ['role_name_en', 'role_name_ar', 'role_category', 'sub_role_en', 'sub_role_ar'],
  role_levels: ['code', 'name', 'name_ar'],
  benefit_categories: ['code', 'name', 'name_ar'],
  coverage_types: ['code', 'name', 'name_ar'],
  eligibility_types: ['code', 'name', 'name_ar'],
  rule_types: ['code', 'name', 'name_ar'],

  companies: ['code', 'name', 'name_ar', 'status', 'industry', 'employee_count', 'priority', 'city', 'address', 'cr_number', 'tax_card', 'current_insurer', 'insurance_type', 'notes', 'client_type'],
  contacts: ['company_id', 'first_name', 'last_name', 'email', 'phone', 'mobile', 'job_title', 'notes'],
  activities: ['activity_type', 'subject', 'description', 'status', 'priority', 'due_date', 'notes'],
  census_members: CENSUS_HEADERS,
  policies: ['policy_number', 'insurer_id', 'tpa_id', 'policy_type', 'start_date', 'end_date', 'notes'],
  claims: ['claim_number', 'policy_id', 'member_id', 'member_name', 'claim_type', 'incident_date', 'submission_date', 'claim_amount', 'status'],
  insurance_companies: ['companyName', 'companyCode', 'companyType', 'status', 'companyNameAr'],
  tpas: ['name', 'code', 'status'],
  invoices: ['invoice_number', 'client_company_name', 'policy_number', 'invoice_type', 'due_date', 'amount_due', 'notes'],
  payments: ['payment_number', 'amount', 'payment_date', 'payment_method', 'status'],
  commissions: ['policy_id', 'premium_amount', 'commission_rate', 'expected_commission', 'paid_commission', 'commission_status'],
  'kyc-documents': ['document_type', 'status', 'expiry_date'],
  sme_plans: ['Plan ID', 'Company Name', 'Plan Name', 'Life Insurance', 'Annual Coverage Limits', 'TPA', 'Network', 'Accommodation', 'Inpatient', 'Consultations', 'Radiology & laboratory', 'Medications', 'Dental', 'Optical', 'Maternity', 'Chronic & Pre-existing', 'COVID-19', 'Out-of-Network Reimbursement', 'Minimum Member Count', 'Maximum members count', 'Payment terms', 'insurer_id'],
  sme_premiums: ['plan_id', 'age', 'emp', 'spouse', 'child', 'start_date', 'end_date'],
  motor_brands: ['name'],
  motor_models: ['brandId', 'name'],
  motor_plans: ['insurerId', 'insurerName', 'name', 'baseRate', 'tplLimit', 'deductible', 'agencyRepair', 'naturalPerils', 'roadsideAssistance', 'totalLoss', 'theft', 'expiryDate'],
  sme_quotations: ['premium', 'status', 'notes'],
  motor_quotations: ['brand', 'model', 'year', 'premium', 'status', 'notes'],
  reference_list: ['category', 'key', 'value', 'is_active']
};

export default function SystemDatabaseManagerPage() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeCollection, setActiveCollection] = useState<string>('industries');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  // Dynamic form data
  const [formData, setFormData] = useState<any>({});
  
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Excel states
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Controlled pagination state to prevent page index state reset loops
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const fetchAllFromTable = async (tableName: string) => {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.from(tableName).select('*').range(from, from + batchSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(data);
        if (data.length < batchSize) {
          hasMore = false;
        } else {
          from += batchSize;
        }
      }
    }
    return allData;
  };

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
    { id: 'contact_roles', label: 'Contact Roles', icon: UsersIcon },
    { id: 'role_levels', label: t('roleLevels' as any) || 'Role Levels', icon: Shield },
    { id: 'benefit_categories', label: 'Benefit Categories', icon: Shield },
    { id: 'coverage_types', label: 'Coverage Types', icon: Shield },
    { id: 'eligibility_types', label: 'Eligibility Types', icon: Shield },
    { id: 'rule_types', label: 'Rule Types', icon: Shield }
  ], [t]);

  const APP_DATABASES = useMemo(() => [
    { id: 'companies', label: t('companies'), icon: Building2 },
    { id: 'contacts', label: t('contacts'), icon: UsersIcon },
    { id: 'activities', label: t('activities'), icon: FileText },
    { id: 'census_members', label: t('census'), icon: UsersIcon },
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
    { id: 'reference_list', label: 'Reference List', icon: Database },
  ], [t]);

  const isLookupList = LOOKUP_LISTS.some(c => c.id === activeCollection);
  const collectionPath = (isLookupList && activeCollection !== 'contact_roles') ? `master_${activeCollection}` : activeCollection;

  const { data: recordsData, isLoading } = useSupabaseCollection<any>(collectionPath, undefined, { fetchAll: true });
  const { data: insurersList } = useSupabaseCollection<any>('insurance_companies');
  const { data: plansList } = useSupabaseCollection<any>('sme_plans', undefined, { fetchAll: true });
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
      
      queryClient.invalidateQueries({ queryKey: ['supabase', collectionPath] });
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
      queryClient.invalidateQueries({ queryKey: ['supabase', collectionPath] });
      toast({ title: "Record deleted" });
      setDeleteDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message || "An error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const idsToDelete = selectedRows.map(row => row.original.id);
      
      // Batch deletions to prevent URL length limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(collectionPath).delete().in('id', batch);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['supabase', collectionPath] });
      toast({ title: `${selectedRows.length} records deleted` });
      setRowSelection({});
      setBulkDeleteDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Bulk delete failed", description: err.message || "An error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => {
    const selectCol = {
      id: "select",
      header: ({ table }: any) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          aria-label="Select all"
          className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4 cursor-pointer"
        />
      ),
      cell: ({ row }: { row: any }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          aria-label="Select row"
          className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    if (isLookupList) {
      return [
        selectCol,
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
          selectCol,
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
            let val = row.original[key];
            
            // Explicitly resolve plan ID casing variations and show the raw plan ID string
            if (activeCollection === 'sme_premiums' && (key === 'plan_id' || key === 'planId' || key === 'Plan ID')) {
              val = row.original.plan_id || row.original.planId || row.original['Plan ID'] || val;
              return <span className="font-mono font-bold text-slate-800">{String(val || '-')}</span>;
            }
            
            if (activeCollection === 'sme_plans' && key === 'insurer_id') {
              const matchedInsurer = insurersList?.find(ins => ins.id === val);
              return <span>{matchedInsurer ? (lang === 'ar' ? (matchedInsurer.companyNameAr || matchedInsurer.companyName) : matchedInsurer.companyName) : (val || '-')}</span>;
            }
            if (typeof val === 'object' && val !== null) return <Badge variant="outline">Object</Badge>;
            if (typeof val === 'number') return <span className="font-mono">{val}</span>;
            return <span className="truncate max-w-[150px] inline-block">{String(val || '-')}</span>;
          }
        }));

      const actionCol = {
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
      };

      return [selectCol, ...cols, actionCol];
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
    // Reset row selection on database collection switch
    setRowSelection({});
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
    onRowSelectionChange: setRowSelection,
    getRowId: (row: any) => row.id,
    autoResetPageIndex: false,
    state: { sorting, globalFilter, pagination, rowSelection },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const pageRowsCount = table.getRowModel().rows.length;
  const selectedPageRowsCount = table.getRowModel().rows.filter(row => row.getIsSelected()).length;
  const isAllPageSelected = selectedPageRowsCount === pageRowsCount && pageRowsCount > 0;
  const totalRowsCount = table.getFilteredRowModel().rows.length;
  const isAllRowsSelected = table.getIsAllRowsSelected();

  // Export / Import Logic
  const handleDownload = async () => {
    const XLSX = await import('xlsx');
    let data: any[] = [];
    let fileName = `${activeCollection}_export.xlsx`;

    if (activeCollection === 'census_members') {
      try {
        const dbRecords = await fetchAllFromTable('census_members');
        if (dbRecords && dbRecords.length > 0) {
          data = dbRecords.map(item => ({
            "Insurance Company Name": item.insurance_company_name || "",
            "Insurance company Code": item.insurance_company_code || "",
            "insurance line": item.insurance_line || "Medical",
            "Policy Name": item.policy_name || "",
            "Policy Number": item.policy_number || "",
            "TPA Name": item.tpa_name || "",
            "Start Date": item.start_date || "",
            "Expiry Date": item.expiry_date || "",
            "Insurer ID": item.member_code || "",
            "Staff ID": item.staff_code || "",
            "Individual ID": item.member_tpa_code || "",
            "Principal ID": item.head_family_code || "",
            "Beneficiary Full Name": item.member_full_name || "",
            "Nationality": item.nationality || "",
            "National ID": item.national_id || "",
            "Date Of Birth": item.date_of_birth || "",
            "Gender": item.gender || "Male",
            "Relation": item.relation || "Employee",
            "Category": item.category || "",
            "Branch": item.branch || "",
            "Area": item.area || "",
            "Department": item.department || "",
            "Job Title": item.job_title || "",
            "Salary": item.salary || 0,
            "Premium": item.premium || 0,
            "Addition Date": item.addition_date || "",
            "Deletion Date": item.deletion_date || "",
            "Mobile Number": item.mobile_number || "",
            "Notes": item.notes || ""
          }));
          fileName = "Census_Data_Export.xlsx";
        } else {
          data = [{}];
          fileName = "Census_Data_Export.xlsx";
        }
      } catch (err) {
        data = [{}];
        fileName = "Census_Data_Export.xlsx";
      }
      const ws = XLSX.utils.json_to_sheet(data, { header: CENSUS_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Census");
      XLSX.writeFile(wb, fileName);
      toast({ title: data.length > 1 ? "Export Successful" : "Template Generated" });
      return;
    }

    if (activeCollection === 'sme_plans') {
      try {
        const dbRecords = await fetchAllFromTable('sme_plans');
        if (dbRecords && dbRecords.length > 0) {
          data = dbRecords;
        } else {
          data = SME_PLANS.map(({ expiryDate, ...rest }: any) => rest);
        }
      } catch (err) {
        data = SME_PLANS.map(({ expiryDate, ...rest }: any) => rest);
      }
      fileName = "SME_Insurance_Plans.xlsx";
    } else if (activeCollection === 'sme_premiums') {
      try {
        const dbRecords = await fetchAllFromTable('sme_premiums');
        if (dbRecords && dbRecords.length > 0) {
          data = dbRecords;
        } else {
          const { PLAN_PREMIUMS } = await import('@/lib/pricing-matrix');
          data = Object.entries(PLAN_PREMIUMS).flatMap(([planId, ages]) => {
            return Object.entries(ages).map(([age, prices]) => ({
              id: `${planId}_${age}`,
              plan_id: planId,
              age: parseInt(age, 10),
              emp: prices.emp,
              spouse: prices.spouse,
              child: prices.child
            }));
          });
        }
      } catch (err) {
        const { PLAN_PREMIUMS } = await import('@/lib/pricing-matrix');
        data = Object.entries(PLAN_PREMIUMS).flatMap(([planId, ages]) => {
          return Object.entries(ages).map(([age, prices]) => ({
            id: `${planId}_${age}`,
            plan_id: planId,
            age: parseInt(age, 10),
            emp: prices.emp,
            spouse: prices.spouse,
            child: prices.child
          }));
        });
      }
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
        const dbRecords = await fetchAllFromTable(collectionPath);
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

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      let headers: string[] = [];
      
      if (activeCollection === 'census_members') {
        headers = CENSUS_HEADERS;
      } else {
        try {
          const { data: records, error } = await supabase.from(collectionPath).select('*').limit(1);
          if (!error && records && records.length > 0) {
            headers = Object.keys(records[0]).filter(k => !['id', 'created_at', 'updated_at', 'user_id'].includes(k));
          }
        } catch (err) {
          console.error("Failed to fetch column template from DB, using fallback", err);
        }
        
        if (headers.length === 0) {
          headers = DEFAULT_TEMPLATE_HEADERS[activeCollection] || ['code', 'name', 'name_ar'];
        }
      }
      
      const emptyRow = headers.reduce((acc: any, header) => {
        acc[header] = "";
        return acc;
      }, {});
      
      const ws = XLSX.utils.json_to_sheet([emptyRow], { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      const fileName = `${activeCollection}_template.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast({ title: "Template Downloaded", description: `Template for ${activeMeta?.label || activeCollection} has been downloaded.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Template Download Failed", description: err.message || "Could not generate template." });
    }
  };

  const processFile = (file: File) => {
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
        if (activeCollection === 'census_members') {
          const mappedData = data.map(item => ({
            insurance_company_name: item["Insurance Company Name"] || "",
            insurance_company_code: item["Insurance company Code"] || "",
            insurance_line: item["insurance line"] || "Medical",
            policy_name: item["Policy Name"] || "",
            policy_number: item["Policy Number"] || "",
            tpa_name: item["TPA Name"] || "",
            start_date: item["Start Date"] ? new Date(item["Start Date"]).toISOString() : null,
            expiry_date: item["Expiry Date"] ? new Date(item["Expiry Date"]).toISOString() : null,
            member_code: item["Insurer ID"] || item["Member Ins Code"] || "",
            staff_code: item["Staff ID"] || item["Staff Code"] || "",
            member_tpa_code: item["Individual ID"] || item["Member TPA Code"] || "",
            head_family_code: item["Principal ID"] || item["Head Family Code"] || "",
            member_full_name: item["Beneficiary Full Name"] || item["Member Full Name"] || "",
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
          const { error } = await supabase.from("census_members").upsert(sanitizeUUIDs(mappedData));
          if (error) throw error;
        } else if (activeCollection === 'sme_premiums') {
          const finalData = data.map(item => {
            const planId = item.plan_id || item.planId;
            const age = item.age;
            const startDate = item.start_date || item.startDate || '2026-01-01';
            const endDate = item.end_date || item.endDate || '2026-12-31';
            const idVal = (item.id && String(item.id).trim() !== "") ? item.id : `${planId}_${age}_${startDate}`;
            return {
              id: idVal,
              plan_id: planId,
              age: parseInt(age, 10),
              emp: parseFloat(item.emp || 0),
              spouse: parseFloat(item.spouse || 0),
              child: parseFloat(item.child || 0),
              start_date: startDate,
              end_date: endDate,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });
          const { error } = await supabase.from('sme_premiums').upsert(sanitizeUUIDs(finalData));
          if (error) throw error;
        } else if (activeCollection === 'sme_plans') {
          const finalData = data.map(item => {
            const planId = (item.id && String(item.id).trim() !== "")
              ? item.id 
              : (item["Plan ID"] || item.plan_id || generateUUID());
            return {
              ...item,
              id: planId,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });
          const { error } = await supabase.from('sme_plans').upsert(sanitizeUUIDs(finalData));
          if (error) throw error;
        } else {
          const finalData = data.map(item => {
            const idVal = (item.id && String(item.id).trim() !== "") ? item.id : generateUUID();
            return {
              ...item,
              id: idVal,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });
          const { error } = await supabase.from(collectionPath).upsert(sanitizeUUIDs(finalData));
        }

        queryClient.invalidateQueries({ queryKey: ['supabase', collectionPath] });
        toast({ title: "Upload Successful", description: `${data.length} records processed.` });
        setImportDialogOpen(false);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: err.message || "An error occurred during import." });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
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
            {selectedRows.length > 0 && (
              <Button 
                variant="destructive" 
                className="h-10 animate-fade-in shadow-sm bg-red-600 hover:bg-red-700 text-white border-none"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={isProcessing || isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedRows.length})
              </Button>
            )}
            <Button variant="outline" className="h-10 border-indigo-200 text-indigo-700 bg-primary/10 hover:bg-indigo-100" onClick={handleDownload} disabled={isProcessing}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" className="h-10 border-indigo-200 text-indigo-700 bg-primary/10 hover:bg-indigo-100" onClick={() => setImportDialogOpen(true)} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Import
            </Button>
            <Button onClick={handleAddNew} className="h-10 bg-primary hover:bg-indigo-700 shadow-sm" disabled={isProcessing}>
              <Plus className="w-4 h-4 mr-2" />
              {t('add')} Record
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isAllPageSelected && totalRowsCount > pageRowsCount && !isAllRowsSelected && (
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between animate-fade-in mb-4">
              <span>All <strong>{pageRowsCount}</strong> records on this page are selected.</span>
              <button 
                onClick={() => table.toggleAllRowsSelected(true)} 
                className="font-bold text-primary underline hover:text-indigo-800 transition-colors ml-2"
              >
                Select all {totalRowsCount} records in {activeMeta?.label}
              </button>
            </div>
          )}
          {isAllRowsSelected && totalRowsCount > pageRowsCount && (
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between animate-fade-in mb-4">
              <span>All <strong>{totalRowsCount}</strong> records in {activeMeta?.label} are selected.</span>
              <button 
                onClick={() => table.toggleAllRowsSelected(false)} 
                className="font-bold text-destructive underline hover:text-red-800 transition-colors ml-2"
              >
                Clear selection
              </button>
            </div>
          )}
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
                  ) : activeCollection === 'sme_plans' && key === 'insurer_id' ? (
                    <Select
                      value={formData[key] || ''}
                      onValueChange={(val) => {
                        const matchedInsurer = insurersList?.find(ins => ins.id === val);
                        setFormData({
                          ...formData,
                          insurer_id: val,
                          "Company Name": matchedInsurer ? matchedInsurer.companyName : formData["Company Name"]
                        });
                      }}
                    >
                      <SelectTrigger className="h-10 bg-background border-border">
                        <SelectValue placeholder="Select Insurance Company" />
                      </SelectTrigger>
                      <SelectContent>
                        {insurersList?.map(ins => (
                          <SelectItem key={ins.id} value={ins.id}>
                            {lang === 'ar' ? (ins.companyNameAr || ins.companyName) : ins.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : activeCollection === 'sme_plans' && key === 'Company Name' ? (
                    <Input 
                      value={formData[key] || ''} 
                      readOnly 
                      placeholder="Synced automatically with Insurer selection"
                      className="bg-slate-50 cursor-not-allowed" 
                    />
                  ) : activeCollection === 'sme_premiums' && (key === 'plan_id' || key === 'planId' || key === 'Plan ID') ? (
                    <Select
                      value={formData[key] || ''}
                      onValueChange={(val) => {
                        setFormData({
                          ...formData,
                          [key]: val
                        });
                      }}
                    >
                      <SelectTrigger className="h-10 bg-background border-border">
                        <SelectValue placeholder="Select Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plansList && plansList.length > 0 ? (
                          plansList.map(plan => {
                            const planVal = plan.id;
                            const planName = plan["Plan Name"] || plan.name || plan.id;
                            const companyName = plan["Company Name"] || plan.company || "";
                            return (
                              <SelectItem key={planVal} value={planVal}>
                                {planName} {companyName ? `(${companyName})` : ''} [{planVal}]
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value={formData[key] || 'no-plans'} disabled>
                            {formData[key] || 'No plans available'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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

      <FormDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title={`Import ${activeMeta?.label || ''}`}
        description={`Follow the steps below to populate or update the ${activeMeta?.label || 'selected'} list.`}
        size="default"
      >
        <div className="space-y-6 py-2">
          {/* Step 1: Download Template */}
          <div className="border border-border rounded-2xl p-5 bg-card hover:bg-slate-50/50 transition-colors group">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                <Download className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-foreground text-sm tracking-tight">Step 1: Download Template</h4>
                <p className="text-xs text-muted-foreground leading-normal">
                  Get the standard template Excel sheet formatted for {activeMeta?.label || 'this list'}.
                </p>
                <div className="pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-9 border-indigo-200 text-indigo-700 bg-primary/10 hover:bg-indigo-100 font-medium"
                    onClick={handleDownloadTemplate}
                    disabled={isProcessing}
                  >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Upload Data */}
          <div 
            className={cn(
              "border border-dashed rounded-2xl p-6 bg-card flex flex-col items-center justify-center text-center space-y-4 transition-colors cursor-pointer group min-h-[180px]",
              dragActive ? "border-[#2A75F3] bg-primary/5" : "border-border hover:border-indigo-400"
            )}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="p-4 bg-primary/5 rounded-full text-indigo-500 group-hover:scale-110 transition-transform">
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground text-sm tracking-tight">
                {isProcessing ? "Processing File..." : "Step 2: Upload Excel File"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-normal">
                {isProcessing 
                  ? "We are currently importing your records into the database..." 
                  : "Drag & drop your filled Excel template here, or click to browse files."
                }
              </p>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleFileUpload} 
              disabled={isProcessing}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>Close</Button>
          </div>
        </div>
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Bulk Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the {selectedRows.length} selected record(s)? This action is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('deletePermanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
