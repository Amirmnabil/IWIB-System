'use client';
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2, ChevronLeft, Mail, Phone, Globe, Calendar, Clock, Users, FileText,
  Shield, Activity as ActivityIcon, Plus, Edit2, MoreVertical, ArrowUpRight,
  TrendingUp, DollarSign, Briefcase, AlertCircle, FileSignature, Target, RefreshCw, Upload,
  UserMinus, PhoneCall, Send, CheckCircle2, XCircle, PhoneOff, ShieldAlert, Loader2, Save, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n-context";
import { format } from "date-fns";
import { cn, formatCompactNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { motion, AnimatePresence } from "framer-motion";
import { KPICard } from "@/components/dashboard/metric-card";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/hooks/use-toast";
import { LogActivityButton } from "@/components/crm/LogActivityButton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/lib/auth-provider";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useInsurers } from "@/lib/hooks/use-insurers";
import { useMasterData } from "@/lib/hooks/use-master-data";
import { logAuditEvent } from "@/lib/audit-logger";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { sanitizeStorageFilename } from "@/lib/utils/sanitize-storage-filename";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const calculateOfferDate = (monthName: string) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const targetMonth = MONTHS.indexOf(monthName.toLowerCase());
  if (targetMonth === -1) return '';
  
  let targetYear = currentYear;
  // If target month is before current month, assume it's for next year
  if (targetMonth < currentMonth) {
    targetYear++;
  }
  
  // Create date for 1st of target month
  const targetDate = new Date(targetYear, targetMonth, 1);
  
  // Subtract 60 days
  targetDate.setDate(targetDate.getDate() - 60);
  
  // Format as YYYY-MM-DD
  return targetDate.toISOString().split('T')[0];
};

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

const REQUIRED_DOCS: Record<string, string[]> = {
  "Medical": ["Member Census (Excel)", "Existing Table of Benefits", "3 Years Claims History", "CR Copy", "Tax Card"],
  "Motor": ["Vehicle Census (Excel)", "Existing Policy Schedule", "CR Copy", "Tax Card"],
  "Property": ["Asset List & Valuations", "CR Copy", "Tax Card"],
  "default": ["CR Copy", "Tax Card", "Existing Policy (if any)"]
};

