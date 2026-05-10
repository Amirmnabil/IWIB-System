'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, ChevronLeft, Save, Loader2, PhoneCall, 
  Calendar, CheckCircle2, UserCircle, Briefcase, 
  MapPin, Globe, Timer, ShieldAlert, X, MessageSquare, Clock,
  FileText, ClipboardCheck, ArrowRight, Upload, UserMinus, PlusCircle,
  Zap, Sparkles, Target, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirestore, useCollection, useUser, useMemoFirebase, doc, updateDoc, collection, addDoc, serverTimestamp, query, where, orderBy } from "@/firebase";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-context";

const LOB_OPTIONS = [
  "Medical", "Life", "Motor", "Property", "Liability", 
  "Marine", "Engineering", "Financial Lines", "Cyber", 
  "Travel", "Personal Accident"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
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
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData(company);
      setActiveAction(company.status);
    }
  }, [company]);

  const CALL_OUTCOMES = [
    { id: 'request_meeting', label: t('requestMeeting'), sub: 'Convert to lead & schedule', icon: '📅', bg: 'bg-indigo-50', border: 'border-indigo-600', text: 'text-indigo-700', activeIcon: 'text-indigo-600' },
    { id: 'request_quotation', label: t('requestQuotation'), sub: 'Capture docs & price', icon: '📝', bg: 'bg-emerald-50', border: 'border-emerald-600', text: 'text-emerald-700', activeIcon: 'text-emerald-600' },
    { id: 'hr_left', label: t('hrLeft'), sub: 'HR moved - spawn new firm', icon: '👤', bg: 'bg-rose-50', border: 'border-rose-600', text: 'text-rose-700', activeIcon: 'text-rose-600' },
    { id: 'waiting_for_data', label: t('waitingForData'), sub: 'Client will send docs', icon: '🔵', bg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-700', activeIcon: 'text-blue-600' },
    { id: 'call_back', label: t('callBack'), sub: 'Follow-up needed', icon: '🟡', bg: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700', activeIcon: 'text-amber-600' },
    { id: 'send_profile', label: t('sendProfile'), sub: 'Share broker info', icon: '🟣', bg: 'bg-violet-50', border: 'border-violet-600', text: 'text-violet-700', activeIcon: 'text-violet-600' },
    { id: 'renewed', label: t('renewed'), sub: 'Contract confirmed', icon: '🟢', bg: 'bg-green-50', border: 'border-green-600', text: 'text-green-700', activeIcon: 'text-green-600' },
    { id: 'not_interested', label: t('notInterested'), sub: 'Close lead entry', icon: '🔴', bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-700', activeIcon: 'text-red-600' },
    { id: 'wrong_number', label: t('wrongNumber'), sub: 'Check contact info', icon: '⚫', bg: 'bg-slate-100', border: 'border-slate-800', text: 'text-slate-900', activeIcon: 'text-slate-800' },
    { id: 'no_answer', label: t('noAnswer'), sub: 'Try another time', icon: '🟠', bg: 'bg-orange-50', border: 'border-orange-600', text: 'text-orange-700', activeIcon: 'text-orange-600' },
  ];

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    let newStatus = actionId;
    if (actionId === 'request_meeting' || actionId === 'request_quotation') {
      newStatus = 'lead';
    }
    setFormData(prev => ({ 
      ...prev, 
      status: newStatus,
      last_contact_date: new Date().toISOString().split('T')[0]
    }));
  };

  const handleSave = async () => {
    if (!firestore || !id) return;
    setIsSaving(true);
    try {
      let finalOldCompanyData = { ...formData };

      // 1. Handle "HR. Left" special automation
      if (activeAction === 'hr_left' && formData.hr_left_new_company_name) {
        const newCompanyData = {
          name: formData.hr_left_new_company_name,
          current_insurer: formData.hr_left_current_insurer || "",
          employee_count: Number(formData.hr_left_employee_count) || 0,
          renewal_month: formData.hr_left_renewal_month || "",
          last_contact_date: formData.hr_left_data_receiving_date || "",
          status: 'lead',
          assigned_user_id: user?.uid || "",
          assigned_user_name: user?.displayName || user?.email || "",
          created_at: new Date().toISOString(),
          notes: `Created via HR. Left from ${formData.name}. ${formData.hr_left_notes || ""}`,
          primary_contact_title: formData.primary_contact_title || "",
          primary_contact_name: formData.primary_contact_name || "",
          primary_contact_phone: formData.primary_contact_phone || "",
          primary_contact_email: formData.primary_contact_email || "",
        };

        await addDoc(collection(firestore, "companies"), newCompanyData);
        finalOldCompanyData.primary_contact_title = "";
        finalOldCompanyData.primary_contact_name = "";
        finalOldCompanyData.primary_contact_phone = "";
        finalOldCompanyData.primary_contact_email = "";

        if (formData.hr_left_update_current_checklist) {
          finalOldCompanyData.checklist_completion = 'Completed';
        }
      }

      await updateDoc(doc(firestore, "companies", id), {
        ...finalOldCompanyData,
        updated_at: serverTimestamp(),
      });

      toast({ title: "Company record synchronized successfully" });
      router.push('/companies');
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Persistence Error", description: "Could not save company data." });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sticky top-0 z-50 bg-slate-50/80 backdrop-blur-xl py-4 border-b">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/companies')} 
            className="rounded-2xl border-2 w-10 h-10 hover:shadow-lg transition-all bg-white"
          >
            <ChevronLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{formData.name}</h1>
              <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500 font-black">{formData.code}</Badge>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t('telesalesWorkflowSuite')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/companies')} className="rounded-2xl font-black h-11 px-6 border-2">{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-900 hover:bg-indigo-800 rounded-2xl font-black h-11 px-8 shadow-xl shadow-indigo-200 transition-all active:scale-95">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t('saveChanges')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PROFILE SECTION */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-100 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xs font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 rounded-2xl text-indigo-600 shadow-sm"><Building2 className="w-5 h-5" /></div>
                {t('coreProfile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <FormInput label={t('companyEn')} value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                <FormInput label={t('companyAr')} value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} dir="rtl" />
                <FormInput label={t('clientCode')} value={formData.code} onChange={v => setFormData({...formData, code: v})} />
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('priority')}</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                    <SelectTrigger className="h-12 bg-slate-50 border-2 rounded-2xl font-bold text-sm focus:ring-indigo-500 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">
                      <SelectItem value="low" className="font-bold">Low</SelectItem>
                      <SelectItem value="medium" className="font-bold">Medium</SelectItem>
                      <SelectItem value="high" className="font-bold text-orange-600">High</SelectItem>
                      <SelectItem value="critical" className="font-bold text-red-600">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FormInput label={t('industry')} value={formData.industry} onChange={v => setFormData({...formData, industry: v})} />
                <FormInput label={t('headcount')} value={formData.employee_count} type="number" onChange={v => setFormData({...formData, employee_count: Number(v)})} />
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('lineOfBusiness')}</Label>
                  <Select value={formData.insurance_type} onValueChange={v => setFormData({...formData, insurance_type: v as any})}>
                    <SelectTrigger className="h-12 bg-slate-50 border-2 rounded-2xl font-bold text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">{LOB_OPTIONS.map(lob => <SelectItem key={lob} value={lob} className="font-bold">{lob}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <FormInput label={t('city')} value={formData.city} onChange={v => setFormData({...formData, city: v})} />
              </motion.div>

              <Separator className="bg-slate-100" />

              <div className="space-y-6">
                <div className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><Timer className="w-4 h-4" /></div>
                  {t('milestonesRenewals')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('exRenewal')}</Label>
                    <Select value={formData.expected_renewal_date} onValueChange={v => setFormData({...formData, expected_renewal_date: v})}>
                      <SelectTrigger className="h-12 bg-slate-50 border-2 rounded-2xl font-bold text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-2">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('exSubmitOfferDate')} type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('actualRenewal')}</Label>
                    <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                      <SelectTrigger className="h-12 bg-slate-50 border-2 rounded-2xl font-bold text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-2">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('actualOfferReceivingDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-6">
                <div className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><UserCircle className="w-4 h-4" /></div>
                  {t('multiLevelContacts')}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2, 3].map((level, index) => {
                    const prefix = level === 1 ? 'primary' : level === 2 ? 'second' : 'third';
                    return (
                      <motion.div 
                        key={level} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="grid grid-cols-1 md:grid-cols-5 gap-4 p-5 bg-slate-50/50 rounded-[1.5rem] border-2 group hover:bg-white hover:border-indigo-100 transition-all hover:shadow-lg shadow-slate-100"
                      >
                        <div className="flex flex-col justify-center">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('level')} {level}</span>
                          <span className="text-xs text-slate-400 font-black uppercase tracking-tighter mt-0.5">{level === 1 ? t('decisionMaker') : t('alternative')}</span>
                        </div>
                        <FormInput label={t('title')} value={formData[`${prefix}_contact_title`]} onChange={v => setFormData({...formData, [`${prefix}_contact_title`]: v})} noBg />
                        <FormInput label={t('name')} value={formData[`${prefix}_contact_name`]} onChange={v => setFormData({...formData, [`${prefix}_contact_name`]: v})} noBg />
                        <FormInput label={t('phone')} value={formData[level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]} onChange={v => setFormData({...formData, [level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]: v})} noBg />
                        <FormInput label={t('email')} value={formData[`${prefix}_contact_email`]} onChange={v => setFormData({...formData, [`${prefix}_contact_email`]: v})} noBg />
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TELESALES ACTIONS SECTION */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-28">
            <div className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.3em] flex items-center gap-3 px-2 mb-6">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" /> {t('telesalesWorkflowSuite')}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {CALL_OUTCOMES.map((outcome, index) => (
                <motion.div 
                  key={outcome.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card 
                    className={cn(
                      "rounded-3xl border-2 transition-all cursor-pointer overflow-hidden group relative",
                      activeAction === outcome.id 
                        ? `${outcome.bg} ${outcome.border} shadow-2xl shadow-slate-200 translate-x-[-8px]` 
                        : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-xl hover:translate-x-[-4px]"
                    )} 
                    onClick={() => handleActionClick(outcome.id)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-5 px-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 shadow-sm",
                          activeAction === outcome.id ? "bg-white/80 scale-110" : "bg-slate-50"
                        )}>
                          {outcome.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-black text-sm tracking-tight", activeAction === outcome.id ? outcome.text : "text-slate-900")}>{outcome.label}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-70 truncate">{outcome.sub}</p>
                        </div>
                        {activeAction === outcome.id ? (
                          <div className={cn("p-1 rounded-full", outcome.bg, outcome.text)}><CheckCircle2 className="w-6 h-6" /></div>
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:border-indigo-200 transition-colors">
                            <ArrowRight className={cn("w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-all", isRtl && "rotate-180")} />
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {activeAction === outcome.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 pt-0 border-t border-black/5 bg-white/40">
                              <div className="grid grid-cols-1 gap-6 mt-6">
                                
                                {/* 1. CALL BACK / WAITING FOR DATA */}
                                {(outcome.id === 'call_back' || outcome.id === 'waiting_for_data') && (
                                  <FormInput label={t('setFollowUpDate')} type="datetime-local" value={formData.follow_up_date} onChange={v => setFormData({...formData, follow_up_date: v})} />
                                )}
                                
                                {/* 2. REQUEST MEETING */}
                                {outcome.id === 'request_meeting' && (
                                  <FormInput label={t('scheduledMeetingTime')} type="datetime-local" value={formData.meeting_time} onChange={v => setFormData({...formData, meeting_time: v})} />
                                )}

                                {/* 3. REQUEST QUOTATION */}
                                {outcome.id === 'request_quotation' && (
                                  <div className="space-y-6">
                                    <div className="p-6 bg-emerald-50/50 rounded-3xl border-2 border-emerald-100/50">
                                      <div className="text-[11px] font-black text-emerald-700 uppercase mb-4 flex items-center gap-2 tracking-widest">
                                        <Sparkles className="w-4 h-4" /> {t('requiredDocuments')} · {formData.insurance_type}
                                      </div>
                                      <div className="grid grid-cols-1 gap-3">
                                        {currentRequiredDocs.map(docName => (
                                          <div key={docName} className="flex items-center gap-3 text-xs font-bold text-slate-700 bg-white/80 p-3 rounded-2xl border border-emerald-100">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                                            {docName}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('uploadDoc')}</Label>
                                      <Button variant="outline" className="w-full h-24 rounded-[1.5rem] border-dashed border-2 border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex flex-col gap-2">
                                        <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm"><Upload className="w-5 h-5" /></div>
                                        <span className="text-xs font-black text-indigo-900 tracking-tight">{isRtl ? 'اسحب الملفات هنا أو اختر ملف' : 'Drop documents here or click to browse'}</span>
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* 4. HR LEFT */}
                                {outcome.id === 'hr_left' && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                      <FormInput label={t('newCompanyName')} value={formData.hr_left_new_company_name} onChange={v => setFormData({...formData, hr_left_new_company_name: v})} />
                                      <FormInput label={t('currentInsurerNewFirm')} value={formData.hr_left_current_insurer} onChange={v => setFormData({...formData, hr_left_current_insurer: v})} />
                                      <FormInput label={t('noOfEmployee')} type="number" value={formData.hr_left_employee_count} onChange={v => setFormData({...formData, hr_left_employee_count: v})} />
                                      <div className="space-y-2">
                                        <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('renewalMonth')}</Label>
                                        <Select value={formData.hr_left_renewal_month} onValueChange={v => setFormData({...formData, hr_left_renewal_month: v})}>
                                          <SelectTrigger className="h-12 bg-slate-50 border-2 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                                          <SelectContent className="rounded-2xl border-2">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                      <FormInput label={t('dataReceivingDate')} type="date" value={formData.hr_left_data_receiving_date} onChange={v => setFormData({...formData, hr_left_data_receiving_date: v})} />
                                    </div>
                                    <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] space-y-4">
                                      <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                          <p className="text-[11px] font-black text-rose-900 uppercase tracking-widest">{t('updateCurrentChecklist')}</p>
                                          <p className="text-[10px] text-rose-700 font-medium">{isRtl ? 'تغيير حالة المستندات إلى "مكتمل"' : 'Set Documents Status to "Completed"'}</p>
                                        </div>
                                        <Switch 
                                          checked={formData.hr_left_update_current_checklist} 
                                          onCheckedChange={v => setFormData({...formData, hr_left_update_current_checklist: v})} 
                                          className="data-[state=checked]:bg-rose-600"
                                        />
                                      </div>
                                      <div className="p-4 bg-white/60 rounded-2xl border border-rose-200">
                                        <p className="text-[10px] font-black text-rose-800 flex items-center gap-2 mb-1">
                                          <ShieldAlert className="w-4 h-4" /> {isRtl ? 'تنبيه نقل البيانات' : 'DATA TRANSFER PROTOCOL'}
                                        </p>
                                        <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">{isRtl ? 'سيتم نقل بيانات الاتصال الأساسية إلى المؤسسة الجديدة ومسحها من هنا عند الحفظ.' : 'Primary contact details will be migrated to the new firm and purged from this record on save.'}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* 5. RENEWED */}
                                {outcome.id === 'renewed' && (
                                  <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('actualRenewal')}</Label>
                                      <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                                        <SelectTrigger className="h-12 bg-slate-50 border-2 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-2">{MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}</SelectContent>
                                      </Select>
                                    </div>
                                    <FormInput label={t('actualOfferDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                                    <FormInput label={t('currentInsurer')} value={formData.current_insurer} onChange={v => setFormData({...formData, current_insurer: v})} />
                                    <FormInput label={t('currentTpa')} value={formData.current_tpa} onChange={v => setFormData({...formData, current_tpa: v})} />
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('interactionNotes')}</Label>
                                  <Textarea 
                                    placeholder={isRtl ? "سجل أهم ما تم مناقشته..." : "Key takeaways from this interaction..."} 
                                    value={formData[`${outcome.id}_notes`]} 
                                    onChange={e => setFormData({...formData, [`${outcome.id}_notes`]: e.target.value})} 
                                    className="bg-white border-2 border-slate-100 rounded-2xl text-sm min-h-[100px] p-4 focus:border-indigo-500 transition-all" 
                                  />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border-2 border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('actionLoggedDate')}</p>
                                      <p className="text-xs font-black text-slate-900 mt-0.5">{new Date().toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  {(outcome.id.includes('request') || outcome.id === 'hr_left') && (
                                    <Badge className="bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 border-indigo-200 text-[10px] font-black px-3 h-7">
                                      {t('systemAutomationActive')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false, dir, noBg = false, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl', noBg?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        required={required}
        dir={dir}
        className={cn(
          "h-12 border-2 rounded-2xl font-bold text-sm transition-all focus:ring-indigo-500 focus:border-indigo-500", 
          noBg ? "bg-white" : "bg-slate-50",
          dir === 'rtl' && "font-arabic"
        )} 
        {...props}
      />
    </div>
  );
}
