'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  FileText, Building2, Calendar, DollarSign, Users, Edit, Trash2, 
  Plus, Upload, FileSpreadsheet, Paperclip, Loader2, CheckCircle2,
  X, Briefcase, User, Download
} from "lucide-react";
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
import { ContactService, SyncContactPayload } from "@/services/contact.service";
import { useUser } from "@/lib/auth-provider";
import FormDialog from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/empty-state";
import { sanitizePayload } from "@/lib/sanitize";
import { useToast } from "@/lib/hooks/use-toast";
import { formatCompactNumber } from "@/lib/utils";
import type { Policy, Company, InsuranceCompany, TPA, User as AppUser, PolicyMember, InsurerAccountManager } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from 'xlsx';
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/components/i18n-context";
import { TranslationSchema } from "@/lib/i18n";

// Supabase Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { PolicyService } from "@/services/policy.service";

const POLICY_TYPES = ["medical", "life", "motor", "property", "liability", "travel"];
const POLICY_STATUSES = ["draft", "pending", "active", "cancelled", "expired", "renewed"];

const emptyForm: Omit<Policy, 'id' | 'created_at'> = {
  policy_number: "",
  client_company_name: "",
  client_company_id: "",
  insurer_name: "",
  insurer_id: "",
  tpa_name: "",
  tpa_id: "",
  policy_type: "medical",
  start_date: "",
  end_date: "",
  premium_total: 0,
  premium_gross: 0,
  contract_net: 0,
  fee_percent: 0,
  insurer_account_managers: [{ name: "", phone: "", email: "" }],
  sales_person: "",
  iwib_account_manager_id: "",
  iwib_account_manager_name: "",
  contract_document_url: "",
  related_documents: [],
  policy_status: "draft",
  member_count: 0,
  payment_frequency: "Annual"
};

