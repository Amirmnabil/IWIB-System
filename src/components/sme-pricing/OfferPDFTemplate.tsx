import React, { forwardRef, useMemo } from 'react';
import type { SMEPlan, CalculationBreakdown } from '@/lib/types';
import { 
  HeartPulse, Settings, Globe, Hotel, Stethoscope, Activity, Briefcase, ShieldAlert, 
  ExternalLink, Shield, Award, Smile, Eye, Baby, TrendingUp, ShieldCheck, Phone, 
  Mail, MapPin, Check, Star, Users, Cpu, FileText, ChevronRight, Scale, BookOpen
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

// Official Luxury Corporate Brand Tokens
const TOKENS = {
  iwibRed: '#A52A2A',
  iwibBlue: '#131A80',
  iwibBlueDeep: '#0B0F52',
  iwibRedTint: 'rgba(165, 42, 42, 0.12)',
  surfaceDark: '#0F1450',
  surfaceDarkAlt: '#151B63',
  surfaceLight: '#FFFFFF',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#E4E6F5',
  textOnLight: '#1A1D3A',
  divider: 'rgba(42, 48, 128, 0.4)',
  bgGradient: 'linear-gradient(135deg, #131A80 0%, #0B0F52 100%)',
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
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-red-300 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded-full">
            <span className="text-red-400 font-extrabold">×</span> {isAr ? 'غير مغطى' : 'Not Covered'}
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
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-red-300 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded-full">
            <span className="text-red-400 font-extrabold">×</span> {isAr ? 'غير مغطى' : 'Not Covered'}
          </span>
        );
      }

      const copayMatch = str.match(/(.*?)\((copayment\s*(\d+%?)|.*?)\)/i);
      if (copayMatch) {
        const topPart = copayMatch[1].trim();
        const copayPart = copayMatch[2].trim();
        return (
          <div className="flex flex-col items-center gap-0.5">
            <div className="font-bold text-white text-[11px]">{topPart}</div>
            <div dir="ltr" className="text-[9px] font-medium text-[#E4E6F5]/70 bg-[#0B0F52]/60 px-2 py-0.5 rounded border border-[#2A3080]/40 font-mono">
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
              <div className="w-10 h-1.5 bg-[#0B0F52] rounded-full overflow-hidden shrink-0 border border-[#2A3080]/50">
                <div className="h-full bg-[#A52A2A] rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <span dir="ltr" className="font-sans font-bold text-[11px] text-white">{pct}%</span>
            </div>
          </div>
        );
      }

      if (str.length > 35) {
        return (
          <div className="max-h-12 overflow-hidden text-[9.5px] leading-tight text-[#E4E6F5]/85 text-ellipsis font-medium px-1">
            {str}
          </div>
        );
      }

      return <span className="text-[11px] font-medium text-[#E4E6F5] leading-snug">{str}</span>;
    };

    // Split plans into chunks of 3 for comparative landscape layouts
    const planChunks: SMEPlan[][] = [];
    for (let i = 0; i < plans.length; i += 3) {
      planChunks.push(plans.slice(i, i + 3));
    }

    // Dynamic Pages Count: Cover (1) + About (1) + Pillars 1-4 (1) + Pillars 5-7 (1) + Plan Chunks + Contact (1)
    const totalPages = 5 + (planChunks.length > 0 ? planChunks.length : 1);

    const Slide = ({ children, className, title, orientation = 'landscape', pageNumber }: any) => {
      const isPortrait = orientation === 'portrait';
      const w = isPortrait ? 'w-[794px]' : 'w-[1123px]';
      const h = isPortrait ? 'h-[1123px]' : 'h-[794px]';
      return (
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          style={{
            fontFamily: isAr ? "'Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Noto Naskh Arabic', sans-serif" : undefined,
            background: TOKENS.bgGradient,
          }}
          data-orientation={orientation}
          className={`${w} ${h} text-white relative overflow-hidden flex flex-col shrink-0 border-b border-[#2A3080]/50 ${className || ''}`}
        >
          {/* Brand Watermark */}
          <div className="absolute top-10 left-10 opacity-[0.04] pointer-events-none z-0">
            <img crossOrigin="anonymous" src="/iwib-logo-white.png" alt="IWIB Watermark" className="w-96 object-contain" />
          </div>

          {/* Top Header Bar */}
          {!className?.includes('is-cover') && (
            <div className="flex items-center justify-between px-10 py-3.5 border-b border-[#2A3080]/40 bg-[#0F1450]/90 shrink-0 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <img crossOrigin="anonymous" src="/iwib-logo-white.png" alt="IWIB" className="h-8 object-contain" />
                <div className="h-5 w-px bg-[#2A3080]/60" />
                <div className="text-xs font-black text-[#E4E6F5] uppercase tracking-widest">{title || _t('insuranceProposal')}</div>
              </div>
              <div className="text-[11px] font-bold text-white uppercase bg-[#131A80] px-4 py-1.5 rounded-full border border-[#2A3080]/60 shadow-sm flex items-center gap-2">
                <span dir="ltr" className="inline-block font-sans font-extrabold">{companyName}</span>
                <span>•</span>
                <span dir="ltr" className="inline-block font-sans">{date}</span>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden z-10 p-10">{children}</div>

          {/* Footer Disclaimer */}
          <div className="px-8 py-3 bg-[#0B0F52] border-t border-[#2A3080]/50 text-slate-300 flex justify-between items-center shrink-0 z-10">
            <div className="flex-1 text-[#E4E6F5]/75 pr-6 rtl:pr-0 rtl:pl-6 text-[8px] leading-normal font-medium max-w-5xl">
              <span className="font-bold text-[#A52A2A]">{isAr ? 'إخلاء مسؤولية: ' : 'Disclaimer: '}</span>
              <span>{isAr ? ARABIC_DISCLAIMER : ENGLISH_DISCLAIMER}</span>
            </div>
            {pageNumber && (
              <div dir="ltr" className="text-white font-black whitespace-nowrap bg-[#131A80] px-3.5 py-1.5 rounded-md border border-[#2A3080]/60 text-[11px] font-mono shadow-inner tracking-wider">
                {pageNumber} / {totalPages}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div ref={ref} className="flex flex-col bg-[#0B0F52] shadow-2xl animate-fade-in" style={{ width: '1123px' }}>
        
        {/* PAGE 1: COVER PAGE */}
        <Slide className="is-cover p-0" pageNumber={1}>
          <div className="absolute inset-0 z-0">
            <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover opacity-10 grayscale" alt="Cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#131A80]/95 via-[#131A80]/90 to-[#0B0F52]/98" />
          </div>

          <div className="relative z-10 flex flex-col h-full p-20 justify-center max-w-4xl">
            {/* Top Logo and Client Badge */}
            <div className="flex items-center gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-6 py-3.5 shadow-xl inline-flex items-center gap-6">
                <img crossOrigin="anonymous" src="/iwib-logo-white.png" alt="IWIB Logo" className="h-12 object-contain" />
                <div className="h-8 w-px bg-white/20" />
                <div className="text-2xl font-black text-white font-sans tracking-tight" dir="ltr">{companyName}</div>
              </div>
            </div>

            {/* Titles */}
            <div className="space-y-6 mb-12">
              <h1 className="text-5xl font-black leading-tight text-white tracking-tight">
                {isAr ? 'مقارنة عروض التأمين الطبي' : 'Medical Insurance Proposals Comparison'}
              </h1>
              
              <div className="border-l-4 border-[#A52A2A] rtl:border-r-4 rtl:border-l-0 bg-[#A52A2A]/10 px-6 py-4 rounded-r-xl">
                <p className="text-xl font-bold text-white leading-snug tracking-wide italic">
                  {isAr 
                    ? '"شريكك الاستراتيجي للارتقاء بتجربة التأمين الطبي لشركتك"' 
                    : '"Your Strategic Partner For Elevating Your Corporate Insurance Experience"'}
                </p>
              </div>
            </div>

            {/* Metadata Rows */}
            <div className="grid grid-cols-4 gap-4 border-t border-white/15 pt-8">
              <div className="bg-[#0F1450]/80 backdrop-blur-sm p-4 rounded-xl border border-white/10 shadow-lg">
                <p className="text-[#E4E6F5]/70 font-bold uppercase tracking-widest text-[9px] mb-1">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</p>
                <p dir="ltr" className="text-white font-bold text-sm font-sans">{date}</p>
              </div>
              <div className="bg-[#0F1450]/80 backdrop-blur-sm p-4 rounded-xl border border-white/10 shadow-lg">
                <p className="text-[#E4E6F5]/70 font-bold uppercase tracking-widest text-[9px] mb-1">{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                <p dir="ltr" className="text-white font-bold text-sm font-sans">{expiryDate || 'N/A'}</p>
              </div>
              <div className="bg-[#0F1450]/80 backdrop-blur-sm p-4 rounded-xl border border-white/10 shadow-lg">
                <p className="text-[#E4E6F5]/70 font-bold uppercase tracking-widest text-[9px] mb-1">{isAr ? 'رمز العرض' : 'Offer Code'}</p>
                <p dir="ltr" className="text-[#A52A2A] font-black text-sm font-mono tracking-wider">{offerCode || 'SME-2026-IWIB'}</p>
              </div>
              <div className="bg-[#0F1450]/80 backdrop-blur-sm p-4 rounded-xl border border-white/10 shadow-lg">
                <p className="text-[#E4E6F5]/70 font-bold uppercase tracking-widest text-[9px] mb-1">{isAr ? 'إجمالي الأعضاء' : 'Total Members'}</p>
                <p dir="ltr" className="text-white font-sans font-extrabold text-sm truncate">
                  {memberCounts 
                    ? `${memberCounts.employee} Emp, ${memberCounts.spouse} Sp, ${memberCounts.child} Ch` 
                    : '0 Emp, 0 Sp, 0 Ch'}
                </p>
              </div>
            </div>
          </div>
        </Slide>

        {/* PAGE 2: ABOUT IWIB */}
        <Slide title={isAr ? 'نبذة عن IWIB' : 'About IWIB'} pageNumber={2}>
          <div className="flex-1 flex gap-10 items-center justify-center">
            {/* Left Content Card */}
            <div className="w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#A52A2A]/20 text-[#A52A2A] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> {isAr ? 'من نحن' : 'Who We Are'}
              </div>
              <h2 className="text-4xl font-black text-white leading-tight">
                {isAr ? 'شريكك الاستراتيجي الموثوق' : 'Your Trusted Strategic Partner'}
              </h2>
              <p className="text-base text-[#E4E6F5]/90 leading-relaxed font-medium">
                {isAr 
                  ? 'في IWIB، لا نقدم مجرد تأمين؛ بل نقدم شراكة استراتيجية مصممة لحماية أصولك، وتمكين موظفيك، وتحسين أدائك المالي. إليك كيف نضيف قيمة ملموسة لشركائنا:'
                  : 'At IWIB, we don\'t just provide insurance; we deliver a strategic partnership designed to protect your assets, empower your people, and optimize your financial performance. Here is how we add tangible value to our partners:'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-[#0F1450]/80 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-[#A52A2A]/20 text-[#A52A2A] rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{isAr ? 'خبرة معتمدة' : 'Certified Expertise'}</h4>
                    <p className="text-[10px] text-[#E4E6F5]/70">{isAr ? 'مرخصين من FRA' : 'FRA Authorized Broker'}</p>
                  </div>
                </div>
                <div className="bg-[#0F1450]/80 p-4 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="p-2 bg-[#A52A2A]/20 text-[#A52A2A] rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{isAr ? 'دعم كامل' : 'Dedicated Support'}</h4>
                    <p className="text-[10px] text-[#E4E6F5]/70">{isAr ? 'فريق خدمة عملاء مخصص' : 'Dedicated Account Mgr'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Photo Frame */}
            <div className="w-1/2 relative flex items-center justify-center">
              <div className="absolute -inset-4 bg-[#A52A2A]/20 rounded-3xl rotate-1 blur-sm" />
              <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=500" className="w-full aspect-[4/3] object-cover rounded-2xl shadow-2xl border border-white/10" alt="About IWIB Team" />
              
              <div className="absolute bottom-4 right-4 bg-[#0F1450]/90 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-3 shadow-lg">
                <div className="w-10 h-10 rounded-full bg-[#A52A2A] text-white flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">{isAr ? 'تحسين الأداء المالي' : 'ROI Driven Solutions'}</p>
                  <p className="text-[9px] text-[#E4E6F5]/70">{isAr ? 'أقساط تأمينية محسنة' : 'Premium Optimization'}</p>
                </div>
              </div>
            </div>
          </div>
        </Slide>

        {/* PAGE 3: ADDED VALUE PILLARS (1-4) */}
        <Slide title={isAr ? 'ركائز القيمة المضافة (1 - 4)' : 'Strategic Value Pillars (1 - 4)'} pageNumber={3}>
          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-2xl font-black text-white">{isAr ? 'كيف نصنع الفارق لشركتنا؟' : 'How We Deliver Tangible Value'}</h3>
              <p className="text-xs text-[#E4E6F5]/80">{isAr ? 'ركائزنا الاستراتيجية لتحقيق أقصى استفادة من ميزانيتكم التأمينية' : 'Our core operational structures engineered to support your corporate healthcare journey'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 items-stretch">
              {/* Card 1 */}
              <div className="bg-[#0F1450]/80 p-5 rounded-2xl border border-white/10 flex gap-4 shadow-md transition-all hover:bg-[#0F1450]">
                <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">1. {isAr ? 'إدارة المخاطر والأصول الاستراتيجية' : 'Strategic Risk & Asset Management'}</h4>
                  <p className="text-xs text-[#E4E6F5]/85 leading-relaxed">
                    {isAr 
                      ? 'نحن نقدم درعاً شاملاً لكل من الأفراد والشركات. من خلال تغطية جميع مجالات التأمين - من حماية الأسرة إلى أصول الشركة - نمكن شركاءنا من إدارة المخاطر بفعالية وتحقيق أعلى عائد ممكن على أقساط التأمين.'
                      : 'We provide a comprehensive shield for both individuals and corporations. By covering all insurance domains-from family protection to corporate assets-we enable our partners to manage risks effectively and achieve the highest possible ROI.'}
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#0F1450]/80 p-5 rounded-2xl border border-white/10 flex gap-4 shadow-md transition-all hover:bg-[#0F1450]">
                <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">2. {isAr ? 'التميز التشغيلي المخصص' : 'Dedicated Operational Excellence'}</h4>
                  <p className="text-xs text-[#E4E6F5]/85 leading-relaxed">
                    {isAr 
                      ? 'شركاؤنا لا يواجهون تعقيدات التأمين بمفردهم أبداً. يتم تعيين مدير حساب مخصص لكل عميل ليكون حلقة الوصل المهنية مع شركات التأمين، مما يضمن خدمة سلسة والتزاماً صارماً بالمعايير التنظيمية.'
                      : 'Our partners never navigate the complexities of insurance alone. Every client is assigned a dedicated Account Manager who acts as a professional liaison with insurance companies, ensuring seamless service and regulatory adherence.'}
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#0F1450]/80 p-5 rounded-2xl border border-white/10 flex gap-4 shadow-md transition-all hover:bg-[#0F1450]">
                <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 flex items-center justify-center shrink-0">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">3. {isAr ? 'التحول الرقمي المتقدم' : 'Advanced Digital Transformation'}</h4>
                  <p className="text-xs text-[#E4E6F5]/85 leading-relaxed">
                    {isAr 
                      ? 'نوفر لمديري الموارد البشرية نظاماً رقمياً متكاملاً لإحداث ثورة في سير عملهم. يسهل التجديدات، تتبع التغطية، ومراقبة الميزانيات في الوقت الفعلي، مما يقلل بشكل كبير من الأعباء الإدارية والأخطاء البشرية.'
                      : 'We provide HR managers with an integrated digital ecosystem to automate renewals, track employee coverage, and monitor budgets in real-time, significantly reducing administrative overhead and human error.'}
                  </p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-[#0F1450]/80 p-5 rounded-2xl border border-white/10 flex gap-4 shadow-md transition-all hover:bg-[#0F1450]">
                <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white">4. {isAr ? 'اتخاذ القرارات المبنية على البيانات' : 'Data-Driven Decision Making'}</h4>
                  <div className="space-y-1 text-xs text-[#E4E6F5]/85">
                    <div>
                      <span className="font-extrabold text-[#A52A2A]">•</span> <b>{isAr ? 'التجديدات الذكية: ' : 'Intelligent Renewals: '}</b>
                      <span>{isAr ? 'نحلل السوق والتغطية لتقديم توصيات استباقية وفعالة من حيث التكلفة.' : 'We use market data and current coverage analysis to provide proactive recommendations.'}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-[#A52A2A]">•</span> <b>{isAr ? 'تحليلات الذكاء الاصطناعي: ' : 'AI Analytics: '}</b>
                      <span>{isAr ? 'نراجع أنماط الاستهلاك لمساعدة الشركاء على اتخاذ قرارات تأمينية أكثر ذكاءً.' : 'Our AI-powered tools review consumption patterns and potential risks for smarter adjustments.'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Slide>

        {/* PAGE 4: ADDED VALUE PILLARS (5-7) */}
        <Slide title={isAr ? 'ركائز القيمة المضافة (5 - 7)' : 'Strategic Value Pillars (5 - 7)'} pageNumber={4}>
          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-2xl font-black text-white">{isAr ? 'دعم مستمر وعافية متكاملة' : 'Specialized Advocacy & Well-being'}</h3>
              <p className="text-xs text-[#E4E6F5]/80">{isAr ? 'حماية شاملة للموظفين وعائلاتهم مع دعم طبي وقانوني كامل' : 'Ensuring fairness, administrative relief, and extended well-being for beneficiaries'}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 flex-1 items-stretch">
              {/* Card 5 */}
              <div className="bg-[#0F1450]/80 p-5 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-md transition-all hover:bg-[#0F1450]">
                <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 flex items-center justify-center shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-sm font-bold text-white">5. {isAr ? 'المساندة والدعم المتخصص' : 'Specialized Advocacy & Support'}</h4>
                  <div className="space-y-1 text-xs text-[#E4E6F5]/85">
                    <div>
                      <span className="font-extrabold text-[#A52A2A]">•</span> <b>{isAr ? 'تسوية المطالبات: ' : 'Claims Advocacy: '}</b>
                      <span>{isAr ? 'نقدم تقارير تحليلية لمساعدتك في فهم الأسباب الجذرية للمخاطر والحد منها.' : 'We provide analytical reports to help you mitigate root causes of risks.'}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-[#A52A2A]">•</span> <b>{isAr ? 'المراجعة الطبية المتخصصة: ' : 'Expert Medical Review: '}</b>
                      <span>{isAr ? 'يقوم أطباؤنا بمراجعة الحالات المرفوضة والدفاع عن المستفيد بناءً على شروط البوليصة.' : 'In-house physicians review rejected cases, advocating based on policy terms.'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 6 */}
              <div className="bg-[#0F1450]/80 p-5 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-md transition-all hover:bg-[#0F1450]">
                <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 flex items-center justify-center shrink-0">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-sm font-bold text-white">6. {isAr ? 'تعزيز رفاهية المستفيدين' : 'Enhanced Beneficiary Well-being'}</h4>
                  <div className="space-y-1 text-xs text-[#E4E6F5]/85">
                    <div>
                      <span className="font-extrabold text-[#A52A2A]">•</span> <b>{isAr ? 'الصحة الوقائية: ' : 'Preventative Health: '}</b>
                      <span>{isAr ? 'فحوصات دورية وجلسات تثقيفية لتعزيز ثقافة العافية والرضا.' : 'Boost satisfaction and health through screenings and educational sessions.'}</span>
                    </div>
                    <div>
                      <span className="font-extrabold text-[#A52A2A]">•</span> <b>{isAr ? 'مزايا الأسرة الممتدة: ' : 'Extended Family Benefits: '}</b>
                      <span>{isAr ? 'بطاقات خصم طبي لأفراد الأسرة في الحالات غير المغطاة بالبوليصة.' : 'Medical discount cards for family members in non-covered cases.'}</span>
                    </div>
                    {cashbackAmount !== undefined && cashbackAmount > 0 && (
                      <div>
                        <span className="font-extrabold text-[#A52A2A]">•</span> <b>{isAr ? 'المرونة المالية: ' : 'Financial Flexibility: '}</b>
                        <span>{isAr 
                          ? `كاش باك بقيمة ${cashbackAmount.toLocaleString()} ج.م وقسائم قيمة لتغطية الاستثناءات.` 
                          : `Cashback incentives of ${cashbackAmount.toLocaleString()} EGP and value vouchers to cover exclusions.`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 7 */}
              <div className="bg-[#0F1450]/80 p-5 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-md transition-all hover:bg-[#0F1450]">
                <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-sm font-bold text-white">7. {isAr ? 'التمكين والتواصل المستمر' : 'Empowerment & Communication'}</h4>
                  <p className="text-xs text-[#E4E6F5]/85 leading-relaxed">
                    {isAr 
                      ? 'نؤمن بالشراكة المستنيرة. نقدم محتوى تعليمياً مستمراً لمساعدتك على فهم حقوقك والاستفادة القصوى من تغطيتك. من خلال قنوات التواصل المتعددة لدينا (واتساب، دردشة مباشرة، هاتف)، فإن الدعم المتخصص دائمًا على بعد نقرة واحدة.'
                      : 'We believe in an informed partnership. We provide ongoing educational content to help you understand your rights and maximize your coverage. With our omnichannel communication (WhatsApp, Live Chat, Phone), expert support is always a click away.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Slide>

        {/* COMPARISON SLIDES (PAGES 5+) */}
        {planChunks.map((chunk, idx) => {
          const premiumsInChunk = chunk.map(p => snapshots[p.id]?.premium || Infinity);
          const minPremiumInChunk = Math.min(...premiumsInChunk);

          return (
            <Slide key={idx} title={`${_t('competitiveAnalysisPart')} ${idx + 1}`} pageNumber={5 + idx}>
              <div className="flex-1 flex flex-col justify-between">
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-white">{_t('sideBySideComparison')}</h2>
                  <p className="text-xs text-[#E4E6F5]/80 font-medium">{_t('comparisonSub')}</p>
                </div>

                <div className="flex-1 bg-[#0F1450]/90 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#0B0F52] border-b border-white/10">
                        <th className="p-3 text-left rtl:text-right w-1/4">
                          <div className="text-[8px] font-black text-[#E4E6F5]/60 uppercase tracking-widest mb-0.5">{_t('benefitStructure')}</div>
                          <div className="text-xs font-bold text-white">{_t('coreCoverageAreas')}</div>
                        </th>
                        {chunk.map((p, i) => {
                          const isRecommended = i === 0 || snapshots[p.id]?.premium === minPremiumInChunk;
                          return (
                            <th key={i} className="p-3 text-center border-l border-white/10 min-w-[140px]">
                              <div className="flex flex-col items-center gap-1">
                                {COMPANY_LOGOS[p.company] ? (
                                  <div className="p-1 bg-white rounded shadow-sm">
                                    <img crossOrigin="anonymous" src={COMPANY_LOGOS[p.company]} className="h-5 object-contain" alt={p.company} />
                                  </div>
                                ) : (
                                  <div className="h-5 flex items-center justify-center font-black text-[#A52A2A] text-xs font-sans" dir="ltr">{p.company}</div>
                                )}
                                <div className={`text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full border ${isRecommended ? 'bg-[#A52A2A] text-white border-[#A52A2A] shadow-sm' : 'bg-[#131A80] text-[#E4E6F5] border-white/15'}`}>
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
                        <tr key={i} className="border-b border-white/10 odd:bg-[#0F1450] even:bg-[#151B63]">
                          <td className="px-3.5 py-1.5 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <b.icon className="w-3.5 h-3.5 text-[#A52A2A] shrink-0" />
                              <span>{_t(b.label)}</span>
                            </div>
                          </td>
                          {chunk.map((p, j) => (
                            <td key={j} className="px-3.5 py-1.5 text-center border-l border-white/10 font-medium">
                              {renderCellContent((p as any)[b.key])}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Premium Total Row */}
                      <tr className="bg-[#A52A2A] text-white border-t border-[#A52A2A]">
                        <td className="p-3 font-black uppercase tracking-wider text-white text-xs">{_t('annualNetPremium')}</td>
                        {chunk.map((p, j) => {
                          const prem = snapshots[p.id]?.premium;
                          const isLowest = prem && prem === minPremiumInChunk;
                          return (
                            <td key={j} className="p-3 text-center border-l border-white/20 bg-[#A52A2A] relative">
                              {isLowest && (
                                <div className="bg-amber-400 text-slate-950 text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full mb-0.5 inline-flex items-center gap-1 shadow-sm">
                                  <Star className="w-2 h-2 fill-slate-950" /> {isAr ? 'الأقل تكلفة' : 'Best Value'}
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

        {/* LAST PAGE: CONTACT & PARTNERSHIP */}
        <Slide title={isAr ? 'شراكتنا الاستراتيجية' : 'Strategic Partnership'} pageNumber={totalPages}>
          <div className="flex-1 flex gap-10 items-center justify-center">
            {/* Left Box */}
            <div className="w-1/2 space-y-6">
              <div>
                <h2 className="text-4xl font-black text-white mb-3">
                  {isAr ? 'لنضمن مستقبلاً آمناً معاً' : "Let's Secure Your Future"}
                </h2>
                <p className="text-base text-[#E4E6F5]/90 leading-relaxed font-medium">
                  {isAr 
                    ? 'بناء شراكة طويلة الأمد تقوم على الثقة والتميز التشغيلي والدعم المستمر.'
                    : 'Building a long-term partnership based on trust, operational excellence, and expert advocacy.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-[#0F1450]/80 p-4 rounded-xl border border-white/10 shadow-lg">
                  <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] flex items-center justify-center shrink-0 border border-white/10">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#E4E6F5]/70 uppercase tracking-widest">{isAr ? 'خط الدعم السريع' : 'Support Hotline'}</p>
                    <p dir="ltr" className="text-xl font-black text-white font-sans">+20 101-333-0409</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#0F1450]/80 p-4 rounded-xl border border-white/10 shadow-lg">
                  <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] flex items-center justify-center shrink-0 border border-white/10">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#E4E6F5]/70 uppercase tracking-widest">{isAr ? 'الاستفسارات والبريد' : 'Email Enquiries'}</p>
                    <p dir="ltr" className="text-xl font-black text-white font-sans">info@iwib-eg.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#0F1450]/80 p-4 rounded-xl border border-white/10 shadow-lg">
                  <div className="w-12 h-12 rounded-xl bg-[#A52A2A]/20 text-[#A52A2A] flex items-center justify-center shrink-0 border border-white/10">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#E4E6F5]/70 uppercase tracking-widest">{isAr ? 'الموقع الرسمي' : 'Official Website'}</p>
                    <p dir="ltr" className="text-xl font-black text-white font-sans">www.iwib-eg.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Head Office Card */}
            <div className="w-1/2 bg-[#0F1450] rounded-3xl p-10 text-white relative overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between aspect-[4/3]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#A52A2A]/10 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#A52A2A]/10 rounded-full -ml-24 -mb-24 blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 bg-[#A52A2A]/20 text-[#A52A2A] border border-[#A52A2A]/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" /> {isAr ? 'المركز الرئيسي' : 'Head Office'}
                </div>
                <h3 className="text-2xl font-black leading-snug text-white">{isAr ? 'تفضل بزيارتنا في المهندسين' : 'Visit us at Mohandessin'}</h3>
                <p className="text-[#E4E6F5]/90 text-sm leading-relaxed font-medium">
                  {isAr 
                    ? '٥ شارع النخيل، المهندسين، الجيزة، مصر. وسيط تأمين مرخص ومسجل من الهيئة العامة للرقابة المالية (FRA).'
                    : '5 El Nakheel St, Mohandessin, Giza, Egypt. Authorized Insurance Brokerage from FRA.'}
                </p>
              </div>

              {/* Regulatory Seal */}
              <div className="relative z-10 pt-4 mt-4 border-t border-white/10 flex items-center gap-3 bg-[#0B0F52]/60 p-3.5 rounded-xl border border-white/5">
                <div className="w-9 h-9 rounded-full bg-[#A52A2A] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-white leading-tight">
                    {isAr ? 'مرخص من الهيئة العامة للرقابة المالية' : 'Authorized Insurance Broker'}
                  </div>
                  <div className="text-[8px] text-[#E4E6F5]/70 font-semibold mt-0.5">
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
