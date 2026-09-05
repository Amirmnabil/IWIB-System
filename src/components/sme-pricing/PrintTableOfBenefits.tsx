'use client';

import React, { useState } from "react";
import { Shield, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrintTableOfBenefitsProps {
  tier?: any;
  tiersList?: any[];
  configsMap?: Record<string, Record<string, any>>;
  poolsMap?: Record<string, any[]>;
  configs?: Record<string, any>;
  oonRules?: Record<string, any>;
  pools?: any[];
  doctorConfig?: any;
  categories: any[];
  definitions: any[];
  initialLang?: 'ar' | 'en';
  hideLangSwitcher?: boolean;
}

export default function PrintTableOfBenefits({
  tier,
  tiersList,
  configsMap,
  poolsMap,
  configs = {},
  oonRules = {},
  pools = [],
  doctorConfig,
  categories = [],
  definitions = [],
  initialLang = 'ar',
  hideLangSwitcher = false
}: PrintTableOfBenefitsProps) {
  const [printLang, setPrintLang] = useState<'ar' | 'en'>(initialLang);
  const printRtl = printLang === 'ar';

  // Determine list of plans to render as columns
  const plans = React.useMemo(() => {
    if (tiersList && tiersList.length > 0) return tiersList;
    if (tier) return [tier];
    return [];
  }, [tiersList, tier]);

  const isCompactFont = plans.length > 3;

  // Helper to get config for a specific tier & benefit
  const getConfig = (tierId: string, benefitId: string) => {
    if (configsMap && configsMap[tierId]) {
      return configsMap[tierId][benefitId];
    }
    if (tier && tier.id === tierId) {
      return configs[benefitId];
    }
    return configs[benefitId];
  };

  // Helper to get pools for a specific tier
  const getTierPools = (tierId: string) => {
    if (poolsMap && poolsMap[tierId]) {
      return poolsMap[tierId];
    }
    if (tier && tier.id === tierId) {
      return pools;
    }
    return pools;
  };

  // Group definitions under requested categories
  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      const getRank = (cat: any) => {
        const name = ((cat.name_en || '') + ' ' + (cat.name_ar || '')).toLowerCase();
        if (name.includes('inpatient') || name.includes('داخلي')) return 1;
        if (name.includes('daycare') || name.includes('يوم واحد') || name.includes('جراحة اليوم')) return 2;
        if (name.includes('outpatient') || name.includes('خارجية')) return 3;
        if (name.includes('maternity') || name.includes('pregnancy') || name.includes('حمل')) return 4;
        if (name.includes('dental') || name.includes('optical') || name.includes('أسنان') || name.includes('بصريات')) return 5;
        if (name.includes('chronic') || name.includes('pre-existing') || name.includes('مزمن')) return 6;
        if (name.includes('special') || name.includes('خاصة') || name.includes('إضافية')) return 7;
        return 99;
      };
      return getRank(a) - getRank(b);
    });
  }, [categories]);

  // Format short concise value for compact high-density cell
  const formatCellContent = (config: any, benefit: any, tierItem: any) => {
    if (!config) return { text: "-", isCovered: false };

    const status = config.coverage_status;
    const specialType = config.special_coverage_type;

    if (status === 'not_covered' || specialType === 'uncovered') {
      return { text: printRtl ? "غير مغطى" : "Uncovered", isCovered: false };
    }

    const nameEn = (benefit.name_en || '').toLowerCase();
    const nameAr = (benefit.name_ar || '').toLowerCase();
    const isRoomAccommodation = nameEn.includes('room') || nameEn.includes('accommodation') || nameAr.includes('إقامة') || nameAr.includes('اقامة');
    const isIcuStay = nameEn.includes('intensive care') || nameEn.includes('icu') || nameAr.includes('عناية مرك');

    let text = "";

    const isMaternityChild = benefit.parent_benefit_id && (nameEn.includes('pregnancy') || nameEn.includes('maternity') || nameEn.includes('childbirth') || nameEn.includes('anc') || nameEn.includes('natal') || nameEn.includes('delivery') || nameAr.includes('حمل') || nameAr.includes('ولادة'));

    if (isRoomAccommodation && config.accommodation_category) {
      const roomLabels: Record<string, { ar: string; en: string }> = {
        standard_private: { ar: "درجة أولى ممتازة", en: "Standard Private" },
        first_class_single: { ar: "درجة أولى ممتازة", en: "Standard Private" },
        semi_private: { ar: "درجة ثانية (مزدوجة)", en: "Semi-Private" },
        regular_double: { ar: "درجة ثانية (مزدوجة)", en: "Semi-Private" },
        suite: { ar: "جناح", en: "Suite" },
        vip: { ar: "جناح ملكي (VIP)", en: "VIP Suite" },
      };
      const rObj = roomLabels[config.accommodation_category];
      text = rObj ? (printRtl ? rObj.ar : rObj.en) : config.accommodation_category;
    } else if (isIcuStay && config.max_icu_days) {
      text = printRtl ? `أقصى ${config.max_icu_days} يوم` : `Max ${config.max_icu_days} Days`;
    } else if (isMaternityChild) {
      text = printRtl ? "مغطى (حد مشترك)" : "Covered (Shared Sub-limit)";
    } else if (config.limit_type === 'sub_limit' && config.limit_value) {
      text = `${Number(config.limit_value).toLocaleString()} ${config.limit_currency || 'EGP'}`;
      if (Number(config.co_payment_percent) > 0) {
        text += ` (Co-pay ${config.co_payment_percent}%)`;
      }
    } else if (Number(config.co_payment_percent) > 0) {
      text = printRtl ? `تحمل ${config.co_payment_percent}%` : `Co-pay ${config.co_payment_percent}%`;
    } else if (config.limit_type === 'included_in_aal' || config.limit_type === 'unlimited' || config.limit_type === 'full_cover') {
      text = printRtl ? "كامل (100%)" : "Full (100%)";
    } else {
      text = printRtl ? "مغطى" : "Covered";
    }

    return { text, isCovered: true };
  };

  if (plans.length === 0) return null;

  return (
    <div dir={printRtl ? "rtl" : "ltr"} className={cn("bg-white p-4 md:p-6 space-y-5 text-slate-800 print:p-0 print:space-y-4", printRtl ? "font-arabic" : "font-sans", isCompactFont ? "text-[10px]" : "text-xs")}>
      
      {/* PRINT-ONLY OFFICIAL HEADER */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            IWIB
          </div>
          <div>
            <h1 className="font-black text-sm text-slate-900 tracking-tight">
              {printRtl ? "منظومة التأمين الطبي - IWIB Insurance System" : "IWIB Medical Insurance Platform"}
            </h1>
            <p className="text-[10px] font-bold text-slate-600">
              {printRtl ? "جدول المنافع ومصفوفة التغطيات التأمينية المعتمدة" : "Official Policy Benefits Schedule & Coverage Matrix"}
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[9px] text-slate-600">
          <div className="font-bold text-slate-900">{printRtl ? "وثيقة معتمدة رسمياً" : "Official Approved Document"}</div>
          <div>{printRtl ? "تاريخ الإصدار: " : "Issue Date: "}{new Date().toISOString().split('T')[0]}</div>
        </div>
      </div>

      {/* Language Switcher Bar */}
      {!hideLangSwitcher && (
        <div className="flex items-center justify-between border-b pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 text-xs">
              {printRtl ? "جدول المنافع ومصفوفة التغطيات التأمينية" : "Table of Benefits (TOB) Matrix"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              variant={printLang === 'ar' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setPrintLang('ar')} 
              className="h-7 text-[11px] font-bold px-2.5"
            >
              العربية (RTL)
            </Button>
            <Button 
              variant={printLang === 'en' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setPrintLang('en')} 
              className="h-7 text-[11px] font-bold px-2.5"
            >
              English (LTR)
            </Button>
          </div>
        </div>
      )}

      {/* 1. HEADER SUMMARY SECTION (Single Horizontal Table Row Matrix) */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50/50 print:break-inside-avoid">
        <div className="bg-slate-800 text-white p-2.5 px-4 font-bold text-xs flex items-center justify-between">
          <span>{printRtl ? "ملخص بيانات خطط البوليصة (Policy Plans Overview)" : "Policy Contract Plans Summary"}</span>
          <span className="text-[10px] text-slate-300 font-normal">{plans.length} {printRtl ? "خطط داخل البوليصة" : "Active Policy Plans"}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                <th className="p-2.5 px-4">{printRtl ? "اسم الخطة (Plan Name)" : "Plan Name"}</th>
                <th className="p-2.5 px-3">{printRtl ? "الشبكة الطبية (Network)" : "Network"}</th>
                <th className="p-2.5 px-3">{printRtl ? "الحد السنوي (AAL)" : "Annual Limit (AAL)"}</th>
                <th className="p-2.5 px-3">{printRtl ? "النطاق (Scope)" : "Regional Scope"}</th>
                <th className="p-2.5 px-3">{printRtl ? "نوع البطاقة" : "Card Type"}</th>
                <th className="p-2.5 px-3">{printRtl ? "خطاب تحويل" : "Referral Required"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 font-medium">
              {plans.map((p: any, idx: number) => {
                const planTitle = printRtl ? (p.tier_name_ar || p.tier_name_en) : (p.tier_name_en || p.tier_name_ar);
                const netName = p.medical_networks ? (printRtl ? p.medical_networks.name_ar : p.medical_networks.name_en) : "-";
                const aalStr = p.annual_aggregate_limit_value 
                  ? `${Number(p.annual_aggregate_limit_value).toLocaleString()} ${p.annual_aggregate_limit_currency || 'EGP'}` 
                  : (printRtl ? "مفتوح بدون حد أقصى" : "Unlimited AAL");

                return (
                  <tr key={p.id || idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="p-2.5 px-4 font-black text-indigo-700">{planTitle}</td>
                    <td className="p-2.5 px-3 font-bold">{netName}</td>
                    <td className="p-2.5 px-3 font-bold text-emerald-700">{aalStr}</td>
                    <td className="p-2.5 px-3 capitalize font-mono text-[11px]">{p.regional_scope || 'local'}</td>
                    <td className="p-2.5 px-3 capitalize">{p.card_type || 'electronic'}</td>
                    <td className="p-2.5 px-3">
                      {p.referral_letter ? (
                        <span className="text-amber-700 font-bold">{printRtl ? "مطلوب (Yes)" : "Required"}</span>
                      ) : (
                        <span className="text-slate-500">{printRtl ? "غير مطلوب (No)" : "Not Required"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MAIN TABLE STRUCTURE (Matrix with Categories & Dynamic Plan Columns) */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white print:break-inside-avoid">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider border-b border-slate-700">
              <th className="p-2.5 px-4 w-1/4">{printRtl ? "المنفعة التأمينية (Benefit Name)" : "Medical Benefit"}</th>
              {plans.map((p: any, idx: number) => {
                const pTitle = printRtl ? (p.tier_name_ar || p.tier_name_en) : (p.tier_name_en || p.tier_name_ar);
                return (
                  <th key={p.id || idx} className="p-2.5 px-3 text-center border-l border-slate-700/50">
                    <div className="font-black text-indigo-200 text-xs">{pTitle}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedCategories.map(cat => {
              const catDefs = definitions.filter(d => d.category_id === cat.id);
              const rootDefs = catDefs.filter(d => !d.parent_benefit_id);
              if (rootDefs.length === 0) return null;

              const catName = printRtl ? cat.name_ar : cat.name_en;

              // Helper to check if a benefit is uncovered for a plan
              const isDefUncovered = (pItem: any, def: any) => {
                const conf = getConfig(pItem.id, def.id);
                return !conf || conf.coverage_status === 'not_covered' || conf.special_coverage_type === 'uncovered';
              };

              // Check if entire category is uncovered for a plan
              const isCatUncoveredForPlan = (pItem: any) => {
                return catDefs.length > 0 && catDefs.every(def => isDefUncovered(pItem, def));
              };

              // Check if entire category is uncovered across ALL plans
              const isCatUncoveredForAllPlans = plans.every(pItem => isCatUncoveredForPlan(pItem));

              // If category is completely uncovered across all plans, display ONLY section header with Uncovered
              if (isCatUncoveredForAllPlans) {
                return (
                  <tr key={cat.id} className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800 select-none">
                    <td className="p-2.5 px-4 text-xs font-black uppercase tracking-wide text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block shrink-0" />
                      <span>{catName}</span>
                    </td>
                    {plans.map((pItem: any) => (
                      <td key={pItem.id} className="p-2.5 px-3 text-center font-bold text-xs text-slate-400 border-l border-slate-200/60 bg-slate-50/50">
                        {printRtl ? "غير مغطى" : "Uncovered"}
                      </td>
                    ))}
                  </tr>
                );
              }

              return (
                <React.Fragment key={cat.id}>
                  {/* Category Subtle Divider Row */}
                  <tr className="bg-slate-100/80 font-bold border-t-2 border-indigo-500/20 text-slate-900 select-none">
                    <td className="p-2 px-4 text-xs font-black uppercase tracking-wide bg-slate-100/90 text-indigo-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block shrink-0" />
                      <span>{catName}</span>
                    </td>
                    {plans.map((pItem: any) => {
                      const isPlanCatUncovered = isCatUncoveredForPlan(pItem);
                      return (
                        <td key={pItem.id} className="p-2 px-3 text-center text-xs font-bold border-l border-slate-200/60">
                          {isPlanCatUncovered ? (
                            <span className="text-slate-400 font-bold">{printRtl ? "غير مغطى" : "Uncovered"}</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>

                  {rootDefs.map((parent, rIdx) => {
                    const pNameEn = (parent.name_en || '').toLowerCase();
                    const pNameAr = (parent.name_ar || '').toLowerCase();
                    const isTopRoomAccommodation = (parent.id === '10000000-0000-0000-0000-000000000001') || ((pNameEn.includes('room accommodation') || (pNameAr.includes('إقامة') && pNameAr.includes('تمريض'))) && (catName.toLowerCase().includes('inpatient') || catName.includes('داخلي')));
                    if (isTopRoomAccommodation) return null;

                    const childDefs = catDefs.filter(d => d.parent_benefit_id === parent.id);
                    const bName = printRtl ? parent.name_ar : parent.name_en;
                    const bDesc = printRtl ? parent.description_ar : parent.description_en;

                    return (
                      <React.Fragment key={parent.id}>
                        {/* Parent Benefit Row */}
                        <tr className={rIdx % 2 === 1 ? "bg-slate-50/40 hover:bg-slate-100/60" : "bg-white hover:bg-slate-100/60"}>
                          <td className="p-2.5 px-4 font-bold text-slate-900">
                            <div>{bName}</div>
                            {bDesc && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{bDesc}</div>}
                          </td>

                          {/* Dynamic Cell per Plan */}
                          {plans.map((pItem: any) => {
                            const conf = getConfig(pItem.id, parent.id);
                            const cell = formatCellContent(conf, parent, pItem);

                            return (
                              <td key={pItem.id} className="p-2.5 px-3 text-center font-semibold text-xs border-l border-slate-100">
                                {cell.isCovered ? (
                                  <span className="text-slate-900 font-bold">
                                    {cell.text}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">{cell.text}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Child Sub-benefits Rows */}
                        {childDefs.map(child => {
                          const cName = printRtl ? child.name_ar : child.name_en;
                          return (
                            <tr key={child.id} className="bg-slate-50/20 hover:bg-slate-100/50">
                              <td className="p-2 px-4 ps-8 text-slate-700 font-medium text-xs flex items-center gap-1.5">
                                <span className="text-slate-300 font-bold">↳</span>
                                <span>{cName}</span>
                              </td>

                              {plans.map((pItem: any) => {
                                const cConf = getConfig(pItem.id, child.id);
                                const cCell = formatCellContent(cConf, child, pItem);

                                return (
                                  <td key={pItem.id} className="p-2 px-3 text-center font-medium text-xs border-l border-slate-100">
                                    {cCell.isCovered ? (
                                      <span className="text-slate-800 font-semibold">
                                        {cCell.text}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">{cCell.text}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. SHARED LIMITS (COMBINED POOLS TABLE - Shared Between All Policy Plans) */}
      {(() => {
        const uniquePoolsMap: Record<string, { pool: any; planNames: string[] }> = {};
        
        plans.forEach((pItem: any) => {
          const tPools = getTierPools(pItem.id) || [];
          const pName = printRtl ? (pItem.tier_name_ar || pItem.tier_name_en) : (pItem.tier_name_en || pItem.tier_name_ar);
          
          tPools.forEach((pool: any) => {
            if (!uniquePoolsMap[pool.id]) {
              uniquePoolsMap[pool.id] = { pool, planNames: [pName] };
            } else if (!uniquePoolsMap[pool.id].planNames.includes(pName)) {
              uniquePoolsMap[pool.id].planNames.push(pName);
            }
          });
        });

        const combinedPoolsList = Object.values(uniquePoolsMap);

        if (combinedPoolsList.length === 0) return null;

        return (
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white print:break-inside-avoid">
            <div className="bg-slate-800 text-white p-2 px-4 font-bold text-xs flex items-center justify-between">
              <span>{printRtl ? "مجمعات الحدود المشتركة (Shared Combined Limit Pools)" : "Shared Combined Limit Pools Matrix"}</span>
              <span className="text-[10px] text-slate-300 font-normal">{combinedPoolsList.length} {printRtl ? "أوعية مشتركة" : "Active Pools"}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <th className="p-2 px-3">{printRtl ? "اسم وعاء الحد المشترك (Pool Name)" : "Combined Pool Name"}</th>
                    <th className="p-2 px-3">{printRtl ? "قيمة الحد المشترك (Limit Value)" : "Shared Limit Value"}</th>
                    <th className="p-2 px-3">{printRtl ? "الخطط المشتركة (Covered Plans)" : "Covered Policy Plans"}</th>
                    <th className="p-2 px-3">{printRtl ? "أساس الاستهلاك (Basis)" : "Depletion Basis"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 font-medium">
                  {combinedPoolsList.map(({ pool, planNames }, pIdx) => {
                    const isAllPlans = plans.length > 1 && planNames.length === plans.length;
                    const plansStr = isAllPlans 
                      ? (printRtl ? "جميع خطط البوليصة (All Policy Plans)" : "All Policy Plans") 
                      : planNames.join(" • ");

                    return (
                      <tr key={pool.id || pIdx} className={pIdx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                        <td className="p-2 px-3 font-bold text-indigo-700">
                          {printRtl ? pool.pool_name_ar : pool.pool_name_en}
                        </td>
                        <td className="p-2 px-3 font-black text-emerald-700">
                          {Number(pool.pool_limit_value).toLocaleString()} {pool.pool_limit_currency || 'EGP'}
                        </td>
                        <td className="p-2 px-3 font-bold text-slate-800">{plansStr}</td>
                        <td className="p-2 px-3 capitalize text-slate-500">{pool.pool_basis || 'annual'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 4. DOCTOR ON SITE (DOS) DETAILS SECTION (Visits per week, locations count, location address ONLY) */}
      {Boolean(doctorConfig && (doctorConfig.is_enabled !== false || doctorConfig.visits_per_week || doctorConfig.number_of_locations || doctorConfig.location_en || doctorConfig.location_ar)) && (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50/40 print:break-inside-avoid">
          <div className="bg-slate-800 text-white p-2 px-3 font-bold text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>{printRtl ? "تفاصيل طبيب الموقع (Doctor on Site - DOS)" : "Doctor on Site (DOS) Details"}</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold uppercase">{printRtl ? "مغطى" : "Covered"}</span>
          </div>
          
          <div className="p-2.5 px-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {printRtl ? "عدد الزيارات في الأسبوع" : "Visits per Week"}
              </div>
              <div className="font-black text-slate-900 text-xs">
                {doctorConfig.visits_per_week || 1} {printRtl ? "زيارة / أسبوع" : "visits / week"}
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {printRtl ? "عدد المواقع" : "Number of Locations"}
              </div>
              <div className="font-black text-slate-900 text-xs">
                {doctorConfig.number_of_locations || 1} {printRtl ? "موقع" : "locations"}
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                {printRtl ? "عنوان وتفاصيل الموقع" : "Location Address"}
              </div>
              <div className="font-black text-slate-900 text-xs">
                {(printRtl ? doctorConfig.location_ar : doctorConfig.location_en) || doctorConfig.location_en || doctorConfig.location_ar || "-"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. REIMBURSEMENT RULES MATRIX SECTION */}
      {plans.some((pItem: any) => pItem.reimbursement_covered !== false) && (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50/40 print:break-inside-avoid">
          <div className="bg-slate-800 text-white p-2 px-3 font-bold text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>{printRtl ? "قواعد استرداد النفقات الطبية خارج الشبكة (Out-of-Network Reimbursement Rules)" : "Out-of-Network Reimbursement Rules"}</span>
            </div>
            <span className="text-[10px] text-slate-300 font-normal">{printRtl ? "خارج الشبكة" : "Out-of-Network"}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <th className="p-2 px-3">{printRtl ? "اسم الخطة (Plan Name)" : "Plan Name"}</th>
                  <th className="p-2 px-3">{printRtl ? "تغطية الاسترداد (Reimbursement Status)" : "Reimbursement Status"}</th>
                  <th className="p-2 px-3">{printRtl ? "نسبة التغطية المعتمدة (%)" : "Approved Coverage %"}</th>
                  <th className="p-2 px-3">{printRtl ? "تسعيرة الاسترداد المرجعية (Price Tariff)" : "Reference Price List"}</th>
                  <th className="p-2 px-3">{printRtl ? "مهلة تقديم الفواتير (Submission Window)" : "Claim Submission Window"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-medium">
                {plans.map((pItem: any, idx: number) => {
                  const pTitle = printRtl ? (pItem.tier_name_ar || pItem.tier_name_en) : (pItem.tier_name_en || pItem.tier_name_ar);
                  const isReimbCovered = pItem.reimbursement_covered !== false;
                  const percentStr = pItem.reimbursement_percent ? `${pItem.reimbursement_percent}%` : "80%";
                  const tariffStr = (pItem.reimbursement_price_list_id && pItem.reimbursement_price_list_id !== 'none')
                    ? (printRtl ? "قائمة الأسعار المرجعية المعتمدة" : "Custom Approved Tariff")
                    : (printRtl ? "تسعيرة المزود القياسية (Standard Fee Schedule)" : "Standard Provider Tariff");

                  return (
                    <tr key={pItem.id || idx} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                      <td className="p-2 px-3 font-bold text-indigo-700">{pTitle}</td>
                      <td className="p-2 px-3 font-bold">
                        {isReimbCovered ? (
                          <span className="text-emerald-700 font-bold">{printRtl ? "مغطى (تغطية استرداد)" : "Covered (Reimbursement)"}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">{printRtl ? "غير مغطى" : "Not Covered"}</span>
                        )}
                      </td>
                      <td className="p-2 px-3 font-bold text-slate-900">{isReimbCovered ? percentStr : "-"}</td>
                      <td className="p-2 px-3 text-slate-700 text-[11px]">{isReimbCovered ? tariffStr : "-"}</td>
                      <td className="p-2 px-3 text-slate-600 font-mono text-[11px]">
                        {isReimbCovered ? (printRtl ? "خلال 30 يوماً من العلاج" : "30 Days from Treatment") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINT-ONLY OFFICIAL FOOTER */}
      <div className="hidden print:flex items-center justify-between border-t-2 border-slate-900 pt-2.5 mt-3 text-[9px] font-mono text-slate-600">
        <div>
          <span className="font-bold text-slate-900">IWIB Insurance System</span> • {printRtl ? "جدول منافع البوليصة الرسمي المعتمد" : "Official Policy Table of Benefits"}
        </div>
        <div>
          {printRtl ? "وثيقة معتمدة • " : "Certified Document • "}{new Date().toLocaleDateString(printRtl ? 'ar-EG' : 'en-US')}
        </div>
      </div>

    </div>
  );
}
