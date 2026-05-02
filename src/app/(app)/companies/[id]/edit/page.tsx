
'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, ChevronLeft, Save, Loader2, PhoneCall, 
  Calendar, CheckCircle2, UserCircle, Briefcase, 
  MapPin, Globe, Timer, ShieldAlert, X, MessageSquare, Clock,
  FileText, ClipboardCheck, ArrowRight, Upload, UserMinus, PlusCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDoc, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
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
        // Move HR details from old company to new company
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
          // Carry over HR Contact info
          primary_contact_title: formData.primary_contact_title || "",
          primary_contact_name: formData.primary_contact_name || "",
          primary_contact_phone: formData.primary_contact_phone || "",
          primary_contact_email: formData.primary_contact_email || "",
        };

        // Create the new firm record
        await addDoc(collection(firestore, "companies"), newCompanyData);
        
        // Remove HR details from the original company record
        finalOldCompanyData.primary_contact_title = "";
        finalOldCompanyData.primary_contact_name = "";
        finalOldCompanyData.primary_contact_phone = "";
        finalOldCompanyData.primary_contact_email = "";

        // Update current company's checklist if requested
        if (formData.hr_left_update_current_checklist) {
          finalOldCompanyData.checklist_completion = 'Completed';
        }
      }

      // 2. Standard Update for the existing company
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

  if (companyLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> {isRtl ? 'جاري التحميل...' : 'Loading profile...'}</div>;

  const currentRequiredDocs = REQUIRED_DOCS[formData.insurance_type || ""] || REQUIRED_DOCS.default;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50 bg-slate-50/90 backdrop-blur-md py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/companies')} className="rounded-full bg-white shadow-sm h-8 w-8">
            <ChevronLeft className={cn("w-4 h-4", isRtl && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{formData.name}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formData.code || 'NO CODE'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/companies')} className="rounded-lg font-bold h-9 text-xs px-4">{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-900 rounded-lg font-black h-9 text-xs px-6 shadow-lg">
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
            {t('saveChanges')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* PROFILE SECTION */}
        <Card className="rounded-xl border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b py-3 px-6">
            <CardTitle className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {t('coreProfile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormInput label={t('companyEn')} value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
              <FormInput label={t('companyAr')} value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} dir="rtl" />
              <FormInput label={t('clientCode')} value={formData.code} onChange={v => setFormData({...formData, code: v})} />
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('priority')}</Label>
                <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                  <SelectTrigger className="h-9 bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormInput label={t('industry')} value={formData.industry} onChange={v => setFormData({...formData, industry: v})} />
              <FormInput label={t('headcount')} value={formData.employee_count} type="number" onChange={v => setFormData({...formData, employee_count: Number(v)})} />
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('lineOfBusiness')}</Label>
                <Select value={formData.insurance_type} onValueChange={v => setFormData({...formData, insurance_type: v as any})}>
                  <SelectTrigger className="h-9 bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{LOB_OPTIONS.map(lob => <SelectItem key={lob} value={lob}>{lob}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <FormInput label={t('city')} value={formData.city} onChange={v => setFormData({...formData, city: v})} />
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                <Timer className="w-3 h-3" /> {t('milestonesRenewals')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('exRenewal')}</Label>
                  <Select value={formData.expected_renewal_date} onValueChange={v => setFormData({...formData, expected_renewal_date: v})}>
                    <SelectTrigger className="bg-slate-50 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <FormInput label={t('exSubmitOfferDate')} type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('actualRenewal')}</Label>
                  <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                    <SelectTrigger className="bg-slate-50 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <FormInput label={t('actualOfferReceivingDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                <UserCircle className="w-3 h-3" /> {t('multiLevelContacts')}
              </p>
              <div className="space-y-2">
                {[1, 2, 3].map((level) => {
                  const prefix = level === 1 ? 'primary' : level === 2 ? 'second' : 'third';
                  return (
                    <div key={level} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-slate-50/50 rounded-lg border">
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">{t('level')} {level}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{level === 1 ? t('decisionMaker') : t('alternative')}</span>
                      </div>
                      <FormInput label={t('title')} value={formData[`${prefix}_contact_title`]} onChange={v => setFormData({...formData, [`${prefix}_contact_title`]: v})} />
                      <FormInput label={t('name')} value={formData[`${prefix}_contact_name`]} onChange={v => setFormData({...formData, [`${prefix}_contact_name`]: v})} />
                      <FormInput label={t('phone')} value={formData[level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]} onChange={v => setFormData({...formData, [level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]: v})} />
                      <FormInput label={t('email')} value={formData[`${prefix}_contact_email`]} onChange={v => setFormData({...formData, [`${prefix}_contact_email`]: v})} />
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TELESALES ACTIONS SECTION */}
        <div className="space-y-3 mt-6">
          <p className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2 px-1">
            <PhoneCall className="w-4 h-4" /> {t('telesalesWorkflowSuite')}
          </p>
          
          <div className="grid grid-cols-1 gap-2">
            {CALL_OUTCOMES.map((outcome) => (
              <Card key={outcome.id} className={cn(
                "rounded-xl border-2 transition-all cursor-pointer overflow-hidden group",
                activeAction === outcome.id ? `${outcome.bg} ${outcome.border} shadow-md` : "bg-white border-slate-100 hover:border-slate-200"
              )} onClick={() => handleActionClick(outcome.id)}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-3 px-5">
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{outcome.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-black text-xs", activeAction === outcome.id ? outcome.text : "text-slate-900")}>{outcome.label}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight opacity-70 truncate">{outcome.sub}</p>
                    </div>
                    {activeAction === outcome.id ? (
                      <CheckCircle2 className={cn("w-4 h-4", outcome.activeIcon)} />
                    ) : (
                      <ArrowRight className={cn("w-3 h-3 text-slate-200 group-hover:text-slate-400 transition-colors", isRtl && "rotate-180")} />
                    )}
                  </div>

                  {activeAction === outcome.id && (
                    <div className="p-5 pt-0 border-t border-black/5 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        
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
                          <div className="md:col-span-2 space-y-4">
                            <div className="p-4 bg-white/60 rounded-xl border border-emerald-100">
                              <p className="text-[10px] font-black text-emerald-700 uppercase mb-3 flex items-center gap-2">
                                <FileText className="w-3 h-3" /> {t('requiredDocuments')} {formData.insurance_type}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {currentRequiredDocs.map(docName => (
                                  <div key={docName} className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {docName}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">{t('uploadDoc')}</Label>
                              <div className="flex items-center gap-3">
                                <Button variant="outline" size="sm" className="h-9 border-dashed border-2 text-[11px] font-bold">
                                  <Upload className="w-3 h-3 mr-2" /> {isRtl ? 'اختر ملفات' : 'Select Files'}
                                </Button>
                                <span className="text-[10px] text-slate-400 italic">{isRtl ? 'لم يتم اختيار ملفات' : 'No files selected yet'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4. HR LEFT */}
                        {outcome.id === 'hr_left' && (
                          <div className="md:col-span-2 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormInput label={t('newCompanyName')} value={formData.hr_left_new_company_name} onChange={v => setFormData({...formData, hr_left_new_company_name: v})} />
                              <FormInput label={t('currentInsurerNewFirm')} value={formData.hr_left_current_insurer} onChange={v => setFormData({...formData, hr_left_current_insurer: v})} />
                              <FormInput label={t('noOfEmployee')} type="number" value={formData.hr_left_employee_count} onChange={v => setFormData({...formData, hr_left_employee_count: v})} />
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-slate-400 uppercase">{t('renewalMonth')}</Label>
                                <Select value={formData.hr_left_renewal_month} onValueChange={v => setFormData({...formData, hr_left_renewal_month: v})}>
                                  <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <FormInput label={t('dataReceivingDate')} type="date" value={formData.hr_left_data_receiving_date} onChange={v => setFormData({...formData, hr_left_data_receiving_date: v})} />
                            </div>
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-rose-900 uppercase">{t('updateCurrentChecklist')}</p>
                                  <p className="text-[9px] text-rose-700">{isRtl ? 'تغيير حالة المستندات إلى "مكتمل" لهذه المؤسسة' : 'Set Documents Status to "Completed" for this firm'}</p>
                                </div>
                                <Switch 
                                  checked={formData.hr_left_update_current_checklist} 
                                  onCheckedChange={v => setFormData({...formData, hr_left_update_current_checklist: v})} 
                                />
                              </div>
                              <div className="mt-2 p-2 bg-white/50 rounded border border-rose-200">
                                <p className="text-[10px] font-bold text-rose-800 flex items-center gap-1">
                                  <UserMinus className="w-3 h-3" /> {isRtl ? 'تنبيه نقل البيانات' : 'TRANSFER ALERT'}
                                </p>
                                <p className="text-[9px] text-slate-600 italic">{isRtl ? 'سيتم نقل بيانات الاتصال الأساسية إلى المؤسسة الجديدة ومسحها من هنا عند الحفظ.' : 'Primary contact details will be moved to the new firm and removed from here on save.'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 5. RENEWED */}
                        {outcome.id === 'renewed' && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">{t('actualRenewal')}</Label>
                              <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                                <SelectTrigger className="bg-white h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <FormInput label={t('actualOfferDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                            <FormInput label={t('currentInsurer')} value={formData.current_insurer} onChange={v => setFormData({...formData, current_insurer: v})} />
                            <FormInput label={t('currentTpa')} value={formData.current_tpa} onChange={v => setFormData({...formData, current_tpa: v})} />
                          </>
                        )}

                        <div className="md:col-span-2 space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase">{t('interactionNotes')}</Label>
                          <Textarea 
                            placeholder={isRtl ? "سجل أهم ما تم مناقشته..." : "Key takeaways from this interaction..."} 
                            value={formData[`${outcome.id}_notes`]} 
                            onChange={e => setFormData({...formData, [`${outcome.id}_notes`]: e.target.value})} 
                            className="bg-white border-slate-200 rounded-lg text-xs min-h-[60px]" 
                          />
                        </div>

                        <div className="md:col-span-2 flex items-center justify-between p-3 bg-white/50 rounded-lg border border-black/5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase">{t('actionLoggedDate')}:</span>
                            <span className="text-[10px] font-bold text-slate-900">{new Date().toLocaleDateString()}</span>
                          </div>
                          {(outcome.id.includes('request') || outcome.id === 'hr_left') && (
                            <Badge className="bg-indigo-600 text-[9px] h-5">{t('systemAutomationActive')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false, dir, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{label}</Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        required={required}
        dir={dir}
        className={cn("h-9 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-xs", dir === 'rtl' && "font-arabic")} 
        {...props}
      />
    </div>
  );
}