export default function CompanyDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const { user } = useUser();
  const { data: insurers } = useInsurers();
  const { data: tpasData } = useSupabaseCollection<any>('tpas');
  const tpas = tpasData || [];
  const { data: contactRolesData } = useSupabaseCollection<any>('contact_roles');
  const contactRoles = contactRolesData || [];
  const { data: systemUsersData } = useSupabaseCollection<any>('users');
  const systemUsers = systemUsersData || [];
  const { data: productTypes } = useMasterData('product_types');
  const { data: productSubtypes } = useMasterData('product_subtypes');

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  
  // File upload state for Request Quotation outcome
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Fetch and parse required documents dynamically from reference_list table
  const { data: refListData } = useSupabaseCollection<any>('reference_list');
  const requiredDocsMap = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    if (refListData) {
      refListData.forEach((item: any) => {
        if (item.category === 'required_docs' && item.is_active) {
          map[item.key] = item.value.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      });
    }
    return map;
  }, [refListData]);

  const getRequiredDocsForLOB = useCallback((lobStr: string, subtypeStr?: string) => {
    let lob = "default";
    let subtype = "";

    const l = (lobStr || "").toLowerCase();
    const s = (subtypeStr || "").toLowerCase();

    if (l.includes("medical") || l.includes("health") || l.includes("طبي")) {
      lob = "Medical";
    } else if (l.includes("motor") || l.includes("auto") || l.includes("سيارات")) {
      lob = "Motor";
    } else if (l.includes("life") || l.includes("حياة")) {
      lob = "Life";
    } else if (l.includes("property") || l.includes("ممتلكات")) {
      lob = "Property";
    } else if (l.includes("liability") || l.includes("مسؤولية")) {
      lob = "Liability";
    } else if (l.includes("marine") || l.includes("بحري")) {
      lob = "Marine";
    } else if (l.includes("engineering") || l.includes("هندسي")) {
      lob = "Engineering";
    } else if (l.includes("financial") || l.includes("مالي")) {
      lob = "Financial Lines";
    } else if (l.includes("cyber") || l.includes("إلكتروني")) {
      lob = "Cyber";
    } else if (l.includes("travel") || l.includes("سفر")) {
      lob = "Travel";
    } else if (l.includes("accident") || l.includes("حوادث")) {
      lob = "Personal Accident";
    }

    if (s.includes("sme") || s.includes("individual") || s.includes("فردي") || s.includes("صغير")) {
      subtype = "SME";
    } else if (s.includes("corporate") || s.includes("group") || s.includes("fleet") || s.includes("شركات") || s.includes("جماعي")) {
      subtype = "Corporate";
    }

    const key = subtype ? `${lob}_${subtype}` : lob;
    const list = requiredDocsMap[key] || requiredDocsMap[lob] || requiredDocsMap['default'];
    if (list && list.length > 0) return list;
    
    // Hardcoded fallback
    const fallback: Record<string, string[]> = {
      "Medical_SME": ["Member Census (Excel)", "CR Copy", "Tax Card", "Existing Policy (if any)"],
      "Medical_Corporate": ["Member Census (Excel)", "Existing Table of Benefits", "3 Years Claims History", "CR Copy", "Tax Card"],
      "Medical": ["Member Census (Excel)", "Existing Table of Benefits", "3 Years Claims History", "CR Copy", "Tax Card"],
      "Motor_SME": ["Vehicle Census (Excel)", "CR Copy", "Tax Card"],
      "Motor_Corporate": ["Vehicle Census (Excel)", "Existing Policy Schedule", "CR Copy", "Tax Card"],
      "Motor": ["Vehicle Census (Excel)", "Existing Policy Schedule", "CR Copy", "Tax Card"],
      "Life_SME": ["Employee Census (Excel)", "CR Copy", "Tax Card"],
      "Life_Corporate": ["Employee Census (Excel)", "Existing Table of Benefits", "CR Copy", "Tax Card"],
      "Life": ["Employee Census (Excel)", "CR Copy", "Tax Card"],
      "Property_SME": ["Asset List", "CR Copy", "Tax Card"],
      "Property_Corporate": ["Asset List & Valuations", "Fire Safety Report", "CR Copy", "Tax Card"],
      "Property": ["Asset List & Valuations", "CR Copy", "Tax Card"],
      "default": ["CR Copy", "Tax Card", "Existing Policy (if any)"]
    };
    return fallback[key] || fallback[lob] || fallback.default;
  }, [requiredDocsMap]);

  const CALL_OUTCOMES = [
    { id: 'request_meeting', label: t('requestMeeting') || 'Request Meeting', icon: <Calendar className="w-5 h-5"/>, bg: 'bg-primary/10/50', border: 'border-indigo-100', text: 'text-primary', activeIcon: 'text-primary' },
    { id: 'request_quotation', label: t('requestQuotation') || 'Request Quotation', icon: <FileText className="w-5 h-5"/>, bg: 'bg-success/10/50', border: 'border-emerald-100', text: 'text-success', activeIcon: 'text-success' },
    { id: 'hr_left', label: t('hrLeft') || 'HR Left', icon: <UserMinus className="w-5 h-5"/>, bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-600', activeIcon: 'text-rose-600' },
    { id: 'waiting_for_data', label: t('waitingForData') || 'Waiting for Data', icon: <Clock className="w-5 h-5"/>, bg: 'bg-primary/10/50', border: 'border-blue-100', text: 'text-primary', activeIcon: 'text-primary' },
    { id: 'call_back', label: t('callBack') || 'Call Back', icon: <PhoneCall className="w-5 h-5"/>, bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600', activeIcon: 'text-amber-600' },
    { id: 'send_profile', label: t('sendProfile') || 'Send Profile', icon: <Send className="w-5 h-5"/>, bg: 'bg-violet-50/50', border: 'border-violet-100', text: 'text-violet-600', activeIcon: 'text-violet-600' },
    { id: 'renewed', label: t('renewed') || 'Renewed', icon: <CheckCircle2 className="w-5 h-5"/>, bg: 'bg-success/10/50', border: 'border-green-100', text: 'text-success', activeIcon: 'text-success' },
    { id: 'not_interested', label: t('notInterested') || 'Not Interested', icon: <XCircle className="w-5 h-5"/>, bg: 'bg-destructive/10/50', border: 'border-red-100', text: 'text-destructive', activeIcon: 'text-destructive' },
    { id: 'wrong_number', label: t('wrongNumber') || 'Wrong Number', icon: <PhoneOff className="w-5 h-5"/>, bg: 'bg-slate-100/50', border: 'border-border', text: 'text-muted-foreground', activeIcon: 'text-muted-foreground' },
    { id: 'no_answer', label: t('noAnswer') || 'No Answer', icon: <AlertCircle className="w-5 h-5"/>, bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-600', activeIcon: 'text-orange-600' },
  ];

  const [company, setCompany] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: comp },
        { data: acts },
        { data: pols },
        { data: cons },
        { data: { user } },
      ] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('related_id', id).order('created_at', { ascending: false }),
        supabase.from('policies').select('*').eq('client_company_id', id),
        supabase.from('contacts').select('*').eq('company_id', id),
        supabase.auth.getUser(),
      ]);
      setCompany(comp);
      setActivities(acts || []);
      setPolicies(pols || []);
      setContacts(cons || []);
      if (user) {
        const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
        setCurrentUser(userData || { id: user.id, name: user.email });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (company) {
      setFormData({
        ...company,
        follow_up_date: company.follow_up_date || "",
        meeting_time: company.meeting_time || "",
        hr_left_new_company_name: "",
        hr_left_current_insurer: "",
        hr_left_employee_count: "",
        hr_left_renewal_month: "",
        hr_left_data_receiving_date: "",
        actual_renewal_date: company.actual_renewal_date || "",
        actual_offer_date: company.actual_offer_date || "",
        current_insurer: company.current_insurer || "",
        current_tpa: company.current_tpa || "",
      });
      setSelectedStatus(company.status || "");
      setExpandedCard(company.status || null);
    }
  }, [company]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && document.referrer) {
      if (document.referrer.includes('/leads')) {
        router.push('/leads');
        return;
      }
      if (document.referrer.includes('/companies') && !document.referrer.includes('/companies/')) {
        router.push('/companies');
        return;
      }
    }
    if (company?.status === 'prospect' || company?.status === 'client') {
      router.push('/companies');
    } else {
      router.push('/leads');
    }
  };

  const handleSaveStatus = async (outcomeId: string) => {
    if (!id || !company) return;
    setIsSavingStatus(outcomeId);
    try {
      if (outcomeId === 'request_quotation') {
        if (selectedFiles.length === 0) {
          toast({ 
            variant: 'destructive', 
            title: t('uploadDoc') || 'Upload Required', 
            description: 'Please drag & drop or click to browse and stage at least one document.' 
          });
          setIsSavingStatus(null);
          return;
        }
        
        // 1. Upload staged files to Supabase Storage documents bucket
        const uploadedDocs: { name: string; url: string; uploaded_at: string }[] = [];
        for (const file of selectedFiles) {
          // Sanitize filename to ensure only ASCII characters are used (Supabase Storage requirement)
          const safeFilename = sanitizeStorageFilename(file.name);
          const path = `quotations/${id}/${Date.now()}_${safeFilename}`;
          const { error: uploadErr } = await supabase.storage
            .from('documents')
            .upload(path, file, { cacheControl: '3600', upsert: true });
          if (uploadErr) throw uploadErr;
          
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(path);
            
          uploadedDocs.push({
            name: file.name,  // Keep original display name for UI
            url: publicUrl,
            uploaded_at: new Date().toISOString()
          });
        }

        // 2. Fetch active Underwriter from users table
        const { data: underwriters } = await supabase
          .from('users')
          .select('id, name')
          .eq('department', 'Underwriting')
          .limit(1);
          
        const underwriter = underwriters && underwriters.length > 0 ? underwriters[0] : null;
        const assignedUserId = underwriter ? underwriter.id : (company.assigned_user_id || user?.id);
        const assignedUserName = underwriter ? underwriter.name : (company.assigned_user_name || user?.user_metadata?.full_name || user?.email);

        // 3. Query leads table to see if lead exists
        const { data: leadData } = await supabase
          .from('leads')
          .select('*')
          .eq('company_id', id)
          .maybeSingle();
        const leadId = leadData ? leadData.id : null;

        // 4. Create a prospect payload
        const prospectId = generateUUID();
        const prospectPayload = {
          id: prospectId,
          company_name: company.name,
          company_id: id,
          lead_id: leadId,
          pipeline_stage: 'qualification',
          probability: 50,
          estimated_value: leadData?.estimated_premium || company.employee_count * 1000 || 0,
          expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assigned_user_id: assignedUserId,
          assigned_user_name: assignedUserName,
          notes: formData.request_quotation_notes || "Auto-converted via Request Quotation document upload",
          requested_products: [company.insurance_type || "Medical"],
          created_at: new Date().toISOString()
        };

        const { error: prospectErr } = await supabase
          .from('prospects')
          .insert(sanitizeUUIDs(prospectPayload));
        if (prospectErr) throw prospectErr;

        // 5. Create prospect details
        const detailsPayload = {
          prospect_id: prospectId,
          company_id: id,
          proposal_versions: uploadedDocs,
          // client_documents: dedicated column that preserves the original
          // client-submitted files even after the Underwriting module overwrites
          // proposal_versions with insurer offer data.
          client_documents: uploadedDocs,
          final_premium: prospectPayload.estimated_value,
          insurance_company: company.current_insurer || "",
          commission: 0,
          decision_maker: "",
          competitors: [],
          notes: prospectPayload.notes
        };

        const { error: detailsErr } = await supabase
          .from('prospect_details')
          .insert(sanitizeUUIDs(detailsPayload));
        if (detailsErr) throw detailsErr;

        // 6. Create SME quotation record for Underwriting pricing
        const smeQuotationPayload = {
          company_id: id,
          company_name: company.name,
          census_snapshot: uploadedDocs,
          total_premium: prospectPayload.estimated_value,
          status: 'draft',
          user_id: assignedUserId,
          user_name: assignedUserName,
          created_at: new Date().toISOString()
        };

        const { error: smeQuotErr } = await supabase
          .from('sme_quotations')
          .insert(sanitizeUUIDs(smeQuotationPayload));
        if (smeQuotErr) throw smeQuotErr;

        // 7. Update company status and assignment
        const companyFields = {
          status: 'prospect',
          assigned_user_id: assignedUserId,
          assigned_user_name: assignedUserName,
          updated_at: new Date().toISOString()
        };

        const { error: compUpdateErr } = await supabase
          .from('companies')
          .update(companyFields)
          .eq('id', id);
        if (compUpdateErr) throw compUpdateErr;

        // 8. Delete the original lead record if it existed
        if (leadId) {
          const { error: deleteLeadErr } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId);
          if (deleteLeadErr) {
            console.error("Failed to delete lead:", deleteLeadErr);
          }
        }

        // 9. Log audit event
        await logAuditEvent(null, user, {
          action: 'update',
          resource_type: 'company' as any,
          resource_name: company.name,
          changes: { status: 'prospect', assigned_user_name: assignedUserName }
        });

        toast({ 
          title: t('prospectCreated') || 'Converted to Prospect', 
          description: 'Request quotation submitted, documents uploaded, and assigned to underwriter.' 
        });

        setSelectedFiles([]);
        queryClient.invalidateQueries({ queryKey: ['supabase', 'companies'] });
        queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
        queryClient.invalidateQueries({ queryKey: ['supabase', 'prospects'] });
        queryClient.invalidateQueries({ queryKey: ['supabase', 'sme_quotations'] });
        fetchAll();
        setIsSavingStatus(null);
        return;
      }
      let status = outcomeId;
      let priority = company.priority || 'medium';

      switch (outcomeId) {
        case 'request_meeting':
        case 'request_quotation':
        case 'waiting_for_data':
        case 'call_back':
          priority = 'high';
          break;
        case 'hr_left':
        case 'send_profile':
        case 'renewed':
          priority = 'medium';
          break;
        case 'not_interested':
        case 'wrong_number':
        case 'no_answer':
          priority = 'low';
          break;
        default:
          break;
      }

      // Compile updated fields
      const updatedFields: any = {
        status,
        priority,
        updated_at: new Date().toISOString()
      };

      // Map specific outcomes fields back to company columns
      if (outcomeId === 'call_back' || outcomeId === 'waiting_for_data') {
        if (formData.follow_up_date) updatedFields.follow_up_date = formData.follow_up_date;
      } else if (outcomeId === 'request_meeting') {
        // meeting_time is not a column on the companies table; it is used to schedule the task due date.
      } else if (outcomeId === 'renewed') {
        if (formData.actual_renewal_date) updatedFields.actual_renewal_date = formData.actual_renewal_date;
        if (formData.actual_offer_date) updatedFields.actual_offer_date = formData.actual_offer_date;
        if (formData.current_insurer) updatedFields.current_insurer = formData.current_insurer;
        if (formData.current_tpa) updatedFields.current_tpa = formData.current_tpa;
      }

      // Update company document
      const { error: companyUpdateError } = await supabase
        .from('companies')
        .update(updatedFields)
        .eq('id', id);
        
      if (companyUpdateError) throw companyUpdateError;

      // Lead conversion logic: mark company as request_meeting, request_quotation, or waiting_for_data
      if (outcomeId === 'request_meeting' || outcomeId === 'request_quotation' || outcomeId === 'waiting_for_data') {
        const { data: leadSnapshot } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', id);

        const alreadyHasLead = leadSnapshot && leadSnapshot.length > 0;
        const leadId = alreadyHasLead ? leadSnapshot[0].id : generateUUID();

        if (!alreadyHasLead) {
          // Fetch primary contact from contacts table
          const { data: primaryContacts } = await supabase.from('contacts').select('*').eq('company_id', id).eq('is_primary', true);
          const pContact = primaryContacts && primaryContacts.length > 0 ? primaryContacts[0] : null;
          
          const leadData = {
            id: leadId,
            company_id: id,
            company_name: company.name || "",
            contact_name: pContact ? `${pContact.first_name} ${pContact.last_name || ''}`.trim() : "",
            email: pContact?.email || "",
            phone: pContact?.phone || pContact?.mobile || "",
            priority: 'high',
            status: 'new',
            last_activity: `Auto-converted due to workflow status transition to: ${outcomeId}`,
            created_at: new Date().toISOString()
          };
          
          const { error: insertLeadError } = await supabase.from('leads').insert(sanitizeUUIDs(leadData));
          if (insertLeadError) {
             console.error("Failed to insert lead:", insertLeadError);
          }
          
          await logAuditEvent(null, user, {
            action: 'create',
            resource_type: 'lead' as any,
            resource_name: `Lead for ${company.name}`,
            changes: leadData
          });
        }

        // 1. If scheduling a meeting: upsert lead details with meeting_date and insert meeting activity for the calendar
        if (outcomeId === 'request_meeting' && formData.meeting_time) {
          const meetingDateISO = new Date(formData.meeting_time).toISOString();
          
          // Upsert lead details for the Leads home page
          const leadDetailsPayload = {
            lead_id: leadId,
            company_id: id,
            meeting_date: meetingDateISO,
            updated_at: new Date().toISOString()
          };
          
          const { error: upsertDetailsError } = await supabase
            .from('lead_details')
            .upsert(sanitizeUUIDs(leadDetailsPayload), { onConflict: 'lead_id' });
            
          if (upsertDetailsError) {
            console.error("Failed to upsert lead details meeting date:", upsertDetailsError);
          }

          // Insert meeting activity for calendar page
          const meetingData = {
            activity_type: 'meeting',
            subject: `Meeting: ${company.name}`,
            description: `Scheduled meeting with ${company.name}.\nNotes: ${formData.request_meeting_notes || ''}`,
            status: 'pending',
            priority: 'high',
            due_date: meetingDateISO,
            end_date: new Date(new Date(formData.meeting_time).getTime() + 60 * 60 * 1000).toISOString(),
            duration_minutes: 60,
            related_type: 'company',
            related_id: id,
            related_name: company.name,
            assigned_to_id: user?.id || null,
            assigned_to_name: user?.user_metadata?.full_name || user?.email || "Sales Agent",
            created_at: new Date().toISOString()
          };
          
          const { error: insertActivityError } = await supabase.from('activities').insert(sanitizeUUIDs(meetingData));
          if (insertActivityError) {
            console.error("Failed to insert meeting activity:", insertActivityError);
          }
        } else {
          // 2. Fallback: Create a task for other workflow outcomes (Prepare Quotation, Follow up on Waiting Data, etc.) if it's a new lead
          if (!alreadyHasLead) {
            const manager = systemUsers.find((u: any) => 
              (u.role === 'Manager' && u.department === 'Sales') || 
              u.role === 'Manager' || 
              u.department === 'Sales'
            ) || { id: null, name: "Sales Manager" };

            let taskSubject = 'Action Required for New Lead';
            if (outcomeId === 'request_quotation') {
              taskSubject = 'Prepare Quotation for New Lead';
            } else if (outcomeId === 'waiting_for_data') {
              taskSubject = 'Follow up on Waiting Data for New Lead';
            }
            
            const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const taskEndDate = new Date(taskDueDate.getTime() + 60 * 60 * 1000);
            
            const taskData = {
              activity_type: 'task',
              subject: taskSubject,
              description: `Auto-generated task from Company Telesales workflow.\nAction required for Company: ${company.name}`,
              status: 'pending',
              priority: 'high',
              due_date: taskDueDate.toISOString(),
              end_date: taskEndDate.toISOString(),
              duration_minutes: 60,
              related_type: 'company',
              related_id: id,
              related_name: company.name,
              assigned_to_id: manager.id,
              assigned_to_name: manager.name,
              created_at: new Date().toISOString()
            };

            const { error: insertActivityError } = await supabase.from('activities').insert(sanitizeUUIDs(taskData));
            if (insertActivityError) {
              console.error("Failed to insert task activity:", insertActivityError);
            }
          }
        }
      }

      // HR LEFT: Contact Migration Logic
      if (outcomeId === 'hr_left') {
        const { data: primaryContacts } = await supabase.from('contacts').select('*').eq('company_id', id).eq('is_primary', true);
        const primaryContact = primaryContacts && primaryContacts.length > 0 ? primaryContacts[0] : null;

        if (primaryContact) {
           await supabase.from('contacts').delete().eq('id', primaryContact.id);
        }

        if (formData.hr_left_new_company_name) {
           const newCompanyData = {
              name: formData.hr_left_new_company_name,
              current_insurer: formData.hr_left_current_insurer,
              employee_count: formData.hr_left_employee_count,
              renewal_month: formData.hr_left_renewal_month,
              status: 'interested',
           };
           
           const contactsPayload = primaryContact ? [{
              first_name: primaryContact.first_name,
              last_name: primaryContact.last_name || '',
              email: primaryContact.email,
              phone: primaryContact.phone,
              mobile: primaryContact.mobile,
              is_primary: true,
              role_id: primaryContact.role_id,
           }] : null;
           
           await supabase.rpc('create_company_with_contacts', {
              company_payload: newCompanyData,
              contacts_payload: contactsPayload
           });
        }
      }

      // Track outcome in activities timeline
      const noteDueDate = new Date();
      const noteEndDate = new Date(noteDueDate.getTime() + 30 * 60 * 1000);
      await supabase.from('activities').insert(sanitizeUUIDs({
         activity_type: 'note',
         subject: `Workflow Outcome: ${outcomeId}`,
         description: `Company outcome status was set to ${outcomeId}. Notes: ${formData[`${outcomeId}_notes`] || ''}`,
         status: 'completed',
         priority: 'medium',
         due_date: noteDueDate.toISOString(),
         end_date: noteEndDate.toISOString(),
         duration_minutes: 30,
         related_type: 'company',
         related_id: id,
         related_name: company.name,
         assigned_to_id: user?.id,
         assigned_to_name: user?.user_metadata?.full_name || user?.email,
         created_at: new Date().toISOString()
      }));

      // Audit Logger
      await logAuditEvent(null, user, {
        action: 'update',
        resource_type: 'company',
        resource_id: id,
        resource_name: company.name,
        changes: updatedFields
      });

      toast({ title: t('companyUpdated') || "Company status updated" });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'companies'] });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'activities'] });
      
      fetchAll();
    } catch (error: any) {
      console.error("Save status error:", error, {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      });
      toast({ 
        variant: "destructive", 
        title: t('persistenceError') || "Save Failed", 
        description: error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error)) 
      });
    } finally {
      setIsSavingStatus(null);
    }
  };

  if (loading) return (
    <div className="p-8 text-center flex flex-col items-center gap-4 justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">{t('loading')}...</p>
    </div>
  );

  if (!company) return <div className="p-8 text-center text-muted-foreground">{t('companyNotFound')}</div>;

  const totalPremium = policies.reduce((s, p) => s + (p.premium_total || 0), 0);

  const activityTypeIcon: Record<string, any> = {
    call: Phone, meeting: Calendar, email: Mail, task: FileText, note: FileText,
  };

  return (
    <div className={cn("pb-12 max-w-7xl mx-auto space-y-6 antialiased", isRtl && "font-arabic")}>

      {/* Header */}
      <div className="bg-card p-6 rounded-3xl shadow-sm border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-metric text-foreground leading-none">
                {isRtl ? company.name_ar || company.name : company.name}
              </h1>
              <StatusBadge status={company.status} />
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              {company.website && <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> {company.website}</span>}
              {company.city && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {company.city}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 rounded-xl border-border hover:bg-background gap-2" onClick={() => router.push(`/companies/${id}/edit`)}>
            <Edit2 className="w-4 h-4" /> {t('edit')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border p-1">
              <DropdownMenuItem className="rounded-lg gap-2" onClick={fetchAll}>
                <RefreshCw className="w-4 h-4" /> Refresh Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="flex-1 md:flex-none h-11 px-6 rounded-xl bg-primary hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 gap-2 font-semibold"
            onClick={() => router.push(`/prospects?company_id=${id}&company_name=${encodeURIComponent(company.name)}`)}
          >
            <Plus className="w-4 h-4" /> {t('createDeal') || "Create Deal"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('pipelineValue') || "Pipeline Value"} value={totalPremium} icon={DollarSign} color="green" format="compact" loading={loading} />
        <KPICard title={t('activePolicies')} value={policies.length} icon={Shield} color="blue" loading={loading} />
        <KPICard title={t('headcount')} value={company.employee_count || 0} icon={Users} color="purple" loading={loading} />
        <KPICard title="Activities" value={activities.length} icon={ActivityIcon} color="orange" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Tabs */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-slate-100/50 p-1 rounded-2xl mb-6 w-full sm:w-auto overflow-x-auto justify-start h-auto">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('overview')}</TabsTrigger>
              <TabsTrigger value="activities" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {t('activitiesTimeline')} {activities.length > 0 && <Badge className="ml-1 h-4 text-[9px] bg-indigo-100 text-primary border-none">{activities.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="policies" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('policies')}</TabsTrigger>
              <TabsTrigger value="contacts" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('contacts')}</TabsTrigger>
              <TabsTrigger value="offers" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">Offers</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-500" /> {t('businessSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    <DetailItem label={t('industry')} value={company.industry} t={t} />
                    <DetailItem label={t('clientType') || 'Client Type'} value={company.client_type} t={t} />
                    <DetailItem label={t('currentInsurer')} value={company.current_insurer} t={t} />
                    <DetailItem label={t('insuranceType')} value={company.insurance_type} t={t} />
                    <DetailItem label={t('renewalMonth')} value={company.renewal_month} t={t} />
                    <DetailItem label={t('headcount')} value={company.employee_count} t={t} />
                    <DetailItem label={t('crNumber')} value={company.cr_number} t={t} />
                    {(() => {
                      const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
                      const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name || ''}`.trim() : null;
                      const contactPhone = primaryContact?.phone || primaryContact?.mobile || null;
                      return (
                        <>
                          <DetailItem label="Primary Contact" value={contactName} t={t} />
                          <DetailItem label="Phone" value={contactPhone} t={t} />
                        </>
                      );
                    })()}
                  </div>
                  {company.notes && (
                    <div className="pt-4 border-t border-slate-50">
                      <DetailItem label={t('note')} value={company.notes} fullWidth t={t} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities Timeline */}
            <TabsContent value="activities" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
                <div className="p-6 flex items-center justify-between border-b border-border">
                  <h3 className="text-lg font-bold">{t('activityHistory')}</h3>
                  <LogActivityButton
                    companyId={id}
                    companyName={company.name}
                    currentUserId={currentUser?.id}
                    currentUserName={currentUser?.name}
                    onSuccess={fetchAll}
                    variant="full"
                    label={t('logActivity')}
                  />
                </div>
                <CardContent className="p-0">
                  {activities.length === 0 ? (
                    <div className="py-16 text-center">
                      <ActivityIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No activities logged yet. Log the first one!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {activities.map((act) => {
                        const Icon = activityTypeIcon[act.activity_type] || FileText;
                        return (
                          <div key={act.id} className="p-4 flex gap-4 hover:bg-background transition-colors">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              act.activity_type === 'call' ? 'bg-primary/10 text-primary' :
                              act.activity_type === 'meeting' ? 'bg-purple-50 text-purple-600' :
                              act.activity_type === 'email' ? 'bg-success/10 text-success' :
                              'bg-background text-muted-foreground'
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-foreground text-sm truncate">{act.subject}</p>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {act.created_at ? format(new Date(act.created_at), 'MMM d, yyyy') : ''}
                                </span>
                              </div>
                              {act.description && <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>}
                              {act.result && <p className="text-xs text-primary mt-1 font-medium">Outcome: {act.result}</p>}
                              <div className="flex items-center gap-3 mt-1">
                                <StatusBadge status={act.status} className="h-4 text-[9px]" />
                                {act.assigned_to_name && <span className="text-[10px] text-slate-400">{act.assigned_to_name}</span>}
                                {act.duration_minutes > 0 && <span className="text-[10px] text-slate-400">{act.duration_minutes} min</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Policies */}
            <TabsContent value="policies" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
                <div className="p-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold">{t('policies')}</h3>
                  <Button className="bg-primary rounded-xl gap-2 h-10 px-4" onClick={() => router.push('/policies')}>
                    <Plus className="w-4 h-4" /> {t('newPolicy')}
                  </Button>
                </div>
                {policies.length === 0 ? (
                  <div className="py-12 text-center bg-background/50 mx-6 mb-6 rounded-2xl border-2 border-dashed border-border">
                    <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">{t('noActivePoliciesFound')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border bg-background/50">
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('policyNumber')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('insurer')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('premiumAmount')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('expiry')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policies.map(policy => (
                          <tr key={policy.id} className="border-b border-slate-50 hover:bg-background transition-colors cursor-pointer" onClick={() => router.push(`/policies`)}>
                            <td className="px-6 py-4">
                              <span className="font-bold text-foreground">{policy.policy_number}</span>
                              <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{policy.policy_type}</p>
                            </td>
                            <td className="px-6 py-4 font-medium text-muted-foreground">{policy.insurer_name}</td>
                            <td className="px-6 py-4 font-bold text-success">{formatCompactNumber(policy.premium_total || 0)}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{policy.end_date ? format(new Date(policy.end_date), 'MMM d, yyyy') : '-'}</td>
                            <td className="px-6 py-4"><StatusBadge status={policy.policy_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Contacts */}
            <TabsContent value="contacts" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">{t('contacts')}</h3>
                    <Button className="bg-primary rounded-xl gap-2 h-10 px-4" onClick={() => router.push(`/contacts`)}>
                      <Plus className="w-4 h-4" /> {t('addContact')}
                    </Button>
                  </div>
                  {contacts.length === 0 ? (
                    <div className="py-12 text-center bg-background/50 rounded-2xl border-2 border-dashed border-border">
                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">{t('noContactsFound')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contacts.map(contact => (
                        <div key={contact.id} className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                            {(contact.first_name || 'C').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">{contact.first_name} {contact.last_name}</h4>
                            <p className="text-[10px] text-muted-foreground font-medium">{contact.role_type}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {contact.email && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>}
                              {contact.phone && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>}
                            </div>
                          </div>
                          {contact.is_primary && <Badge className="bg-primary/10 text-primary border-indigo-100 text-[8px] uppercase px-1.5 py-0">{t('primaryContact')}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Offers */}
            <TabsContent value="offers" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Quotations & Offers</h3>
                    <Button className="bg-primary rounded-xl gap-2 h-10 px-4">
                      <Upload className="w-4 h-4" /> Upload Offer
                    </Button>
                  </div>
                  <div className="py-12 text-center bg-background/50 rounded-2xl border-2 border-dashed border-border">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No offers uploaded yet.</p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">
          {/* Assigned Agent */}
          <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-50 bg-background/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> {t('assignedTeam')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-muted-foreground font-bold">
                  {(company.assigned_user_name || 'A').charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-foreground">{company.assigned_user_name || t('unassigned')}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{t('primaryAccountManager')}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{t('source')}</span>
                <Badge variant="secondary" className="bg-slate-100 text-muted-foreground border-none px-2 py-0.5 text-[10px]">{company.source || t('direct')}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* WORKFLOW STATUS CARD SYSTEM (TELESALES ACTIONS REDESIGN) */}
          <div className="grid grid-cols-1 gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground pl-1 mt-2">Workflow Outcomes</h3>
            {CALL_OUTCOMES.map((outcome, index) => {
              const isExpanded = expandedCard === outcome.id;
              const isChecked = selectedStatus === outcome.id;
              
              return (
                <motion.div 
                  key={outcome.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card 
                    className={cn(
                      "rounded-[1.5rem] border transition-all overflow-hidden group relative hover:shadow-md",
                      isChecked 
                        ? `${outcome.bg} border-${outcome.border} shadow-sm` 
                        : "bg-card border-border"
                    )}
                    onClick={() => {
                      if (!isExpanded) {
                        setExpandedCard(outcome.id);
                      }
                    }}
                  >
                    <CardContent className="p-0">
                      {/* CARD HEADER */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer select-none border-b border-border/50 bg-background/20 hover:bg-background/60 transition-colors"
                        onClick={(e) => {
                          if (isExpanded) {
                            e.stopPropagation();
                            setExpandedCard(null);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStatus(outcome.id);
                              } else {
                                setSelectedStatus("");
                              }
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                          
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-105",
                            isChecked ? "bg-card text-inherit shadow-inner" : "bg-slate-100 text-muted-foreground"
                          )}>
                            {outcome.icon}
                          </div>
                          
                          <div className="flex flex-col">
                            <p className={cn("font-bold text-sm", isChecked ? outcome.text : "text-slate-700")}>
                              {outcome.label}
                            </p>
                            {isChecked && (
                              <Badge variant="outline" className="w-fit text-[8px] font-black px-1.5 py-0 mt-0.5 bg-emerald-100/80 text-emerald-800 border-emerald-200">
                                Selected Status
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-slate-400 font-black text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-slate-100/40">
                          {isExpanded ? "Collapse" : "Expand"}
                        </div>
                      </div>

                      {/* CARD CONTENT BODY */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-5 pt-3 border-t border-border bg-card/40 space-y-4">
                              
                              {/* 1. CALL BACK / WAITING FOR DATA */}
                              {(outcome.id === 'call_back' || outcome.id === 'waiting_for_data') && (
                                <FormInput label={t('setFollowUpDate') || 'Follow Up Date'} type="datetime-local" value={formData.follow_up_date} onChange={v => setFormData({...formData, follow_up_date: v})} />
                              )}
                              
                              {/* 2. REQUEST MEETING */}
                              {outcome.id === 'request_meeting' && (
                                <FormInput label={t('scheduledMeetingTime') || 'Meeting Time'} type="datetime-local" value={formData.meeting_time} onChange={v => setFormData({...formData, meeting_time: v})} />
                              )}

                              {/* 3. REQUEST QUOTATION */}
                              {outcome.id === 'request_quotation' && (
                                <div className="space-y-4">
                                  <div className="p-4 bg-success/10/50 rounded-2xl border border-emerald-100/60">
                                    <div className="text-[10px] font-black text-emerald-700 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                      <Sparkles className="w-4 h-4" /> {t('requiredDocuments')} · {company.insurance_type || "Medical"}{company.medical_subtype ? ` / ${company.medical_subtype}` : ""}
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                      {getRequiredDocsForLOB(company.insurance_type || "", company.medical_subtype || "").map(docName => (
                                        <div key={docName} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 bg-card/90 p-2.5 rounded-xl border border-emerald-100">
                                          <div className="w-1.5 h-1.5 rounded-full bg-success/100 shadow-sm" />
                                          {docName}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t('uploadDoc')}</Label>
                                    <input 
                                      type="file" 
                                      multiple 
                                      id="lob-doc-upload" 
                                      className="hidden" 
                                      onChange={(e) => {
                                        if (e.target.files) {
                                          setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                                        }
                                      }}
                                    />
                                    <div 
                                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                      onDrop={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        if (e.dataTransfer.files) { 
                                          setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); 
                                        } 
                                      }}
                                    >
                                      <Button 
                                        type="button"
                                        variant="outline" 
                                        onClick={() => document.getElementById('lob-doc-upload')?.click()}
                                        className="w-full h-20 rounded-2xl border-dashed border-2 border-indigo-200 bg-primary/5 hover:bg-primary/10 hover:border-indigo-300 transition-all flex flex-col gap-1.5 justify-center items-center"
                                      >
                                        <Upload className="w-4 h-4 text-primary" />
                                        <span className="text-[10px] font-bold text-indigo-900 tracking-tight">{t('dropDocuments') || "Drop documents here or click to browse"}</span>
                                      </Button>
                                    </div>
                                    {selectedFiles.length > 0 && (
                                      <div className="mt-3 space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staged files ({selectedFiles.length})</p>
                                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                                          {selectedFiles.map((file, idx) => (
                                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 text-xs bg-white p-1.5 rounded-lg border border-slate-100 font-semibold text-slate-700">
                                              <span className="truncate flex items-center gap-1.5 max-w-[80%]">
                                                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                <span className="truncate">{file.name}</span>
                                              </span>
                                              <button 
                                                type="button" 
                                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline shrink-0"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 4. HR LEFT */}
                              {outcome.id === 'hr_left' && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 gap-3">
                                    <FormInput label={t('newCompanyName')} value={formData.hr_left_new_company_name} onChange={v => setFormData({...formData, hr_left_new_company_name: v})} />
                                    <div className="space-y-1.5">
                                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t('currentInsurerNewFirm') || 'Current Insurer'}</Label>
                                      <Select value={formData.hr_left_current_insurer} onValueChange={v => setFormData({...formData, hr_left_current_insurer: v})}>
                                        <SelectTrigger className="h-10 bg-background border rounded-xl font-bold"><SelectValue placeholder="Select Insurer" /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                          {insurers && insurers.map((ins: any) => (
                                            <SelectItem key={ins.id} value={ins.companyName} className="font-bold">{ins.companyName}</SelectItem>
                                          ))}
                                          {formData.hr_left_current_insurer && insurers && !insurers.find((i: any) => i.companyName === formData.hr_left_current_insurer) && (
                                            <SelectItem value={formData.hr_left_current_insurer} className="font-bold">{formData.hr_left_current_insurer}</SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <FormInput label={t('noOfEmployee')} type="number" value={formData.hr_left_employee_count} onChange={v => setFormData({...formData, hr_left_employee_count: v})} />
                                    <div className="space-y-2">
                                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t('renewalMonth')}</Label>
                                      <Select value={formData.hr_left_renewal_month} onValueChange={v => setFormData({...formData, hr_left_renewal_month: v})}>
                                        <SelectTrigger className="h-10 bg-background border rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{t(m as any)}</SelectItem>)}</SelectContent>
                                      </Select>
                                    </div>
                                    <FormInput label={t('dataReceivingDate')} type="date" value={formData.hr_left_data_receiving_date} onChange={v => setFormData({...formData, hr_left_data_receiving_date: v})} />
                                  </div>
                                  <p className="text-[10px] font-black text-rose-800 flex items-center gap-1.5 mt-2">
                                    <ShieldAlert className="w-4 h-4" /> {t('dataTransferProtocol')}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">{t('dataTransferDescription')}</p>
                                </div>
                              )}
                              
                              {/* 5. RENEWED */}
                              {outcome.id === 'renewed' && (
                                <div className="grid grid-cols-1 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t('actualRenewal')}</Label>
                                    <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                                      <SelectTrigger className="h-10 bg-background border rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                      <SelectContent className="rounded-xl">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{t(m as any)}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <FormInput label={t('actualOfferDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t('currentInsurer') || 'Current Insurer'}</Label>
                                    <Select value={formData.current_insurer} onValueChange={v => setFormData({...formData, current_insurer: v})}>
                                      <SelectTrigger className="h-10 bg-background border rounded-xl font-bold"><SelectValue placeholder="Select Insurer" /></SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        {insurers && insurers.map((ins: any) => (
                                          <SelectItem key={ins.id} value={ins.companyName} className="font-bold">{ins.companyName}</SelectItem>
                                        ))}
                                        {formData.current_insurer && insurers && !insurers.find((i: any) => i.companyName === formData.current_insurer) && (
                                          <SelectItem value={formData.current_insurer} className="font-bold">{formData.current_insurer}</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-medium text-muted-foreground">{t('currentTpa')}</Label>
                                    <Select value={formData.current_tpa || "none"} onValueChange={v => setFormData({...formData, current_tpa: v === "none" ? "" : v})}>
                                      <SelectTrigger className="h-10 bg-background border rounded-xl font-bold"><SelectValue placeholder="Select TPA" /></SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        <SelectItem value="none">None</SelectItem>
                                        {tpas.map((t: any) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t('interactionNotes')}</Label>
                                <Textarea 
                                  placeholder={t('interactionNotesPlaceholder')} 
                                  value={formData[`${outcome.id}_notes`] || ''} 
                                  onChange={e => setFormData({...formData, [`${outcome.id}_notes`]: e.target.value})} 
                                  className="bg-card border border-border rounded-xl text-xs min-h-[70px] p-3 focus:border-indigo-500 transition-all" 
                                />
                              </div>

                              {/* SAVE BUTTON IN CARD */}
                              <div className="flex items-center justify-end border-t border-border/60 pt-3">
                                <Button 
                                  size="sm" 
                                  disabled={!isChecked || isSavingStatus !== null}
                                  onClick={() => handleSaveStatus(outcome.id)} 
                                  className="bg-primary hover:bg-indigo-700 text-white rounded-xl h-9 px-5 font-black text-[10px] shadow-sm shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {isSavingStatus === outcome.id ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      Save status
                                    </>
                                  )}
                                </Button>
                              </div>

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, fullWidth = false, t }: { label: string; value: any; fullWidth?: boolean; t: (k: any) => string }) {
  return (
    <div className={cn("space-y-1.5", fullWidth && "col-span-full")}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="text-sm font-semibold text-foreground leading-tight">
        {value || <span className="text-slate-300 font-normal italic">{t('notProvided')}</span>}
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false, dir, noBg = false, className, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl', noBg?: boolean, className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={(e: any) => onChange(e.target.value)} 
        required={required}
        dir={dir}
        className={cn(
          "h-9 border-border rounded-lg font-normal text-sm transition-all focus:ring-indigo-500", 
          noBg ? "bg-transparent" : "bg-background",
          dir === 'rtl' && "font-arabic"
        )} 
        {...props}
      />
    </div>
  );
}
