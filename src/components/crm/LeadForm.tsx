import React from "react";
import { Building2, Timer, MapPin, Briefcase, Globe, AlertCircle, Target } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";
import type { TranslationSchema } from "@/lib/i18n";
import type { Company } from "@/lib/types";

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
  if (targetMonth < currentMonth) {
    targetYear++;
  }
  
  const targetDate = new Date(targetYear, targetMonth, 1);
  targetDate.setDate(targetDate.getDate() - 60);
  return targetDate.toISOString().split('T')[0];
};

interface LeadFormProps {
  formData: Omit<Company, 'id' | 'created_at'>;
  setFormData: React.Dispatch<React.SetStateAction<Omit<Company, 'id' | 'created_at'>>>;
  duplicateWarning: string | null;
  checkForDuplicates: (name: string, email?: string, phone?: string) => void;
  industries: any[];
  users: any[];
  productTypes: any[];
  sources: any[];
  selectedLead: any;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function LeadForm({
  formData,
  setFormData,
  duplicateWarning,
  checkForDuplicates,
  industries,
  users,
  productTypes,
  sources,
  selectedLead,
  onSubmit,
  onCancel
}: LeadFormProps) {
  const { t, isRtl } = useI18n();

  return (
    <form onSubmit={onSubmit} className="space-y-10 py-2">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
          <Building2 className="w-4 h-4" /> {t('coreProfile')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FormInput
              label={t('companyEn')}
              value={formData.name}
              onChange={v => {
                setFormData(prev => ({ ...prev, name: v }));
                checkForDuplicates(v, formData.primary_contact_email, formData.primary_contact_phone);
              }}
              required
            />
            {duplicateWarning && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 animate-pulse">
                <AlertCircle className="w-3 h-3" /> {duplicateWarning}
              </div>
            )}
          </div>
          <FormInput 
            label={t('companyAr')} 
            value={formData.name_ar} 
            onChange={v => setFormData(prev => ({ ...prev, name_ar: v }))} 
            dir="rtl" 
          />
          <FormInput 
            label={t('clientCode')} 
            value={formData.code} 
            onChange={v => setFormData(prev => ({ ...prev, code: v }))} 
            readOnly 
            disabled 
            className="h-10 bg-slate-100 border-border text-muted-foreground italic" 
          />
          <FormInput 
            label="Landline" 
            value={formData.landline} 
            onChange={v => setFormData(prev => ({ ...prev, landline: v }))} 
          />
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('industry')}</Label>
            <Select 
              value={formData.industry} 
              onValueChange={v => setFormData(prev => ({ ...prev, industry: v }))}
            >
              <SelectTrigger className="h-10 bg-background text-sm">
                <SelectValue placeholder="Select Industry" />
              </SelectTrigger>
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
                      <SelectLabel className="text-[10px] font-black text-primary bg-background py-1 px-2">{cat}</SelectLabel>
                      {items.map((ind: any) => (
                        <SelectItem key={ind.id} value={isRtl ? ind.subcategory_ar : ind.subcategory_en}>
                          {isRtl ? ind.subcategory_ar : ind.subcategory_en}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <FormInput 
            label={t('headcount')} 
            value={formData.employee_count} 
            type="number" 
            onChange={v => setFormData(prev => ({ ...prev, employee_count: Number(v) }))} 
          />
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('priority')}</Label>
            <Select 
              value={formData.priority} 
              onValueChange={v => setFormData(prev => ({ ...prev, priority: v as any }))}
            >
              <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('negligible')}</SelectItem>
                <SelectItem value="medium">{t('moderate')}</SelectItem>
                <SelectItem value="high">{t('high')}</SelectItem>
                <SelectItem value="critical">{t('critical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
          <Target className="w-4 h-4" /> Lead Pipeline Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Estimated Premium (EGP)</Label>
            <Input
              type="number"
              value={formData.estimated_premium || ""}
              onChange={e => setFormData(prev => ({ ...prev, estimated_premium: Number(e.target.value) }))}
              placeholder="e.g. 50000"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Meeting Date & Time</Label>
            <Input
              type="datetime-local"
              value={formData.meeting_date || ""}
              onChange={e => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Lead Source</Label>
            <Input
              type="text"
              value={formData.source || ""}
              onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
              placeholder="Source details"
              className="bg-background"
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">Requirements & Diagnostics</Label>
            <Textarea
              value={formData.requirements || ""}
              onChange={e => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="Specify requirements, diagnostics, or document links..."
              rows={3}
              className="bg-background"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
          <Timer className="w-4 h-4" /> {t('milestonesRenewals')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('exRenewal')}</Label>
            <Select 
              value={formData.expected_renewal_date} 
              onValueChange={v => setFormData(prev => ({ 
                ...prev, 
                expected_renewal_date: v, 
                expected_offer_date: calculateOfferDate(v) 
              }))}
            >
              <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={m} value={m}>{t(m as keyof TranslationSchema)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormInput 
            label={t('exSubmitOfferDate')} 
            type="date" 
            value={formData.expected_offer_date} 
            onChange={v => setFormData(prev => ({ ...prev, expected_offer_date: v }))} 
          />
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('actualRenewal')}</Label>
            <Select 
              value={formData.actual_renewal_date} 
              onValueChange={v => setFormData(prev => ({ 
                ...prev, 
                actual_renewal_date: v, 
                actual_offer_date: calculateOfferDate(v) 
              }))}
            >
              <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={m} value={m}>{t(m as keyof TranslationSchema)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormInput 
            label={t('actualOfferReceivingDate')} 
            type="date" 
            value={formData.actual_offer_date} 
            onChange={v => setFormData(prev => ({ ...prev, actual_offer_date: v }))} 
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
          <MapPin className="w-4 h-4" /> {t('registrationAndLocation') || "Registration & Location"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput 
            label={t('crNumber')} 
            value={formData.cr_number} 
            onChange={v => setFormData(prev => ({ ...prev, cr_number: v }))} 
          />
          <FormInput 
            label={t('taxCard')} 
            value={formData.tax_card} 
            onChange={v => setFormData(prev => ({ ...prev, tax_card: v }))} 
          />
          <FormInput 
            label={t('city')} 
            value={formData.city} 
            onChange={v => setFormData(prev => ({ ...prev, city: v }))} 
          />
          <div className="md:col-span-2">
            <FormInput 
              label={t('address')} 
              value={formData.address} 
              onChange={v => setFormData(prev => ({ ...prev, address: v }))} 
            />
          </div>
          <FormInput 
            label="Landline" 
            value={formData.landline} 
            onChange={v => setFormData(prev => ({ ...prev, landline: v }))} 
          />
          <FormInput 
            label={t('currentInsurer')} 
            value={formData.current_insurer} 
            onChange={v => setFormData(prev => ({ ...prev, current_insurer: v }))} 
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
          <Briefcase className="w-4 h-4" /> {t('multiLevelContacts')}
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Tabs defaultValue="primary" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-primary/10/50 p-1 rounded-xl">
              <TabsTrigger value="primary" className="rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">{t('level')} 1: {t('primaryDecisionMaker')}</TabsTrigger>
              <TabsTrigger value="secondary" className="rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">{t('level')} 2: {t('alternative')}</TabsTrigger>
              <TabsTrigger value="tertiary" className="rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">{t('level')} 3: {t('alternative')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="primary" className="mt-4 bg-card p-4 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput label={t('name')} value={formData.primary_decision_maker || formData.primary_contact_name} onChange={v => setFormData(prev => ({ ...prev, primary_contact_name: v, primary_decision_maker: v }))} />
                <FormInput label={t('phone')} value={formData.primary_contact_phone} onChange={v => setFormData(prev => ({ ...prev, primary_contact_phone: v }))} />
                <FormInput label={t('email')} value={formData.primary_contact_email} onChange={v => setFormData(prev => ({ ...prev, primary_contact_email: v }))} />
              </div>
            </TabsContent>
            
            <TabsContent value="secondary" className="mt-4 bg-card p-4 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput label={t('name')} value={formData.second_contact_name} onChange={v => setFormData(prev => ({ ...prev, second_contact_name: v }))} />
                <FormInput label={t('phone')} value={formData.second_contact_mobile} onChange={v => setFormData(prev => ({ ...prev, second_contact_mobile: v }))} />
                <FormInput label={t('email')} value={formData.second_contact_email} onChange={v => setFormData(prev => ({ ...prev, second_contact_email: v }))} />
              </div>
            </TabsContent>
            
            <TabsContent value="tertiary" className="mt-4 bg-card p-4 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput label={t('name')} value={formData.third_contact_name} onChange={v => setFormData(prev => ({ ...prev, third_contact_name: v }))} />
                <FormInput label={t('phone')} value={formData.third_contact_mobile} onChange={v => setFormData(prev => ({ ...prev, third_contact_mobile: v }))} />
                <FormInput label={t('email')} value={formData.third_contact_email} onChange={v => setFormData(prev => ({ ...prev, third_contact_email: v }))} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
          <Globe className="w-4 h-4" /> {t('communicationAndOps') || "Communication & Ops"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput 
            label={t('website')} 
            value={formData.website} 
            onChange={v => setFormData(prev => ({ ...prev, website: v }))} 
          />
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{t('assignedUser')}</Label>
            <Select 
              value={formData.assigned_user_id || "none"} 
              onValueChange={v => {
                const isNone = v === "none";
                const selectedUser = !isNone ? users.find((u: any) => u.id === v) : null;
                setFormData(prev => ({ 
                  ...prev, 
                  assigned_user_id: isNone ? "" : v, 
                  assigned_user_name: selectedUser ? selectedUser.name : "" 
                }));
              }}
            >
              <SelectTrigger className="h-10 bg-background border-border">
                <SelectValue placeholder="Select Assigned User" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="none" className="italic text-slate-400">Unassigned</SelectItem>
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {`${u.name} (${u.role})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('lineOfBusiness')}</Label>
            <Select 
              value={formData.insurance_type} 
              onValueChange={v => setFormData(prev => ({ ...prev, insurance_type: v as any }))}
            >
              <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {productTypes?.map((pt: any) => (
                  <SelectItem key={pt.id} value={isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}>
                    {isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('source')}</Label>
            <Select 
              value={formData.source} 
              onValueChange={v => setFormData(prev => ({ ...prev, source: v }))}
            >
              <SelectTrigger className="h-10 bg-background text-sm"><SelectValue placeholder="Select Source" /></SelectTrigger>
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
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground uppercase">{t('internalNotes')}</Label>
          <Textarea 
            value={formData.notes} 
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
            rows={4} 
            placeholder={t('internalNotes')} 
            className="bg-background" 
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t w-full">
        <Button type="button" variant="outline" onClick={onCancel}>{t('cancel')}</Button>
        <Button type="submit" className="bg-indigo-900 font-bold px-8 shadow-lg">{t('save')}</Button>
      </div>
    </form>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false, dir, className, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl', readOnly?: boolean, disabled?: boolean, className?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{label}</Label>
      <Input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        dir={dir}
        className={cn("h-10 bg-background border-border focus:border-indigo-500", dir === 'rtl' && "font-arabic", className)}
        {...props}
      />
    </div>
  );
}
