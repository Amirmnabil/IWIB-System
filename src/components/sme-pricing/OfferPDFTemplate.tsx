import React, { forwardRef } from 'react';
import type { SMEPlan, CalculationBreakdown } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { HeartPulse, Users, Wallet, MessageSquareHeart, UserCheck, Settings, ShieldCheck, PieChart, Phone, Mail, Globe, MapPin, Check, Star, TrendingUp, Award, Zap, Smile, Eye, Baby, Hotel, Stethoscope, Activity, Briefcase, ShieldAlert, ExternalLink, Shield } from 'lucide-react';
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

const parseNum = (val: string | number | null | undefined): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).toLowerCase();
  if (str.includes('full') || str.includes('unlimited')) return 100000;
  return parseInt(str.replace(/[^0-9]/g, '')) || 0;
};

const parsePercent = (val: string | number | null | undefined): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).toLowerCase();
  if (str.includes('full') || str.includes('unlimited')) return 100;
  const match = str.match(/(\d+)\s*%/);
  return match ? parseInt(match[1]) : 0;
};

const COMPANY_LOGOS: Record<string, string> = {
  ...companyLogosB64,
  "Arop": companyLogosB64["Arope"] || "https://i.ibb.co/gLDS2PGh/Arope.jpg",
  "Libano Suisse": companyLogosB64["Labanoswiss"] || "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Linbano Suisse": companyLogosB64["Labanoswiss"] || "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Misr Insurance Takaful life": companyLogosB64["Misr Insurance Takaful"] || "https://i.ibb.co/6RPtXd9x/Misr-Insurance-life-Takaful.jpg"
};

