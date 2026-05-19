'use client';
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
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirestore, useCollection, useUser, useMemoFirebase, doc, updateDoc, collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from "@/firebase";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-context";
import { syncContact } from "@/lib/contact-sync";
import { CRMService } from "@/services/crm-service";
import { useMasterData } from "@/hooks/use-master-data";
import { useInsurers } from "@/hooks/use-insurers";
import { logAuditEvent } from "@/lib/audit-logger";

const LOB_OPTIONS = [
  "type_medical", "type_life", "type_motor", "type_property", "type_liability", 
  "type_marine", "type_engineering", "type_financial_lines", "type_cyber", 
  "type_travel", "type_personal_accident"
];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

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
  const firestore = useFirestore();
  const { user } = useUser();

  const companyRef = useMemoFirebase(() => doc(firestore!, 'companies', id), [firestore, id]);
  const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

  const [formData, setFormData] = useState<Partial<Company>>({});
  
  // Exclusive Single Status Workflow & Expansion State
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  const { data: industries } = useMasterData('industries');
  const { data: sources } = useMasterData('sources');
  const { data: insurers } = useInsurers();

  const crmService = useMemo(() => firestore ? new CRMService(firestore) : null, [firestore]);

  // Synchronize company load with exclusive workflow statuses
  useEffect(() => {
    if (company && (!formData.id || formData.id !== company.id)) {
      setFormData(company);
      if (company.status) {
        setSelectedStatus(company.status);
        setExpandedCard(company.status);
      }
    }
  }, [company, formData.id]);

  const CALL_OUTCOMES = [
    { id: 'request_meeting', label: t('requestMeeting') || 'Request Meeting', icon: <Calendar className="w-5 h-5"/>, bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600', activeIcon: 'text-indigo-600' },
    { id: 'request_quotation', label: t('requestQuotation') || 'Request Quotation', icon: <FileText className="w-5 h-5"/>, bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-600', activeIcon: 'text-emerald-600' },
    { id: 'hr_left', label: t('hrLeft') || 'HR Left', icon: <UserMinus className="w-5 h-5"/>, bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-600', activeIcon: 'text-rose-600' },
    { id: 'waiting_for_data', label: t('waitingForData') || 'Waiting for Data', icon: <Clock className="w-5 h-5"/>, bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600', activeIcon: 'text-blue-600' },
    { id: 'call_back', label: t('callBack') || 'Call Back', icon: <PhoneCall className="w-5 h-5"/>, bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600', activeIcon: 'text-amber-600' },
    { id: 'send_profile', label: t('sendProfile') || 'Send Profile', icon: <Send className="w-5 h-5"/>, bg: 'bg-violet-50/50', border: 'border-violet-100', text: 'text-violet-600', activeIcon: 'text-violet-600' },
    { id: 'renewed', label: t('renewed') || 'Renewed', icon: <CheckCircle2 className="w-5 h-5"/>, bg: 'bg-green-50/50', border: 'border-green-100', text: 'text-green-600', activeIcon: 'text-green-600' },
    { id: 'not_interested', label: t('notInterested') || 'Not Interested', icon: <XCircle className="w-5 h-5"/>, bg: 'bg-red-50/50', border: 'border-red-100', text: 'text-red-600', activeIcon: 'text-red-600' },
    { id: 'wrong_number', label: t('wrongNumber') || 'Wrong Number', icon: <PhoneOff className="w-5 h-5"/>, bg: 'bg-slate-100/50', border: 'border-slate-200', text: 'text-slate-600', activeIcon: 'text-slate-600' },
    { id: 'no_answer', label: t('noAnswer') || 'No Answer', icon: <AlertCircle className="w-5 h-5"/>, bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-600', activeIcon: 'text-orange-600' },
  ];

  const handleSaveStatus = async (outcomeId: string) => {
    if (!firestore || !id || !company) return;
    setIsSavingStatus(outcomeId);
    try {
      if (!crmService) throw new Error("CRM Service not initialized");

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
          // Automatically remove primary contact details from the company document
          primaryContactFields = {
            primary_contact_name: "",
            primary_contact_phone: "",
            primary_contact_email: "",
            primary_contact_title: "",
          };
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
      const companyRef = doc(firestore, 'companies', id);
      await updateDoc(companyRef, updatedFields);

      // 5) LEAD CONVERSION LOGIC
      if (outcomeId === 'request_meeting' || outcomeId === 'request_quotation') {
        const leadsRef = collection(firestore, 'leads');
        const leadSnapshot = await getDocs(leadsRef);
        const alreadyHasLead = leadSnapshot.docs.some((d: any) => d.data().company_id === id);

        if (!alreadyHasLead) {
          const leadData = {
            company_id: id,
            company_name: company.name || "",
            contact_name: company.primary_contact_name || "",
            email: company.primary_contact_email || "",
            phone: company.primary_contact_phone || "",
            priority: 'high',
            status: 'new',
            last_activity: `Auto-converted due to workflow status transition to: ${outcomeId}`,
            created_at: new Date().toISOString()
          };
          await addDoc(leadsRef, leadData);
          
          await logAuditEvent(firestore, user, {
            action: 'create',
            resource_type: 'lead' as any,
            resource_name: `Lead for ${company.name}`,
            changes: leadData
          });
        }
      }

      // Run standard workflow trigger logs
      const mergedUpdate = { ...company, ...updatedFields };
      await crmService.handleWorkflowTriggers(id, mergedUpdate, [outcomeId]);

      // Audit Logger
      await logAuditEvent(firestore, user, {
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
    if (!firestore || !id) return;
    setIsSaving(true);
    try {
      if (!crmService || !company) throw new Error("Initialization error");

      let finalOldCompanyData = { ...formData };
      
      // Keep selectedStatus in sync with save actions
      if (selectedStatus) {
        finalOldCompanyData.status = selectedStatus;
      }

      await crmService.updateCompany(id, finalOldCompanyData, company);

      // Sync primary contact
      const name = formData.primary_contact_name;
      if (name && (formData.primary_contact_email || formData.primary_contact_phone)) {
        await syncContact(firestore, {
          name: name,
          email: formData.primary_contact_email || "",
          phone: formData.primary_contact_phone || "",
          job_title: formData.primary_contact_title || "",
          company_id: id,
          company_name: formData.name || company.name,
          is_primary: true
        });
      }

      toast({ title: t('companyUpdated') });
      router.push('/companies');
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: t('persistenceError'), description: error.message || t('persistenceErrorDescription') });
    } finally {
      setIsSaving(false);
    }
  };

  if (companyLoading) return <div className="p-8 text-center flex flex-col items-center gap-4"><Clock className="animate-spin w-12 h-12 text-indigo-600" /> <p className="font-bold text-slate-500">{t('loading')}...</p></div>;

  const currentRequiredDocs = REQUIRED_DOCS[formData.insurance_type || ""] || REQUIRED_DOCS.default;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className={cn("space-y-6 max-w-7xl mx-auto pb-20", isRtl && "font-arabic")}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50 bg-slate-50/90 backdrop-blur-md py-3 border-b border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/companies')} 
            className="rounded-xl border border-slate-200 w-9 h-9 hover:bg-slate-100 transition-all bg-white"
          >
            <ChevronLeft className={cn("w-4 h-4 text-slate-600", isRtl && "rotate-180")} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-800 tracking-tight">{formData.name}</h1>
              {formData.code && <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500 font-medium">{formData.code}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/companies')} className="rounded-xl font-medium h-9 px-4 text-slate-600 hover:bg-slate-100">{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold h-9 px-6 shadow-md transition-all active:scale-95 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t('saveChanges')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PROFILE SECTION */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-5 py-4">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                {t('coreProfile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-8">
              {/* Row 1: Core Info */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('coreInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput label={t('companyEn')} value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                  <FormInput label={t('companyAr')} value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} dir="rtl" />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">{t('clientCode')}</Label>
                    <div className="h-9 bg-slate-100 border border-slate-200 rounded-lg flex items-center px-3 text-xs font-bold text-slate-500">
                      {formData.code || '---'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Business & Legal Info */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('registrationAndLocation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">{t('industry')}</Label>
                    <Select value={formData.industry} onValueChange={v => setFormData({...formData, industry: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"><SelectValue placeholder="Select Industry" /></SelectTrigger>
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
                              <SelectLabel className="text-[11px] font-bold text-indigo-600 bg-slate-50 py-1 px-3">{cat}</SelectLabel>
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
                  <FormInput label={t('city')} value={formData.city} onChange={v => setFormData({...formData, city: v})} />
                  <FormInput label={t('address')} value={formData.address} onChange={v => setFormData({...formData, address: v})} className="md:col-span-2" />
                  <FormInput label={t('website')} value={formData.website} onChange={v => setFormData({...formData, website: v})} />
                  <FormInput label={t('linkedin')} value={formData.linkedin_page} onChange={v => setFormData({...formData, linkedin_page: v})} />
                </div>
              </div>

              {/* Row 3: Insurance & Sales Tracking */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('insuranceSalesTracking')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">{t('lineOfBusiness')}</Label>
                    <Select value={formData.insurance_type} onValueChange={v => setFormData({...formData, insurance_type: v as any})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-lg">{LOB_OPTIONS.map(lob => <SelectItem key={lob} value={lob}>{t(lob as any)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">{t('medicalSubtype')}</Label>
                    <Select value={formData.medical_subtype} onValueChange={v => setFormData({...formData, medical_subtype: v as any})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="SME">{t('subtype_sme')}</SelectItem>
                        <SelectItem value="Corporate / Group">{t('subtype_corporate')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">{t('currentInsurer')}</Label>
                    <Select value={formData.current_insurer} onValueChange={v => setFormData({...formData, current_insurer: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"><SelectValue placeholder="Select Insurer" /></SelectTrigger>
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
                    <Label className="text-[11px] font-medium text-slate-500">{t('source')}</Label>
                    <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"><SelectValue placeholder="Select Source" /></SelectTrigger>
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
                    <Label className="text-[11px] font-medium text-slate-500">{t('priority')}</Label>
                    <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm">
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
                  <FormInput label={t('assignedUser')} value={formData.assigned_user_name} onChange={v => setFormData({...formData, assigned_user_name: v})} />
                  <FormInput label={t('lastContactDate')} type="date" value={formData.last_contact_date?.split('T')[0]} onChange={v => setFormData({...formData, last_contact_date: v})} />
                  <FormInput label={t('followUpDate')} type="datetime-local" value={formData.follow_up_date} onChange={v => setFormData({...formData, follow_up_date: v})} />
                </div>
              </div>

              {/* Row 4: Dates & Renewals */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('milestonesRenewals')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">{t('exRenewal')}</Label>
                    <Select value={formData.expected_renewal_date} onValueChange={v => setFormData({...formData, expected_renewal_date: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-lg">{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as any)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('exSubmitOfferDate')} type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">{t('actualRenewal')}</Label>
                    <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-lg">{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as any)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('actualOfferDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                </div>
              </div>

              {/* Row 5: Contacts */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('multiLevelContacts')}</h3>
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl mt-2 transition-transform hover:-translate-y-1 hover:shadow-sm">
                          <FormInput label={t('title')} value={formData[`${prefix}_contact_title`]} onChange={v => setFormData({...formData, [`${prefix}_contact_title`]: v})} noBg />
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
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('internalNotes')}</h3>
                <Textarea 
                  placeholder={t('interactionNotesPlaceholder')} 
                  value={formData.notes || ''}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="min-h-[80px] text-sm bg-slate-50 border-slate-200 focus:bg-white"
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
                          : "bg-white border-slate-200"
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
                          className="flex items-center justify-between p-4 cursor-pointer select-none border-b border-slate-100/50 bg-slate-50/20 hover:bg-slate-50/60 transition-colors"
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
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            />
                            
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-105",
                              isChecked ? "bg-white text-inherit shadow-inner" : "bg-slate-100 text-slate-500"
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
                              <div className="p-5 pt-3 border-t border-slate-100 bg-white/40 space-y-4">
                                
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
                                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/60">
                                      <div className="text-[10px] font-black text-emerald-700 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                        <Sparkles className="w-4 h-4" /> {t('requiredDocuments')} · {formData.insurance_type}
                                      </div>
                                      <div className="grid grid-cols-1 gap-2">
                                        {currentRequiredDocs.map(docName => (
                                          <div key={docName} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                                            {docName}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('uploadDoc')}</Label>
                                      <Button variant="outline" className="w-full h-20 rounded-2xl border-dashed border-2 border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex flex-col gap-1.5">
                                        <Upload className="w-4 h-4 text-indigo-600" />
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
                                      <FormInput label={t('currentInsurerNewFirm')} value={formData.hr_left_current_insurer} onChange={v => setFormData({...formData, hr_left_current_insurer: v})} />
                                      <FormInput label={t('noOfEmployee')} type="number" value={formData.hr_left_employee_count} onChange={v => setFormData({...formData, hr_left_employee_count: v})} />
                                      <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('renewalMonth')}</Label>
                                        <Select value={formData.hr_left_renewal_month} onValueChange={v => setFormData({...formData, hr_left_renewal_month: v})}>
                                          <SelectTrigger className="h-10 bg-slate-50 border rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                          <SelectContent className="rounded-xl">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{t(m as any)}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <FormInput label={t('dataReceivingDate')} type="date" value={formData.hr_left_data_receiving_date} onChange={v => setFormData({...formData, hr_left_data_receiving_date: v})} />
                                    </div>
                                    <p className="text-[10px] font-black text-rose-800 flex items-center gap-1.5 mt-2">
                                      <ShieldAlert className="w-4 h-4" /> {t('dataTransferProtocol')}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">{t('dataTransferDescription')}</p>
                                  </div>
                                )}
                                
                                {/* 5. RENEWED */}
                                {outcome.id === 'renewed' && (
                                  <div className="grid grid-cols-1 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('actualRenewal')}</Label>
                                      <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                                        <SelectTrigger className="h-10 bg-slate-50 border rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{t(m as any)}</SelectItem>)}</SelectContent>
                                      </Select>
                                    </div>
                                    <FormInput label={t('actualOfferDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                                    <FormInput label={t('currentInsurer')} value={formData.current_insurer} onChange={v => setFormData({...formData, current_insurer: v})} />
                                    <FormInput label={t('currentTpa')} value={formData.current_tpa} onChange={v => setFormData({...formData, current_tpa: v})} />
                                  </div>
                                )}

                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('interactionNotes')}</Label>
                                  <Textarea 
                                    placeholder={t('interactionNotesPlaceholder')} 
                                    value={formData[`${outcome.id}_notes`] || ''} 
                                    onChange={e => setFormData({...formData, [`${outcome.id}_notes`]: e.target.value})} 
                                    className="bg-white border border-slate-200 rounded-xl text-xs min-h-[70px] p-3 focus:border-indigo-500 transition-all" 
                                  />
                                </div>

                                {/* SAVE BUTTON IN CARD */}
                                <div className="flex items-center justify-end border-t border-slate-100/60 pt-3">
                                  <Button 
                                    size="sm" 
                                    disabled={!isChecked || isSavingStatus !== null}
                                    onClick={() => handleSaveStatus(outcome.id)} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-5 font-black text-[10px] shadow-sm shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
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
      <Label className="text-[11px] font-medium text-slate-500">{label}</Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        required={required}
        dir={dir}
        className={cn(
          "h-9 border-slate-200 rounded-lg font-normal text-sm transition-all focus:ring-indigo-500", 
          noBg ? "bg-transparent" : "bg-slate-50",
          dir === 'rtl' && "font-arabic"
        )} 
        {...props}
      />
    </div>
  );
}
