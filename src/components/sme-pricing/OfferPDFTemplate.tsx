import React, { forwardRef, useMemo } from 'react';
import type { SMEPlan, CalculationBreakdown } from '@/lib/types';
import { 
  HeartPulse, Settings, Globe, Hotel, Stethoscope, Activity, Briefcase, ShieldAlert, 
  ExternalLink, Shield, Award, Smile, Eye, Baby, ShieldCheck, Phone, 
  Mail, MapPin, Star, Users, Cpu, Scale, BookOpen
} from 'lucide-react';
import { companyLogosB64 } from './logos';
import { translations, TranslationSchema } from '@/lib/i18n';

interface BenefitItem {
  label: keyof TranslationSchema;
  key: string;
  icon: React.ComponentType<any>;
}

const benefitsList: BenefitItem[] = [
  { label: 'annualLimit', key: 'annualLimit', icon: Award },
  { label: 'lifeInsurance', key: 'lifeInsurance', icon: HeartPulse },
  { label: 'pdfTpa', key: 'tpa', icon: Settings },
  { label: 'network', key: 'network', icon: Globe },
  { label: 'accommodation', key: 'accommodation', icon: Hotel },
  { label: 'pdfInpatient', key: 'inpatient', icon: Hotel },
  { label: 'pdfConsultations', key: 'consultations', icon: Stethoscope },
  { label: 'radiologyLab', key: 'radiologyLab', icon: Activity },
  { label: 'medications', key: 'medications', icon: Briefcase },
  { label: 'dental', key: 'dental', icon: Smile },
  { label: 'optical', key: 'optical', icon: Eye },
  { label: 'pdfMaternity', key: 'maternity', icon: Baby },
  { label: 'chronicPreExisting', key: 'chronicPreExisting', icon: ShieldAlert },
  { label: 'covid19', key: 'covid19', icon: Shield },
  { label: 'pdfOutOfNetwork', key: 'outOfNetwork', icon: ExternalLink },
];

interface OfferPDFTemplateProps {
  offerName: string;
  companyName: string;
  date: string;
  plans: SMEPlan[];
  snapshots: Record<string, { premium: number; breakdown: CalculationBreakdown }>;
  cashbackAmount?: number;
  memberCounts?: { employee: number; spouse: number; child: number };
  offerCode?: string;
  language?: 'en' | 'ar';
}

const COMPANY_LOGOS: Record<string, string> = {
  ...companyLogosB64,
  "Arop": companyLogosB64["Arope"] || "https://i.ibb.co/gLDS2PGh/Arope.jpg",
  "Libano Suisse": companyLogosB64["Labanoswiss"] || "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Linbano Suisse": companyLogosB64["Labanoswiss"] || "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Misr Insurance Takaful life": companyLogosB64["Misr Insurance Takaful"] || "https://i.ibb.co/6RPtXd9x/Misr-Insurance-life-Takaful.jpg"
};

// Premium Luxury Corporate Brand Tokens (White + Orange theme)
const TOKENS = {
  iwibOrange: '#FF991F',
  textDark: '#0F172A',         // Slate-900 (Deep Charcoal)
  textMuted: '#64748B',        // Slate-500
  bgLight: '#FAF9F6',          // Soft luxury cream/beige
  bgCard: '#F8FAFC',           // Soft slate card bg
  border: '#E2E8F0',           // Slate-200
  divider: 'rgba(255, 153, 31, 0.3)', // Faded orange divider
  textOnDark: '#FFFFFF',
  surfaceDark: '#0B0F52',      // Deep Navy (very minimal use - final slide card)
};

const ENGLISH_DISCLAIMER = "Disclaimer: This offer is based on the prices and terms published by the insurance companies on the date of issuance and is for guidance purposes only and does not constitute a contractual obligation. Final terms and prices are subject to approval and issuance by the insurance company after review of the required documents and coverage.";
const ARABIC_DISCLAIMER = "إخلاء مسؤولية: تم إعداد هذا العرض بناءً على الأسعار والشروط المعلنة من شركات التأمين بتاريخ الإصدار، وهو لأغراض استرشادية فقط ولا يشكل التزاماً تعاقدياً. تخضع الشروط والأسعار النهائية لموافقة وإصدار شركة التأمين بعد مراجعة المستندات والتغطيات المطلوبة.";