export default function Policies() {
  const { t, isRtl } = useI18n();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [formData, setFormData] = useState<Omit<Policy, 'id' | 'created_at'>>(emptyForm);
  const [isSubmitting, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [memberFile, setMemberFile] = useState<File | null>(null);
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Supabase Collection Hooks — explicit column projections to reduce over-fetching
  const { data: policiesData, isLoading } = useSupabaseCollection<Policy>('policies', undefined, {
    filterKey: 'policies-all',
  });
  // Companies: id/name only for linking client
  const { data: companiesData } = useSupabaseCollection<any>('companies', undefined, {
    select: 'id, name',
    filterKey: 'companies-policies-lookup',
  });
  // Insurers: id/companyName for dropdown
  const { data: insurersData } = useSupabaseCollection<any>('insurance_companies', undefined, {
    select: 'id, companyName',
    filterKey: 'insurers-dropdown',
  });
  // Users: id/name for account manager dropdown
  const { data: usersData } = useSupabaseCollection<any>('users', undefined, {
    select: 'id, name',
    filterKey: 'users-dropdown',
  });
  // TPAs: id/name for dropdown
  const { data: tpasData } = useSupabaseCollection<any>('tpas', undefined, {
    select: 'id, name',
    filterKey: 'tpas-dropdown',
  });

  const policies = policiesData || [];
  const companies = companiesData || [];
  const insurers = insurersData || [];
  const users = usersData || [];
  const tpas = tpasData || [];
  const { user: authUser } = useUser();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const handleFileUpload = async (file: File, path: string, field: string) => {
    try {
      setUploadProgress(prev => ({ ...prev, [field]: 30 }));
      const publicUrl = await PolicyService.uploadFile(file, path);
      setUploadProgress(prev => ({ ...prev, [field]: 100 }));
      return publicUrl;
    } catch (err: any) {
      setUploadProgress(prev => ({ ...prev, [field]: 0 }));
      console.error("Storage upload failed:", err);
      toast({ variant: 'destructive', title: 'File upload failed', description: err?.message });
      throw err;
    }
  };

  const excelDateToISO = (value: any) => {
    if (!value) return "";
    if (typeof value === 'string' && value.includes('-')) return value;
    
    // Handle Excel numeric date format
    const serial = Number(value);
    if (!isNaN(serial) && serial > 10000) { // Likely an Excel serial date
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    
    return value;
  };

  const handleExcelParse = async (file: File): Promise<Omit<PolicyMember, 'id' | 'policy_id'>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          const members = jsonData.map((row: any) => ({
            member_name: row['Member Name'] || "",
            member_id_insurance: row['Member Ins Code'] || "",
            staff_code: row['Staff Code'] || "",
            member_id_tpa: row['Member TPA Code'] || "",
            date_of_birth: excelDateToISO(row['Date Of Birth']) || null,
            gender: row['Gender'] || "Male",
            relation: row['Relation'] || "Principal",
            nationality: row['Nationality'] || "",
            national_id: row['National ID'] || "",
            plan_category: row['Plan Category'] || "",
            location: row['Location'] || "",
            department: row['Department'] || "",
            job_title: row['Job Title'] || "",
            premium: Number(row['Premium']) || 0,
            addition_date: excelDateToISO(row['Addition Date']) || null,
            deletion_date: excelDateToISO(row['Deletion Date']) || null,
            mobile_number: row['Mobile Number'] || "",
            notes: row['Notes'] || "",
            created_at: new Date().toISOString()
          }));
          resolve(members);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const downloadTemplate = () => {
    const templateData = [{
      'Member Name': 'John Doe',
      'Member Ins Code': 'M001',
      'Staff Code': 'S001',
      'Member TPA Code': 'T001',
      'Date Of Birth': '1990-01-01',
      'Gender': 'Male',
      'Relation': 'Principal',
      'Nationality': 'Egyptian',
      'National ID': '12345678901234',
      'Plan Category': 'A',
      'Location': 'Cairo',
      'Department': 'IT',
      'Job Title': 'Developer',
      'Premium': 5000,
      'Addition Date': '2024-01-01',
      'Mobile Number': '01234567890',
      'Notes': ''
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members Template");
    XLSX.writeFile(wb, "Policy_Members_Template.xlsx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const sanitizeId = (val: any) => (val === "" || val === "none") ? null : val;
      const sanitizeDate = (val: any) => val === "" ? null : val;

      const policyData = {
        policy_number: formData.policy_number,
        client_company_name: formData.client_company_name,
        client_company_id: sanitizeId(formData.client_company_id),
        insurer_name: formData.insurer_name,
        insurer_id: sanitizeId(formData.insurer_id),
        tpa_name: formData.tpa_name || null,
        tpa_id: sanitizeId(formData.tpa_id),
        policy_type: formData.policy_type || 'medical',
        client_type_id: sanitizeId(formData.client_type_id),
        line_of_business_id: sanitizeId(formData.line_of_business_id),
        product_subtype_id: sanitizeId(formData.product_subtype_id),
        currency_id: sanitizeId(formData.currency_id),
        payment_frequency_id: sanitizeId(formData.payment_frequency_id),
        start_date: sanitizeDate(formData.start_date),
        end_date: sanitizeDate(formData.end_date),
        premium_total: formData.premium_total || 0,
        premium_gross: formData.premium_gross || 0,
        contract_net: formData.contract_net || 0,
        fee_percent: formData.fee_percent || 0,
        insurer_account_managers: formData.insurer_account_managers || [],
        sales_person: formData.sales_person || "",
        iwib_account_manager_id: sanitizeId(formData.iwib_account_manager_id),
        iwib_account_manager_name: formData.iwib_account_manager_name || "",
        contract_document_url: formData.contract_document_url || "",
        related_documents: formData.related_documents || [],
        policy_status: formData.policy_status || 'draft',
        member_count: formData.member_count || 0,
        payment_terms: formData.payment_frequency || 'Annual'
      };

      const clean = sanitizePayload(policyData);
      console.log("[handleSubmit] Policy data to be sent:", clean);
      let policyId = selectedPolicy?.id;
      let membersPayload: any[] | undefined = undefined;

      if (memberFile) {
        membersPayload = await handleExcelParse(memberFile);
      }

      if (selectedPolicy) {
        await PolicyService.updatePolicy(selectedPolicy.id, clean, membersPayload);
        toast({ title: t('saveChanges') || "Changes saved successfully" });
      } else {
        policyId = await PolicyService.createPolicy(clean, membersPayload);
        toast({ title: t('add') || "Added successfully" });
      }

      // Automatically add insurer contacts to the CRM Contacts
      if (formData.insurer_account_managers && formData.insurer_account_managers.length > 0 && policyId) {
        const contactPayloads: SyncContactPayload[] = formData.insurer_account_managers
          .filter((m: any) => m.name && (m.email || m.phone))
          .map((m: any) => ({
            first_name: m.name.split(' ')[0] || m.name,
            last_name: m.name.split(' ').slice(1).join(' ') || '',
            role_name_en: 'Account Manager',
            email: m.email || '',
            phone: m.phone || '',
            company_name: clean.insurer_name || '',
            linked_policy_id: policyId,
            entity_type: 'policy',
            entity_id: policyId
          }));

        if (contactPayloads.length > 0) {
          ContactService.syncMultipleContacts(contactPayloads, authUser, 'Policies Module').then((ids) => {
            if (ids.length > 0) {
              queryClient.invalidateQueries({ queryKey: ['supabase', 'contacts'] });
              toast({ title: "Contacts automatically synced to CRM Contacts" });
            }
          });
        }
      }

      if (memberFile) {
        toast({ title: t('analysisComplete') || "Analysis complete" });
      }

      queryClient.invalidateQueries({ queryKey: ['supabase', 'policies'] });
      setDialogOpen(false);
      setFormData(emptyForm);
      setMemberFile(null);
      setSelectedPolicy(null);
    } catch (error: any) {
      console.error("Error saving policy:", error);
      toast({ 
        title: "An error occurred.", 
        description: error.message || "Failed to save policy and members.",
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAccountManager = () => {
    const managers = formData.insurer_account_managers || [];
    if (managers.length < 3) {
      setFormData({
        ...formData,
        insurer_account_managers: [...managers, { name: "", phone: "", email: "" }]
      });
    }
  };

  const columns = [
    {
      header: t('businessDetails'),
      accessorKey: "policy_number",
      cell: ({row}: any) => {
        const policy = row.original as Policy;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">{policy.policy_number}</p>
              <p className="text-xs text-muted-foreground capitalize">{policy.policy_type} • {policy.insurer_name}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: t('status_client'),
      accessorKey: "client_company_name",
    },
    {
      header: t('totalPremium'),
      accessorKey: "contract_net",
      cell: ({row}: any) => (
        <span className="font-medium text-foreground">
          {formatCompactNumber(row.original.contract_net || 0)}
        </span>
      )
    },
    {
      header: t('status'),
      accessorKey: "policy_status",
      cell: ({row}: any) => <StatusBadge status={row.original.policy_status} />
    },
    {
      header: t('period') || "Period",
      accessorKey: "start_date",
      cell: ({row}: any) => (
        <div className="text-xs">
          <p>{row.original.start_date ? format(new Date(row.original.start_date), 'MMM d, yyyy') : '-'}</p>
          <p className="text-slate-400">{t('to') || "to"} {row.original.end_date ? format(new Date(row.original.end_date), 'MMM d, yyyy') : '-'}</p>
        </div>
      )
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({row}: any) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setSelectedPolicy(row.original); setDeleteDialogOpen(true); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const table = useReactTable({
    data: policies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting, globalFilter },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('policies')}
        onAction={() => { 
          const rand = Math.floor(100000 + Math.random() * 900000);
          setFormData({
            ...emptyForm,
            policy_number: `POL-${rand}`
          }); 
          setDialogOpen(true); 
        }}
        actionLabel={t('add')}
        ActionIcon={Plus}
      />

      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder={t('searchByNumberClient' as any) || "Search by number or client..."}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        onRowClick={(row) => router.push(`/policies/${row.id}`)}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedPolicy ? t('edit') : t('add')}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8 py-4 px-1">
          {/* Section 1: Basic & Financial */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> {t('finance')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('policyNumber') || "Policy Number"} *</Label>
                <Input value={formData.policy_number || ""} onChange={e => setFormData({...formData, policy_number: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{t('insuranceType')}</Label>
                <Select value={formData.policy_type} onValueChange={v => setFormData({...formData, policy_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POLICY_TYPES.map(t_key => <SelectItem key={t_key} value={t_key}>{t(`type_${t_key}` as keyof TranslationSchema) || t_key}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('status')}</Label>
                <Select value={formData.policy_status} onValueChange={v => setFormData({...formData, policy_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POLICY_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`status_${s}` as keyof TranslationSchema)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('totalPremium')}</Label>
                <Input type="number" value={formData.premium_gross || 0} onChange={e => setFormData({...formData, premium_gross: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{t('totalContractNet' as any) || "Total Contract Net"}</Label>
                <Input type="number" value={formData.contract_net || 0} onChange={e => setFormData({...formData, contract_net: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{t('feePercent') || "Fee"} (%)</Label>
                <Input type="number" step="0.01" value={formData.fee_percent} onChange={e => setFormData({...formData, fee_percent: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{t('paymentFrequency' as any) || "Payment Frequency"}</Label>
                <Select value={formData.payment_frequency} onValueChange={(v: any) => setFormData({...formData, payment_frequency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">{t('frequency_monthly' as any) || "Monthly"}</SelectItem>
                    <SelectItem value="Quarterly">{t('frequency_quarterly' as any) || "Quarterly"}</SelectItem>
                    <SelectItem value="Semi-Annual">{t('frequency_semiannual' as any) || "Semi-Annual"}</SelectItem>
                    <SelectItem value="Annual">{t('frequency_annual' as any) || "Annual"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Partner Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {t('partnersAndPeriods') || "Partners & Periods"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('status_client')} *</Label>
                <Select value={formData.client_company_id} onValueChange={v => {
                  const c = companies.find(x => x.id === v);
                  setFormData({...formData, client_company_id: v, client_company_name: c?.name || ""});
                }}>
                  <SelectTrigger><SelectValue placeholder={t('selectClient') || "Select Client"} /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('insuranceCompanies')} *</Label>
                <Select value={formData.insurer_id} onValueChange={v => {
                  const i = insurers.find(x => x.id === v);
                  setFormData({...formData, insurer_id: v, insurer_name: i?.companyName || ""});
                }}>
                  <SelectTrigger><SelectValue placeholder={t('selectInsurer') || "Select Insurer"} /></SelectTrigger>
                  <SelectContent>{insurers.map(i => <SelectItem key={i.id} value={i.id}>{i.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>TPA Name</Label>
                <Select value={formData.tpa_id || formData.tpa_name || ""} onValueChange={v => {
                  const t = tpas.find((x: any) => x.id === v || x.name === v);
                  setFormData({...formData, tpa_id: t?.id || null, tpa_name: t?.name || v});
                }}>
                  <SelectTrigger><SelectValue placeholder="Select TPA" /></SelectTrigger>
                  <SelectContent>{tpas.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('startDate') || "Start Date"}</Label>
                <Input type="date" value={formData.start_date || ""} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('endDate') || "End Date"}</Label>
                <Input type="date" value={formData.end_date || ""} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Insurer Managers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> {t('insurerAccountManagers') || "Insurer Account Managers"}
              </h3>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleAddAccountManager} 
                disabled={(formData.insurer_account_managers?.length || 0) >= 3}
              >
                <Plus className="w-3 h-3 mr-1" /> {t('add')}
              </Button>
            </div>
            <div className="space-y-3">
              {formData.insurer_account_managers?.map((mgr: InsurerAccountManager, idx: number) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-background rounded-lg relative">
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t('name')}</Label>
                    <Input value={mgr.name} onChange={e => {
                      const newMgrs = [...(formData.insurer_account_managers || [])];
                      newMgrs[idx].name = e.target.value;
                      setFormData({...formData, insurer_account_managers: newMgrs});
                    }} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t('email')}</Label>
                    <Input type="email" value={mgr.email} onChange={e => {
                      const newMgrs = [...(formData.insurer_account_managers || [])];
                      newMgrs[idx].email = e.target.value;
                      setFormData({...formData, insurer_account_managers: newMgrs});
                    }} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t('phone')}</Label>
                    <div className="flex gap-2">
                      <Input value={mgr.phone} onChange={e => {
                        const newMgrs = [...(formData.insurer_account_managers || [])];
                        newMgrs[idx].phone = e.target.value;
                        setFormData({...formData, insurer_account_managers: newMgrs});
                      }} className="h-8 text-xs" />
                      {idx > 0 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => {
                          setFormData({...formData, insurer_account_managers: (formData.insurer_account_managers || []).filter((_: any, i: number) => i !== idx)});
                        }}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section 4: Internal Team */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> {t('internalTeam') || "Internal Team"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('salesPerson') || "Sales Person"}</Label>
                <Select value={formData.sales_person || "none"} onValueChange={v => setFormData({ ...formData, sales_person: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select Sales Person" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users?.map((u: any) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('assignedUser')}</Label>
                <Select value={formData.iwib_account_manager_id} onValueChange={v => {
                  const u = users.find(x => x.id === v);
                  setFormData({...formData, iwib_account_manager_id: v, iwib_account_manager_name: u?.name || ""});
                }}>
                  <SelectTrigger><SelectValue placeholder={t('selectUser') || "Select User"} /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 5: Members Upload */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-success flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> {t('census')}
            </h3>
            <div className="p-6 border-2 border-dashed border-emerald-100 bg-success/10/30 rounded-xl text-center">
              <input type="file" className="hidden" id="excel-upload" accept=".xlsx, .xls" onChange={e => setMemberFile(e.target.files?.[0] || null)} />
              {memberFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold">
                    <FileSpreadsheet className="w-5 h-5" /> {memberFile.name}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="text-destructive border-red-100 hover:bg-destructive/10" onClick={() => setMemberFile(null)}>Remove File</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{t('censusMissingDescription')}</p>
                  <div className="flex justify-center gap-3">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('excel-upload')?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> {t('upload')}
                    </Button>
                    <Button type="button" variant="ghost" onClick={downloadTemplate} className="text-primary hover:text-indigo-700 hover:bg-primary/10">
                      <Download className="w-4 h-4 mr-2" /> {t('downloadTemplate')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Section 6: Documents Upload */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Paperclip className="w-4 h-4" /> {t('documents') || "Documents"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{t('primaryContractDoc') || "Primary Contract Document"}</Label>
                <Input type="file" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await handleFileUpload(file, 'contracts', 'primary');
                    setFormData({...formData, contract_document_url: url});
                  }
                }} />
                {uploadProgress.primary > 0 && <Progress value={uploadProgress.primary} className="h-1" />}
                {formData.contract_document_url && <p className="text-[10px] text-success font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('analysisComplete')}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('relatedDocuments') || "Related Documents"}</Label>
                <Input type="file" multiple onChange={async e => {
                  const files = Array.from(e.target.files || []);
                  const docs = [...(formData.related_documents || [])];
                  for (const file of files) {
                    const url = await handleFileUpload(file, 'related', file.name);
                    docs.push({ name: file.name, url: url });
                  }
                  setFormData({...formData, related_documents: docs});
                }} />
                <div className="space-y-1 mt-2">
                  {formData.related_documents?.map((d: {name: string, url: string}, i: number) => (
                    <div key={i} className="text-[10px] text-muted-foreground flex items-center justify-between bg-card p-1 border rounded">
                      <span className="truncate max-w-[150px]">{d.name}</span>
                      <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => setFormData({...formData, related_documents: (formData.related_documents || []).filter((_: any, idx: number) => idx !== i)})} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700 min-w-[120px]" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedPolicy ? t('save') : t('add'))}
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmationMessage').replace('{name}', '')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (selectedPolicy) {
                  try {
                    await PolicyService.deletePolicy(selectedPolicy.id);
                    toast({ title: t('delete') || "Deleted successfully" });
                    queryClient.invalidateQueries({ queryKey: ['supabase', 'policies'] });
                  } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Delete failed', description: error?.message || String(error) });
                  }
                  setDeleteDialogOpen(false);
                  setSelectedPolicy(null);
                }
              }}
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
