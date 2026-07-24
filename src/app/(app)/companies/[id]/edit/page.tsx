'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, ChevronLeft, Save, Loader2, PhoneCall, 
  Calendar, CheckCircle2, UserCircle, Briefcase, 
  MapPin, Globe, Timer, ShieldAlert, X, MessageSquare, Clock,
  FileText, ClipboardCheck, ArrowRight, Upload, UserMinus, PlusCircle,
  Zap, Sparkles, Target, ArrowUpRight, Send, XCircle, PhoneOff, AlertCircle, Link as LinkIcon, Edit3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/lib/hooks/use-toast";
import { useUser } from "@/lib/auth-provider";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-context";
import { TranslationSchema } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useMasterData } from "@/lib/hooks/use-master-data";
import { useInsurers } from "@/lib/hooks/use-insurers";
import { logAuditEvent } from "@/lib/audit-logger";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useSupabaseDoc } from "@/lib/hooks/use-supabase-doc";
import { sanitizePayload } from "@/lib/sanitize";
import { CompanySchema } from "@/schemas/company.schema";
import { ContactService } from "@/services/contact.service";



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

const REQUIRED_DOCS: Record<string, string[]> = {
  "Medical": ["Member Census (Excel)", "Existing Table of Benefits", "3 Years Claims History", "CR Copy", "Tax Card"],
  "Motor": ["Vehicle Census (Excel)", "Existing Policy Schedule", "CR Copy", "Tax Card"],
  "Property": ["Asset List & Valuations", "CR Copy", "Tax Card"],
  "default": ["CR Copy", "Tax Card", "Existing Policy (if any)"]
};