export const OfferPDFTemplate = forwardRef<HTMLDivElement, OfferPDFTemplateProps>(
  ({ offerName, companyName, date, plans, snapshots, cashbackAmount, memberCounts, offerCode, language = 'en' }, ref) => {
    
    const isAr = language === 'ar';
    const dict = translations[language] || translations.en;
    const _t = (key: keyof TranslationSchema) => dict[key] || translations.en[key] || String(key);

    const translateValue = (val: any) => {
      if (!val) return _t('notCovered');
      if (!isAr) return val;
      let str = String(val);
      str = str.replace(/Not Covered/gi, 'غير مغطى');
      str = str.replace(/Covered/gi, 'مغطى');
      str = str.replace(/Unlimited/gi, 'بدون حد أقصى');
      str = str.replace(/Full/gi, 'تغطية كاملة');
      str = str.replace(/Yes/gi, 'نعم');
      str = str.replace(/No/gi, 'لا');
      str = str.replace(/EGP/gi, 'ج.م');
      str = str.replace(/Per/gi, 'لكل');
      str = str.replace(/Family/gi, 'عائلة');
      str = str.replace(/Member/gi, 'فرد');
      str = str.replace(/Up to/gi, 'حتى');
      return str;
    };

    const chartData = plans.map(p => ({
      name: p.name,
      company: p.company,
      'Annual Limit': parseNum(p.annualLimit),
      'Consultations': parsePercent(p.consultations),
      'Radiology/Lab': parsePercent(p.radiologyLab),
      'Premium': snapshots[p.id]?.premium || 0,
    }));

    // Split plans into chunks of 3 for multiple comparison pages in portrait
    const planChunks = [];
    for (let i = 0; i < plans.length; i += 3) {
      planChunks.push(plans.slice(i, i + 3));
    }

    const Slide = ({ children, className, title, orientation = 'landscape' }: any) => {
      const isPortrait = orientation === 'portrait';
      const w = isPortrait ? 'w-[794px]' : 'w-[1123px]';
      const h = isPortrait ? 'h-[1123px]' : 'h-[794px]';
      return (
        <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: isAr ? "'Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Noto Naskh Arabic', sans-serif" : undefined }} data-orientation={orientation} className={`${w} ${h} bg-card relative overflow-hidden flex flex-col shrink-0 border-b border-border ${className || ''}`}>
          {/* Header for every slide except cover */}
          {!className?.includes('is-cover') && (
            <div className="flex items-center justify-between px-12 py-6 border-b border-border bg-background/50">
              <div className="flex items-center gap-4">
                <img crossOrigin="anonymous" src="/iwib-logo-new.png" alt="IWIB" className="h-10 object-contain" />
                <div className="h-6 w-px bg-slate-300" />
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{title || _t('insuranceProposal')}</div>
              </div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/10 px-3 py-1 rounded-full border border-indigo-100">
                {companyName} • {date}
              </div>
            </div>
          )}
          <div className={`flex-1 flex flex-col w-full h-full overflow-hidden ${isPortrait ? 'px-8 py-4' : 'p-12'}`}>{children}</div>
          {/* Footer */}
          <div className="px-12 py-4 bg-slate-900 text-[10px] text-slate-400 flex justify-between items-center font-bold tracking-widest">
            <span>{_t('confidentialProposal')} • IWIB BROKERAGE</span>
            <div className="flex items-center gap-4">
              <span className="text-[8px] opacity-70">
                {_t('englishDisclaimerDesc')}
              </span>
              <span className="whitespace-nowrap">{_t('pageReference')}: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>
          </div>
        </div>
      )
    };

    return (
      <div ref={ref} className="flex flex-col bg-slate-800 shadow-2xl" style={{ width: '1123px' }}>

        {/* 1. Cover Page (High Impact) */}
        <Slide className="is-cover bg-slate-900 text-white p-0">
          <div className="absolute inset-0 z-0">
            <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover opacity-30 grayscale" alt="Cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          </div>
          <div className="relative z-10 flex flex-col h-full p-24 justify-center max-w-3xl">
            <div className="flex items-center gap-8 mb-16">
              <div className="p-4">
                <img crossOrigin="anonymous" src="/iwib-logo-new.png" alt="IWIB Logo" className="h-16 object-contain" />
              </div>
              <div className="h-16 w-1 bg-primary/100 rounded-full" />
              <div className="text-4xl font-black tracking-tight text-white/90">{companyName}</div>
            </div>

            <div className="space-y-4 mb-16">
              <div className="text-indigo-400 font-black text-xl uppercase tracking-[0.3em] mb-4">{_t('executiveProposal')}</div>
              <h1 className="text-7xl font-black leading-[1.1] text-white">
                {_t('medicalProgram')}<br />
                <span className="text-indigo-400">{_t('optimization')}</span>
              </h1>
              <p className="text-2xl text-slate-400 font-light max-w-xl border-l-4 border-indigo-500/50 px-6 py-2">
                {_t('pdfCoverDescription')}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 border-t border-white/10 pt-12">
              <div>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-2">{_t('proposalName')}</p>
                <p className="text-card-header text-white">{offerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-2">{_t('issueDate')}</p>
                <p className="text-card-header text-white">{date}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-2">{_t('offerCode')}</p>
                <p className="text-card-header text-white text-sm font-mono mt-1">{offerCode || '---'}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-2">{_t('totalMembers')}</p>
                <div className="text-card-header text-white flex gap-2 text-sm items-center mt-1">
                  <span className="font-bold text-lg leading-none" title="Total">{memberCounts ? memberCounts.employee + memberCounts.spouse + memberCounts.child : 0}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">({memberCounts?.employee || 0}E / {memberCounts?.spouse || 0}S / {memberCounts?.child || 0}C)</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-24 right-24 rotate-90 origin-right text-slate-700 text-[10px] font-black tracking-[1em] uppercase">
            {_t('secureTransparentExpert')}
          </div>
        </Slide>

        {/* 2. Strategic Value (Problem/Solution) */}
        <Slide title={_t('strategicValueProposition')}>
          <div className="flex-1 flex flex-col justify-center gap-12">
            <div className="flex gap-16 items-center">
              <div className="w-1/2 space-y-8">
                <h2 className="text-5xl font-black text-foreground leading-tight">
                  {_t('beyondJust')} <span className="text-primary">{_t('coverage')}</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {_t('strategicDescription')}
                </p>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex gap-5 items-start bg-background p-6 rounded-2xl border border-border">
                    <div className="bg-primary p-3 rounded-xl shadow-lg shadow-indigo-200">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground mb-1">{_t('financialOptimization')}</h4>
                      <p className="text-sm text-muted-foreground">{_t('financialOptDesc')}</p>
                    </div>
                  </div>
                  <div className="flex gap-5 items-start bg-background p-6 rounded-2xl border border-border">
                    <div className="bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-200">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-foreground mb-1">{_t('riskMitigation')}</h4>
                      <p className="text-sm text-muted-foreground">{_t('riskMitigationDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-1/2 relative">
                <div className="absolute -inset-4 bg-indigo-100 rounded-[40px] rotate-3 -z-10" />
                <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=600" className="w-full aspect-[4/3] object-cover rounded-[32px] shadow-2xl" alt="Excellence" />
                <div className="absolute bottom-8 -right-8 bg-card p-8 rounded-2xl shadow-xl border border-border max-w-[240px]">
                  <Star className="text-amber-400 w-8 h-8 mb-4 fill-amber-400" />
                  <div className="text-2xl font-black text-foreground">100%</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{_t('commitmentToService')}</div>
                </div>
              </div>
            </div>
          </div>
        </Slide>

        {/* 3. Program Comparison Tables (Chunked) */}
        {planChunks.map((chunk, idx) => (
          <Slide key={idx} title={`${_t('competitiveAnalysisPart')} ${idx + 1}`} orientation="portrait">
            <div className="flex-1 flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-foreground">{_t('sideBySideComparison')}</h2>
                  <p className="text-muted-foreground font-medium">{_t('comparisonSub')}</p>
                </div>
                <div className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm">
                  {chunk.length} {_t('programsInView')}
                </div>
              </div>

              <div className="flex-1 bg-card rounded-[24px] border border-border shadow-sm overflow-hidden flex flex-col">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      <th className="p-4 text-left w-1/4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{_t('benefitStructure')}</div>
                        <div className="text-sm font-bold text-foreground">{_t('coreCoverageAreas')}</div>
                      </th>
                      {chunk.map((p, i) => (
                        <th key={i} className="p-4 text-center border-l border-border min-w-[150px]">
                          <div className="flex flex-col items-center gap-2">
                            {COMPANY_LOGOS[p.company] ? (
                              <img crossOrigin="anonymous" src={COMPANY_LOGOS[p.company]} className="h-6 object-contain" alt={p.company} />
                            ) : (
                              <div className="h-6 flex items-center justify-center font-black text-primary">{p.company}</div>
                            )}
                            <div className="text-[9px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full text-center leading-normal">{p.name}</div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {benefitsList.map((b, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-bold text-slate-700 bg-background/30">
                          <div className="flex items-center gap-2">
                            <b.icon className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>{_t(b.label)}</span>
                          </div>
                        </td>
                        {chunk.map((p, j) => (
                          <td key={j} className="px-4 py-3 text-center text-muted-foreground border-l border-slate-50 font-medium text-xs leading-normal">
                            {translateValue((p as any)[b.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* PRICING ROW - HIGH VISIBILITY */}
                    <tr className="bg-indigo-900 text-white">
                      <td className="p-4 font-black uppercase tracking-widest text-indigo-300 text-xs">{_t('annualNetPremium')}</td>
                      {chunk.map((p, j) => (
                        <td key={j} className="p-4 text-center border-l border-white/10">
                          <div className="text-xl font-black tracking-tight">
                            {snapshots[p.id]?.premium ? snapshots[p.id].premium.toLocaleString() : '---'}
                            <span className="text-[10px] mx-1 font-bold text-indigo-300">{_t('egp')}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Slide>
        ))}

        {/* 4. Visual Analysis (Charts) */}
        <Slide title={_t('financialCoverageIntelligence')}>
          <div className="grid grid-cols-2 gap-12 flex-1">
            <div className="flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-black text-foreground mb-1">{_t('premiumEfficiency')}</h3>
                <p className="text-xs text-muted-foreground">{_t('premiumEfficiencyDesc')}</p>
              </div>
              <div className="flex-1 bg-background rounded-3xl p-8 border border-border">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} interval={0} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="Premium" radius={[8, 8, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-black text-foreground mb-1">{_t('benefitCapacity')}</h3>
                <p className="text-xs text-muted-foreground">{_t('benefitCapacityDesc')}</p>
              </div>
              <div className="flex-1 bg-background rounded-3xl p-8 border border-border">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} width={100} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="Annual Limit" radius={[0, 8, 8, 0]} barSize={30} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Slide>

        {/* 5. Contact & Next Steps (Modern CTA) */}
        <Slide title={_t('strategicPartnership')} className="bg-background">
          <div className="flex-1 flex gap-16 items-center">
            <div className="w-1/2 space-y-12">
              <div>
                <h2 className="text-5xl font-black text-foreground mb-6">{_t('letsSecureFuture')}</h2>
                <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                  {_t('partnershipDesc')}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-card shadow-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Phone className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_t('supportHotline')}</p>
                    <p className="text-2xl font-black text-foreground">+20 101-333-0409</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-card shadow-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Mail className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_t('emailEnquiries')}</p>
                    <p className="text-2xl font-black text-foreground">info@iwib-eg.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-card shadow-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Globe className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{_t('officialWebsite')}</p>
                    <p className="text-2xl font-black text-foreground">www.iwib-eg.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-1/2 bg-slate-900 rounded-[40px] p-16 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/100/10 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/100/10 rounded-full -ml-32 -mb-32" />

              <div className="relative z-10 space-y-8">
                <div className="inline-flex items-center gap-2 bg-primary/100/20 text-indigo-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                  <MapPin className="w-4 h-4" /> Head Office
                </div>
                <h3 className="text-4xl font-black leading-tight">{_t('visitUsAtMohandessin')}</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  {_t('iwibAddress')}
                </p>
                <div className="pt-8 border-t border-white/10 flex items-center gap-4">
                  <img crossOrigin="anonymous" src="/iwib-logo-new.png" alt="IWIB" className="h-12 p-2" />
                  <div className="text-xs font-bold text-muted-foreground leading-tight">
                    {_t('authorizedBroker')}
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
