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

  const getPercentOption = (val: [number, number]) => {
    if (val[0] === 0 && val[1] === 100) return 'all';
    if (val[0] === 100 && val[1] === 100) return '100';
    if (val[0] === 90 && val[1] === 100) return '90plus';
    if (val[0] === 80 && val[1] === 100) return '80plus';
    if (val[0] === 70 && val[1] === 100) return '70plus';
    return 'custom';
  };

  const handlePercentChange = (key: 'consultations' | 'radiologyLab', option: string) => {
    let range: [number, number] = [0, 100];
    if (option === '100') range = [100, 100];
    else if (option === '90plus') range = [90, 100];
    else if (option === '80plus') range = [80, 100];
    else if (option === '70plus') range = [70, 100];
    setFilters({ ...filters, [key]: range });
  };

  const getLimitOption = (val: [number, number], maxVal: number) => {
    if (val[0] === 0 && val[1] === maxVal) return 'all';
    if (val[0] === 1 && val[1] === maxVal) return 'covered';
    if (val[0] === 0 && val[1] === 0) return 'not_covered';
    
    if (maxVal === 50000) {
      if (val[0] === 2000) return '2000plus';
      if (val[0] === 1500) return '1500plus';
      if (val[0] === 1000) return '1000plus';
      if (val[0] === 0 && val[1] === 999) return 'under1000';
    } else if (maxVal === 20000) {
      if (val[0] === 1500) return '1500plus';
      if (val[0] === 1000) return '1000plus';
      if (val[0] === 500) return '500plus';
      if (val[0] === 0 && val[1] === 499) return 'under500';
    } else if (maxVal === 100000) {
      if (val[0] === 10000) return '10000plus';
      if (val[0] === 7000) return '7000plus';
      if (val[0] === 5000) return '5000plus';
      if (val[0] === 0 && val[1] === 4999) return 'under5000';
    } else if (maxVal === 500000) {
      if (val[0] === 20000) return '20000plus';
      if (val[0] === 15000) return '15000plus';
      if (val[0] === 10000) return '10000plus';
      if (val[0] === 0 && val[1] === 9999) return 'under10000';
    }
    return 'custom';
  };

  const handleLimitChange = (key: 'dental' | 'optical' | 'maternity' | 'chronic', option: string, maxVal: number) => {
    let range: [number, number] = [0, maxVal];
    
    if (option === 'covered') range = [1, maxVal];
    else if (option === 'not_covered') range = [0, 0];
    else {
      if (key === 'dental') {
        if (option === '2000plus') range = [2000, maxVal];
        else if (option === '1500plus') range = [1500, maxVal];
        else if (option === '1000plus') range = [1000, maxVal];
        else if (option === 'under1000') range = [0, 999];
      } else if (key === 'optical') {
        if (option === '1500plus') range = [1500, maxVal];
        else if (option === '1000plus') range = [1000, maxVal];
        else if (option === '500plus') range = [500, maxVal];
        else if (option === 'under500') range = [0, 499];
      } else if (key === 'maternity') {
        if (option === '10000plus') range = [10000, maxVal];
        else if (option === '7000plus') range = [7000, maxVal];
        else if (option === '5000plus') range = [5000, maxVal];
        else if (option === 'under5000') range = [0, 4999];
      } else if (key === 'chronic') {
        if (option === '20000plus') range = [20000, maxVal];
        else if (option === '15000plus') range = [15000, maxVal];
        else if (option === '10000plus') range = [10000, maxVal];
        else if (option === 'under10000') range = [0, 9999];
      }
    }
    
    setFilters({ ...filters, [key]: range });
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
        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
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
        <SheetHeader className="p-6 border-b bg-background/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-lg font-black text-foreground">{t('planFilter') || 'Plan Filter'}</SheetTitle>
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
                  className="pl-9 bg-background border-border"
                  value={filters.searchQuery}
                  onChange={e => setFilters({...filters, searchQuery: e.target.value})}
                />
              </div>
            </div>

            <Accordion type="multiple" defaultValue={['general', 'limits', 'benefits']}>
              
              {/* GENERAL INFO */}
              <AccordionItem value="general" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-2 text-primary">
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
                      <SelectTrigger className="bg-background">
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
                      <SelectTrigger className="bg-background">
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

                  <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">{t('lifeInsurance')}</Label>
                      <p className="text-[10px] text-muted-foreground">{t('lifeInsuranceDesc') || 'Only show plans with life cover'}</p>
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
                  <div className="flex items-center gap-2 text-primary">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('coverageLimits') || 'Coverage Limits'}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">{t('annualLimit') || "Annual Limit"}</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="annual-limit-from" className="text-[10px] font-medium text-muted-foreground">From (EGP)</Label>
                        <Input
                          id="annual-limit-from"
                          type="number"
                          min={0}
                          value={filters.annualLimit[0]}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setFilters({ ...filters, annualLimit: [val, filters.annualLimit[1]] });
                          }}
                          className="h-9 bg-background border-border text-xs"
                          placeholder="Min"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="annual-limit-to" className="text-[10px] font-medium text-muted-foreground">To (EGP)</Label>
                        <Input
                          id="annual-limit-to"
                          type="number"
                          min={0}
                          value={filters.annualLimit[1]}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setFilters({ ...filters, annualLimit: [filters.annualLimit[0], val] });
                          }}
                          className="h-9 bg-background border-border text-xs"
                          placeholder="Max"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* BENEFITS */}
              <AccordionItem value="benefits" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('keyBenefits') || 'Key Benefits'}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-6">
                  {/* Consultations */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">{t('consultations') || "Consultations"} (%)</Label>
                    <Select 
                      value={getPercentOption(filters.consultations)}
                      onValueChange={(v) => handlePercentChange('consultations', v)}
                    >
                      <SelectTrigger className="bg-background text-xs">
                        <SelectValue placeholder="Select percentage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All (No restriction)</SelectItem>
                        <SelectItem value="100">100% Coverage (Full)</SelectItem>
                        <SelectItem value="90plus">90% and above</SelectItem>
                        <SelectItem value="80plus">80% and above</SelectItem>
                        <SelectItem value="70plus">70% and above</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Radiology & Lab */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">{t('radiologyLab') || "Radiology & Lab"} (%)</Label>
                    <Select 
                      value={getPercentOption(filters.radiologyLab)}
                      onValueChange={(v) => handlePercentChange('radiologyLab', v)}
                    >
                      <SelectTrigger className="bg-background text-xs">
                        <SelectValue placeholder="Select percentage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All (No restriction)</SelectItem>
                        <SelectItem value="100">100% Coverage (Full)</SelectItem>
                        <SelectItem value="90plus">90% and above</SelectItem>
                        <SelectItem value="80plus">80% and above</SelectItem>
                        <SelectItem value="70plus">70% and above</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dental Limit */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">{t('dental') || "Dental Limit"}</Label>
                    <Select 
                      value={getLimitOption(filters.dental, 50000)}
                      onValueChange={(v) => handleLimitChange('dental', v, 50000)}
                    >
                      <SelectTrigger className="bg-background text-xs">
                        <SelectValue placeholder="Select limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="covered">Covered (Any Limit)</SelectItem>
                        <SelectItem value="2000plus">2,000 EGP and above</SelectItem>
                        <SelectItem value="1500plus">1,500 EGP and above</SelectItem>
                        <SelectItem value="1000plus">1,000 EGP and above</SelectItem>
                        <SelectItem value="under1000">Below 1,000 EGP</SelectItem>
                        <SelectItem value="not_covered">Not Covered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Optical Limit */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">{t('optical') || "Optical Limit"}</Label>
                    <Select 
                      value={getLimitOption(filters.optical, 20000)}
                      onValueChange={(v) => handleLimitChange('optical', v, 20000)}
                    >
                      <SelectTrigger className="bg-background text-xs">
                        <SelectValue placeholder="Select limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="covered">Covered (Any Limit)</SelectItem>
                        <SelectItem value="1500plus">1,500 EGP and above</SelectItem>
                        <SelectItem value="1000plus">1,000 EGP and above</SelectItem>
                        <SelectItem value="500plus">500 EGP and above</SelectItem>
                        <SelectItem value="under500">Below 500 EGP</SelectItem>
                        <SelectItem value="not_covered">Not Covered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Maternity Limit */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">{t('maternity') || "Maternity Limit"}</Label>
                    <Select 
                      value={getLimitOption(filters.maternity, 100000)}
                      onValueChange={(v) => handleLimitChange('maternity', v, 100000)}
                    >
                      <SelectTrigger className="bg-background text-xs">
                        <SelectValue placeholder="Select limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="covered">Covered (Any Limit)</SelectItem>
                        <SelectItem value="10000plus">10,000 EGP and above</SelectItem>
                        <SelectItem value="7000plus">7,000 EGP and above</SelectItem>
                        <SelectItem value="5000plus">5,000 EGP and above</SelectItem>
                        <SelectItem value="under5000">Below 5,000 EGP</SelectItem>
                        <SelectItem value="not_covered">Not Covered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Chronic/Pre-existing */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">{t('chronic') || "Chronic/Pre-existing"}</Label>
                    <Select 
                      value={getLimitOption(filters.chronic, 500000)}
                      onValueChange={(v) => handleLimitChange('chronic', v, 500000)}
                    >
                      <SelectTrigger className="bg-background text-xs">
                        <SelectValue placeholder="Select limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="covered">Covered (Any Limit)</SelectItem>
                        <SelectItem value="20000plus">20,000 EGP and above</SelectItem>
                        <SelectItem value="15000plus">15,000 EGP and above</SelectItem>
                        <SelectItem value="10000plus">10,000 EGP and above</SelectItem>
                        <SelectItem value="under10000">Below 10,000 EGP</SelectItem>
                        <SelectItem value="not_covered">Not Covered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t bg-background/50 flex-row gap-3 sm:justify-between items-center">
          <Button variant="outline" onClick={onReset} className="flex-1 gap-2 font-bold text-xs uppercase tracking-widest h-11">
            <RefreshCcw className="w-3 h-3" /> {t('reset')}
          </Button>
          <Button onClick={onApply} className="flex-[2] bg-primary hover:bg-indigo-700 font-bold text-xs uppercase tracking-widest h-11">
            {t('applyFilters') || 'Apply Filters'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