export const OfferPDFTemplate = forwardRef<HTMLDivElement, OfferPDFTemplateProps>(
  ({ offerName, companyName, date, plans, snapshots, cashbackAmount, memberCounts, offerCode, language = 'en' }, ref) => {
    const isAr = language === 'ar';
    const dict = translations[language] || translations.en;
    const _t = (key: keyof TranslationSchema) => dict[key] || translations.en[key] || String(key);

    // Dynamic Expiry Date Calculation (Issue Date + 30 Days)
    const expiryDate = useMemo(() => {
      try {
        const parts = date.split('/');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          d.setDate(d.getDate() + 30);
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
      } catch (e) {}
      return '';
    }, [date]);

    const renderCellContent = (val: any) => {
      if (!val) {
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <span className="text-red-600 font-extrabold">×</span> {isAr ? 'غير مغطى' : 'Not Covered'}
          </span>
        );
      }

      let str = String(val);
      if (isAr) {
        str = str.replace(/Not Covered/gi, 'غير مغطى')
                 .replace(/Covered/gi, 'مغطى')
                 .replace(/Unlimited/gi, 'بدون حد أقصى')
                 .replace(/Full Coverage/gi, 'تغطية كاملة 100%')
                 .replace(/Full/gi, 'تغطية كاملة')
                 .replace(/Yes/gi, 'نعم')
                 .replace(/No/gi, 'لا')
                 .replace(/EGP/gi, 'ج.م')
                 .replace(/Per/gi, 'لكل')
                 .replace(/Family/gi, 'عائلة')
                 .replace(/Member/gi, 'فرد')
                 .replace(/Up to/gi, 'حتى');
      }

      if (str.includes('غير مغطى') || str.toLowerCase().includes('not covered')) {
        return (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <span className="text-red-600 font-extrabold">×</span> {isAr ? 'غير مغطى' : 'Not Covered'}
          </span>
        );
      }

      const copayMatch = str.match(/(.*?)\((copayment\s*(\d+%?)|.*?)\)/i);
      if (copayMatch) {
        const topPart = copayMatch[1].trim();
        const copayPart = copayMatch[2].trim();
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="font-bold text-slate-800 text-[11px]">{topPart}</div>
            <div dir="ltr" className="text-[9px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
              ({copayPart})
            </div>
          </div>
        );
      }

      const percentMatch = str.match(/^(\d+)\s*%/);
      if (percentMatch) {
        const pct = parseInt(percentMatch[1]);
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0 border border-slate-200">
                <div className="h-full bg-[#FF991F] rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span dir="ltr" className="font-sans font-bold text-[11px] text-slate-700">{pct}%</span>
            </div>
          </div>
        );
      }

      if (str.length > 35) {
        return (
          <div className="max-h-12 overflow-hidden text-[9.5px] leading-tight text-slate-600 text-ellipsis font-medium px-1">
            {str}
          </div>
        );
      }

      return <span className="text-[11px] font-semibold text-slate-700 leading-snug">{str}</span>;
    };

    // Split plans into chunks of 3 for comparative portrait layouts
    const planChunks: SMEPlan[][] = [];
    for (let i = 0; i < plans.length; i += 3) {
      planChunks.push(plans.slice(i, i + 3));
    }

    // Dynamic Pages Count: Cover (1) + Hero/ValProp (1) + Pillars (1) + Plan Chunks + Summary (1) + Timeline (1) + Contact (1)
    const totalPages = 6 + (planChunks.length > 0 ? planChunks.length : 1);

    const Slide = ({ children, className, title, pageNumber }: any) => {
      return (
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          style={{
            fontFamily: isAr ? "'Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Noto Naskh Arabic', sans-serif" : undefined,
            backgroundColor: '#FFFFFF',
          }}
          data-orientation="portrait"
          className={`w-[794px] h-[1123px] text-slate-800 relative overflow-hidden flex flex-col shrink-0 border-b border-slate-200 ${className || ''}`}
        >
          {/* Subtle Abstract Orange Shape (Top Right Accent) */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-[#FF991F]/5 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none z-0" />

          {/* Top Header Bar */}
          {!className?.includes('is-cover') && (
            <div className="flex items-center justify-between px-10 py-4 border-b border-slate-100 bg-white/95 shrink-0 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <img crossOrigin="anonymous" src="/iwib-logo-attached.png" alt="IWIB Logo" className="h-8 object-contain" />
                <div className="h-5 w-px bg-slate-200" />
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title || _t('insuranceProposal')}</div>
              </div>
              <div className="text-[9.5px] font-bold text-slate-700 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
                <span dir="ltr" className="inline-block font-sans font-extrabold">{companyName}</span>
                <span>•</span>
                <span dir="ltr" className="inline-block font-sans">{date}</span>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden z-10 p-10">{children}</div>

          {/* Footer Disclaimer */}
          <div className="px-10 py-4 bg-slate-50 border-t border-slate-100 text-slate-500 flex justify-between items-center shrink-0 z-10">
            <div className="flex-1 text-slate-400 pr-6 rtl:pr-0 rtl:pl-6 text-[8px] leading-normal font-medium max-w-2xl">
              <span className="font-bold text-[#FF991F]">{isAr ? 'إخلاء مسؤولية: ' : 'Disclaimer: '}</span>
              <span>{isAr ? ARABIC_DISCLAIMER : ENGLISH_DISCLAIMER}</span>
            </div>
            {pageNumber && (
              <div dir="ltr" className="text-white font-bold whitespace-nowrap bg-[#FF991F] px-3.5 py-1.5 rounded-full text-[10px] font-mono shadow-sm tracking-wider">
                {pageNumber} / {totalPages}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div ref={ref} className="flex flex-col bg-white shadow-2xl animate-fade-in" style={{ width: '794px' }}>
        
        {/* PAGE 1: COVER PAGE */}
        <Slide className="is-cover p-0" pageNumber={1}>
          {/* Subtle Abstract Top Design Accent */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-[#FF991F]/5 to-transparent rounded-full -mr-[150px] -mt-[150px] z-0" />
          
          <div className="relative z-10 flex flex-col h-full p-16 justify-between">
            {/* Top Logo Panel (using new attached logo) */}
            <div className="flex flex-col items-center mt-12">
              <img crossOrigin="anonymous" src="/iwib-logo-attached.png" alt="IWIB Logo" className="h-20 object-contain" />
            </div>

            {/* Middle Title and Client Box */}
            <div className="space-y-8 my-auto">
              <div className="w-20 h-1 bg-[#FF991F] mx-auto rounded-full" />
              
              <div className="text-center space-y-4">
                <span className="text-xs font-black text-slate-400 tracking-widest uppercase">
                  {isAr ? 'تم إعداد هذا المقترح لـ' : 'PROPOSAL PREPARED FOR'}
                </span>
                <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                  {companyName || 'Vinnys Pizza'}
                </h2>
              </div>
              
              <div className="text-center">
                <h1 className="text-2xl font-bold leading-snug text-slate-700">
                  {isAr ? 'مقارنة عروض التأمين الطبي' : 'Medical Insurance Proposals Comparison'}
                </h1>
                <p className="text-xs text-[#FF991F] font-bold mt-2 uppercase tracking-wider">
                  {isAr 
                    ? 'شريكك الاستراتيجي في قرارات المخاطر' 
                    : 'Your Strategic Partner in Smarter Risk Decisions'}
                </p>
              </div>
            </div>

            {/* Bottom Metadata Block */}
            <div className="grid grid-cols-4 gap-3 bg-[#FAF9F6] p-5 rounded-2xl border-b-2 border-[#FF991F] shadow-sm">
              <div className="text-center">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[8.5px] mb-1">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                <p dir="ltr" className="text-slate-700 font-extrabold text-xs font-sans">{date}</p>
              </div>
              <div className="text-center border-l border-slate-200 rtl:border-r rtl:border-l-0">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[8.5px] mb-1">{isAr ? 'تاريخ الانتهاء' : 'Expired Date'}</p>
                <p dir="ltr" className="text-slate-700 font-extrabold text-xs font-sans">{expiryDate || 'N/A'}</p>
              </div>
              <div className="text-center border-l border-slate-200 rtl:border-r rtl:border-l-0">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[8.5px] mb-1">{isAr ? 'رمز العرض' : 'Offer Code'}</p>
                <p dir="ltr" className="text-[#FF991F] font-black text-xs font-mono tracking-wider">{offerCode || 'SME-2026-IWIB'}</p>
              </div>
              <div className="text-center border-l border-slate-200 rtl:border-r rtl:border-l-0">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[8.5px] mb-1">{isAr ? 'إجمالي الأعضاء' : 'Total Members'}</p>
                <p dir="ltr" className="text-slate-700 font-sans font-extrabold text-xs truncate">
                  {memberCounts 
                    ? `${memberCounts.employee} Emp, ${memberCounts.spouse} Sp, ${memberCounts.child} Ch` 
                    : '0 Emp, 0 Sp, 0 Ch'}
                </p>
              </div>
            </div>
          </div>
        </Slide>

        {/* PAGE 2: VALUE PROPOSITION WITH HERO VISUAL */}
        <Slide title={isAr ? 'شريكك الاستراتيجي' : 'Strategic Value Partner'} pageNumber={2}>
          <div className="flex-1 flex flex-col justify-between">
            {/* Top Badge Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#FF991F]/30 text-center">
                <span className="text-[10px] font-black text-[#FF991F] tracking-widest uppercase">
                  {isAr ? 'شهادة الخبرة' : 'CERTIFICATE OF EXPERTISE'}
                </span>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#FF991F]/30 text-center">
                <span className="text-[10px] font-black text-[#FF991F] tracking-widest uppercase">
                  {isAr ? 'وسيط مرخص من الهيئة العامة للرقابة المالية' : 'FRA AUTHORIZED BROKER'}
                </span>
              </div>
            </div>

            {/* Hero Image representation */}
            <div className="relative rounded-2xl overflow-hidden shadow-md border border-slate-100 my-4 h-[200px]">
              <img 
                crossOrigin="anonymous" 
                src="/egyptian-office-hero.png" 
                className="w-full h-full object-cover" 
                alt="Corporate Collaboration" 
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <div className="absolute bottom-4 left-6 text-white">
                <h3 className="text-lg font-bold">{isAr ? 'مستقبل أكثر أماناً لشركتك' : 'Smarter Corporate Health Decisions'}</h3>
              </div>
            </div>

            {/* Value Statement */}
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-slate-800">
                {isAr ? 'شريكك الاستراتيجي للتأمين' : 'Your Strategic Insurance Partner'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {isAr
                  ? 'نحن لا نقدم مجرد بوالص تأمين طبي؛ بل نصمم شراكة استراتيجية مخصصة تهدف إلى:'
                  : "We don't just offer insurance policies; we deliver a strategic partnership designed to:"}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-[#FF991F] font-bold mt-0.5">•</span>
                  <p className="text-slate-700">
                    <b>{isAr ? 'حماية أصولك' : 'Protect your assets'}</b> — {isAr ? 'الحد من المخاطر المالية والتكاليف غير المتوقعة.' : 'Shielding your business and financial standing.'}
                  </p>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-[#FF991F] font-bold mt-0.5">•</span>
                  <p className="text-slate-700">
                    <b>{isAr ? 'تمكين موظفيك' : 'Empower your people'}</b> — {isAr ? 'الاهتمام بصحتهم، سعادتهم وسلامتهم النفسية.' : 'Promoting health, security, and employee peace of mind.'}
                  </p>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-[#FF991F] font-bold mt-0.5">•</span>
                  <p className="text-slate-700">
                    <b>{isAr ? 'تحسين الأداء المالي' : 'Optimize your financial performance'}</b> — {isAr ? 'أعلى عائد استثماري على الميزانية المخصصة للتأمين.' : 'Ensuring maximum value and premium efficiency.'}
                  </p>
                </div>
              </div>
            </div>

            {/* We Don't Think Like Brokers Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">{isAr ? 'نحن لا نفكر كوسطاء تقليديين' : "We Don't Think Like Brokers"}</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                  <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider mb-1">{isAr ? 'الوسطاء التقليديون' : 'Traditional Brokers'}</p>
                  <p className="text-slate-600 leading-tight">{isAr ? 'يركزون فقط على بوالص منفصلة دون ربطها باحتياجات الشركة.' : 'Focus on isolated policies, leading to fragmentation.'}</p>
                </div>
                <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#FF991F]/20">
                  <p className="text-[#FF991F] font-bold text-[9px] uppercase tracking-wider mb-1">{isAr ? 'شراكتنا في IWIB' : 'Our Approach at IWIB'}</p>
                  <p className="text-slate-700 leading-tight font-medium">{isAr ? 'ندرس محفظة المخاطر بالكامل للتأكد من تكامل كافة التغطيات.' : 'We focus on how your entire risk portfolio works together.'}</p>
                </div>
              </div>
            </div>

            {/* Executive Highlight Box */}
            <div className="bg-[#FAF9F6] border-2 border-[#FF991F] p-4 rounded-xl text-center shadow-sm">
              <p className="text-slate-800 font-bold text-xs">
                {isAr 
                  ? 'لا نتخصص في نوع واحد من التأمين — بل نتخصص في كيفية تكامل جميع الأنواع معاً.'
                  : 'We don’t specialize in one type of insurance — We specialize in how all types work together.'}
              </p>
            </div>
          </div>
        </Slide>

        {/* PAGE 3: ADDED VALUE PILLARS (INFOGRAPHIC GRID DESIGN) */}
        <Slide title={isAr ? 'مزايا القيمة المضافة' : 'Strategic Value Proposition'} pageNumber={3}>
          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-xl font-black text-slate-800">{isAr ? 'إطار القيمة المضافة' : 'How We Deliver Tangible Value'}</h3>
              <p className="text-xs text-slate-500">{isAr ? 'ركائزنا الاستراتيجية لتحقيق أقصى استفادة من ميزانيتكم التأمينية' : 'Our core operational structures engineered to support your corporate healthcare journey'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 flex-1 items-stretch my-2">
              {/* Card 1 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-lg font-black text-[#FF991F]">01</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isAr ? 'إدارة المخاطر الاستراتيجية' : 'Strategic Risk Management'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isAr ? 'تغطية شاملة لكل أصول وكيان الشركة لزيادة العائد على الاستثمار.' : 'Comprehensive coverage across family and corporate domains to maximize ROI.'}
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-lg font-black text-[#FF991F]">02</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isAr ? 'التميز التشغيلي المخصص' : 'Operational Excellence'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isAr ? 'مدير حساب مخصص للشركة يتولى كافة عمليات التجديد وحل المشكلات.' : 'A dedicated Account Manager to handle renewals, carrier liaison, and compliance.'}
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-lg font-black text-[#FF991F]">03</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isAr ? 'التحول الرقمي المتقدم' : 'Digital Transformation'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isAr ? 'نظام رقمي تفاعلي لإدارة وتتبع التجديدات وسجلات الموظفين بالكامل.' : 'Real-time digital dashboard for automated renewals and HR workflows.'}
                  </p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-lg font-black text-[#FF991F]">04</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isAr ? 'اتخاذ القرارات بالبيانات' : 'Data-Driven Decisions'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isAr ? 'تحليل معدلات الاستهلاك والذكاء الاصطناعي لتوفير بدائل استباقية ممتازة.' : 'Data-driven renewals and AI analytics to optimize premiums and mitigate risks.'}
                  </p>
                </div>
              </div>

              {/* Card 5 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-lg font-black text-[#FF991F]">05</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isAr ? 'المساندة الطبية المتخصصة' : 'Specialized Advocacy'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isAr ? 'مراجعة الحالات الطبية المرفوضة عبر أطباء متخصصين لضمان أحقية الموظف.' : 'In-house medical reviews and analytical claims advocacy for rejected cases.'}
                  </p>
                </div>
              </div>

              {/* Card 6 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-lg font-black text-[#FF991F]">06</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isAr ? 'رفاهية متكاملة للمستفيدين' : 'Beneficiary Well-being'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isAr 
                      ? `فحوصات دورية وقسائم discount وكاش باك بقيمة ${cashbackAmount?.toLocaleString()} ج.م.` 
                      : `Wellness sessions, discounts, and ${cashbackAmount?.toLocaleString()} EGP cashback incentives.`}
                  </p>
                </div>
              </div>

              {/* Card 7 */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="text-lg font-black text-[#FF991F]">07</span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isAr ? 'دعم متكامل متعدد القنوات' : 'Omnichannel Support'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {isAr ? 'تواصل فوري عبر الواتساب والدردشة المباشرة لحل مشاكل الموافقة الطبية.' : '24/7 WhatsApp and live chat support lines alongside ongoing training materials.'}
                  </p>
                </div>
              </div>

              {/* Card 8: Commitment summary */}
              <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#FF991F]/30 flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1">{isAr ? 'التزامنا' : 'OUR COMMITMENT'}</span>
                <p className="text-[10.5px] font-semibold text-slate-700 leading-snug">
                  {isAr 
                    ? 'تقديم خدمة استشارية مبنية على الثقة والشفافية وتطبيقات التكنولوجيا لضمان أفضل سعر وخدمة.' 
                    : 'Delivering a strategic, premium partnership built on trust, transparency, and data-driven insights.'}
                </p>
              </div>
            </div>
          </div>
        </Slide>

        {/* --- NOTE: ORIGINAL PAGE 4 (PRICING GRAPH SLIDE) REMOVED --- */}

        {/* PAGE 4+: COMPARISON SLIDES */}
        {planChunks.map((chunk, idx) => {
          const premiumsInChunk = chunk.map(p => snapshots[p.id]?.premium || Infinity);
          const minPremiumInChunk = Math.min(...premiumsInChunk);

          return (
            <Slide key={idx} title={`${_t('competitiveAnalysisPart')} ${idx + 1}`} pageNumber={4 + idx}>
              <div className="flex-1 flex flex-col justify-between">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-slate-800">{_t('sideBySideComparison')}</h2>
                  <p className="text-xs text-slate-500 font-medium">{_t('comparisonSub')}</p>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200/60 shadow-md overflow-hidden flex flex-col justify-between">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#FAF9F6] border-b border-slate-200">
                        <th className="p-3 text-left rtl:text-right w-1/3">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{_t('benefitStructure')}</div>
                          <div className="text-xs font-bold text-slate-800">{_t('coreCoverageAreas')}</div>
                        </th>
                        {chunk.map((p, i) => {
                          const isRecommended = i === 0 || snapshots[p.id]?.premium === minPremiumInChunk;
                          return (
                            <th key={i} className="p-3 text-center border-l border-slate-200 min-w-[120px]">
                              <div className="flex flex-col items-center gap-1">
                                {COMPANY_LOGOS[p.company] ? (
                                  <div className="p-1 bg-white rounded border border-slate-100 shadow-sm">
                                    <img crossOrigin="anonymous" src={COMPANY_LOGOS[p.company]} className="h-4 object-contain" alt={p.company} />
                                  </div>
                                ) : (
                                  <div className="h-4 flex items-center justify-center font-black text-[#FF991F] text-xs font-sans" dir="ltr">{p.company}</div>
                                )}
                                <div className={`text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full border ${isRecommended ? 'bg-[#FF991F] text-white border-[#FF991F] shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                  {p.name}
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="text-[10px]">
                      {benefitsList.map((b, i) => (
                        <tr key={i} className="border-b border-slate-100 odd:bg-white even:bg-[#FAF9F6]/40">
                          <td className="px-3.5 py-2 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <b.icon className="w-3.5 h-3.5 text-[#FF991F] shrink-0" />
                              <span>{_t(b.label)}</span>
                            </div>
                          </td>
                          {chunk.map((p, j) => (
                            <td key={j} className="px-3.5 py-2 text-center border-l border-slate-100 font-medium">
                              {renderCellContent((p as any)[b.key])}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Premium Total Row */}
                      <tr className="bg-[#FF991F] text-white border-t border-[#FF991F]">
                        <td className="p-3.5 font-black uppercase tracking-wider text-white text-xs">{_t('annualNetPremium')}</td>
                        {chunk.map((p, j) => {
                          const prem = snapshots[p.id]?.premium;
                          const isLowest = prem && prem === minPremiumInChunk;
                          return (
                            <td key={j} className="p-3.5 text-center border-l border-white/20 bg-[#FF991F] relative">
                              {isLowest && (
                                <div className="bg-white text-[#FF991F] text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full mb-0.5 inline-flex items-center gap-1 shadow-sm">
                                  <Star className="w-2 h-2 fill-[#FF991F]" /> {isAr ? 'الأقل تكلفة' : 'Best Value'}
                                </div>
                              )}
                              <div className="text-lg font-black text-white tracking-tight flex items-center justify-center gap-0.5">
                                <span dir="ltr" className="inline-block font-sans font-extrabold">{prem ? prem.toLocaleString() : '---'}</span>
                                <span dir="ltr" className="text-[10px] font-bold text-white/90">EGP</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Slide>
          );
        })}

        {/* PAGE 5: PROPOSAL PREMIUM SUMMARY TABLE */}
        <Slide title={isAr ? 'ملخص الأقساط' : 'Premium Summary'} pageNumber={totalPages - 2}>
          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-2xl font-black text-slate-800">{isAr ? 'ملخص أقساط العروض' : 'Proposal Premium Summary'}</h2>
              <p className="text-xs text-slate-500 font-medium">{isAr ? 'نظرة عامة على المجموع المالي وقنوات التشغيل لكل بديل مقترح' : 'A quick overview of key plan configurations and their annual premiums.'}</p>
            </div>

            <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl p-6 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#FF991F]/30 text-[11px] font-bold text-slate-700">
                    <th className="p-3 text-left rtl:text-right">{isAr ? 'اسم العرض' : 'Plan Name'}</th>
                    <th className="p-3 text-left rtl:text-right">{isAr ? 'شركة إدارة الخدمة (TPA)' : 'TPA Provider'}</th>
                    <th className="p-3 text-left rtl:text-right">{isAr ? 'الشبكة الطبية' : 'Medical Network'}</th>
                    <th className="p-3 text-center">{isAr ? 'القسط السنوي الإجمالي' : 'Annual Premium'}</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-600">
                  {plans.map((p, i) => {
                    const prem = snapshots[p.id]?.premium || 0;
                    return (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                        <td className="p-3">{p.tpa || 'N/A'}</td>
                        <td className="p-3">{p.network || 'N/A'}</td>
                        <td className="p-3 text-center font-bold text-[#FF991F] font-mono">{prem ? `${Math.round(prem).toLocaleString()} EGP` : 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Slide>

        {/* PAGE 6: CONTRACT ISSUANCE TIMELINE */}
        <Slide title={isAr ? 'خطوات إصدار العقد' : 'Contract Issuance Timeline'} pageNumber={totalPages - 1}>
          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-2xl font-black text-slate-800">{isAr ? 'جدول إصدار العقود' : 'Contract Issuance Timeline'}</h2>
              <p className="text-xs text-slate-500 font-medium">{isAr ? 'من قبول المقترح إلى إصدار العقد والبطاقات الطبية خلال ١٠ أيام عمل' : 'From proposal acceptance to formal contract issuance within 10 working days.'}</p>
            </div>

            {/* Vertical timeline matching python layout */}
            <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between">
              
              <div className="flex items-start gap-4 border-b border-slate-100 pb-3 relative">
                {/* Timeline connector circle and line */}
                <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#FF991F] flex items-center justify-center text-sm font-black text-[#FF991F] shrink-0 z-10">
                  01
                </div>
                <div className="absolute top-10 left-5 w-0.5 h-16 bg-[#FF991F]" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">{isAr ? 'قبول العرض والمقترح' : 'Proposal Approval'}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">{isAr ? 'يقوم العميل بمراجعة واختيار العرض المناسب والتوقيع عليه إلكترونياً أو ورقياً.' : 'Client reviews and signs off on the selected insurance proposal plan.'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-slate-100 py-3 relative">
                <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#FF991F] flex items-center justify-center text-sm font-black text-[#FF991F] shrink-0 z-10">
                  02
                </div>
                <div className="absolute top-10 left-5 w-0.5 h-16 bg-[#FF991F]" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">{isAr ? 'جمع الأوراق والبيانات' : 'Data Collection'}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">{isAr ? 'جمع قائمة الموظفين (السينسوس)، بيانات الشركة ووثائق KYC المطلوبة.' : 'Submission of required corporate documentation, employee census list, and KYC files.'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-slate-100 py-3 relative">
                <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#FF991F] flex items-center justify-center text-sm font-black text-[#FF991F] shrink-0 z-10">
                  03
                </div>
                <div className="absolute top-10 left-5 w-0.5 h-16 bg-[#FF991F]" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">{isAr ? 'إعداد ملفات البوليصة' : 'Policy Setup'}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">{isAr ? 'تنسيق IWIB مع شركة التأمين المختارة لإدخال شروط البوليصة والبيانات بالنظام.' : 'IWIB coordinates with the selected underwriter to configure policy terms and systems.'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-slate-100 py-3 relative">
                <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#FF991F] flex items-center justify-center text-sm font-black text-[#FF991F] shrink-0 z-10">
                  04
                </div>
                <div className="absolute top-10 left-5 w-0.5 h-16 bg-[#FF991F]" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">{isAr ? 'إصدار العقد الرسمي' : 'Underwriter Issuance'}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">{isAr ? 'تقوم شركة التأمين بمراجعة الأوراق النهائية وإصدار العقد الرسمي وجدول الأقساط.' : 'The underwriter processes the documents and issues the formal contract policy.'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 py-2">
                <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#FF991F] flex items-center justify-center text-sm font-black text-[#FF991F] shrink-0 z-10">
                  05
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">{isAr ? 'التسليم وتدريب الموظفين' : 'Delivery & Onboarding'}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">{isAr ? 'تسليم العقد والبطاقات الطبية، وبدء جلسة تدريبية للموظفين لمعرفة كيفية استخدام التأمين.' : 'Contract documents are delivered, and employee onboarding sessions begin.'}</p>
                </div>
              </div>

            </div>
          </div>
        </Slide>

        {/* PAGE 7: CONTACT & PARTNERSHIP (FINAL PAGE - ENHANCED WITH LOGO) */}
        <Slide title={isAr ? 'شراكتنا الاستراتيجية' : 'Strategic Partnership'} pageNumber={totalPages}>
          <div className="flex-1 flex flex-col justify-between">
            {/* Logo centered at the top of Slide 7 */}
            <div className="flex flex-col items-center mt-2">
              <img crossOrigin="anonymous" src="/iwib-logo-attached.png" alt="IWIB Logo" className="h-16 object-contain" />
            </div>

            {/* Intro */}
            <div className="text-center my-4 space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-800">
                {isAr ? 'شريكك في قرارات المخاطر الأكثر ذكاءً.' : "Your partner in smarter risk decisions."}
              </h2>
              <p className="text-xs text-[#FF991F] font-bold uppercase tracking-widest">
                {isAr ? 'IWIB لوساطة التأمين' : 'IWIB Insurance Brokerage'}
              </p>
            </div>

            {/* Support boxes */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between">
                <div className="text-[#FF991F] font-bold text-[9px] uppercase tracking-wider mb-2">{isAr ? 'خط الدعم السريع' : 'Support Hotline'}</div>
                <p dir="ltr" className="text-sm font-extrabold text-slate-800">+20 101-333-0409</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between">
                <div className="text-[#FF991F] font-bold text-[9px] uppercase tracking-wider mb-2">{isAr ? 'الاستفسارات والبريد' : 'Email Enquiries'}</div>
                <p dir="ltr" className="text-sm font-extrabold text-slate-800">info@iwib-eg.com</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between">
                <div className="text-[#FF991F] font-bold text-[9px] uppercase tracking-wider mb-2">{isAr ? 'الموقع الرسمي' : 'Official Website'}</div>
                <p dir="ltr" className="text-sm font-extrabold text-slate-800">www.iwib-eg.com</p>
              </div>
            </div>

            {/* Bottom contact card in Navy color */}
            <div className="bg-[#0B0F52] rounded-2xl p-6 text-white relative overflow-hidden shadow-md flex justify-between items-center">
              <div className="space-y-2 max-w-md text-left rtl:text-right">
                <div className="inline-flex items-center gap-1.5 bg-[#FF991F]/20 text-[#FF991F] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <MapPin className="w-3 h-3" /> {isAr ? 'المركز الرئيسي' : 'Head Office'}
                </div>
                <h3 className="text-lg font-bold text-white">{isAr ? 'تفضل بزيارتنا في المهندسين' : 'Visit us at Mohandessin'}</h3>
                <p className="text-slate-300 text-[10.5px] leading-relaxed">
                  {isAr 
                    ? '٥ شارع النخيل، المهندسين، الجيزة، مصر. وسيط تأمين مرخص ومسجل من الهيئة العامة للرقابة المالية (FRA).'
                    : '5 El Nakheel St, Mohandessin, Giza, Egypt. Authorized Insurance Brokerage from FRA.'}
                </p>
              </div>
              
              <div className="flex items-center gap-3 bg-[#0F1450]/80 p-3 rounded-xl border border-white/10 shrink-0 max-w-xs text-left rtl:text-right">
                <div className="w-8 h-8 rounded-full bg-[#FF991F] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-white leading-tight">
                    {isAr ? 'مرخص من الهيئة العامة للرقابة المالية' : 'Authorized Insurance Broker'}
                  </div>
                  <div className="text-[7.5px] text-[#E4E6F5]/70 mt-0.5">
                    {isAr ? 'ترخيص رقم ٤٩٢ - خاضع لإشراف الهيئة' : 'FRA License Registration under Egyptian Insurance Law'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Slide>
      </div>
    );
  }
);

OfferPDFTemplate.displayName = 'OfferPDFTemplate';
