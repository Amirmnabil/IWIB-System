
'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/lib/hooks/use-toast";
import { useUser } from "@/lib/auth-provider";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-logger";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { sanitizePayload } from "@/lib/sanitize";
import { CompanySchema } from "@/schemas/company.schema";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-context";
import { useQueryClient } from "@tanstack/react-query";
import { TranslationSchema } from "@/lib/i18n";
import { useMasterData } from "@/lib/hooks/use-master-data";
import { useInsurers } from "@/lib/hooks/use-insurers";



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

export default function NewCompanyPage() {
  const { t, isRtl } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<Company>>({
    code: `CLI-${Math.floor(10000 + Math.random() * 90000)}`,
    status: 'interested',
    priority: 'medium',
    insurance_type: 'Medical',
    checklist_completion: 'Pending'
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: industries } = useMasterData('industries');
  const { data: sources } = useMasterData('sources');
  const { data: productTypes } = useMasterData('product_types');
  const { data: productSubtypes } = useMasterData('product_subtypes');
  const { data: clientTypes } = useMasterData('client_types');
  const { data: insurers } = useInsurers();
  const { data: contactRolesData } = useSupabaseCollection<any>('contact_roles');
  const contactRoles = contactRolesData || [];
  const { data: locationsData } = useMasterData('locations');
  const locations = locationsData || [];
  const { data: systemUsersData } = useSupabaseCollection('users');
  const systemUsers = systemUsersData || [];

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
    if (!formData.name) {
        toast({ variant: "destructive", title: "Validation Error", description: "Company name is required." });
        return;
    }

    setIsSaving(true);
    try {

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
      
      // Build finalData with only real companies table columns
      const COMPANY_DB_COLUMNS = new Set([
        'code','name','name_ar','status','industry','employee_count','priority',
        'city','address','cr_number','tax_card','current_insurer','insurance_type',
        'medical_subtype','checklist_status','checklist_completion',
        'expected_renewal_date','expected_offer_date','actual_renewal_date','actual_offer_date',
        'website','linkedin_page','landline',
        'assigned_user_id','assigned_user_name','source',
        'last_contact_date','call_date','follow_up_date','renewal_month','notes'
      ]);
      const finalData: Record<string, any> = {};
      for (const [k, v] of Object.entries(clean)) {
        if (COMPANY_DB_COLUMNS.has(k)) finalData[k] = v;
      }

      // Build contacts from formData contact fields
      const raw_contacts: any[] = [];
      const contactLevels = [
        { prefix: 'primary' },
        { prefix: 'second' },
        { prefix: 'third' },
      ];
      for (const { prefix } of contactLevels) {
        const name = (formData as any)[`${prefix}_contact_name`];
        if (!name) continue;
        const parts = (name as string).trim().split(' ');
        raw_contacts.push({
          first_name: parts[0],
          last_name: parts.length > 1 ? parts.slice(1).join(' ') : '',
          email: (formData as any)[`${prefix}_contact_email`] || null,
          phone: prefix === 'primary' ? (formData as any)['primary_contact_phone'] || null : null,
          mobile: prefix !== 'primary' ? (formData as any)[`${prefix}_contact_mobile`] || null : null,
          is_primary: prefix === 'primary',
          role_id: (formData as any)[`${prefix}_contact_role_id`] || null,
        });
      }

      // Sanitize contacts — last_name NOT NULL, remove non-existent columns
      const safe_contacts = raw_contacts.map(c => ({
        first_name: c.first_name,
        last_name: c.last_name ?? '',
        email: c.email || null,
        phone: c.phone || null,
        mobile: c.mobile || null,
        is_primary: c.is_primary ?? false,
        role_id: c.role_id || null,
      }));

      // Execute SQL Transaction
      const { data: companyId, error } = await supabase.rpc('create_company_with_contacts', {
        company_payload: finalData,
        contacts_payload: safe_contacts.length > 0 ? safe_contacts : null
      });

      if (error) {
        console.error('RPC error:', error.message, '|', error.code, '|', error.details);
        throw new Error(error.message || 'RPC failed');
      }
      
      await logAuditEvent(null, user, {
        action: 'create',
        resource_type: 'company',
        resource_id: companyId,
        resource_name: finalData.name,
        changes: finalData
      });
      
      // Phase 1: Manual Notification Trigger
      if (finalData.assigned_user_id) {
        await supabase.from('notifications').insert(sanitizeUUIDs({
          user_id: finalData.assigned_user_id,
          title: `New Lead Assigned: ${finalData.name}`,
          message: `You have been assigned as the account manager for ${finalData.name}.`,
          priority: 'high',
          entity_type: 'companies',
          entity_id: companyId
        }));
      }
      
      queryClient.invalidateQueries({ queryKey: ['supabase', 'companies'] });
      toast({ title: "Company created successfully" });
      router.push(`/companies/${companyId}`);
    } catch (error: any) {
      console.error("Save error:", error?.message ?? error?.code ?? String(error));
      toast({ variant: "destructive", title: "Persistence Error", description: error?.message || "Could not create company record." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20">
      <form onSubmit={handleSave}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-50 bg-background/90 backdrop-blur-md py-3 border-b">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => router.push('/companies')} className="rounded-full bg-card shadow-sm h-8 w-8">
              <ChevronLeft className={cn("w-4 h-4", isRtl && "rotate-180")} />
            </Button>
            <div>
              <h1 className="text-[32px] md:text-[40px] font-headline font-black text-foreground tracking-tight">{t('add')} {t('companies')}</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{t('newCompanyName')}</p>
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
            <CardHeader className="bg-card border-b py-3 px-6">
              <CardTitle className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                <Building2 className="w-4 h-4" /> {t('coreProfile')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormInput label={t('companyEn')} value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                  <FormInput label={t('companyAr')} value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} dir="rtl" />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('clientType') || 'Client Type'}</Label>
                    <Select value={formData.client_type} onValueChange={v => setFormData({...formData, client_type: v})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select Client Type" /></SelectTrigger>
                      <SelectContent>
                        {clientTypes?.map((ct: any) => (
                          <SelectItem key={ct.id} value={isRtl ? (ct.name_ar || ct.name) : (ct.name_en || ct.name)}>
                            {isRtl ? (ct.name_ar || ct.name) : (ct.name_en || ct.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('clientCode')}</Label>
                    <Input 
                      value={formData.code || ''} 
                      readOnly 
                      disabled 
                      className="h-9 bg-slate-100 border-border text-muted-foreground italic text-xs" 
                    />
                  </div>
                  <FormInput label="Landline" value={formData.landline} onChange={v => setFormData({...formData, landline: v})} />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('priority')}</Label>
                    <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('negligible')}</SelectItem>
                        <SelectItem value="medium">{t('moderate')}</SelectItem>
                        <SelectItem value="high">{t('high')}</SelectItem>
                        <SelectItem value="critical">{t('critical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('industry')}</Label>
                    <Select value={formData.industry} onValueChange={v => setFormData({...formData, industry: v})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select Industry" /></SelectTrigger>
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
                        {formData.industry && !industries.find((i: any) => (isRtl ? i.subcategory_ar : i.subcategory_en) === formData.industry) && (
                          <SelectItem value={formData.industry}>{formData.industry}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Source</Label>
                    <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select Source" /></SelectTrigger>
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
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('lineOfBusiness')}</Label>
                    <Select value={formData.insurance_type} onValueChange={v => setFormData({...formData, insurance_type: v as any})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select Line of Business" /></SelectTrigger>
                      <SelectContent>
                        {productTypes.map((pt: any) => (
                          <SelectItem key={pt.id} value={isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}>
                            {isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('subtype') || 'Subtype'}</Label>
                    <Select value={formData.medical_subtype} onValueChange={v => setFormData({...formData, medical_subtype: v as any})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select Subtype" /></SelectTrigger>
                      <SelectContent>
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
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Current Insurer</Label>
                    <Select value={formData.current_insurer} onValueChange={v => setFormData({...formData, current_insurer: v})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select Insurer" /></SelectTrigger>
                      <SelectContent>
                        {insurers.map((ins: any) => (
                          <SelectItem key={ins.id} value={ins.companyName}>{ins.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('city')}</Label>
                    <Select value={formData.city} onValueChange={v => setFormData({...formData, city: v})}>
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select City" /></SelectTrigger>
                      <SelectContent>
                        {locations.map((loc: any) => (
                           <SelectItem key={loc.id} value={isRtl ? (loc.name_ar || loc.name_en) : (loc.name_en || loc.name)}>
                             {isRtl ? (loc.name_ar || loc.name_en) : (loc.name_en || loc.name)}
                           </SelectItem>
                        ))}
                        {formData.city && !locations.find((l: any) => (isRtl ? (l.name_ar || l.name_en) : (l.name_en || l.name)) === formData.city) && (
                          <SelectItem value={formData.city}>{formData.city}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormInput label="Landline" value={formData.landline} onChange={v => setFormData({...formData, landline: v})} />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('assignedUser')}</Label>
                    <Select 
                      value={formData.assigned_user_id} 
                      onValueChange={v => {
                        const u = systemUsers.find(u => u.id === v);
                        setFormData({...formData, assigned_user_id: v, assigned_user_name: u?.name});
                      }}
                    >
                      <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Select User" /></SelectTrigger>
                      <SelectContent>
                        {systemUsers.map((u: any) => (
                           <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                  <Timer className="w-3 h-3" /> {t('milestonesRenewals')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('exRenewal')}</Label>
                    <Select value={formData.expected_renewal_date} onValueChange={v => setFormData({...formData, expected_renewal_date: v, expected_offer_date: calculateOfferDate(v)})}>
                      <SelectTrigger className="bg-background h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as keyof TranslationSchema)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('exSubmitOfferDate')} type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('actualRenewal')}</Label>
                    <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v, actual_offer_date: calculateOfferDate(v)})}>
                      <SelectTrigger className="bg-background h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as keyof TranslationSchema)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label={t('actualOfferReceivingDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                  <UserCircle className="w-3 h-3" /> {t('multiLevelContacts')}
                </p>
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
                          <FormInput label={t('name')} value={formData[`${prefix}_contact_name`]} onChange={v => setFormData({...formData, [`${prefix}_contact_name`]: v})} />
                          <FormInput label={t('phone')} value={formData[level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]} onChange={v => setFormData({...formData, [level === 1 ? 'primary_contact_phone' : `${prefix}_contact_mobile`]: v})} />
                          <FormInput label={t('email')} value={formData[`${prefix}_contact_email`]} onChange={v => setFormData({...formData, [`${prefix}_contact_email`]: v})} />
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{t('internalNotes')}</Label>
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
      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{label}</Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        required={required}
        dir={dir}
        className={cn("h-9 bg-background border-border focus:border-indigo-500 rounded-lg text-xs")} 
        {...props}
      />
    </div>
  );
}
