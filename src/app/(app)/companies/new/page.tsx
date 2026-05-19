
'use client';
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, ChevronLeft, Save, Loader2,
  UserCircle, Timer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useFirestore, useUser, collection, addDoc, serverTimestamp } from "@/firebase";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-context";
import { syncContact } from "@/lib/contact-sync";
import { CRMService } from "@/services/crm-service";
import { useMasterData } from "@/hooks/use-master-data";
import { useInsurers } from "@/hooks/use-insurers";

const LOB_OPTIONS = [
  "type_medical", "type_life", "type_motor", "type_property", "type_liability", 
  "type_marine", "type_engineering", "type_financial_lines", "type_cyber", 
  "type_travel", "type_personal_accident"
];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

export default function NewCompanyPage() {
  const { t, isRtl } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [formData, setFormData] = useState<Partial<Company>>({
    status: 'interested',
    priority: 'medium',
    insurance_type: 'Medical',
    checklist_completion: 'Pending'
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: industries } = useMasterData('industries');
  const { data: sources } = useMasterData('sources');
  const { data: insurers } = useInsurers();

  const crmService = useMemo(() => firestore ? new CRMService(firestore) : null, [firestore]);

  const isWithinLeadRange = (dateStr?: string, monthName?: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();

    if (monthName) {
      const targetMonth = MONTHS.indexOf(monthName.toLowerCase());
      if (targetMonth !== -1) {
        const diff = (targetMonth - currentMonth + 12) % 12;
        if (diff <= 2) return true;
      }
    }

    if (dateStr) {
      const targetDate = new Date(dateStr);
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Within 60 days from now (approx 2 months)
      if (diffDays >= -7 && diffDays <= 60) return true;
    }

    return false;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    if (!formData.name) {
        toast({ variant: "destructive", title: "Validation Error", description: "Company name is required." });
        return;
    }

    setIsSaving(true);
    try {
      if (!crmService) throw new Error("CRM Service not initialized");

      const finalData = { ...formData };
      
      // Removed the automatic lead conversion to keep status consistent 
      // with the manual interaction-based workflow.

      const companyId = await crmService.createCompany(
        finalData, 
        user?.uid, 
        user?.displayName || user?.email || ""
      );
      
      // Sync all 3 levels of contacts
      const contactLevels = [
        { prefix: 'primary', label: 'Decision Maker' },
        { prefix: 'second', label: 'Alternative 1' },
        { prefix: 'third', label: 'Alternative 2' }
      ];

      for (const level of contactLevels) {
        const name = formData[`${level.prefix}_contact_name` as keyof Company];
        const email = formData[`${level.prefix}_contact_email` as keyof Company];
        const phone = formData[level.prefix === 'primary' ? 'primary_contact_phone' : `${level.prefix}_contact_mobile` as keyof Company];
        const title = formData[`${level.prefix}_contact_title` as keyof Company];

        if (name && (email || phone)) {
          await syncContact(firestore, {
            name: name as string,
            email: email as string,
            phone: level.prefix === 'primary' ? phone as string : "",
            mobile: level.prefix !== 'primary' ? phone as string : "",
            job_title: title as string,
            company_id: companyId,
            company_name: formData.name,
            is_primary: level.prefix === 'primary'
          });
        }
      }
      
      toast({ title: "Company created successfully" });
      router.push(`/companies/${companyId}`);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Persistence Error", description: error.message || "Could not create company record." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20">
      <form onSubmit={handleSave}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50 bg-slate-50/90 backdrop-blur-md py-3 border-b">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => router.push('/companies')} className="rounded-full bg-white shadow-sm h-8 w-8">
              <ChevronLeft className={cn("w-4 h-4", isRtl && "rotate-180")} />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('add')} {t('companies')}</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('newCompanyName')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/companies')} className="rounded-lg font-bold h-9 text-xs px-4">{t('cancel')}</Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-900 rounded-lg font-black h-9 text-xs px-6 shadow-lg">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
              {t('save')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
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
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('clientCode')}</Label>
                    <div className="h-9 bg-slate-100 border border-slate-200 rounded-lg flex items-center px-3 text-[10px] font-bold text-slate-500 italic">
                       Auto-generated on save
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('priority')}</Label>
                    <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                      <SelectTrigger className="h-9 bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('negligible')}</SelectItem>
                        <SelectItem value="medium">{t('moderate')}</SelectItem>
                        <SelectItem value="high">{t('high')}</SelectItem>
                        <SelectItem value="critical">{t('critical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('industry')}</Label>
                    <Select value={formData.industry} onValueChange={v => setFormData({...formData, industry: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 text-xs"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {(() => {
                          const groups: Record<string, any[]> = {};
                          industries.forEach((ind: any) => {
                            const cat = isRtl ? ind.category_ar : ind.category_en;
                            if (!groups[cat]) groups[cat] = [];
                            groups[cat].push(ind);
                          });
                          
                          return Object.entries(groups).map(([cat, items]) => (
                            <SelectGroup key={cat}>
                              <SelectLabel className="text-[10px] font-black text-indigo-600 bg-slate-50 py-1 px-2">{cat}</SelectLabel>
                              {items.map((ind: any) => (
                                <SelectItem key={ind.id} value={isRtl ? ind.subcategory_ar : ind.subcategory_en}>
                                  {isRtl ? ind.subcategory_ar : ind.subcategory_en}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                        {formData.industry && !industries.find((i: any) => (isRtl ? i.subcategory_ar : i.subcategory_en) === formData.industry) && (
                          <SelectItem value={formData.industry}>{formData.industry}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Source</Label>
                    <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 text-xs"><SelectValue placeholder="Select Source" /></SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const groups: Record<string, any[]> = {};
                          sources.forEach((src: any) => {
                            const cat = src.category || 'Other';
                            if (!groups[cat]) groups[cat] = [];
                            groups[cat].push(src);
                          });
                          
                          return Object.entries(groups).map(([cat, items]) => (
                            <SelectGroup key={cat}>
                              <SelectLabel className="text-[10px] font-black text-slate-400 px-2 py-1 uppercase">{cat}</SelectLabel>
                              {items.map((src: any) => (
                                <SelectItem key={src.id} value={isRtl ? src.name_ar : src.name_en}>
                                  {isRtl ? src.name_ar : src.name_en}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('headcount')} value={formData.employee_count} type="number" onChange={v => setFormData({...formData, employee_count: Number(v)})} />
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('lineOfBusiness')}</Label>
                    <Select value={formData.insurance_type} onValueChange={v => setFormData({...formData, insurance_type: v as any})}>
                      <SelectTrigger className="h-9 bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{LOB_OPTIONS.map(lob => <SelectItem key={lob} value={lob}>{t(lob as any)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Current Insurer</Label>
                    <Select value={formData.current_insurer} onValueChange={v => setFormData({...formData, current_insurer: v})}>
                      <SelectTrigger className="h-9 bg-slate-50 text-xs"><SelectValue placeholder="Select Insurer" /></SelectTrigger>
                      <SelectContent>
                        {insurers.map((ins: any) => (
                          <SelectItem key={ins.id} value={ins.companyName}>{ins.companyName}</SelectItem>
                        ))}
                      </SelectContent>
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
                      <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as any)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('exSubmitOfferDate')} type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('actualRenewal')}</Label>
                    <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                      <SelectTrigger className="bg-slate-50 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as any)}</SelectItem>)}</SelectContent>
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

              <Separator />
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{t('internalNotes')}</Label>
                <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={4} placeholder={t('internalNotes')} />
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
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
        className={cn("h-9 bg-slate-50 border-slate-200 focus:border-indigo-500 rounded-lg text-xs")} 
        {...props}
      />
    </div>
  );
}
