import React, { forwardRef } from 'react';
import type { SMEPlan, CalculationBreakdown } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { HeartPulse, Users, Wallet, MessageSquareHeart, UserCheck, Settings, ShieldCheck, PieChart, Phone, Mail, Globe, MapPin, Check, Star, TrendingUp, Award, Zap, Smile, Eye, Baby, Hotel, Stethoscope, Activity, Briefcase, ShieldAlert, ExternalLink, Shield } from 'lucide-react';

const benefitsList = [
  { label: 'Annual Limit', key: 'annualLimit', icon: Award },
  { label: 'Life Insurance', key: 'lifeInsurance', icon: HeartPulse },
  { label: 'TPA Provider', key: 'tpa', icon: Settings },
  { label: 'Network', key: 'network', icon: Globe },
  { label: 'Accommodation', key: 'accommodation', icon: Hotel },
  { label: 'Inpatient', key: 'inpatient', icon: Hotel },
  { label: 'Consultations', key: 'consultations', icon: Stethoscope },
  { label: 'Radiology/Lab', key: 'radiologyLab', icon: Activity },
  { label: 'Medications', key: 'medications', icon: Briefcase },
  { label: 'Dental', key: 'dental', icon: Smile },
  { label: 'Optical', key: 'optical', icon: Eye },
  { label: 'Maternity', key: 'maternity', icon: Baby },
  { label: 'Chronic Limits', key: 'chronicPreExisting', icon: ShieldAlert },
  { label: 'COVID-19', key: 'covid19', icon: Shield },
  { label: 'Out-of-Network', key: 'outOfNetwork', icon: ExternalLink },
];

interface OfferPDFTemplateProps {
  offerName: string;
  companyName: string;
  date: string;
  plans: SMEPlan[];
  snapshots: Record<string, { premium: number; breakdown: CalculationBreakdown }>;
  cashbackAmount?: number;
}

const parseNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).toLowerCase();
  if (str.includes('full') || str.includes('unlimited')) return 100000;
  return parseInt(str.replace(/[^0-9]/g, '')) || 0;
};

const parsePercent = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).toLowerCase();
  if (str.includes('full') || str.includes('unlimited')) return 100;
  const match = str.match(/(\d+)\s*%/);
  return match ? parseInt(match[1]) : 0;
};

const COMPANY_LOGOS: Record<string, string> = {
  "Sarwa General": "https://i.ibb.co/vxTfzGV9/Sarwa.jpg",
  "AXA": "https://i.ibb.co/S4MDnzHV/AXA.jpg",
  "Arope": "https://i.ibb.co/gLDS2PGh/Arope.jpg",
  "Arop": "https://i.ibb.co/gLDS2PGh/Arope.jpg",
  "GIG": "https://i.ibb.co/yFT6pVNy/GIG.jpg",
  "Libano Suisse": "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Linbano Suisse": "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Labanoswiss": "https://i.ibb.co/C37y4vq5/Labanoswiss.jpg",
  "Metlife": "https://i.ibb.co/qF5q9XkZ/Metlife.jpg",
  "Misr Insurance Takaful": "https://i.ibb.co/6RPtXd9x/Misr-Insurance-life-Takaful.jpg",
  "Misr Insurance Takaful life": "https://i.ibb.co/6RPtXd9x/Misr-Insurance-life-Takaful.jpg",
  "Sarwa Life": "https://i.ibb.co/hFhPXhDG/Sarwa-LIfe.jpg",
  "Orient": "https://i.ibb.co/fdwy8fb7/Orient.jpg"
};

