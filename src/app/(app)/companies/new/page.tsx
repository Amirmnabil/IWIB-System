
'use client';
import React, { useState } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, collection, addDoc, serverTimestamp } from "@/firebase";
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    if (!formData.name) {
        toast({ variant: "destructive", title: "Validation Error", description: "Company name is required." });
        return;
    }

    setIsSaving(true);
    try {
      const newCompanyData = {
        ...formData,
        assigned_user_id: user?.uid || "",
        assigned_user_name: user?.displayName || user?.email || "",
        created_at: new Date().toISOString(),
        updated_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, "companies"), newCompanyData);
      
      toast({ title: "Company created successfully" });
      router.push(`/companies/${docRef.id}`);
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Persistence Error", description: "Could not create company record." });
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
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Create new organization record</p>
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

              <Separator />
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Initial Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={4} placeholder="Background, source, or initial contact details..." />
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
