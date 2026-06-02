import React, { useMemo } from 'react';
import { 
  X, Filter, Search, Shield, Zap, 
  Building2, Percent, DollarSign, RefreshCcw, 
  ChevronDown, Info, Activity, HeartPulse
} from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import type { SMEPlan } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-context';

export interface PlanFilters {
  searchQuery: string;
  companies: string[];
  tpas: string[];
  lifeInsurance: boolean | null;
  annualLimit: [number, number];
  consultations: [number, number];
  radiologyLab: [number, number];
  dental: [number, number];
  optical: [number, number];
  maternity: [number, number];
  chronic: [number, number];
}

interface PlanFilterSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PlanFilters;
  setFilters: (filters: PlanFilters) => void;
  plans: SMEPlan[];
  onReset: () => void;
  onApply: () => void;
  resultsCount: number;
}

const parseNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val);
  const lower = str.toLowerCase();
  if (lower.includes('full coverage') || lower.includes('unlimited')) return 10000000;
  const num = parseInt(str.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
};

const parsePercent = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val);
  const lower = str.toLowerCase();
  if (lower.includes('full coverage') || lower.includes('unlimited')) return 100;
  const match = str.match(/(\d+)\s*%/);
  return match ? parseInt(match[1]) : 0;
};

export function PlanFilterSidebar({
  open,
  onOpenChange,
  filters,
  setFilters,
  plans,
  onReset,
  onApply,
  resultsCount
}: PlanFilterSidebarProps) {
  const { t, isRtl } = useI18n();

  // Calculate unique values and ranges
  const filterOptions = useMemo(() => {
    const companies = Array.from(new Set(plans.map(p => p.company))).filter(Boolean).sort();
    const tpas = Array.from(new Set(plans.map(p => p.tpa))).filter(Boolean).sort();
    
    return { companies, tpas };
  }, [plans]);

  const handleRangeChange = (key: keyof PlanFilters, val: number[]) => {
    setFilters({ ...filters, [key]: val as [number, number] });
  };

  const FilterSection = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2 text-sme-primary font-black uppercase text-[10px] tracking-widest border-b pb-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="space-y-4 px-1">
        {children}
      </div>
    </div>
  );

  const RangeControl = ({ label, value, max, step = 100, unit = "EGP", onChange }: { 
    label: string, 
    value: [number, number], 
    max: number, 
    step?: number, 
    unit?: string,
    onChange: (val: number[]) => void 
  }) => (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <Label className="text-xs font-bold text-slate-700">{label}</Label>
        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {value[0].toLocaleString()} - {value[1].toLocaleString()} {unit}
        </span>
      </div>
      <Slider
        value={value}
        max={max}
        step={step}
        onValueChange={onChange}
        className="py-4"
      />
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isRtl ? "right" : "right"} className={cn("w-full sm:max-w-md p-0 flex flex-col gap-0 border-l-0", isRtl && "font-arabic")}>
        <SheetHeader className="p-6 border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-lg font-black text-slate-800">{t('planFilter') || 'Plan Filter'}</SheetTitle>
                <SheetDescription className="text-xs">
                  {resultsCount} {t('matchingPlansFound') || 'matching plans found'}
                </SheetDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-2">
            
            {/* SEARCH */}
            <div className="space-y-2 pb-4">
              <Label className="text-xs font-bold">{t('searchPlans') || 'Search Plans'}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder={t('searchPlaceholder') || "Plan name or keywords..."} 
                  className="pl-9 bg-slate-50 border-slate-200"
                  value={filters.searchQuery}
                  onChange={e => setFilters({...filters, searchQuery: e.target.value})}
                />
              </div>
            </div>

            <Accordion type="multiple" defaultValue={['general', 'limits', 'benefits']}>
              
              {/* GENERAL INFO */}
              <AccordionItem value="general" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('generalInfo') || 'General Info'}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-4">
                  <div className="space-y-2">
                    <Label className="text-xs">{t('companyName')}</Label>
                    <Select 
                      onValueChange={(v) => setFilters({...filters, companies: v === 'all' ? [] : [v]})}
                      value={filters.companies[0] || 'all'}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder={t('allCompanies') || "All Companies"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allCompanies') || "All Companies"}</SelectItem>
                        {filterOptions.companies.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">{t('tpa') || "TPA Provider"}</Label>
                    <Select 
                      onValueChange={(v) => setFilters({...filters, tpas: v === 'all' ? [] : [v]})}
                      value={filters.tpas[0] || 'all'}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder={t('allTpas') || "All TPAs"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allTpas') || "All TPAs"}</SelectItem>
                        {filterOptions.tpas.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">{t('lifeInsurance')}</Label>
                      <p className="text-[10px] text-slate-500">{t('lifeInsuranceDesc') || 'Only show plans with life cover'}</p>
                    </div>
                    <Switch 
                      checked={filters.lifeInsurance === true}
                      onCheckedChange={(c) => setFilters({...filters, lifeInsurance: c || null})}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* COVERAGE LIMITS */}
              <AccordionItem value="limits" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('coverageLimits') || 'Coverage Limits'}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-4">
                  <RangeControl 
                    label={t('annualLimit') || "Annual Limit"} 
                    value={filters.annualLimit} 
                    max={5000000} 
                    step={50000}
                    onChange={(v) => handleRangeChange('annualLimit', v)} 
                  />
                </AccordionContent>
              </AccordionItem>

              {/* BENEFITS */}
              <AccordionItem value="benefits" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('keyBenefits') || 'Key Benefits'}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-8 pb-6">
                  <RangeControl 
                    label={`${t('consultations') || "Consultations"} (%)`} 
                    value={filters.consultations} 
                    max={100} 
                    step={1}
                    unit="%"
                    onChange={(v) => handleRangeChange('consultations', v)} 
                  />
                  <RangeControl 
                    label={`${t('radiologyLab') || "Radiology & Lab"} (%)`} 
                    value={filters.radiologyLab} 
                    max={100} 
                    step={1}
                    unit="%"
                    onChange={(v) => handleRangeChange('radiologyLab', v)} 
                  />
                  <RangeControl 
                    label={t('dental') || "Dental Limit"} 
                    value={filters.dental} 
                    max={50000} 
                    step={500}
                    onChange={(v) => handleRangeChange('dental', v)} 
                  />
                  <RangeControl 
                    label={t('optical') || "Optical Limit"} 
                    value={filters.optical} 
                    max={20000} 
                    step={250}
                    onChange={(v) => handleRangeChange('optical', v)} 
                  />
                  <RangeControl 
                    label={t('maternity') || "Maternity Limit"} 
                    value={filters.maternity} 
                    max={100000} 
                    step={1000}
                    onChange={(v) => handleRangeChange('maternity', v)} 
                  />
                  <RangeControl 
                    label={t('chronic') || "Chronic/Pre-existing"} 
                    value={filters.chronic} 
                    max={500000} 
                    step={5000}
                    onChange={(v) => handleRangeChange('chronic', v)} 
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t bg-slate-50/50 flex-row gap-3 sm:justify-between items-center">
          <Button variant="outline" onClick={onReset} className="flex-1 gap-2 font-bold text-xs uppercase tracking-widest h-11">
            <RefreshCcw className="w-3 h-3" /> {t('reset')}
          </Button>
          <Button onClick={onApply} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 font-bold text-xs uppercase tracking-widest h-11">
            {t('applyFilters') || 'Apply Filters'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
