'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";

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
import CreateEndorsementWizard from "@/components/endorsements/create-endorsement-wizard";
import BrokerCommissionSharing from "@/components/policies/broker-commission-sharing";
import PolicyCommissionAgreements from "@/components/policies/policy-commission-agreements";
import { useMasterData } from "@/hooks/use-master-data";
import { SelectGroup, SelectLabel } from "@/components/ui/select";


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
  const [wizardOpen, setWizardOpen] = useState(false);

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

  const { data: industries } = useMasterData('industries');
  const { data: locations } = useMasterData('locations');

  // Fetch Policy Members
  const filterMembers = useCallback((q: any) => q.eq('policy_id', id), [id]);
  const { data: members, isLoading: membersLoading } = useSupabaseCollection<any>('policy_members', filterMembers, {
    filterKey: "policy_members-filter"
  });

  // Fetch Endorsements
  const filterEndorsements = useCallback((q: any) => q.eq('policy_id', id), [id]);
  const { data: endorsementsData, isLoading: endorsementsLoading } = useSupabaseCollection<any>('endorsements', filterEndorsements, {
    filterKey: "endorsements-filter"
  });
  const endorsements = endorsementsData || [];

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
        related_documents: policy.related_documents || [],
        insurer_policy_number: policy.insurer_policy_number || "",
        policy_value: policy.policy_value || 0,
        rate: policy.rate || 0,
        tax_amount: policy.tax_amount || 0,
        tax_type: policy.tax_type || "percentage",
        tpa_fee: policy.tpa_fee || 0,
        tpa_fee_type: policy.tpa_fee_type || "amount",
        medical_brackets: policy.medical_brackets || [],
      });
    }
  }, [policy]);

  const selectedCompanyInfo = useMemo(() => {
    if (!companies || (!policy?.client_company_id && !formData.client_company_id)) return null;
    return companies.find((c: any) => c.id === (formData.client_company_id || policy?.client_company_id));
  }, [companies, policy, formData.client_company_id]);

  useEffect(() => {
    if (selectedCompanyInfo && !formData.company_industry) {
      setFormData((prev: any) => ({
        ...prev,
        company_industry: selectedCompanyInfo.industry || "",
        company_city: selectedCompanyInfo.city || "",
        company_code: selectedCompanyInfo.code || "",
        company_priority: selectedCompanyInfo.priority || "",
        company_renewal_month: selectedCompanyInfo.renewal_month || "",
        company_employee_count: selectedCompanyInfo.employee_count || 0,
        company_cr_number: selectedCompanyInfo.cr_number || "",
        company_tax_card: selectedCompanyInfo.tax_card || "",
        company_address: selectedCompanyInfo.address || "",
        company_landline: selectedCompanyInfo.landline || "",
        company_website: selectedCompanyInfo.website || "",
      }));
    }
  }, [selectedCompanyInfo]);

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

  const isMedicalOrLife = useMemo(() => {
    const ptName = productTypes?.find((pt: any) => pt.id === (formData.line_of_business_id || policy?.line_of_business_id))?.name || policy?.policy_type || "";
    return ptName.toLowerCase().includes("medical") || ptName.toLowerCase().includes("life");
  }, [productTypes, formData.line_of_business_id, policy]);

  // Handle Gross & Net Premium calculations for Non-Medical
  useEffect(() => {
    if (!isMedicalOrLife && editMode) {
      const pv = Number(formData.policy_value) || 0;
      const rt = Number(formData.rate) || 0;
      const gross = (pv * rt) / 100;

      let tax = 0;
      if (formData.tax_type === 'percentage') {
        tax = (gross * (Number(formData.tax_amount) || 0)) / 100;
      } else {
        tax = Number(formData.tax_amount) || 0;
      }

      const net = gross + tax;

      setFormData((prev: any) => {
        if (prev.premium_gross !== gross || prev.contract_net !== net) {
          return { ...prev, premium_gross: gross, contract_net: net, premium_total: net };
        }
        return prev;
      });
    }
  }, [formData.policy_value, formData.rate, formData.tax_amount, formData.tax_type, isMedicalOrLife, editMode]);

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

  // Handle automatic calculation of Medical Brackets Count based on members census
  const calculatedBrackets = useMemo(() => {
    if (!isMedicalOrLife || !members?.length || !formData.medical_brackets) return formData.medical_brackets;
    
    const referenceDate = formData.start_date ? new Date(formData.start_date) : new Date();
    
    const calculateInsuranceAge = (dob: any, refDate: Date) => {
      if (!dob) return 0;
      const birth = new Date(dob);
      const ref = new Date(refDate);
      if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return 0;

      const totalDays = differenceInDays(ref, birth);
      const ageYears = Math.floor(totalDays / 364);
      const remainingDays = totalDays % 364;

      if (remainingDays > 182) {
        return ageYears + 1;
      }
      return ageYears;
    };
    
    return formData.medical_brackets.map((bracket: any) => {
      let count = 0;
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        if (bracket.plan && m.plan_category && m.plan_category.toLowerCase() !== bracket.plan.toLowerCase()) continue;
        if (bracket.relation && m.relation && m.relation.toLowerCase() !== bracket.relation.toLowerCase()) continue;
        
        const age = calculateInsuranceAge(m.date_of_birth, referenceDate);
        const from = Number(bracket.age_from) || 0;
        const to = Number(bracket.age_to) || 999;
        if (age >= from && age <= to) {
          count++;
        }
      }
      return { ...bracket, count };
    });
  }, [members, formData.start_date, formData.medical_brackets, isMedicalOrLife]);

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
        end_date: sanitizeDate(formData.end_date),
        insurer_policy_number: formData.insurer_policy_number,
        policy_value: formData.policy_value,
        rate: formData.rate,
        tax_amount: formData.tax_amount,
        tax_type: formData.tax_type,
        tpa_fee: formData.tpa_fee,
        tpa_fee_type: formData.tpa_fee_type,
        medical_brackets: calculatedBrackets || formData.medical_brackets
      };

      const { error } = await supabase
        .from('policies')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update Company Details if editing
      if (formData.client_company_id) {
        await supabase.from('companies').update({
          industry: formData.company_industry,
          city: formData.company_city,
          priority: formData.company_priority,
          renewal_month: formData.company_renewal_month,
          employee_count: formData.company_employee_count,
          cr_number: formData.company_cr_number,
          tax_card: formData.company_tax_card,
          address: formData.company_address,
          landline: formData.company_landline,
          website: formData.company_website,
        }).eq('id', formData.client_company_id);
      }

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
      const { data: signedData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      if (signedUrlError) throw signedUrlError;

      const updatedDocs = [...(formData.related_documents || [])];
      updatedDocs.push({
        name: file.name,
        url: signedData.signedUrl,
        path: fileName,
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
            member_id_insurance: row['Member ID from Insurance'] || "",
            member_id_tpa: row['Member ID from TPA'] || "",
            date_of_birth: row['Date Of Birth'] || null,
            gender: row['Gender'] || "Male",
            relation: row['Relation'] || "Principal",
            nationality: row['Nationality'] || "",
            national_id: row['National ID'] || "",
            plan_category: row['Plan Category'] || "",
            location: row['Location'] || "",
            department: row['Department'] || "",
            job_title: row['Job Title'] || "",
            addition_date: row['Addition Date'] || new Date().toISOString().split('T')[0],
            deletion_date: row['Deletion Date'] || null,
            created_at: new Date().toISOString()
          }));

          setUploadProgress(prev => ({ ...prev, census: 60 }));

          // Delete old members
          await supabase.from('policy_members').delete().eq('policy_id', id);

          // Insert new ones
          const { error: insertError } = await supabase.from('policy_members').insert(sanitizeUUIDs(membersPayload));
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
      <p className="text-muted-foreground font-medium animate-pulse">{t('loading')}...</p>
    </div>
  );

  if (policyError || !policy) return <div className="p-8 text-center text-muted-foreground">Policy not found.</div>;

  return (
    <div className={cn("pb-12 max-w-7xl mx-auto space-y-6 antialiased", isRtl && "font-arabic")}>

      {/* Header section matching company detail */}
      <div className="bg-card p-6 rounded-3xl shadow-sm border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => router.push('/policies')} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-16 h-16 bg-gradient-to-br from-[#2A75F3] to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-metric text-foreground leading-none">
                {policy.policy_number}
              </h1>
              <StatusBadge status={policy.policy_status} />
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {policy.client_company_name}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> {policy.insurer_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {editMode ? (
            <>
              <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 rounded-xl border-border" onClick={() => setEditMode(false)}>
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
            <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 rounded-xl border-border hover:bg-background gap-2" onClick={() => setEditMode(true)}>
              <Edit3 className="w-4 h-4" /> {t('edit')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Net Premium" value={`EGP ${(formData.contract_net || policy.contract_net || 0).toLocaleString()}`} icon={DollarSign} color="text-success" bg="bg-success/10" />
        <KPICard title="Total Members" value={stats.totalMembers} icon={Users} color="text-primary" bg="bg-primary/10" />
        <KPICard title="Active Members" value={stats.activeMembers} icon={CheckCircle2} color="text-violet-500" bg="bg-violet-50" />
        <KPICard title="Days to Renewal" value={stats.daysLeft > 0 ? `${stats.daysLeft} Days` : "Expired"} icon={Clock} color="text-orange-500" bg="bg-orange-50" />
      </div>

      {/* Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Main tabs section */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          <Tabs defaultValue="overview" className="w-full">
            <div className="w-full overflow-x-auto pb-2 mb-4">
              <TabsList className="bg-slate-100/50 p-1 rounded-2xl w-max min-w-full flex h-auto">
                <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Overview & Financials</TabsTrigger>
                <TabsTrigger value="agreements" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Commission Agreements</TabsTrigger>
                <TabsTrigger value="members" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  Policy Census {stats.totalMembers > 0 && <Badge className="ml-1.5 h-4 bg-blue-100 text-[#2A75F3] border-none">{stats.totalMembers}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="endorsements" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Endorsements</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Documents</TabsTrigger>
              </TabsList>
            </div>

            {/* Overview tab content */}
            <TabsContent value="overview" className="mt-0 space-y-6">

              {/* Policy Overview Block */}
              <Card className="rounded-3xl border-border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#2A75F3]" /> Policy Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Policy Number</Label>
                        <div className="flex gap-2">
                          <Input value={formData.policy_number} onChange={e => setFormData({ ...formData, policy_number: e.target.value })} className="h-10" />
                          <Button type="button" variant="outline" className="h-10 text-xs px-3 shrink-0" onClick={handleAutoGeneratePolicyNumber}>Auto</Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Company Name</Label>
                        <Select value={formData.client_company_id} onValueChange={v => setFormData({ ...formData, client_company_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Insurance Company</Label>
                        <Select value={formData.insurer_id} onValueChange={v => setFormData({ ...formData, insurer_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {insurers?.map(i => <SelectItem key={i.id} value={i.id}>{i.companyName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">TPA Name</Label>
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
                        <Label className="text-xs font-semibold text-muted-foreground">Insurer Policy Number</Label>
                        <Input value={formData.insurer_policy_number || ''} onChange={e => setFormData({ ...formData, insurer_policy_number: e.target.value })} className="h-10" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Line of Business</Label>
                        <Select value={formData.line_of_business_id} onValueChange={v => setFormData({ ...formData, line_of_business_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {productTypes?.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Subtype</Label>
                        <Select value={formData.product_subtype_id} onValueChange={v => setFormData({ ...formData, product_subtype_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {filteredSubtypes?.map((ps: any) => <SelectItem key={ps.id} value={ps.id}>{ps.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Client Type</Label>
                        <Select value={formData.client_type_id} onValueChange={v => setFormData({ ...formData, client_type_id: v })}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {clientTypes?.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
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
                      <DetailItem label="Insurer Policy Number" value={policy.insurer_policy_number} />
                      <DetailItem label="Company Name" value={policy.client_company_name} />
                      <DetailItem label="Insurance Company" value={policy.insurer_name} />
                      <DetailItem label="TPA Name" value={policy.tpa_name || "-"} />
                      <DetailItem label="Line of Business" value={productTypes?.find((pt: any) => pt.id === policy.line_of_business_id)?.name || "-"} className="capitalize" />
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
                <Card className="rounded-3xl border-border shadow-sm bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-500" /> Client Company Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {editMode ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Client Code</Label>
                          <Input value={formData.company_code} readOnly disabled className="h-10 bg-slate-100 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Industry</Label>
                          <Select value={formData.company_industry} onValueChange={v => setFormData({ ...formData, company_industry: v })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {(() => {
                                const groups: Record<string, any[]> = {};
                                industries?.forEach((ind: any) => {
                                  const cat = ind.category_en || ind.category_ar || "Other";
                                  if (!groups[cat]) groups[cat] = [];
                                  groups[cat].push(ind);
                                });
                                return Object.entries(groups).map(([cat, items]) => (
                                  <SelectGroup key={cat}>
                                    <SelectLabel className="text-[10px] font-black text-primary bg-background py-1 px-2">{cat}</SelectLabel>
                                    {items.map((ind: any) => (
                                      <SelectItem key={ind.id} value={ind.subcategory_en || ind.subcategory_ar}>
                                        {ind.subcategory_en || ind.subcategory_ar}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">City</Label>
                          <Select value={formData.company_city} onValueChange={v => setFormData({ ...formData, company_city: v })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {locations?.map((loc: any) => (
                                <SelectItem key={loc.id} value={isRtl ? (loc.name_ar || loc.name_en) : (loc.name_en || loc.name)}>
                                  {isRtl ? (loc.name_ar || loc.name_en) : (loc.name_en || loc.name)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Priority</Label>
                          <Select value={formData.company_priority} onValueChange={v => setFormData({ ...formData, company_priority: v })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Renewal Month</Label>
                          <Select value={formData.company_renewal_month} onValueChange={v => setFormData({ ...formData, company_renewal_month: v })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].map(m => (
                                <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormInput label="Headcount" type="number" value={formData.company_employee_count} onChange={v => setFormData({ ...formData, company_employee_count: Number(v) })} />
                        <FormInput label="CR Number" value={formData.company_cr_number} onChange={v => setFormData({ ...formData, company_cr_number: v })} />
                        <FormInput label="Tax Card" value={formData.company_tax_card} onChange={v => setFormData({ ...formData, company_tax_card: v })} />
                        <FormInput label="Address" value={formData.company_address} onChange={v => setFormData({ ...formData, company_address: v })} />
                        <FormInput label="Landline" value={formData.company_landline} onChange={v => setFormData({ ...formData, company_landline: v })} />
                        <FormInput label="Website" value={formData.company_website} onChange={v => setFormData({ ...formData, company_website: v })} />

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Source</Label>
                          <Input value={selectedCompanyInfo.source || ''} readOnly disabled className="h-10 bg-slate-100 text-muted-foreground" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
                        <DetailItem label="Client Code" value={selectedCompanyInfo.code} />
                        <DetailItem label="Industry" value={selectedCompanyInfo.industry} />
                        <DetailItem label="Priority" value={selectedCompanyInfo.priority} className="capitalize" />
                        <DetailItem label="Renewal Month" value={selectedCompanyInfo.renewal_month} className="capitalize" />
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
                    )}
                    {selectedCompanyInfo.notes && (
                      <div className="pt-4 border-t border-slate-50">
                        <DetailItem label="Company Notes" value={selectedCompanyInfo.notes} fullWidth />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Financials & Premium Block */}
              <Card className="rounded-3xl border-border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-success" /> Financials & Premium Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editMode ? (
                    <div className="space-y-6">
                      {!isMedicalOrLife ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-background border border-border rounded-xl">
                          <FormInput label="Policy Value" type="number" value={formData.policy_value} onChange={v => setFormData({ ...formData, policy_value: Number(v) })} />
                          <FormInput label="Rate (%)" type="number" value={formData.rate} onChange={v => setFormData({ ...formData, rate: Number(v) })} />
                          <FormInput label="Gross Premium" type="number" value={formData.premium_gross} readOnly disabled className="bg-slate-200" onChange={() => { }} />

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground">Tax Type</Label>
                            <Select value={formData.tax_type} onValueChange={v => setFormData({ ...formData, tax_type: v })}>
                              <SelectTrigger className="h-10 bg-card"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="amount">Fixed Amount</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormInput label={`Tax ${formData.tax_type === 'percentage' ? '(%)' : '(Amount)'}`} type="number" value={formData.tax_amount} onChange={v => setFormData({ ...formData, tax_amount: Number(v) })} />
                          <FormInput label="Net Premium" type="number" value={formData.contract_net} readOnly disabled className="bg-success/10 text-emerald-700 font-bold border-emerald-200" onChange={() => { }} />
                        </div>
                      ) : (
                        <div className="p-4 bg-background border border-border rounded-xl space-y-4 overflow-x-auto">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" /> Policy Member Brackets
                          </h4>
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="text-muted-foreground uppercase tracking-wider">
                              <tr>
                                <th className="px-2 py-2">Plan Name</th>
                                <th className="px-2 py-2">Relation</th>
                                <th className="px-2 py-2">Age Range</th>
                                <th className="px-2 py-2">Count</th>
                                <th className="px-2 py-2">Net Premium</th>
                                <th className="px-2 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.medical_brackets?.map((bracket: any, idx: number) => (
                                <tr key={idx} className="border-t border-border">
                                  <td className="px-2 py-2"><Input className="h-8 text-xs w-32" value={bracket.plan} onChange={e => { const b = [...formData.medical_brackets]; b[idx].plan = e.target.value; setFormData({ ...formData, medical_brackets: b }) }} /></td>
                                  <td className="px-2 py-2">
                                    <Select value={bracket.relation} onValueChange={v => { const b = [...formData.medical_brackets]; b[idx].relation = v; setFormData({ ...formData, medical_brackets: b }) }}>
                                      <SelectTrigger className="h-8 text-xs w-24 bg-card"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Principal">Principal</SelectItem>
                                        <SelectItem value="Spouse">Spouse</SelectItem>
                                        <SelectItem value="Child">Child</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-2 py-2 flex items-center gap-1">
                                    <Input type="number" className="h-8 text-xs w-16" value={bracket.age_from} onChange={e => { const b = [...formData.medical_brackets]; b[idx].age_from = e.target.value; setFormData({ ...formData, medical_brackets: b }) }} />
                                    -
                                    <Input type="number" className="h-8 text-xs w-16" value={bracket.age_to} onChange={e => { const b = [...formData.medical_brackets]; b[idx].age_to = e.target.value; setFormData({ ...formData, medical_brackets: b }) }} />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Input
                                      type="number"
                                      className={cn("h-8 text-xs w-16", members && members.length > 0 && "bg-slate-100 text-muted-foreground cursor-not-allowed")}
                                      value={bracket.count}
                                      readOnly={!!(members && members.length > 0)}
                                      onChange={e => { const b = [...formData.medical_brackets]; b[idx].count = e.target.value; setFormData({ ...formData, medical_brackets: b }) }}
                                    />
                                  </td>
                                  <td className="px-2 py-2"><Input type="number" className="h-8 text-xs w-24" value={bracket.net_premium} onChange={e => { const b = [...formData.medical_brackets]; b[idx].net_premium = e.target.value; setFormData({ ...formData, medical_brackets: b }) }} /></td>
                                  <td className="px-2 py-2"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 text-destructive p-0" onClick={() => { const b = [...formData.medical_brackets]; b.splice(idx, 1); setFormData({ ...formData, medical_brackets: b }) }}><Trash2 className="w-4 h-4" /></Button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => { setFormData({ ...formData, medical_brackets: [...(formData.medical_brackets || []), { plan: '', relation: 'Principal', age_from: '', age_to: '', count: '', net_premium: '' }] }) }}>
                            <Plus className="w-3 h-3 mr-1" /> Add Bracket
                          </Button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Currency</Label>
                          <Select value={formData.currency_id} onValueChange={v => setFormData({ ...formData, currency_id: v })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {currencies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Payment Frequency</Label>
                          <Select value={formData.payment_frequency_id} onValueChange={v => setFormData({ ...formData, payment_frequency_id: v })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {paymentFrequencies?.map(pf => <SelectItem key={pf.id} value={pf.id}>{pf.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormInput label="Taxes % (Override)" type="number" value={formData.taxes_percent} onChange={v => setFormData({ ...formData, taxes_percent: Number(v) })} />
                        <FormInput label="Broker Commission %" type="number" value={formData.broker_commission_percent} onChange={v => setFormData({ ...formData, broker_commission_percent: Number(v) })} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6">
                        <DetailItem label="Currency" value={currencies?.find((c: any) => c.id === policy.currency_id)?.name || "EGP"} />
                        {!isMedicalOrLife && (
                          <>
                            <DetailItem label="Policy Value" value={(policy.policy_value || 0).toLocaleString()} />
                            <DetailItem label="Rate" value={`${policy.rate || 0}%`} />
                            <DetailItem label="Gross Premium" value={(policy.premium_gross || 0).toLocaleString()} />
                            <DetailItem label="Tax" value={policy.tax_type === 'percentage' ? `${policy.tax_amount || 0}%` : (policy.tax_amount || 0).toLocaleString()} />
                          </>
                        )}
                        <DetailItem label="Net Premium" value={(policy.contract_net || 0).toLocaleString()} />
                        <DetailItem label="Taxes %" value={`${policy.taxes_percent || 0}%`} />
                        <DetailItem label="Broker Commission %" value={`${policy.broker_commission_percent || 0}%`} />
                        <DetailItem label="Payment Frequency" value={paymentFrequencies?.find((pf: any) => pf.id === policy.payment_frequency_id)?.name || policy.payment_terms || "Annual"} className="capitalize" />
                      </div>

                      {isMedicalOrLife && policy.medical_brackets?.length > 0 && (
                        <div className="pt-6 border-t border-border">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Policy Member Brackets</h4>
                          <div className="bg-background rounded-xl overflow-x-auto border border-border">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-100/50 text-muted-foreground uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="px-4 py-2">Plan</th>
                                  <th className="px-4 py-2">Relation</th>
                                  <th className="px-4 py-2">Age Range</th>
                                  <th className="px-4 py-2">Count</th>
                                  <th className="px-4 py-2">Net Premium</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-small text-slate-700">
                                {policy.medical_brackets.map((b: any, i: number) => (
                                  <tr key={i}>
                                    <td className="px-4 py-2 font-bold text-foreground">{b.plan || '-'}</td>
                                    <td className="px-4 py-2">{b.relation || '-'}</td>
                                    <td className="px-4 py-2">{b.age_from} - {b.age_to}</td>
                                    <td className="px-4 py-2">{b.count}</td>
                                    <td className="px-4 py-2 text-success">{(Number(b.net_premium) || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Payment Timeline Tracker */}
                      <div className="pt-6 border-t border-border">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Payment Timeline Tracker</h4>
                        <div className="relative pl-6 border-l-2 border-border space-y-6">
                          {paymentTimeline.map((item, index) => (
                            <div key={index} className="relative">
                              {/* Dot */}
                              <div className={cn(
                                "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
                                item.status === 'due' ? "bg-[#2A75F3] ring-4 ring-blue-50" : "bg-slate-300"
                              )} />

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <p className="font-bold text-foreground text-sm">{item.label}</p>
                                  <p className="text-xs text-slate-400">
                                    Due Date: {format(item.dueDate, 'PPPP')} ({item.percentage}%)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge className={cn(
                                    "px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border-none",
                                    item.status === 'due' ? "bg-success/10 text-success" : "bg-slate-100 text-muted-foreground"
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

                  {/* Broker Commission Sharing */}
                  <div className="pt-8 border-t border-border">
                    <BrokerCommissionSharing policy={policy} users={users || []} editMode={editMode} />
                  </div>
                </CardContent>
              </Card>

              {/* Internal Notes block */}
              <Card className="rounded-3xl border-border shadow-sm bg-card">
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
                      className="text-sm bg-background border-border focus:bg-card rounded-2xl"
                    />
                  ) : (
                    <div className="p-4 bg-background rounded-2xl border border-border text-sm text-slate-700 whitespace-pre-line leading-relaxed min-h-[100px]">
                      {policy.notes || <span className="text-slate-400 italic">No notes added.</span>}
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            <TabsContent value="agreements" className="mt-0">
              <PolicyCommissionAgreements policy={policy} />
            </TabsContent>

            {/* Members / Census tab content */}
            <TabsContent value="members" className="mt-0">
              <Card className="rounded-3xl border-border shadow-sm bg-card overflow-hidden">
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
                        'Member ID from Insurance': 'I001',
                        'Member ID from TPA': 'T001',
                        'Date Of Birth': '1990-01-01',
                        'Gender': 'Male',
                        'Relation': 'Principal',
                        'Nationality': 'Egyptian',
                        'National ID': '12345678901234',
                        'Plan Category': 'A',
                        'Location': 'Cairo',
                        'Department': 'IT',
                        'Job Title': 'Developer',
                        'Addition Date': '2024-01-01',
                        'Deletion Date': ''
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
                      <p className="text-muted-foreground font-medium">No members in this policy census roster yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Upload an Excel census spreadsheet in the Documents tab to populate the roster.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-background/70 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-card">
                          <tr>
                            <th className="px-6 py-3">Policy Name</th>
                            <th className="px-6 py-3">Policy Number</th>
                            <th className="px-6 py-3">Member Name</th>
                            <th className="px-6 py-3">Relation</th>
                            <th className="px-6 py-3">Member ID TPA</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">National ID</th>
                            <th className="px-6 py-3">Deletion Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {members.map((member: any) => (
                            <tr key={member.id} className="hover:bg-background/50 transition-colors">
                              <td className="px-6 py-3.5 font-bold text-foreground">{member.company_name || policy.client_company_name || "-"}</td>
                              <td className="px-6 py-3.5 font-mono text-xs">{member.policy_number || policy.policy_number || "-"}</td>
                              <td className="px-6 py-3.5 font-bold text-foreground">
                                {member.member_name}
                                <p className="text-[10px] text-slate-400 mt-0.5">Ins: {member.member_id_insurance || "-"}</p>
                              </td>
                              <td className="px-6 py-3.5 capitalize">{member.relation}</td>
                              <td className="px-6 py-3.5 font-mono text-xs">{member.member_id_tpa || "-"}</td>
                              <td className="px-6 py-3.5">{member.plan_category || "-"}</td>
                              <td className="px-6 py-3.5 font-mono text-xs">{member.national_id || "-"}</td>
                              <td className="px-6 py-3.5 text-xs text-destructive">{member.deletion_date || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Endorsements tab content */}
            <TabsContent value="endorsements" className="mt-0 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-card-header text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> Endorsements & Updates
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage additions, deletions, and adjustments for this policy.</p>
                </div>
                <Button onClick={() => setWizardOpen(true)} className="bg-primary hover:bg-indigo-700 text-white rounded-xl shadow-md gap-2">
                  <Plus className="w-4 h-4" /> Create Endorsement
                </Button>
              </div>

              {wizardOpen && (
                <CreateEndorsementWizard
                  policy={policy}
                  insurer={selectedCompanyInfo}
                  onClose={() => setWizardOpen(false)}
                  onSuccess={() => {
                    setWizardOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['supabase', 'endorsements'] });
                  }}
                />
              )}

              <Card className="rounded-3xl border-border shadow-sm bg-card overflow-hidden">
                <CardContent className="p-0">
                  {endorsementsLoading ? (
                    <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                  ) : endorsements.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No endorsements found for this policy.</p>
                      <Button variant="link" className="mt-2 text-primary" onClick={() => setWizardOpen(true)}>Create the first one</Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-background/70 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Ref Number</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Effective Date</th>
                            <th className="px-6 py-4">Net Premium</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-card">
                          {endorsements.map((e: any) => (
                            <tr key={e.id} className="hover:bg-background/50">
                              <td className="px-6 py-4 font-bold text-foreground">{e.endorsement_number}</td>
                              <td className="px-6 py-4 capitalize">{e.endorsement_type.replace('_', ' ')}</td>
                              <td className="px-6 py-4 text-muted-foreground">{e.effective_date ? format(new Date(e.effective_date), 'MMM d, yyyy') : '-'}</td>
                              <td className={`px-6 py-4 font-mono font-bold ${e.premium_adjustment > 0 ? 'text-success' : e.premium_adjustment < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {e.premium_adjustment > 0 ? '+' : ''}{e.premium_adjustment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4"><StatusBadge status={e.status} /></td>
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
              <Card className="rounded-3xl border-border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" /> Documents Manager
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
                  <div className="pt-6 border-t border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Uploaded Documents</h4>
                    {!formData.related_documents || formData.related_documents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No files uploaded yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-50 bg-background/50 rounded-2xl border border-border overflow-hidden">
                        {formData.related_documents.map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-4 hover:bg-background transition-colors">
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
                                <p className="font-bold text-foreground text-sm truncate">{doc.name}</p>
                                <p className="text-[10px] text-slate-400 capitalize">
                                  {doc.type} File • {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy') : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-muted-foreground bg-card border border-border rounded-lg hover:shadow-sm transition-all">
                                <Download className="w-4 h-4" />
                              </a>
                              <button onClick={() => handleDeleteDoc(idx)} className="p-2 text-red-400 hover:text-destructive bg-card border border-border rounded-lg hover:shadow-sm transition-all">
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
        <div className="lg:col-span-4 space-y-6 sticky top-24 min-w-0">

          {/* Assigned User & Sales Agent details */}
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-50 bg-background/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-[#2A75F3]" /> Internal Assigned Staff
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {editMode ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Sales Agent</Label>
                    <Select value={formData.sales_person || "none"} onValueChange={v => setFormData({ ...formData, sales_person: v === "none" ? "" : v })}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Sales Agent" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {users?.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">IWIB Account Manager</Label>
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
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[#2A75F3] font-bold">
                      {(policy.sales_person || 'U').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{policy.sales_person || "Unassigned"}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Sales Agent</p>
                    </div>
                  </div>
                  <Separator className="bg-background" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold">
                      {(policy.iwib_account_manager_name || 'M').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{policy.iwib_account_manager_name || "Unassigned"}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">IWIB Account Manager</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renewal alerts */}
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-50 bg-background/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Renewal Countdown & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {stats.daysLeft > 0 ? (
                <div className={cn(
                  "p-4 rounded-2xl border flex items-start gap-3",
                  stats.daysLeft <= 30 ? "bg-destructive/10 border-red-100 text-red-800" :
                    stats.daysLeft <= 60 ? "bg-orange-50 border-orange-100 text-orange-800" :
                      stats.daysLeft <= 90 ? "bg-amber-50 border-amber-100 text-amber-800" :
                        "bg-success/10 border-emerald-100 text-emerald-800"
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
                <div className="p-4 rounded-2xl border bg-destructive/10 border-red-100 text-red-800 flex items-start gap-3">
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
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-slate-50 bg-background/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-success" /> Insurer Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {editMode ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Contact Title</Label>
                    <Select value={formData.insurer_contact_role_id || ""} onValueChange={v => {
                      const selectedRole = contactRoles?.find((r: any) => r.id === v);
                      setFormData({
                        ...formData,
                        insurer_contact_role_id: v,
                        insurer_contact_title: selectedRole?.role_name_en || ""
                      });
                    }}>
                      <SelectTrigger className="h-10 bg-background border-border rounded-xl">
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
                <div className="space-y-3 font-semibold text-foreground text-sm">
                  {policy.insurer_contact_name ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center text-success">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">{policy.insurer_contact_name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{policy.insurer_contact_title || "Account Manager"}</p>
                        </div>
                      </div>
                      <Separator className="bg-background my-2" />
                      {policy.insurer_contact_mobile && (
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{policy.insurer_contact_mobile}</span>
                        </div>
                      )}
                      {policy.insurer_contact_email && (
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
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
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        dir={dir}
        className={cn(
          "h-10 border-border rounded-xl font-medium text-sm transition-all focus:ring-blue-500 focus:border-[#2A75F3]",
          noBg ? "bg-transparent" : "bg-background",
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
      <div className="text-sm font-semibold text-foreground leading-tight">
        {value || <span className="text-slate-300 font-normal italic">Not Provided</span>}
      </div>
    </div>
  );
}

// Subcomponent: KPICard
function KPICard({ title, value, icon: Icon, color, bg }: any) {
  // convert text-color-xxx to bg-color-xxx for solid background
  const solidBg = color ? color.replace('text-', 'bg-') : 'bg-primary';
  return (
    <div className={cn("rounded-3xl border-none shadow-sm p-6 flex flex-col gap-1 transition-all hover:shadow-md text-white", solidBg)}>
      <div className="w-10 h-10 rounded-2xl bg-card/20 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{title}</p>
      <h3 className="text-xl font-black text-white">{value}</h3>
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
        dragActive ? "border-[#2A75F3] bg-primary/10/20" : "border-border bg-background/30 hover:bg-background hover:border-slate-300"
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
          <p className="text-xs font-bold text-muted-foreground">Uploading...</p>
          <Progress value={progress} className="h-1.5 w-full" />
        </div>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-muted-foreground">
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
