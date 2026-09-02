'use client';

import React, { useState } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

interface PrintTableOfBenefitsProps {
  tier: any;
  configs: Record<string, any>;
  oonRules: Record<string, any>;
  pools: any[];
  doctorConfig?: any; // kept for signature compatibility, unused
  categories: any[];
  definitions: any[];
  initialLang?: 'ar' | 'en';
  hideLangSwitcher?: boolean;
}

export default function PrintTableOfBenefits({
  tier,
  configs,
  oonRules,
  pools,
  categories,
  definitions,
  initialLang = 'ar',
  hideLangSwitcher = false
}: PrintTableOfBenefitsProps) {
  const [printLang, setPrintLang] = useState<'ar' | 'en'>(initialLang);
  const printRtl = printLang === 'ar';

  const tLookup = {
    ar: {
      category: "الفئة",
      benefit: "المنفعة التأمينية",
      coverage: "حالة التغطية",
      limits: "الحدود والتحمل",
      aal: "الحد الأقصى السنوي للمجموعة",
      scope: "النطاق الجغرافي",
      network: "الشبكة الطبية",
      card: "نوع البطاقة",
      referralLetter: "خطاب تحويل طبي",
      referralLetterVal: tier?.referral_letter ? "مطلوب (Yes)" : "غير مطلوب (No)",
      pools: "المجمعات والحدود المشتركة",
      oon: "علاج خارج الشبكة",
      covered: "مغطى",
      partially: "مغطى جزئياً",
      notcovered: "غير مغطى",
      yes: "نعم",
      no: "لا",
      reimbursementTitle: "استرداد المصاريف الطبية (Reimbursement)",
      reimbPercent: "نسبة الاسترداد",
      reimbPriceList: "قائمة الأسعار المعتمدة للاسترداد",
      coverageScope: "نطاق توزيع التغطية للأعضاء",
      allMembers: "كل الأعضاء",
      specificCount: "عدد محدد من الأعضاء",
      specificPercent: "نسبة مئوية من الأعضاء",
      accommodationCat: "فئة الإقامة والتمريض",
      maxIcuDays: "أقصى عدد أيام العناية المركزة",
      specialCoverageType: "طريقة تغطية الحالة",
      fullCoverage: "تغطية كاملة",
      separateLimit: "حد فرعي منفصل",
      sharedLimit: "حد مشترك مع منفعة أخرى",
      uncovered: "غير مغطى",
      separateContainer: "مغطى عبر وعاء منفصل",
      sharedContainer: "مغطى عبر وعاء مشترك",
    },
    en: {
      category: "Category",
      benefit: "Benefit & Coverage Rules",
      coverage: "Coverage Status",
      limits: "Limits & Co-payments",
      aal: "Annual Aggregate Limit (AAL)",
      scope: "Regional Scope",
      network: "Medical Network",
      card: "Card Type",
      referralLetter: "Referral Letter Required",
      referralLetterVal: tier?.referral_letter ? "Yes" : "No",
      pools: "Shared Limits & Pools",
      oon: "Out-of-Network Reimbursement",
      covered: "Covered",
      partially: "Partially Covered",
      notcovered: "Not Covered",
      yes: "Yes",
      no: "No",
      reimbursementTitle: "Medical Expenses Reimbursement Settings",
      reimbPercent: "Reimbursement Percentage",
      reimbPriceList: "Approved Price List for Reimbursement",
      coverageScope: "Coverage Scope Distribution",
      allMembers: "All Members",
      specificCount: "Specific Number of Members",
      specificPercent: "Percentage of Members",
      accommodationCat: "Accommodation Stay Level",
      maxIcuDays: "Max ICU Days Allowed",
      specialCoverageType: "Coverage Type",
      fullCoverage: "Full Coverage",
      separateLimit: "Separate Limit",
      sharedLimit: "Shared Limit with Another Benefit",
      uncovered: "Uncovered",
      separateContainer: "Covered via Separate Container",
      sharedContainer: "Covered via Shared Container",
    }
  }[printLang];

  if (!tier) return null;

  // Filter definitions based on lang for strict view (no mixed language)
  const getBenefitName = (def: any) => {
    return printRtl ? def.name_ar : def.name_en;
  };

  const getBenefitDesc = (def: any) => {
    return printRtl ? def.description_ar : def.description_en;
  };

  const renderLimitDesc = (config: any) => {
    if (!config) return "-";
    if (config.coverage_status === 'not_covered' || config.special_coverage_type === 'uncovered') {
      return tLookup.notcovered;
    }

    const lines: string[] = [];

    // Special Condition Coverage Type details
    if (config.special_coverage_type && config.special_coverage_type !== 'full_coverage') {
      lines.push(`${tLookup.specialCoverageType}: ${tLookup[config.special_coverage_type as keyof typeof tLookup] || config.special_coverage_type}`);
    }

    // Shared pool limits
    if (config.combined_pool_id) {
      lines.push(printRtl ? "مغطى ضمن مجمع الحد المشترك" : "Covered under Shared Pool limit");
    } else {
      if (config.limit_type === 'included_in_aal') {
        lines.push(printRtl ? "مدرج في الحد الأقصى السنوي" : "Included in Annual Limit (AAL)");
      } else if (config.limit_type === 'unlimited') {
        lines.push(printRtl ? "تغطية كاملة بدون حد" : "Unlimited Coverage");
      } else if (config.limit_type === 'sub_limit') {
        lines.push(`${config.limit_value} ${config.limit_currency} (${config.limit_basis})`);
      } else if (config.limit_type === 'per_case') {
        lines.push(printRtl ? "لكل حالة" : "Per Case");
      }
    }

    // Co-payment details
    if (Number(config.co_payment_percent) > 0) {
      let copayStr = printRtl ? `نسبة التحمل: ${config.co_payment_percent}%` : `Co-payment: ${config.co_payment_percent}%`;
      if (config.co_payment_cap) {
        copayStr += printRtl ? ` (حد أقصى ${config.co_payment_cap} ج.م)` : ` (capped at ${config.co_payment_cap} EGP)`;
      }
      lines.push(copayStr);
    }

    // Network scope
    if (config.network_scope === 'in_and_out_network') {
      lines.push(printRtl ? "مغطى داخل وخارج الشبكة الطبية" : "In & Out of Network Coverage");
    }

    // Waiting period
    if (Number(config.waiting_period_days) > 0) {
      lines.push(printRtl ? `فترة الانتظار: ${config.waiting_period_days} يوم` : `Waiting Period: ${config.waiting_period_days} days`);
    }

    // Coverage scope / distribution details
    if (config.coverage_scope_type && config.coverage_scope_type !== 'all') {
      const scopeLabel = config.coverage_scope_type === 'count' ? tLookup.specificCount : tLookup.specificPercent;
      lines.push(`${tLookup.coverageScope}: ${scopeLabel} (${config.coverage_scope_value})`);
    }

    // Accommodation categories details
    if (config.accommodation_category) {
      let accomLabel = "";
      if (config.accommodation_category === 'suite') {
        accomLabel = printRtl ? "جناح ملكي" : "Suite";
      } else if (config.accommodation_category === 'first_class_single') {
        accomLabel = printRtl ? "غرفة فردية درجة أولى" : "First Class Single";
      } else {
        accomLabel = printRtl ? "غرفة مزدوجة عادية" : "Regular Double";
      }
      lines.push(`${tLookup.accommodationCat}: ${accomLabel}`);
    }

    // Max ICU days details
    if (config.max_icu_days) {
      lines.push(`${tLookup.maxIcuDays}: ${config.max_icu_days}`);
    }

    return lines.join(" • ");
  };

  return (
    <div dir={printRtl ? "rtl" : "ltr"} className={cn("space-y-6 print:p-0", printRtl ? "font-arabic" : "font-sans")}>
      
      {/* Printable Lang Switcher (Hidden in print) */}
      {!hideLangSwitcher && (
        <div className="flex justify-start gap-2 border-b pb-3 print:hidden">
          <Button 
            variant={printLang === 'ar' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setPrintLang('ar')} 
            className="font-bold text-xs"
          >
            عربي (Arabic RTL)
          </Button>
          <Button 
            variant={printLang === 'en' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setPrintLang('en')} 
            className="font-bold text-xs"
          >
            English (LTR)
          </Button>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="border-b-4 border-indigo-600 pb-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900">
              {printRtl ? tier.tier_name_ar : tier.tier_name_en}
            </h2>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              {printRtl ? "جدول المنافع والمواصفات الطبية المعتمدة" : "Table of Benefits & Approved Specifications"}
            </p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold text-indigo-700">IWIB Insurance Hub</h3>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {tier.policy_start_date || "-"} / {tier.policy_end_date || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Tier Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-slate-50 border rounded-xl text-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{tLookup.aal}</span>
          <p className="font-bold text-slate-800">
            {tier.annual_aggregate_limit_value 
              ? `${Number(tier.annual_aggregate_limit_value).toLocaleString()} ${tier.annual_aggregate_limit_currency}` 
              : (printRtl ? "مفتوح بدون حد أقصى" : "Unlimited")}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{tLookup.network}</span>
          <p className="font-bold text-slate-800">
            {tier.medical_networks ? (printRtl ? tier.medical_networks.name_ar : tier.medical_networks.name_en) : "-"}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{tLookup.scope}</span>
          <p className="font-bold text-slate-800 uppercase font-mono">{tier.regional_scope}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{tLookup.card}</span>
          <p className="font-bold text-slate-800 capitalize">{tier.card_type}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{tLookup.referralLetter}</span>
          <p className="font-bold text-slate-800">{tLookup.referralLetterVal}</p>
        </div>
      </div>

      {/* Pools rendering */}
      {pools && pools.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">{tLookup.pools}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {pools.map(p => (
              <div key={p.id} className="p-3 border rounded-xl bg-indigo-50/20 border-indigo-100/50 flex items-center justify-between">
                <span className="font-bold text-slate-800">{printRtl ? p.pool_name_ar : p.pool_name_en}</span>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                  {Number(p.pool_limit_value).toLocaleString()} {p.pool_limit_currency} ({p.pool_basis})
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table of Benefits structured according to requirements */}
      <table className="w-full border-collapse border border-slate-200 text-xs">
        <thead>
          <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
            <th className="border border-slate-200 p-3 text-left w-1/2">{tLookup.benefit}</th>
            <th className="border border-slate-200 p-3 text-center w-1/6">{tLookup.coverage}</th>
            <th className="border border-slate-200 p-3 text-left w-1/3">{tLookup.limits}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {categories.map(cat => {
            const catDefs = definitions.filter(d => d.category_id === cat.id);
            const rootDefs = catDefs.filter(d => !d.parent_benefit_id);
            if (rootDefs.length === 0) return null;

            return (
              <React.Fragment key={cat.id}>
                {/* Category Row */}
                <tr className="bg-slate-100 font-bold text-slate-800 text-[11px]">
                  <td colSpan={3} className="border border-slate-200 p-2.5 px-4 bg-slate-100">
                    {printRtl ? cat.name_ar : cat.name_en}
                  </td>
                </tr>

                {rootDefs.map(parent => {
                  const parentConfig = configs[parent.id];
                  const childDefs = catDefs.filter(d => d.parent_benefit_id === parent.id);

                  return (
                    <React.Fragment key={parent.id}>
                      {/* Parent row */}
                      <tr className="hover:bg-slate-50/20">
                        <td className="border border-slate-200 p-3">
                          <p className="font-bold text-slate-900">{getBenefitName(parent)}</p>
                          {getBenefitDesc(parent) && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              {getBenefitDesc(parent)}
                            </p>
                          )}
                        </td>
                        <td className="border border-slate-200 p-3 text-center">
                          {parentConfig ? (
                            <Badge variant="outline" className={cn(
                              "text-[10px] py-0 px-2 font-bold",
                              parentConfig.coverage_status === 'covered' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : parentConfig.coverage_status === 'partially_covered' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                  : 'bg-red-50 text-red-700 border-red-100'
                            )}>
                              {parentConfig.coverage_status === 'covered' 
                                ? tLookup.covered 
                                : parentConfig.coverage_status === 'partially_covered' 
                                  ? tLookup.partially 
                                  : tLookup.notcovered}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="border border-slate-200 p-3 text-xs leading-relaxed">
                          {parentConfig ? renderLimitDesc(parentConfig) : "-"}
                        </td>
                      </tr>

                      {/* Child rows under parent */}
                      {childDefs.map(child => {
                        const childConfig = configs[child.id];
                        return (
                          <tr key={child.id} className="bg-slate-50/20 hover:bg-slate-50/40">
                            <td className="border border-slate-200 p-3 pl-8">
                              <div className="flex items-start gap-2">
                                <span className="text-slate-300 font-bold shrink-0">↳</span>
                                <div>
                                  <p className="font-semibold text-slate-800">{getBenefitName(child)}</p>
                                  {getBenefitDesc(child) && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {getBenefitDesc(child)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="border border-slate-200 p-3 text-center">
                              {childConfig ? (
                                <Badge variant="outline" className={cn(
                                  "text-[9px] py-0 px-2 font-bold",
                                  childConfig.coverage_status === 'covered' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : childConfig.coverage_status === 'partially_covered' 
                                      ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                      : 'bg-red-50 text-red-700 border-red-100'
                                )}>
                                  {childConfig.coverage_status === 'covered' 
                                    ? tLookup.covered 
                                    : childConfig.coverage_status === 'partially_covered' 
                                      ? tLookup.partially 
                                      : tLookup.notcovered}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="border border-slate-200 p-3 text-xs leading-relaxed">
                              {childConfig ? renderLimitDesc(childConfig) : "-"}
                            </td>
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

      {/* Financials / Reimbursement Section Banner (NEW) */}
      <div className="p-4 border border-indigo-100 bg-indigo-50/10 rounded-xl space-y-2 text-xs">
        <h3 className="font-black text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-indigo-600" /> {tLookup.reimbursementTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-400 font-semibold">{printRtl ? "حالة استرداد المصاريف:" : "Reimbursement Status:"}</span>
            <span className="font-bold text-slate-800 ml-1.5">
              {tier.reimbursement_covered 
                ? (printRtl ? "مشمولة بالتغطية" : "Covered / Allowed") 
                : (printRtl ? "غير مغطاة" : "Not Covered")}
            </span>
          </div>
          {tier.reimbursement_covered && (
            <>
              <div>
                <span className="text-slate-400 font-semibold">{tLookup.reimbPercent}:</span>
                <span className="font-bold text-slate-800 ml-1.5">{tier.reimbursement_percent}%</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold">{tLookup.reimbPriceList}:</span>
                <span className="font-bold text-slate-800 ml-1.5">
                  {tier.reimbursement_price_list_id 
                    ? (printRtl ? "قائمة الأسعار المعتمدة للشبكة الطبية" : "Network Approved Reimbursement tariff rates")
                    : (printRtl ? "أسعار وزارة الصحة المصرية الرسمية" : "Official Egyptian MOH Tariff Rate basis")}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