export const OfferPDFTemplate = forwardRef<HTMLDivElement, OfferPDFTemplateProps>(
  ({ offerName, companyName, date, plans, snapshots, cashbackAmount }, ref) => {

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
        <div data-orientation={orientation} className={`${w} ${h} bg-white relative overflow-hidden flex flex-col shrink-0 border-b border-slate-200 ${className || ''}`}>
          {/* Header for every slide except cover */}
          {!className?.includes('is-cover') && (
            <div className="flex items-center justify-between px-12 py-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <img crossOrigin="anonymous" src="https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png" alt="IWIB" className="h-10 object-contain" />
                <div className="h-6 w-px bg-slate-300" />
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{title || 'Insurance Proposal'}</div>
              </div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                {companyName} • {date}
              </div>
            </div>
          )}
          <div className={`flex-1 flex flex-col w-full h-full overflow-hidden ${isPortrait ? 'px-8 py-4' : 'p-12'}`}>{children}</div>
          {/* Footer */}
          <div className="px-12 py-4 bg-slate-900 text-[10px] text-slate-400 flex justify-between items-center font-bold tracking-widest">
            <span>CONFIDENTIAL PROPOSAL • IWIB BROKERAGE</span>
            <span>PAGE REFERENCE: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
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
              <div className="bg-white p-4 rounded-2xl shadow-2xl">
                <img crossOrigin="anonymous" src="https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png" alt="IWIB Logo" className="h-16 object-contain" />
              </div>
              <div className="h-16 w-1 bg-indigo-500 rounded-full" />
              <div className="text-4xl font-black tracking-tight text-white/90">{companyName}</div>
            </div>

            <div className="space-y-4 mb-16">
              <div className="text-indigo-400 font-black text-xl uppercase tracking-[0.3em] mb-4">Executive Proposal</div>
              <h1 className="text-7xl font-black leading-[1.1] text-white">
                Medical Program<br />
                <span className="text-indigo-400">Optimization</span>
              </h1>
              <p className="text-2xl text-slate-400 font-light max-w-xl border-l-4 border-indigo-500/50 pl-6 py-2">
                A data-driven comparative analysis of top-tier insurance programs tailored for your organizational needs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-12">
              <div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Proposal Name</p>
                <p className="text-xl font-bold text-white">{offerName}</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Issue Date</p>
                <p className="text-xl font-bold text-white">{date}</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-24 right-24 rotate-90 origin-right text-slate-700 text-[10px] font-black tracking-[1em] uppercase">
            SECURE • TRANSPARENT • EXPERT
          </div>
        </Slide>

        {/* 2. Strategic Value (Problem/Solution) */}
        <Slide title="Strategic Value Proposition">
          <div className="flex-1 flex flex-col justify-center gap-12">
            <div className="flex gap-16 items-center">
              <div className="w-1/2 space-y-8">
                <h2 className="text-5xl font-black text-slate-900 leading-tight">
                  Beyond Just <span className="text-indigo-600">Coverage</span>
                </h2>
                <p className="text-xl text-slate-500 leading-relaxed">
                  Our approach integrates financial prudence with employee well-being, ensuring your insurance program acts as a strategic asset rather than a sunk cost.
                </p>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex gap-5 items-start bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">Financial Optimization</h4>
                      <p className="text-sm text-slate-500">Intelligent premium structures and tax-efficient health benefits design.</p>
                    </div>
                  </div>
                  <div className="flex gap-5 items-start bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-200">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">Risk Mitigation</h4>
                      <p className="text-sm text-slate-500">Advanced medical reviews and claims advocacy to protect your interests.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-1/2 relative">
                <div className="absolute -inset-4 bg-indigo-100 rounded-[40px] rotate-3 -z-10" />
                <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=600" className="w-full aspect-[4/3] object-cover rounded-[32px] shadow-2xl" alt="Excellence" />
                <div className="absolute bottom-8 -right-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-[240px]">
                  <Star className="text-amber-400 w-8 h-8 mb-4 fill-amber-400" />
                  <div className="text-2xl font-black text-slate-900">100%</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Commitment to Service</div>
                </div>
              </div>
            </div>
          </div>
        </Slide>

        {/* 3. Program Comparison Tables (Chunked) */}
        {planChunks.map((chunk, idx) => (
          <Slide key={idx} title={`Competitive Analysis • Part ${idx + 1}`} orientation="portrait">
            <div className="flex-1 flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Side-by-Side Comparison</h2>
                  <p className="text-slate-500 font-medium">Detailed breakdown of benefit limits and structural advantages.</p>
                </div>
                <div className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm">
                  {chunk.length} Programs in this view
                </div>
              </div>

              <div className="flex-1 bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-left w-1/4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Benefit Structure</div>
                        <div className="text-sm font-bold text-slate-900">Core Coverage Areas</div>
                      </th>
                      {chunk.map((p, i) => (
                        <th key={i} className="p-4 text-center border-l border-slate-100 min-w-[150px]">
                          <div className="flex flex-col items-center gap-2">
                            {COMPANY_LOGOS[p.company] ? (
                              <img crossOrigin="anonymous" src={COMPANY_LOGOS[p.company]} className="h-6 object-contain" alt={p.company} />
                            ) : (
                              <div className="h-6 flex items-center justify-center font-black text-indigo-600">{p.company}</div>
                            )}
                            <div className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-full text-center leading-normal">{p.name}</div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {benefitsList.map((b, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-bold text-slate-700 bg-slate-50/30">
                          <div className="flex items-center gap-2">
                            <b.icon className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>{b.label}</span>
                          </div>
                        </td>
                        {chunk.map((p, j) => (
                          <td key={j} className="px-4 py-3 text-center text-slate-600 border-l border-slate-50 font-medium text-xs leading-normal">
                            {(p as any)[b.key] || 'Not Covered'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* PRICING ROW - HIGH VISIBILITY */}
                    <tr className="bg-indigo-900 text-white">
                      <td className="p-4 font-black uppercase tracking-widest text-indigo-300 text-xs">Annual Net Premium</td>
                      {chunk.map((p, j) => (
                        <td key={j} className="p-4 text-center border-l border-white/10">
                          <div className="text-xl font-black tracking-tight">
                            {snapshots[p.id]?.premium ? snapshots[p.id].premium.toLocaleString() : '---'}
                            <span className="text-[10px] ml-1 font-bold text-indigo-300">EGP</span>
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
        <Slide title="Financial & Coverage Intelligence">
          <div className="grid grid-cols-2 gap-12 flex-1">
            <div className="flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 mb-1">Premium Efficiency</h3>
                <p className="text-xs text-slate-500">Total annual cost comparison across proposed programs.</p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-3xl p-8 border border-slate-100">
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
                <h3 className="text-xl font-black text-slate-900 mb-1">Benefit Capacity</h3>
                <p className="text-xs text-slate-500">Market score based on annual coverage limits.</p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-3xl p-8 border border-slate-100">
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
        <Slide title="Strategic Partnership" className="bg-slate-50">
          <div className="flex-1 flex gap-16 items-center">
            <div className="w-1/2 space-y-12">
              <div>
                <h2 className="text-5xl font-black text-slate-900 mb-6">Let's Secure Your <span className="text-indigo-600">Future</span></h2>
                <p className="text-xl text-slate-500 leading-relaxed font-medium">
                  Our team is ready to assist you in finalizing the selection and beginning the implementation process.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Phone className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Hotline</p>
                    <p className="text-2xl font-black text-slate-900">+20 101-333-0409</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Mail className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Enquiries</p>
                    <p className="text-2xl font-black text-slate-900">info@iwib-eg.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Globe className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Website</p>
                    <p className="text-2xl font-black text-slate-900">www.iwib-eg.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-1/2 bg-slate-900 rounded-[40px] p-16 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32" />

              <div className="relative z-10 space-y-8">
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                  <MapPin className="w-4 h-4" /> Head Office
                </div>
                <h3 className="text-4xl font-black leading-tight">Visit us at<br />Mohandessin</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  5 El Nakheel St, Mohandessin,<br />
                  Giza, Egypt.
                </p>
                <div className="pt-8 border-t border-white/10 flex items-center gap-4">
                  <img crossOrigin="anonymous" src="https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png" alt="IWIB" className="h-12 bg-white p-2 rounded-lg" />
                  <div className="text-xs font-bold text-slate-500 leading-tight">
                    Authorized Broker by the<br />Financial Regulatory Authority
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