export default function EditCompanyPage() {
  const { t, isRtl } = useI18n();
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const { data: company, isLoading: companyLoading } = useSupabaseDoc<Company>('companies', id);

  const [formData, setFormData] = useState<Partial<Company>>({});
  
  // Exclusive Single Status Workflow & Expansion State
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  const { data: industries } = useMasterData('industries');
  const { data: sources } = useMasterData('sources');
  const { data: productTypes } = useMasterData('product_types');
  const { data: productSubtypes } = useMasterData('product_subtypes');
  const { data: clientTypes } = useMasterData('client_types');
  const { data: locationsData } = useMasterData('locations');
  const locations = locationsData || [];
  const { data: systemUsersData } = useSupabaseCollection<any>('users');
  const systemUsers = systemUsersData || [];
  const { data: insurers } = useInsurers();
  const { data: tpasData } = useSupabaseCollection<any>('tpas');
  const tpas = tpasData || [];
  const { data: contactRolesData } = useSupabaseCollection<any>('contact_roles');
  const contactRoles = contactRolesData || [];

  // Synchronize company load with exclusive workflow statuses and load contacts
  useEffect(() => {
    let isMounted = true;
    
    const loadCompanyData = async () => {
      if (company && (!formData.id || formData.id !== id)) {
        const initialData: Partial<Company> = { ...company, id };
        
        try {
          const { data: contactsData } = await supabase
            .from('contacts')
            .select('*')
            .eq('company_id', id);
            
          if (contactsData && contactsData.length > 0 && isMounted) {
            let primaryFound = false;
            let secondFound = false;
            let thirdFound = false;
            
            contactsData.forEach((contact: any) => {
              if (contact.is_primary && !primaryFound) {
                initialData.primary_contact_name = `${contact.first_name} ${contact.last_name}`.trim();
                initialData.primary_contact_phone = contact.phone || contact.mobile || "";
                initialData.primary_contact_email = contact.email || "";
                initialData.primary_contact_role_id = contact.role_id || "";
                primaryFound = true;
              } else if (!secondFound && (!contact.is_primary || primaryFound)) {
                initialData.second_contact_name = `${contact.first_name} ${contact.last_name}`.trim();
                initialData.second_contact_mobile = contact.mobile || contact.phone || "";
                initialData.second_contact_email = contact.email || "";
                initialData.second_contact_role_id = contact.role_id || "";
                secondFound = true;
              } else if (!thirdFound) {
                initialData.third_contact_name = `${contact.first_name} ${contact.last_name}`.trim();
                initialData.third_contact_mobile = contact.mobile || contact.phone || "";
                initialData.third_contact_email = contact.email || "";
                initialData.third_contact_role_id = contact.role_id || "";
                thirdFound = true;
              }
            });
          }
        } catch (err) {
          console.error("Failed to load contacts for company", err);
        }

        if (isMounted) {
          setFormData(initialData);
          if (company.status) {
            setSelectedStatus(company.status);
            setExpandedCard(company.status);
          }
        }
      }
    };
    
    loadCompanyData();
    
    return () => { isMounted = false; };
  }, [company, formData.id, id]);

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

  const handleSaveStatus = async (outcomeId: string) => {
    if (!id || !company) return;
    setIsSavingStatus(outcomeId);
    try {

      let status = outcomeId;
      let priority = company.priority || 'medium';
      let primaryContactFields: any = {};

      // 4) AUTOMATION LOGIC (CRITICAL RULES)
      switch (outcomeId) {
        case 'request_meeting':
          priority = 'high';
          break;
        case 'request_quotation':
          priority = 'high';
          break;
        case 'hr_left':
          priority = 'medium'; // Moderate
          break;
        case 'waiting_for_data':
          priority = 'high';
          break;
        case 'call_back':
          priority = 'high';
          break;
        case 'send_profile':
          priority = 'medium'; // Moderate
          break;
        case 'renewed':
          priority = 'medium'; // Moderate
          break;
        case 'not_interested':
          priority = 'low'; // Negligible
          break;
        case 'wrong_number':
          priority = 'low'; // Negligible
          break;
        case 'no_answer':
          priority = 'low'; // Negligible
          break;
        default:
          break;
      }

      // Compile updated fields
      const updatedFields = {
        ...primaryContactFields,
        status,
        priority,
        updated_at: new Date().toISOString()
      };

      // Update company document
      const { error: companyUpdateError } = await supabase
        .from('companies')
        .update(updatedFields)
        .eq('id', id);
        
      if (companyUpdateError) throw companyUpdateError;

      // 5) LEAD CONVERSION LOGIC
      if (outcomeId === 'request_meeting' || outcomeId === 'request_quotation') {
        const { data: leadSnapshot } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', id);

        const alreadyHasLead = leadSnapshot && leadSnapshot.length > 0;

        if (!alreadyHasLead) {
          // Fetch primary contact from contacts table
          const { data: primaryContacts } = await supabase.from('contacts').select('*').eq('company_id', id).eq('is_primary', true);
          const pContact = primaryContacts && primaryContacts.length > 0 ? primaryContacts[0] : null;
          
          const leadData = {
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

          // Create a task for the Sales Manager
          const manager = systemUsers.find((u: any) => 
            (u.role === 'Manager' && u.department === 'Sales') || 
            u.role === 'Manager' || 
            u.department === 'Sales'
          ) || { id: null, name: "Sales Manager" };

          const taskSubject = outcomeId === 'request_meeting' ? 'Schedule Meeting for New Lead' : 'Prepare Quotation for New Lead';
          
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

          await supabase.from('activities').insert(sanitizeUUIDs(taskData));
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
         description: `Company outcome status was set to ${outcomeId}`,
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
        changes: {
          status_workflow_trigger: outcomeId,
          fields_updated: updatedFields
        }
      });

      // Sync form inputs locally
      setFormData(prev => ({
        ...prev,
        ...updatedFields
      }));

      toast({ 
        title: "Workflow Status Updated", 
        description: `Successfully moved to "${outcomeId}" status and executed automation pipeline.` 
      });
    } catch (error: any) {
      console.error("Workflow status save error:", error);
      toast({ 
        variant: "destructive", 
        title: "Workflow Update Failed", 
        description: error.message || "Could not update status." 
      });
    } finally {
      setIsSavingStatus(null);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      if (!company) throw new Error("Initialization error");

      const clean = sanitizePayload(formData);
      
      const parsed = CompanySchema.safeParse(clean);
      if (!parsed.success) {
        setIsSaving(false);
        toast({ 
          title: "Validation Error", 
          description: parsed.error.errors.map(e => e.message).join(", "),
          variant: "destructive" 
        });
        return;
      }

      // Keep selectedStatus in sync with save actions
      if (selectedStatus) {
        clean.status = selectedStatus;
      }

      // Strip fields that are NOT real DB columns (e.g. role_id virtual fields).
      // Only send known Supabase companies columns to avoid PostgrestError.
      const COMPANY_DB_COLUMNS = new Set([
        'code','name','name_ar','status','industry','employee_count','priority',
        'city','address','cr_number','tax_card','current_insurer','insurance_type',
        'medical_subtype','checklist_status','checklist_completion',
        'expected_renewal_date','expected_offer_date','actual_renewal_date','actual_offer_date',
        'website','linkedin_page','landline',
        'assigned_user_id','assigned_user_name','source',
        'last_contact_date','call_date','follow_up_date','renewal_month','notes','updated_at'
      ]);

      const finalOldCompanyData: Record<string, any> = {};
      for (const [k, v] of Object.entries(clean)) {
        if (COMPANY_DB_COLUMNS.has(k)) finalOldCompanyData[k] = v;
      }
      finalOldCompanyData.updated_at = new Date().toISOString();

      // Execute Supabase update directly
      const { error: companyError } = await supabase
        .from('companies')
        .update(finalOldCompanyData)
        .eq('id', id);

      if (companyError) {
        console.error('Supabase update error details:', {
          message: companyError.message,
          code: companyError.code,
          details: companyError.details,
          hint: companyError.hint,
        });
        throw new Error(companyError.message || 'Database update failed');
      }

      // Construct contacts payload for updating/inserting
      const contacts_payload: any[] = [];
      const contactLevels = [
        { prefix: 'primary', label: 'Decision Maker' },
        { prefix: 'second', label: 'Alternative 1' },
        { prefix: 'third', label: 'Alternative 2' }
      ];

      for (const level of contactLevels) {
        const name = formData[`${level.prefix}_contact_name` as keyof Company];
        const email = formData[`${level.prefix}_contact_email` as keyof Company];
        const phone = formData[level.prefix === 'primary' ? 'primary_contact_phone' : `${level.prefix}_contact_mobile` as keyof Company];
        const role_id = formData[`${level.prefix}_contact_role_id` as keyof Company] as string | undefined;

        if (name) {
          const parts = (name as string).trim().split(' ');
          const first_name = parts[0];
          // last_name is NOT NULL in contacts table — use '' as fallback
          const last_name = parts.length > 1 ? parts.slice(1).join(' ') : '';

          // Resolve role name from contactRoles for job_title column
          const resolvedRole = role_id
            ? contactRoles.find((r: any) => r.id === role_id)
            : null;
          const job_title = resolvedRole?.role_name_en || resolvedRole?.role_name || null;
          
          contacts_payload.push({
            first_name,
            last_name,
            email: email || null,
            phone: level.prefix === 'primary' ? phone || null : null,
            mobile: level.prefix !== 'primary' ? phone || null : null,
            is_primary: level.prefix === 'primary',
            job_title,
            role_id: role_id || null,
          });
        }
      }

      // Centralized Contact Sync using ContactService for deduplication and relationship preservation
      const activeContactIds: string[] = [];
      for (const c of contacts_payload) {
        try {
          const syncedId = await ContactService.syncContact({
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            mobile: c.mobile || undefined,
            role_id: c.role_id || undefined,
            role_name_en: c.job_title || undefined,
            company_id: id,
            company_name: formData.name || undefined,
            is_primary: c.is_primary,
            preferred_contact_method: "Email",
            notes: `[Synced via Company Edit]`
          } as any, user, "CompanyEdit");
          if (syncedId) {
            activeContactIds.push(syncedId);
          }
        } catch (syncErr) {
          console.error("Error syncing contact in CompanyEdit:", syncErr);
        }
      }

      // Delete contacts that are no longer active for this company
      try {
        if (activeContactIds.length > 0) {
          await supabase
            .from('contacts')
            .delete()
            .eq('company_id', id)
            .not('id', 'in', `(${activeContactIds.join(',')})`);
        } else {
          await supabase
            .from('contacts')
            .delete()
            .eq('company_id', id);
        }
      } catch (deleteErr) {
        console.error("Error deleting inactive contacts in CompanyEdit:", deleteErr);
      }

      await logAuditEvent(null, user, {
        action: 'update',
        resource_type: 'company',
        resource_id: id,
        resource_name: formData.name,
        changes: finalOldCompanyData
      });

      toast({ title: t('companyUpdated') });
      router.push('/companies');
    } catch (error: any) {
      // Log full error details — Supabase PostgrestError fields are non-enumerable
      console.error("Save error:", error?.message ?? error?.code ?? JSON.stringify(error));
      toast({ variant: "destructive", title: t('persistenceError'), description: error?.message || t('persistenceErrorDescription') });
    } finally {
      setIsSaving(false);
    }
  };

  if (companyLoading) return <div className="p-8 text-center flex flex-col items-center gap-4"><Clock className="animate-spin w-12 h-12 text-primary" /> <p className="font-bold text-muted-foreground">{t('loading')}...</p></div>;

  const currentRequiredDocs = REQUIRED_DOCS[formData.insurance_type || ""] || REQUIRED_DOCS.default;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className={cn("space-y-6 max-w-7xl mx-auto pb-20", isRtl && "font-arabic")}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md py-3 border-b border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/companies')} 
            className="rounded-xl border border-border w-9 h-9 hover:bg-slate-100 transition-all bg-card"
          >
            <ChevronLeft className={cn("w-4 h-4 text-muted-foreground", isRtl && "rotate-180")} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[32px] md:text-[40px] font-headline font-black text-foreground tracking-tight">{formData.name}</h1>
              {formData.code && <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-medium">{formData.code}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/companies')} className="rounded-xl font-medium h-9 px-4 text-muted-foreground hover:bg-slate-100">{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-indigo-700 rounded-xl font-semibold h-9 px-6 shadow-md transition-all active:scale-95 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t('saveChanges')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PROFILE SECTION */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-background/50 border-b p-5 py-4">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                {t('coreProfile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-8">
              {/* Row 1: Core Info */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('coreInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput label={t('companyEn')} value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                  <FormInput label={t('companyAr')} value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} dir="rtl" />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('clientType') || 'Client Type'}</Label>
                    <Select value={formData.client_type} onValueChange={v => setFormData({...formData, client_type: v})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue placeholder="Select Client Type" /></SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {clientTypes?.map((ct: any) => (
                          <SelectItem key={ct.id} value={isRtl ? (ct.name_ar || ct.name) : (ct.name_en || ct.name)}>
                            {isRtl ? (ct.name_ar || ct.name) : (ct.name_en || ct.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('clientCode')}</Label>
                    <div className="h-9 bg-slate-100 border border-border rounded-lg flex items-center px-3 text-xs font-bold text-muted-foreground">
                      {formData.code || '---'}
                    </div>
                  </div>
                  <FormInput label="Landline" value={formData.landline} onChange={v => setFormData({...formData, landline: v})} />
                </div>
              </div>

              {/* Row 2: Business & Legal Info */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('registrationAndLocation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('industry')}</Label>
                    <Select value={formData.industry} onValueChange={v => setFormData({...formData, industry: v})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                      <SelectContent className="rounded-lg max-h-[300px]">
                        {(() => {
                          const groups: Record<string, any[]> = {};
                          if (industries) {
                            industries.forEach((ind: any) => {
                              const cat = isRtl ? ind.category_ar : ind.category_en;
                              if (!groups[cat]) groups[cat] = [];
                              groups[cat].push(ind);
                            });
                          }
                          
                          return Object.entries(groups).map(([cat, items]) => (
                            <SelectGroup key={cat}>
                              <SelectLabel className="text-[11px] font-bold text-primary bg-background py-1 px-3">{cat}</SelectLabel>
                              {items.map((ind: any) => (
                                <SelectItem key={ind.id} value={isRtl ? ind.subcategory_ar : ind.subcategory_en}>
                                  {isRtl ? ind.subcategory_ar : ind.subcategory_en}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                        {formData.industry && industries && !industries.find((i: any) => (isRtl ? i.subcategory_ar : i.subcategory_en) === formData.industry) && (
                          <SelectItem value={formData.industry}>{formData.industry}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('headcount')} value={formData.employee_count} type="number" onChange={v => setFormData({...formData, employee_count: Number(v)})} />
                  <FormInput label={t('crNumber')} value={formData.cr_number} onChange={v => setFormData({...formData, cr_number: v})} />
                  <FormInput label={t('taxCard')} value={formData.tax_card} onChange={v => setFormData({...formData, tax_card: v})} />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('city')}</Label>
                    <Select value={formData.city} onValueChange={v => setFormData({...formData, city: v})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue placeholder="Select City" /></SelectTrigger>
                      <SelectContent className="rounded-lg max-h-[250px]">
                        {locations.map((loc: any) => (
                          <SelectItem key={loc.id} value={isRtl ? (loc.name_ar || loc.name_en) : (loc.name_en || loc.name)}>
                            {isRtl ? (loc.name_ar || loc.name_en) : (loc.name_en || loc.name)}
                          </SelectItem>
                        ))}
                        {/* Preserve existing value if not in list */}
                        {formData.city && !locations.find((l: any) => (isRtl ? (l.name_ar || l.name_en) : (l.name_en || l.name)) === formData.city) && (
                          <SelectItem value={formData.city}>{formData.city}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('address')} value={formData.address} onChange={v => setFormData({...formData, address: v})} className="md:col-span-2" />
                  <FormInput label="Landline" value={formData.landline} onChange={v => setFormData({...formData, landline: v})} />
                  <FormInput label={t('website')} value={formData.website} onChange={v => setFormData({...formData, website: v})} />
                  <FormInput label={t('linkedin')} value={formData.linkedin_page} onChange={v => setFormData({...formData, linkedin_page: v})} />
                </div>
              </div>

              {/* Row 3: Insurance & Sales Tracking */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('insuranceSalesTracking')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('lineOfBusiness')}</Label>
                    <Select value={formData.insurance_type} onValueChange={v => setFormData({...formData, insurance_type: v as any, medical_subtype: undefined})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue placeholder="Select Line of Business" /></SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {productTypes.map((pt: any) => (
                          <SelectItem key={pt.id} value={isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}>
                            {isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('subtype') || 'Subtype'}</Label>
                    <Select value={formData.medical_subtype} onValueChange={v => setFormData({...formData, medical_subtype: v as any})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue placeholder="Select Subtype" /></SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {(() => {
                          const selectedLOB = productTypes?.find((pt: any) => 
                            (isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)) === formData.insurance_type
                          );
                          const lobCategory = selectedLOB?.name || formData.insurance_type;
                          const availableSubtypes = productSubtypes?.filter((st: any) => st.category === lobCategory) || [];
                          
                          if (availableSubtypes.length === 0) {
                            return <SelectItem value="none" disabled className="text-slate-400 italic">No subtypes available</SelectItem>;
                          }
                          
                          return availableSubtypes.map((st: any) => (
                            <SelectItem key={st.id} value={isRtl ? (st.name_ar || st.name) : (st.name_en || st.name)}>
                              {isRtl ? (st.name_ar || st.name) : (st.name_en || st.name)}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('currentInsurer')}</Label>
                    <Select value={formData.current_insurer} onValueChange={v => setFormData({...formData, current_insurer: v})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue placeholder="Select Insurer" /></SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {insurers && insurers.map((ins: any) => (
                          <SelectItem key={ins.id} value={ins.companyName}>{ins.companyName}</SelectItem>
                        ))}
                        {formData.current_insurer && insurers && !insurers.find((i: any) => i.companyName === formData.current_insurer) && (
                          <SelectItem value={formData.current_insurer}>{formData.current_insurer}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('source')}</Label>
                    <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue placeholder="Select Source" /></SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {(() => {
                          const groups: Record<string, any[]> = {};
                          if (sources) {
                            sources.forEach((src: any) => {
                              const cat = src.category || 'Other';
                              if (!groups[cat]) groups[cat] = [];
                              groups[cat].push(src);
                            });
                          }
                          
                          return Object.entries(groups).map(([cat, items]) => (
                            <SelectGroup key={cat}>
                              <SelectLabel className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase">{cat}</SelectLabel>
                              {items.map((src: any) => (
                                <SelectItem key={src.id} value={isRtl ? src.name_ar : src.name_en}>
                                  {isRtl ? src.name_ar : src.name_en}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                        {formData.source && sources && !sources.find((s: any) => (isRtl ? s.name_ar : s.name_en) === formData.source) && (
                          <SelectItem value={formData.source}>{formData.source}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('priority')}</Label>
                    <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="low">{t('negligible')}</SelectItem>
                        <SelectItem value="medium">{t('moderate')}</SelectItem>
                        <SelectItem value="high">{t('high')}</SelectItem>
                        <SelectItem value="critical">{t('critical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('assignedUser')}</Label>
                    <Select
                      value={formData.assigned_user_id || ''}
                      onValueChange={v => {
                        const selected = systemUsers.find((u: any) => u.id === v);
                        setFormData({...formData, assigned_user_id: v, assigned_user_name: selected?.name || ''});
                      }}
                    >
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm">
                        <SelectValue placeholder="Select User" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg max-h-[250px]">
                        {systemUsers.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{u.name}</span>
                              {u.department && <span className="text-[10px] text-slate-400">{u.department}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('lastContactDate')} type="date" value={formData.last_contact_date?.split('T')[0]} onChange={v => setFormData({...formData, last_contact_date: v})} />
                  <FormInput label={t('followUpDate')} type="datetime-local" value={formData.follow_up_date} onChange={v => setFormData({...formData, follow_up_date: v})} />
                </div>
              </div>

              {/* Row 4: Dates & Renewals */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('milestonesRenewals')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('exRenewal')}</Label>
                    <Select value={formData.expected_renewal_date} onValueChange={v => setFormData({...formData, expected_renewal_date: v, expected_offer_date: calculateOfferDate(v)})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-lg">{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as keyof TranslationSchema)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('exSubmitOfferDate')} type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t('actualRenewal')}</Label>
                    <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v, actual_offer_date: calculateOfferDate(v)})}>
                      <SelectTrigger className="h-9 bg-background border-border rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-lg">{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as keyof TranslationSchema)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('actualOfferDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                </div>
              </div>

              {/* Row 5: Contacts */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('multiLevelContacts')}</h3>
                <Tabs defaultValue="level1" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-9 bg-slate-100 rounded-lg">
                    <TabsTrigger value="level1" className="text-xs rounded-md">{t('primaryDecisionMaker') || "Primary"}</TabsTrigger>
                    <TabsTrigger value="level2" className="text-xs rounded-md">{t('alternative')} (2)</TabsTrigger>
                    <TabsTrigger value="level3" className="text-xs rounded-md">{t('alternative')} (3)</TabsTrigger>
                  </TabsList>
                  {[1, 2, 3].map((level) => {
                    const prefix = level === 1 ? 'primary' : level === 2 ? 'second' : 'third';
                    return (
                      <TabsContent key={level} value={`level${level}`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-background border border-border rounded-xl mt-2 transition-transform hover:-translate-y-1 hover:shadow-sm">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] font-medium text-muted-foreground">{t('role') || 'Role'}</Label>
                            <Select value={formData[`${prefix}_contact_role_id`]} onValueChange={v => setFormData({...formData, [`${prefix}_contact_role_id`]: v})}>
                              <SelectTrigger className="h-9 bg-card border-border rounded-lg text-sm"><SelectValue placeholder="Select Role" /></SelectTrigger>
                              <SelectContent>
                                {contactRoles.filter((r: any) => r.role_category === 'Client').map((role: any) => (
                                  <SelectItem key={role.id} value={role.id}>{role.role_name_en}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormInput label={t('name')} value={formData[`${prefix}_contact_name`]} onChange={v => setFormData({...formData, [`${prefix}_contact_name`]: v})} noBg />
                          <FormInput label={t('phone')} value={formData[level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]} onChange={v => setFormData({...formData, [level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]: v})} noBg />
                          <FormInput label={t('email')} value={formData[`${prefix}_contact_email`]} onChange={v => setFormData({...formData, [`${prefix}_contact_email`]: v})} noBg />
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </div>

              {/* Row 6: Notes */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('internalNotes')}</h3>
                <Textarea 
                  placeholder={t('interactionNotesPlaceholder')} 
                  value={formData.notes || ''}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="min-h-[80px] text-sm bg-background border-border focus:bg-card"
                />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* WORKFLOW STATUS CARD SYSTEM (TELESALES ACTIONS REDESIGN) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="sticky top-24">
            
            <div className="grid grid-cols-1 gap-3">
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
                        // Click anywhere on card -> expand
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
                            // Click top header -> collapse
                            if (isExpanded) {
                              e.stopPropagation(); // Stop expansion trigger from card wrapper
                              setExpandedCard(null);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {/* Checkbox (Status selection) */}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onClick={(e) => e.stopPropagation()} // Stop toggle clicks collapsing/expanding card
                              onChange={(e) => {
                                // "Ensure only ONE active status per company / Prevent multiple statuses at same time"
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
                              onClick={(e) => e.stopPropagation()} // Stop click-throughs collapsing body
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
                                        <Sparkles className="w-4 h-4" /> {t('requiredDocuments')} · {formData.insurance_type}
                                      </div>
                                      <div className="grid grid-cols-1 gap-2">
                                        {currentRequiredDocs.map(docName => (
                                          <div key={docName} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 bg-card/90 p-2.5 rounded-xl border border-emerald-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success/100 shadow-sm" />
                                            {docName}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t('uploadDoc')}</Label>
                                      <Button variant="outline" className="w-full h-20 rounded-2xl border-dashed border-2 border-indigo-200 bg-primary/10/30 hover:bg-primary/10 hover:border-indigo-300 transition-all flex flex-col gap-1.5">
                                        <Upload className="w-4 h-4 text-primary" />
                                        <span className="text-[10px] font-bold text-indigo-900 tracking-tight">{t('dropDocuments')}</span>
                                      </Button>
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
                                          <SelectContent className="rounded-xl">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{t(m as keyof TranslationSchema)}</SelectItem>)}</SelectContent>
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
                                        <SelectContent className="rounded-xl">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{t(m as keyof TranslationSchema)}</SelectItem>)}</SelectContent>
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
    </motion.div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false, dir, noBg = false, className, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl', noBg?: boolean, className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
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
