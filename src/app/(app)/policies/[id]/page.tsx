'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText, ChevronLeft, Save, Loader2, Calendar,
  CheckCircle2, Briefcase, DollarSign, Users, AlertCircle,
  Clock, Shield, ArrowUpRight, Download, Upload, Trash2,
  Edit3, Phone, Mail, User, Info, AlertTriangle, ShieldAlert,
  FileSpreadsheet, Sparkles, RefreshCw, MoreVertical, Plus, Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";
import { supabase } from "@/lib/supabase";
import { useSupabaseDoc } from "@/lib/hooks/use-supabase-doc";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { StatusBadge } from "@/components/shared/status-badge";
import * as XLSX from 'xlsx';
import { useQueryClient } from "@tanstack/react-query";
import { ContactService, SyncContactPayload } from "@/lib/services/ContactService";
import { useUser } from "@/lib/auth-provider";

const POLICY_TYPES = ["medical", "life", "motor", "property", "liability", "travel"];
const POLICY_STATUSES = ["active", "pending", "expired", "cancelled"];
const PAYMENT_TERMS_OPTIONS = ["annual", "semi-annual", "quarterly"];

export default function PolicyDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Fetch Policy Doc
  const { data: policy, isLoading: policyLoading, error: policyError } = useSupabaseDoc<any>('policies', id);

  // Fetch Related Collections
  const { data: companies } = useSupabaseCollection<any>('companies');
  const { data: insurers } = useSupabaseCollection<any>('insurance_companies');
  const { data: users } = useSupabaseCollection<any>('users');
  const { data: currencies } = useSupabaseCollection<any>('master_currencies');
  const { data: paymentFrequencies } = useSupabaseCollection<any>('master_payment_frequencies');
  const { data: productTypes } = useSupabaseCollection<any>('master_product_types');
  const { data: productSubtypes } = useSupabaseCollection<any>('master_product_subtypes');
  const { data: clientTypes } = useSupabaseCollection<any>('master_client_types');
  const { data: tpas } = useSupabaseCollection<any>('tpas');
  const { data: contactRoles } = useSupabaseCollection<any>('master_contact_roles');

  // Fetch Policy Members
  const filterMembers = useCallback((q: any) => q.eq('policy_id', id), [id]);
  const { data: members, isLoading: membersLoading } = useSupabaseCollection<any>('policy_members', filterMembers);
  const { user: authUser } = useUser();

  // Initialize Form Data
  useEffect(() => {
    if (policy) {
      setFormData({
        policy_number: policy.policy_number || "",
        client_company_id: policy.client_company_id || "",
        client_company_name: policy.client_company_name || "",
        insurer_id: policy.insurer_id || "",
        insurer_name: policy.insurer_name || "",
        tpa_name: policy.tpa_name || "",
        policy_type: policy.policy_type || "medical",
        line_of_business_id: policy.line_of_business_id || "",
        product_subtype_id: policy.product_subtype_id || "",
        client_type_id: policy.client_type_id || "",
        start_date: policy.start_date || "",
        end_date: policy.end_date || "",
        premium_total: policy.premium_total || 0,
        premium_gross: policy.premium_gross || 0,
        contract_net: policy.contract_net || 0,
        fee_percent: policy.fee_percent || 0,
        broker_commission_percent: policy.broker_commission_percent || 0,
        taxes_percent: policy.taxes_percent || 0,
        currency_id: policy.currency_id || "",
        payment_frequency_id: policy.payment_frequency_id || "",
        payment_terms: policy.payment_terms || "annual",
        sales_person: policy.sales_person || "",
        iwib_account_manager_id: policy.iwib_account_manager_id || "",
        iwib_account_manager_name: policy.iwib_account_manager_name || "",
        policy_status: policy.policy_status || "draft",
        notes: policy.notes || "",
        insurer_contact_title: policy.insurer_contact_title || "",
        insurer_contact_name: policy.insurer_contact_name || "",
        insurer_contact_mobile: policy.insurer_contact_mobile || "",
        insurer_contact_email: policy.insurer_contact_email || "",
        related_documents: policy.related_documents || []
      });
    }
  }, [policy]);

  const selectedCompanyInfo = useMemo(() => {
    if (!companies || (!policy?.client_company_id && !formData.client_company_id)) return null;
    return companies.find((c: any) => c.id === (formData.client_company_id || policy?.client_company_id));
  }, [companies, policy, formData.client_company_id]);

  const filteredSubtypes = useMemo(() => {
    if (!formData.line_of_business_id) return [];
    const selectedLOB = productTypes?.find((pt: any) => pt.id === formData.line_of_business_id);
    if (!selectedLOB) return [];
    return productSubtypes?.filter((ps: any) =>
      ps.product_type_id === selectedLOB.id ||
      ps.category === selectedLOB.name ||
      ps.category === selectedLOB.name_en ||
      ps.category_en === selectedLOB.name_en
    ) || [];
  }, [formData.line_of_business_id, productTypes, productSubtypes]);

  // Statistics & Calculations
  const stats = useMemo(() => {
    if (!policy) return { daysLeft: 0, totalMembers: 0, activeMembers: 0 };

    // Countdown
    const daysLeft = policy.end_date
      ? differenceInDays(new Date(policy.end_date), new Date())
      : 0;

    // Census counts
    const total = members?.length || 0;
    const active = members?.filter((m: any) => m.status === 'active' || !m.deletion_date)?.length || 0;

    return { daysLeft, totalMembers: total, activeMembers: active };
  }, [policy, members]);

  // Handle Save Update
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedCompany = companies?.find(c => c.id === formData.client_company_id);
      const selectedInsurer = insurers?.find(i => i.id === formData.insurer_id);
      const selectedUser = users?.find(u => u.id === formData.iwib_account_manager_id);

      const sanitizeId = (val: any) => (val === "" || val === "none") ? null : val;
      const sanitizeDate = (val: any) => val === "" ? null : val;

      const {
        notes,
        insurer_contact_title,
        insurer_contact_name,
        insurer_contact_mobile,
        insurer_contact_email,
        insurer_contact_role_id,
        ...restFormData
      } = formData;
      const updateData = {
        ...restFormData,
        client_company_name: selectedCompany?.name || formData.client_company_name,
        insurer_name: selectedInsurer?.companyName || formData.insurer_name,
        iwib_account_manager_name: selectedUser?.name || formData.iwib_account_manager_name,
        member_count: stats.totalMembers,
        client_company_id: sanitizeId(formData.client_company_id),
        insurer_id: sanitizeId(formData.insurer_id),
        iwib_account_manager_id: sanitizeId(formData.iwib_account_manager_id),
        client_type_id: sanitizeId(formData.client_type_id),
        line_of_business_id: sanitizeId(formData.line_of_business_id),
        product_subtype_id: sanitizeId(formData.product_subtype_id),
        tpa_id: sanitizeId(formData.tpa_id),
        currency_id: sanitizeId(formData.currency_id),
        payment_frequency_id: sanitizeId(formData.payment_frequency_id),
        start_date: sanitizeDate(formData.start_date),
        end_date: sanitizeDate(formData.end_date)
      };

      const { error } = await supabase
        .from('policies')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Automatically add insurer contact to the CRM Contacts
      if (formData.insurer_contact_name && (formData.insurer_contact_email || formData.insurer_contact_mobile)) {
        const contactPayload: SyncContactPayload = {
          first_name: formData.insurer_contact_name.split(' ')[0] || formData.insurer_contact_name,
          last_name: formData.insurer_contact_name.split(' ').slice(1).join(' ') || '',
          role_id: formData.insurer_contact_role_id || '',
          role_name_en: formData.insurer_contact_title || 'Insurer Contact',
          email: formData.insurer_contact_email || '',
          phone: formData.insurer_contact_mobile || '',
          company_name: updateData.insurer_name || '',
          linked_policy_id: id,
          entity_type: 'policy',
          entity_id: id
        };

        ContactService.syncContact(contactPayload, authUser, 'Policy Details').then((contactId) => {
          if (contactId) {
            queryClient.invalidateQueries({ queryKey: ['supabase', 'contacts'] });
            toast({ title: "Insurer Contact automatically synced to CRM Contacts" });
          }
        });
      }

      queryClient.invalidateQueries({ queryKey: ['supabase', 'policies', id] });
      toast({ title: "Policy updated successfully" });
      setEditMode(false);
    } catch (err: any) {
      console.error("Save Error:", JSON.stringify(err, null, 2));
      toast({ variant: 'destructive', title: "Update failed", description: err.message || "Unknown error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Policy Number
  const handleAutoGeneratePolicyNumber = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    setFormData({ ...formData, policy_number: `POL-${rand}` });
    toast({ title: "Generated automatic policy number" });
  };

  // File Upload Helper
  const uploadFileToStorage = async (file: File, type: 'policy' | 'endorsement' | 'census') => {
    try {
      setUploadingDocType(type);
      setUploadProgress(prev => ({ ...prev, [type]: 20 }));

      const fileName = `policies/${id}/${type}/${Date.now()}_${file.name}`;

      setUploadProgress(prev => ({ ...prev, [type]: 50 }));
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      setUploadProgress(prev => ({ ...prev, [type]: 80 }));
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const updatedDocs = [...(formData.related_documents || [])];
      updatedDocs.push({
        name: file.name,
        url: publicUrl,
        type: type,
        uploaded_at: new Date().toISOString()
      });

      const { error: updateError } = await supabase
        .from('policies')
        .update({ related_documents: updatedDocs })
        .eq('id', id);

      if (updateError) throw updateError;

      setFormData((prev: any) => ({ ...prev, related_documents: updatedDocs }));
      queryClient.invalidateQueries({ queryKey: ['supabase', 'policies', id] });
      setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      toast({ title: `${file.name} uploaded successfully!` });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    } finally {
      setUploadingDocType(null);
    }
  };

  // Parse Census File
  const handleCensusExcelUpload = async (file: File) => {
    try {
      setUploadingDocType('census');
      setUploadProgress(prev => ({ ...prev, census: 10 }));

      // Parse file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          setUploadProgress(prev => ({ ...prev, census: 40 }));

          const membersPayload = jsonData.map((row: any) => ({
            policy_id: id,
            member_name: row['Member Name'] || "",
            member_code: row['Member Code'] || "",
            staff_code: row['Staff Code'] || "",
            date_of_birth: row['Date Of Birth'] || null,
            gender: row['Gender'] || "Male",
            relation: row['Relation'] || "Principal",
            nationality: row['Nationality'] || "",
            national_id: row['National ID'] || "",
            plan_category: row['Plan Category'] || "",
            location: row['Location'] || "",
            department: row['Department'] || "",
            job_title: row['Job Title'] || "",
            premium: Number(row['Premium']) || 0,
            status: row['Status'] || "active",
            created_at: new Date().toISOString()
          }));

          setUploadProgress(prev => ({ ...prev, census: 60 }));

          // Delete old members
          await supabase.from('policy_members').delete().eq('policy_id', id);

          // Insert new ones
          const { error: insertError } = await supabase.from('policy_members').insert(membersPayload);
          if (insertError) throw insertError;

          setUploadProgress(prev => ({ ...prev, census: 80 }));

          // Upload physical file
          await uploadFileToStorage(file, 'census');

          // Invalidate cache
          queryClient.invalidateQueries({ queryKey: ['supabase', 'policy_members'] });
          queryClient.invalidateQueries({ queryKey: ['supabase', 'policies', id] });
          setUploadProgress(prev => ({ ...prev, census: 100 }));
        } catch (err: any) {
          console.error(err);
          toast({ variant: 'destructive', title: 'Excel parsing failed', description: err.message });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Census upload failed', description: err.message });
    } finally {
      setUploadingDocType(null);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [type]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDrop = async (e: React.DragEvent, type: 'policy' | 'endorsement' | 'census') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (type === 'census') {
        await handleCensusExcelUpload(file);
      } else {
        await uploadFileToStorage(file, type);
      }
    }
  };

  // Delete document from related list
  const handleDeleteDoc = async (docIndex: number) => {
    try {
      const updatedDocs = [...(formData.related_documents || [])];
      updatedDocs.splice(docIndex, 1);

      const { error } = await supabase
        .from('policies')
        .update({ related_documents: updatedDocs })
        .eq('id', id);

      if (error) throw error;

      setFormData((prev: any) => ({ ...prev, related_documents: updatedDocs }));
      queryClient.invalidateQueries({ queryKey: ['supabase', 'policies', id] });
      toast({ title: "Document removed successfully" });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Delete failed", description: err.message });
    }
  };

  // Payment Installments list generator
  const paymentTimeline = useMemo(() => {
    if (!policy || !policy.start_date || !policy.end_date) return [];

    const terms = formData.payment_terms || policy.payment_terms || "annual";
    const netPremium = formData.contract_net || policy.contract_net || 0;
    const startDate = new Date(policy.start_date);

    const installments: any[] = [];

    if (terms === 'annual') {
      installments.push({
        label: "Annual Premium",
        percentage: 100,
        amount: netPremium,
        dueDate: startDate,
        status: "due"
      });
    } else if (terms === 'semi-annual') {
      const secondDate = new Date(startDate);
      secondDate.setMonth(secondDate.getMonth() + 6);

      installments.push(
        { label: "1st Installment", percentage: 50, amount: netPremium * 0.5, dueDate: startDate, status: "due" },
        { label: "2nd Installment", percentage: 50, amount: netPremium * 0.5, dueDate: secondDate, status: "upcoming" }
      );
    } else if (terms === 'quarterly') {
      installments.push(
        { label: "1st Quarter", percentage: 25, amount: netPremium * 0.25, dueDate: startDate, status: "due" },
        { label: "2nd Quarter", percentage: 25, amount: netPremium * 0.25, dueDate: new Date(new Date(startDate).setMonth(startDate.getMonth() + 3)), status: "upcoming" },
        { label: "3rd Quarter", percentage: 25, amount: netPremium * 0.25, dueDate: new Date(new Date(startDate).setMonth(startDate.getMonth() + 6)), status: "upcoming" },
        { label: "4th Quarter", percentage: 25, amount: netPremium * 0.25, dueDate: new Date(new Date(startDate).setMonth(startDate.getMonth() + 9)), status: "upcoming" }
      );
    }

    return installments;
  }, [policy, formData.payment_terms, formData.contract_net]);

  // Loading indicator
  if (policyLoading) return (
    <div className="p-8 text-center flex flex-col items-center gap-4 justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-[#2A75F3] border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">{t('loading')}...</p>
    </div>
  );

  if (policyError || !policy) return <div className="p-8 text-center text-slate-500">Policy not found.</div>;

  return (
    <div className={cn("pb-12 max-w-7xl mx-auto space-y-6 antialiased", isRtl && "font-arabic")}>

      {/* Header section matching company detail */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => router.push('/policies')} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-16 h-16 bg-gradient-to-br from-[#2A75F3] to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 leading-none">
                {policy.policy_number}
              </h1>
              <StatusBadge status={policy.policy_status} />
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-sm">
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {policy.client_company_name}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> {policy.insurer_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {editMode ? (
            <>
              <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 rounded-xl border-slate-200" onClick={() => setEditMode(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 md:flex-none h-11 px-6 rounded-xl bg-[#2A75F3] hover:bg-blue-700 text-white shadow-lg shadow-blue-100 gap-2 font-semibold"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('save')}
              </Button>
            </>
          ) : (
            <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 rounded-xl border-slate-200 hover:bg-slate-50 gap-2" onClick={() => setEditMode(true)}>
              <Edit3 className="w-4 h-4" /> {t('edit')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Net Premium" value={`EGP ${(formData.contract_net || policy.contract_net || 0).toLocaleString()}`} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
        <KPICard title="Total Members" value={stats.totalMembers} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <KPICard title="Active Members" value={stats.activeMembers} icon={CheckCircle2} color="text-purple-600" bg="bg-purple-50" />
        <KPICard title="Days to Renewal" value={stats.daysLeft > 0 ? `${stats.daysLeft} Days` : "Expired"} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Main tabs section */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-slate-100/50 p-1 rounded-2xl mb-6 w-full sm:w-auto overflow-x-auto justify-start h-auto">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview & Financials</TabsTrigger>
              <TabsTrigger value="members" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Policy Census {stats.totalMembers > 0 && <Badge className="ml-1.5 h-4 bg-blue-100 text-[#2A75F3] border-none">{stats.totalMembers}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Documents</TabsTrigger>
            </TabsList>

            {/* Overview tab content */}
            <TabsContent value="overview" className="mt-0 space-y-6">

              {/* Policy Overview Block */}
              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#2A75F3]" /> Policy Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Policy Number</Label>
                        <div className="flex gap-2">
                          <Input value={formData.policy_number} onChange={e => setFormData({ ...formData, policy_number: e.target.value })} className="h-10" />
                          <Button type="button" variant="outline" className="h-10 text-xs px-3 shrink-0" onClick={handleAutoGeneratePolicyNumber}>Auto</Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Company Name</Label>
                        <Select value={formData.client_company_id} onValueChange={v => setFormData({ ...formData, client_company_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Insurance Company</Label>
                        <Select value={formData.insurer_id} onValueChange={v => setFormData({ ...formData, insurer_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {insurers?.map(i => <SelectItem key={i.id} value={i.id}>{i.companyName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">TPA Name</Label>
                        <Select value={formData.tpa_id || formData.tpa_name || ""} onValueChange={v => {
                          const t = tpas?.find((x: any) => x.id === v || x.name === v);
                          setFormData({ ...formData, tpa_id: t?.id || null, tpa_name: t?.name || v });
                        }}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select TPA" /></SelectTrigger>
                          <SelectContent>
                            {tpas?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Policy Type</Label>
                        <Select value={formData.policy_type} onValueChange={v => setFormData({ ...formData, policy_type: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {POLICY_TYPES.map(pt => <SelectItem key={pt} value={pt} className="capitalize">{pt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Line of Business</Label>
                        <Select value={formData.line_of_business_id} onValueChange={v => setFormData({ ...formData, line_of_business_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {productTypes?.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Subtype</Label>
                        <Select value={formData.product_subtype_id} onValueChange={v => setFormData({ ...formData, product_subtype_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {filteredSubtypes?.map((ps: any) => <SelectItem key={ps.id} value={ps.id}>{ps.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Client Type</Label>
                        <Select value={formData.client_type_id} onValueChange={v => setFormData({ ...formData, client_type_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {clientTypes?.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Status</Label>
                        <Select value={formData.policy_status} onValueChange={v => setFormData({ ...formData, policy_status: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {POLICY_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <FormInput label="Start Date" type="date" value={formData.start_date} onChange={v => setFormData({ ...formData, start_date: v })} />
                      <FormInput label="End Date" type="date" value={formData.end_date} onChange={v => setFormData({ ...formData, end_date: v })} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      <DetailItem label="Policy Number" value={policy.policy_number} />
                      <DetailItem label="Company Name" value={policy.client_company_name} />
                      <DetailItem label="Insurance Company" value={policy.insurer_name} />
                      <DetailItem label="TPA Name" value={policy.tpa_name || "-"} />
                      <DetailItem label="Line of Business" value={productTypes?.find((pt: any) => pt.id === policy.line_of_business_id)?.name || policy.policy_type} className="capitalize" />
                      <DetailItem label="Subtype" value={productSubtypes?.find((ps: any) => ps.id === policy.product_subtype_id)?.name || "-"} />
                      <DetailItem label="Client Type" value={clientTypes?.find((ct: any) => ct.id === policy.client_type_id)?.name || "-"} />
                      <DetailItem label="Coverage Period" value={`${policy.start_date ? format(new Date(policy.start_date), 'MMM d, yyyy') : ''} to ${policy.end_date ? format(new Date(policy.end_date), 'MMM d, yyyy') : ''}`} />
                      <DetailItem label="Sales Agent" value={policy.sales_person || "-"} />
                      <DetailItem label="Total Employees Count" value={stats.totalMembers} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Company Details Block */}
              {selectedCompanyInfo && (
                <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-500" /> Client Company Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
                      <DetailItem label="Client Code" value={selectedCompanyInfo.code} />
                      <DetailItem label="Industry" value={selectedCompanyInfo.industry} />
                      <DetailItem label="Priority" value={selectedCompanyInfo.priority} className="capitalize" />
                      <DetailItem label="Renewal Month" value={selectedCompanyInfo.renewal_month} />
                      <DetailItem label="Headcount" value={selectedCompanyInfo.employee_count} />
                      <DetailItem label="CR Number" value={selectedCompanyInfo.cr_number} />
                      <DetailItem label="Tax Card" value={selectedCompanyInfo.tax_card} />
                      <DetailItem label="City" value={selectedCompanyInfo.city} />
                      <DetailItem label="Address" value={selectedCompanyInfo.address} />
                      <DetailItem label="Landline" value={selectedCompanyInfo.landline} />
                      <DetailItem label="Website" value={selectedCompanyInfo.website} />
                      <DetailItem label="Source" value={selectedCompanyInfo.source} />
                      <DetailItem label="Assigned Rep" value={selectedCompanyInfo.assigned_user_name} />
                      <DetailItem label="Primary Contact" value={selectedCompanyInfo.primary_contact_name} />
                      <DetailItem label="Contact Phone" value={selectedCompanyInfo.primary_contact_phone} />
                      <DetailItem label="Contact Email" value={selectedCompanyInfo.primary_contact_email} />
                    </div>
                    {selectedCompanyInfo.notes && (
                      <div className="pt-4 border-t border-slate-50">
                        <DetailItem label="Company Notes" value={selectedCompanyInfo.notes} fullWidth />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Financials & Premium Block */}
              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" /> Financials & Premium Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Currency</Label>
                        <Select value={formData.currency_id} onValueChange={v => setFormData({ ...formData, currency_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {currencies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormInput label="Total Premium" type="number" value={formData.premium_total} onChange={v => setFormData({ ...formData, premium_total: Number(v) })} />
                      <FormInput label="Net Premium" type="number" value={formData.contract_net} onChange={v => setFormData({ ...formData, contract_net: Number(v) })} />
                      <FormInput label="Taxes %" type="number" value={formData.taxes_percent} onChange={v => setFormData({ ...formData, taxes_percent: Number(v) })} />
                      <FormInput label="Admin Fee %" type="number" value={formData.fee_percent} onChange={v => setFormData({ ...formData, fee_percent: Number(v) })} />
                      <FormInput label="Broker Commission %" type="number" value={formData.broker_commission_percent} onChange={v => setFormData({ ...formData, broker_commission_percent: Number(v) })} />

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Payment Frequency</Label>
                        <Select value={formData.payment_frequency_id} onValueChange={v => setFormData({ ...formData, payment_frequency_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {paymentFrequencies?.map(pf => <SelectItem key={pf.id} value={pf.id}>{pf.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6">
                        <DetailItem label="Currency" value={currencies?.find((c: any) => c.id === policy.currency_id)?.name || "EGP"} />
                        <DetailItem label="Total Premium" value={(policy.premium_total || 0).toLocaleString()} />
                        <DetailItem label="Net Premium" value={(policy.contract_net || 0).toLocaleString()} />
                        <DetailItem label="Taxes" value={`${policy.taxes_percent || 0}%`} />
                        <DetailItem label="Admin Fee" value={`${policy.fee_percent || 0}%`} />
                        <DetailItem label="Broker Commission" value={`${policy.broker_commission_percent || 0}%`} />
                        <DetailItem label="Payment Frequency" value={paymentFrequencies?.find((pf: any) => pf.id === policy.payment_frequency_id)?.name || policy.payment_terms || "Annual"} className="capitalize" />
                      </div>

                      {/* Payment Timeline Tracker */}
                      <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Payment Timeline Tracker</h4>
                        <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                          {paymentTimeline.map((item, index) => (
                            <div key={index} className="relative">
                              {/* Dot */}
                              <div className={cn(
                                "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                                item.status === 'due' ? "bg-[#2A75F3] ring-4 ring-blue-50" : "bg-slate-300"
                              )} />

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                                  <p className="text-xs text-slate-400">
                                    Due Date: {format(item.dueDate, 'PPPP')} ({item.percentage}%)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge className={cn(
                                    "px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border-none",
                                    item.status === 'due' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                                  )}>
                                    EGP {item.amount.toLocaleString()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Internal Notes block */}
              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> Internal Notes of Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <Textarea
                      placeholder="Type internal notes or instructions here..."
                      value={formData.notes || ''}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      rows={5}
                      className="text-sm bg-slate-50 border-slate-200 focus:bg-white rounded-2xl"
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 whitespace-pre-line leading-relaxed min-h-[100px]">
                      {policy.notes || <span className="text-slate-400 italic">No notes added.</span>}
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            {/* Members / Census tab content */}
            <TabsContent value="members" className="mt-0">
              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-50">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" /> Census Member Roster
                  </CardTitle>

                  {/* Census Template button */}
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => {
                      const templateData = [{
                        'Policy Name (Company)': policy.client_company_name || 'Example Corp',
                        'Policy Number': policy.policy_number || 'POL-12345',
                        'Member Name': 'John Doe',
                        'Member Code': 'M001',
                        'Staff Code': 'S001',
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
                        'Deletion Date': '',
                        'Status': 'active'
                      }];
                      const ws = XLSX.utils.json_to_sheet(templateData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Members");
                      XLSX.writeFile(wb, "Policy_Members_Template.xlsx");
                    }} className="h-9 text-xs rounded-xl gap-1">
                      <Download className="w-3.5 h-3.5" /> Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {membersLoading ? (
                    <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#2A75F3]" /></div>
                  ) : !members || members.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No members in this policy census roster yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Upload an Excel census spreadsheet in the Documents tab to populate the roster.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/70 border-b text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white">
                          <tr>
                            <th className="px-6 py-3">Policy Name</th>
                            <th className="px-6 py-3">Policy Number</th>
                            <th className="px-6 py-3">Member Name</th>
                            <th className="px-6 py-3">Relation</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">National ID</th>
                            <th className="px-6 py-3">Premium</th>
                            <th className="px-6 py-3">Deletion Date</th>
                            <th className="px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {members.map((member: any) => (
                            <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5 font-bold text-slate-800">{member.company_name || policy.client_company_name || "-"}</td>
                              <td className="px-6 py-3.5 font-mono text-xs">{member.policy_number || policy.policy_number || "-"}</td>
                              <td className="px-6 py-3.5 font-bold text-slate-900">
                                {member.member_name}
                                <p className="text-[10px] text-slate-400 mt-0.5">{member.member_code || member.staff_code || "-"}</p>
                              </td>
                              <td className="px-6 py-3.5 capitalize">{member.relation}</td>
                              <td className="px-6 py-3.5">{member.plan_category || "-"}</td>
                              <td className="px-6 py-3.5 font-mono text-xs">{member.national_id || "-"}</td>
                              <td className="px-6 py-3.5 font-bold text-emerald-600">EGP {(member.premium || 0).toLocaleString()}</td>
                              <td className="px-6 py-3.5 text-xs text-red-500">{member.deletion_date || "-"}</td>
                              <td className="px-6 py-3.5">
                                <Badge className={cn(
                                  "px-2 py-0.5 rounded-full border-none text-[9px] uppercase",
                                  member.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                )}>
                                  {member.status || 'Active'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents tab content */}
            <TabsContent value="documents" className="mt-0 space-y-6">

              {/* Document upload grids */}
              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-600" /> Documents Manager
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Policy Contract Drag Drop */}
                    <DragDropUploadZone
                      label="Policy Contract"
                      type="policy"
                      dragActive={dragActive.policy}
                      onDrag={handleDrag}
                      onDrop={handleDrop}
                      onFileSelect={uploadFileToStorage}
                      progress={uploadProgress.policy}
                      isUploading={uploadingDocType === 'policy'}
                    />

                    {/* Endorsements Drag Drop */}
                    <DragDropUploadZone
                      label="Endorsements"
                      type="endorsement"
                      dragActive={dragActive.endorsement}
                      onDrag={handleDrag}
                      onDrop={handleDrop}
                      onFileSelect={uploadFileToStorage}
                      progress={uploadProgress.endorsement}
                      isUploading={uploadingDocType === 'endorsement'}
                    />

                    {/* Census Excel Drag Drop */}
                    <DragDropUploadZone
                      label="Member Census (Excel)"
                      type="census"
                      dragActive={dragActive.census}
                      onDrag={handleDrag}
                      onDrop={handleDrop}
                      onFileSelect={handleCensusExcelUpload}
                      progress={uploadProgress.census}
                      isUploading={uploadingDocType === 'census'}
                      accept=".xlsx, .xls"
                    />

                  </div>

                  {/* List of uploaded documents */}
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Uploaded Documents</h4>
                    {!formData.related_documents || formData.related_documents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No files uploaded yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-50 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                        {formData.related_documents.map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                doc.type === 'policy' ? "bg-blue-100 text-[#2A75F3]" :
                                  doc.type === 'endorsement' ? "bg-amber-100 text-amber-600" :
                                    "bg-purple-100 text-purple-600"
                              )}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{doc.name}</p>
                                <p className="text-[10px] text-slate-400 capitalize">
                                  {doc.type} File • {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy') : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all">
                                <Download className="w-4 h-4" />
                              </a>
                              <button onClick={() => handleDeleteDoc(idx)} className="p-2 text-red-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panel matching company page */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">

          {/* Assigned User & Sales Agent details */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4 text-[#2A75F3]" /> Internal Assigned Staff
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">Sales Agent</Label>
                    <Select value={formData.sales_person || "none"} onValueChange={v => setFormData({ ...formData, sales_person: v === "none" ? "" : v })}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Sales Agent" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {users?.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">IWIB Account Manager</Label>
                    <Select value={formData.iwib_account_manager_id} onValueChange={v => setFormData({ ...formData, iwib_account_manager_id: v })}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#2A75F3] font-bold">
                      {(policy.sales_person || 'U').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{policy.sales_person || "Unassigned"}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Sales Agent</p>
                    </div>
                  </div>
                  <Separator className="bg-slate-50" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold">
                      {(policy.iwib_account_manager_name || 'M').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{policy.iwib_account_manager_name || "Unassigned"}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">IWIB Account Manager</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renewal alerts */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Renewal Countdown & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {stats.daysLeft > 0 ? (
                <div className={cn(
                  "p-4 rounded-2xl border flex items-start gap-3",
                  stats.daysLeft <= 30 ? "bg-red-50 border-red-100 text-red-800" :
                    stats.daysLeft <= 60 ? "bg-orange-50 border-orange-100 text-orange-800" :
                      stats.daysLeft <= 90 ? "bg-amber-50 border-amber-100 text-amber-800" :
                        "bg-emerald-50 border-emerald-100 text-emerald-800"
                )}>
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">Renewal Status</h5>
                    <p className="text-sm font-bold mt-1">{stats.daysLeft} Days remaining</p>
                    <p className="text-[10px] opacity-80 mt-0.5">
                      Expiry date: {policy.end_date ? format(new Date(policy.end_date), 'PPPP') : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border bg-red-50 border-red-100 text-red-800 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">Expired Contract</h5>
                    <p className="text-sm font-bold mt-1">This policy has expired</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insurance Account Manager contact */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" /> Insurer Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {editMode ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">Contact Title</Label>
                    <Select value={formData.insurer_contact_role_id || ""} onValueChange={v => {
                      const selectedRole = contactRoles?.find((r: any) => r.id === v);
                      setFormData({
                        ...formData,
                        insurer_contact_role_id: v,
                        insurer_contact_title: selectedRole?.role_name_en || ""
                      });
                    }}>
                      <SelectTrigger className="h-10 bg-slate-50 border-slate-200 rounded-xl">
                        <SelectValue placeholder="Select Title" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactRoles?.filter((r: any) => r.is_active !== false && r.role_category === 'Insurer').map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.role_name_en}</SelectItem>
                        ))}
                        {contactRoles?.filter((r: any) => r.is_active !== false && r.role_category !== 'Insurer').map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.role_name_en} ({r.role_category})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormInput label="Contact Name" value={formData.insurer_contact_name} onChange={v => setFormData({ ...formData, insurer_contact_name: v })} />
                  <FormInput label="Mobile Number" value={formData.insurer_contact_mobile} onChange={v => setFormData({ ...formData, insurer_contact_mobile: v })} />
                  <FormInput label="Email Address" type="email" value={formData.insurer_contact_email} onChange={v => setFormData({ ...formData, insurer_contact_email: v })} />
                </div>
              ) : (
                <div className="space-y-3 font-semibold text-slate-800 text-sm">
                  {policy.insurer_contact_name ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">{policy.insurer_contact_name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{policy.insurer_contact_title || "Account Manager"}</p>
                        </div>
                      </div>
                      <Separator className="bg-slate-50 my-2" />
                      {policy.insurer_contact_mobile && (
                        <div className="flex items-center gap-2.5 text-xs text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{policy.insurer_contact_mobile}</span>
                        </div>
                      )}
                      {policy.insurer_contact_email && (
                        <div className="flex items-center gap-2.5 text-xs text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{policy.insurer_contact_email}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">No insurer contact assigned.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// Subcomponent: FormInput
function FormInput({ label, value, onChange, type = "text", required = false, dir, noBg = false, className, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl', noBg?: boolean, className?: string, [key: string]: any }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      <Input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        dir={dir}
        className={cn(
          "h-10 border-slate-200 rounded-xl font-medium text-sm transition-all focus:ring-blue-500 focus:border-[#2A75F3]",
          noBg ? "bg-transparent" : "bg-slate-50",
          dir === 'rtl' && "font-arabic"
        )}
        {...props}
      />
    </div>
  );
}

// Subcomponent: DetailItem
function DetailItem({ label, value, className, fullWidth = false }: { label: string; value: any; className?: string; fullWidth?: boolean }) {
  return (
    <div className={cn("space-y-1", fullWidth && "col-span-full", className)}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="text-sm font-semibold text-slate-800 leading-tight">
        {value || <span className="text-slate-300 font-normal italic">Not Provided</span>}
      </div>
    </div>
  );
}

// Subcomponent: KPICard
function KPICard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-1 transition-all hover:shadow-md">
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-xl font-black text-slate-900">{value}</h3>
    </div>
  );
}

// Subcomponent: DragDropUploadZone
function DragDropUploadZone({ label, type, dragActive, onDrag, onDrop, onFileSelect, progress, isUploading, accept = "*" }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0], type);
    }
  };

  return (
    <div
      className={cn(
        "p-6 border-2 border-dashed rounded-2xl text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer min-h-[160px]",
        dragActive ? "border-[#2A75F3] bg-blue-50/20" : "border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300"
      )}
      onDragEnter={(e) => onDrag(e, type)}
      onDragLeave={(e) => onDrag(e, type)}
      onDragOver={(e) => onDrag(e, type)}
      onDrop={(e) => onDrop(e, type)}
      onClick={() => fileInputRef.current?.click()}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept={accept} onChange={handleFileChange} />

      {isUploading ? (
        <div className="space-y-2 w-full">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2A75F3]" />
          <p className="text-xs font-bold text-slate-500">Uploading...</p>
          <Progress value={progress} className="h-1.5 w-full" />
        </div>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">{label}</p>
            <p className="text-[10px] text-slate-400 mt-1">Drag & drop or click to upload</p>
          </div>
        </>
      )}
    </div>
  );
}
