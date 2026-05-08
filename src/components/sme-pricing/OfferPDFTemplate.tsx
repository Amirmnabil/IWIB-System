import React, { forwardRef } from 'react';
import type { SMEPlan, CalculationBreakdown } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HeartPulse, Users, Wallet, MessageSquareHeart, UserCheck, Settings, ShieldCheck, PieChart, Phone, Mail, Globe, MapPin } from 'lucide-react';

const benefitsList = [
  { label: 'Annual Limit', key: 'annualLimit' },
  { label: 'TPA', key: 'tpa' },
  { label: 'Consultations', key: 'consultations' },
  { label: 'Radiology/Lab', key: 'radiologyLab' },
  { label: 'Dental', key: 'dental' },
  { label: 'Optical', key: 'optical' },
  { label: 'Maternity', key: 'maternity' },
  { label: 'Chronic & Pre-existing', key: 'chronicPreExisting' },
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
  if (str.includes('full') || str.includes('unlimited')) return 100000; // arbitrary high for charts
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
      name: `${p.company} - ${p.name}`,
      'Annual Limit': parseNum(p.annualLimit),
      'Consultations': parsePercent(p.consultations),
      'Radiology/Lab': parsePercent(p.radiologyLab),
      'Dental': parseNum(p.dental),
      'Optical': parseNum(p.optical),
      'Maternity': parseNum(p.maternity),
    }));

    const Slide = ({ children, className }: any) => (
      <div className={`w-[1280px] h-[720px] bg-slate-100 relative overflow-hidden flex flex-col shrink-0 ${className || ''}`}>
        <div className="absolute inset-0 border-[32px] border-white/0 pointer-events-none z-50"></div>
        <div className="flex-1 flex flex-col w-full h-full p-8">{children}</div>
      </div>
    );

    return (
      <div ref={ref} className="flex flex-col bg-slate-900" style={{ width: '1280px' }}>
        
        {/* 1. Cover Page */}
        <Slide className="bg-white text-slate-900 flex-row">
          <div className="w-1/2 p-16 flex flex-col justify-center relative z-10">
            <div className="flex items-center gap-6 mb-16">
              <img crossOrigin="anonymous" src="https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png" alt="IWIB Logo" className="h-40 object-contain bg-white p-4 rounded-xl" />
              <div className="h-32 w-px bg-slate-200" />
              <div className="text-3xl font-bold text-slate-500">{companyName}</div>
            </div>
            <h1 className="text-6xl font-black mb-6 leading-tight text-slate-900">
              Quotations Comparison<br/>& Value Proposition
            </h1>
            <h2 className="text-2xl text-slate-600 mb-12">{offerName}</h2>
            <div className="mt-auto border-t border-slate-100 pt-8">
              <p className="text-slate-500 font-medium text-lg">Prepared by IWIB team</p>
              <p className="text-slate-400 font-medium">{date}</p>
            </div>
          </div>
          <div className="w-1/2 relative">
            <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=60&w=800&fm=jpg" className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-lg" alt="Business" />
          </div>
        </Slide>

        {/* 2. Enhanced Beneficiary Well-being */}
        <Slide className="bg-slate-50 flex-row">
          <div className="w-5/12 relative rounded-3xl overflow-hidden shadow-sm">
            <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=60&w=600&fm=jpg" className="absolute inset-0 w-full h-full object-cover" alt="Healthcare" />
            <div className="absolute inset-0 bg-indigo-900/20 mix-blend-multiply" />
          </div>
          <div className="w-7/12 p-16 flex flex-col justify-center">
            <h2 className="text-4xl font-black text-indigo-950 mb-12 border-l-8 border-indigo-600 pl-6">Enhanced Beneficiary Well-being</h2>
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-start">
                <HeartPulse className="w-10 h-10 text-indigo-600 shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">Preventative Health</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">Proactive wellness programs and regular health check-ups designed to keep your workforce healthy, engaged, and productive.</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-start">
                <Users className="w-10 h-10 text-indigo-600 shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">Extended Family Benefits</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">Comprehensive coverage options that extend peace of mind to the families and dependents of your core team.</p>
                </div>
              </div>
              {cashbackAmount && cashbackAmount > 0 ? (
                <div className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100 flex gap-4 items-start">
                  <Wallet className="w-10 h-10 text-indigo-600 shrink-0 mt-1" />
                  <div>
                    <h3 className="text-2xl font-bold text-indigo-900 mb-3">Financial Flexibility</h3>
                    <p className="text-indigo-700 leading-relaxed text-lg">
                      Cashback incentives fund with <strong className="text-indigo-900">{cashbackAmount.toLocaleString()} EGP</strong> help cover policy exclusions and reduce financial burden.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Slide>

        {/* 3. Customer Feedback */}
        <Slide className="bg-slate-100 flex-col justify-center items-center relative">
          <div className="relative z-10 text-center max-w-4xl px-8 bg-white p-12 rounded-3xl shadow-sm border border-slate-200">
            <MessageSquareHeart className="w-16 h-16 text-indigo-500 mb-6 mx-auto" />
            <h2 className="text-5xl font-black text-slate-900 mb-8 border-b-4 border-indigo-500 pb-6 inline-block">Customer Feedback Loop</h2>
            <p className="text-2xl text-slate-600 leading-relaxed font-light mt-4">
              We believe in continuous improvement. Our dedicated feedback mechanisms ensure that your voice shapes the evolution of your insurance program, guaranteeing alignment with your dynamic business needs.
            </p>
          </div>
        </Slide>

        {/* 4. Dedicated Operational Excellence */}
        <Slide className="bg-slate-900 text-white flex-row">
          <div className="w-1/2 p-16 flex flex-col justify-center">
            <h2 className="text-4xl font-black mb-12 border-l-8 border-blue-500 pl-6">Dedicated Operational Excellence</h2>
            <div className="grid grid-cols-1 gap-8">
              <div className="border-b border-slate-800 pb-6 flex items-start gap-4">
                <UserCheck className="w-8 h-8 text-blue-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-blue-400 mb-3">Dedicated Account Manager</h3>
                  <p className="text-slate-400 text-lg">A single point of contact providing personalized guidance and strategic oversight for your account.</p>
                </div>
              </div>
              <div className="border-b border-slate-800 pb-6 flex items-start gap-4">
                <Settings className="w-8 h-8 text-blue-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-blue-400 mb-3">Service Delivery</h3>
                  <p className="text-slate-400 text-lg">Streamlined processes and robust SLAs ensuring rapid response times and uninterrupted operations.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 text-blue-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold text-blue-400 mb-3">Compliance &amp; Auditing</h3>
                  <p className="text-slate-400 text-lg">Rigorous adherence to regulatory standards with continuous auditing to mitigate risk.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-1/2 relative rounded-3xl overflow-hidden shadow-sm">
            <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=60&w=600&fm=jpg" className="absolute inset-0 w-full h-full object-cover" alt="Corporate" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-slate-900" />
          </div>
        </Slide>

        {/* 5. Data-Driven Decision Making */}
        <Slide className="bg-slate-50 flex-col justify-center items-center text-center px-24">
          <PieChart className="w-20 h-20 text-teal-600 mb-8" />
          <h2 className="text-5xl font-black text-slate-900 mb-16">Data-Driven Decision Making</h2>
          <div className="grid grid-cols-2 gap-16 w-full max-w-5xl">
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-3xl font-bold text-teal-700 mb-4">Intelligent Renewals</h3>
              <p className="text-slate-600 text-xl leading-relaxed">Leveraging historical data and market trends to negotiate the most favorable renewal terms.</p>
            </div>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-3xl font-bold text-teal-700 mb-4">AI Analytics</h3>
              <p className="text-slate-600 text-xl leading-relaxed">Advanced utilization tracking and predictive modeling to optimize plan design and contain costs.</p>
            </div>
          </div>
        </Slide>

        {/* 6. Specialized Advocacy & Support */}
        <Slide className="bg-emerald-950 text-white flex-col justify-center items-center px-24">
          <h2 className="text-5xl font-black text-white mb-16 border-b-4 border-emerald-500 pb-4 inline-block">Specialized Advocacy &amp; Support</h2>
          <div className="grid grid-cols-2 gap-16 w-full max-w-5xl">
            <div className="bg-emerald-900/50 p-10 rounded-3xl border border-emerald-800 backdrop-blur-sm flex flex-col items-center text-center">
              <h3 className="text-3xl font-bold text-emerald-400 mb-4">Claims Advocacy</h3>
              <p className="text-emerald-100 text-xl leading-relaxed">Expert intervention and negotiation on your behalf to ensure fair and timely claims resolution.</p>
            </div>
            <div className="bg-emerald-900/50 p-10 rounded-3xl border border-emerald-800 backdrop-blur-sm flex flex-col items-center text-center">
              <h3 className="text-3xl font-bold text-emerald-400 mb-4">Medical Review</h3>
              <p className="text-emerald-100 text-xl leading-relaxed">In-house medical professionals reviewing complex cases to guarantee appropriate care and cost management.</p>
            </div>
          </div>
        </Slide>

        {/* 7. Quotations Comparison (Table) */}
        <Slide className="bg-slate-50 flex-col">
          <h2 className="text-3xl font-black text-slate-800 mb-6 border-l-8 border-indigo-600 pl-4">Quotations Comparison</h2>
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1 h-full">
              <table className="w-full text-left border-collapse min-w-max h-full">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-sm uppercase tracking-wider sticky top-0 z-10">
                    <th className="p-4 font-bold border-b border-r border-slate-200 w-1/4">Coverage / Benefits</th>
                    {plans.map((p, i) => (
                      <th key={i} className="p-4 font-bold border-b border-r border-slate-200 min-w-[200px] last:border-r-0">
                        <div className="flex flex-col gap-2">
                          {COMPANY_LOGOS[p.company] && (
                            <img crossOrigin="anonymous" src={COMPANY_LOGOS[p.company]} className="h-8 w-auto object-contain" alt={p.company} />
                          )}
                          <span className="text-slate-900 text-sm mt-1">{p.company}</span>
                          <span className="text-indigo-600 text-[11px] uppercase">{p.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benefitsList.map((b, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 text-[13px]">
                      <td className="p-4 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">{b.label}</td>
                      {plans.map((p, j) => (
                        <td key={j} className="p-4 text-slate-700 border-r border-slate-200 last:border-r-0">
                          <div className={b.key === 'chronicPreExisting' ? 'truncate max-w-[250px]' : ''} title={b.key === 'chronicPreExisting' ? String((p as any)[b.key]) : ''}>
                            {(p as any)[b.key] || '-'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Slide>

        {/* 7b. Quotations Comparison (Charts) */}
        {plans.length > 0 && (
          <Slide className="bg-white p-12 flex-col">
            <h2 className="text-3xl font-black text-slate-800 mb-8 border-l-8 border-indigo-600 pl-4">Coverage Analysis</h2>
            <div className="flex-1 grid grid-cols-2 gap-8">
              {/* Chart 1: Annual Limits */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col">
                <h3 className="text-center font-bold text-slate-700 mb-4">Annual Limits (EGP)</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 9}} interval={0} angle={-25} textAnchor="end" />
                      <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{fontSize: 10}} />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Bar dataKey="Annual Limit" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Chart 2: Consultations & Radiology */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col">
                <h3 className="text-center font-bold text-slate-700 mb-4">Consultations &amp; Radiology Coverage (%)</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 9}} interval={0} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tick={{fontSize: 10}} />
                      <Tooltip />
                      <Legend wrapperStyle={{fontSize: '10px'}} />
                      <Bar dataKey="Consultations" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Radiology/Lab" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Dental, Optical, Maternity */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col">
                <h3 className="text-center font-bold text-slate-700 mb-4">Sub-Limits: Dental, Optical, Maternity (EGP)</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 9}} interval={0} angle={-25} textAnchor="end" />
                      <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{fontSize: 10}} />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Legend wrapperStyle={{fontSize: '10px'}} />
                      <Bar dataKey="Dental" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Optical" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Maternity" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Premium Summary */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col">
                <h3 className="text-center font-bold text-slate-700 mb-4">Total Premium per Plan (EGP)</h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={plans.map(p => ({ name: `${p.company} ${p.name}`, Premium: snapshots[p.id]?.premium || 0 }))} margin={{ top: 20, right: 30, left: 40, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 9}} interval={0} angle={-25} textAnchor="end" />
                      <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{fontSize: 10}} />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Bar dataKey="Premium" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Slide>
        )}

        {/* 8. Contact Page */}
        <Slide className="bg-slate-900 text-white flex-row">
          <div className="w-1/2 relative rounded-3xl overflow-hidden shadow-sm">
            <img crossOrigin="anonymous" src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=60&w=600&fm=jpg" className="absolute inset-0 w-full h-full object-cover" alt="Office" />
            <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply" />
          </div>
          <div className="w-1/2 p-20 flex flex-col justify-center">
            <img crossOrigin="anonymous" src="https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png" alt="IWIB Logo" className="h-20 object-contain bg-white p-3 rounded-xl mb-12 self-start shadow-md" />
            <h2 className="text-5xl font-black mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent leading-tight">Let's Build the Future Together</h2>
            <p className="text-xl text-slate-400 mb-12 font-light border-l-4 border-indigo-500 pl-4">We look forward to a successful partnership. Reach out to our team anytime.</p>
            
            <div className="grid grid-cols-1 gap-6 text-lg">
              <div className="flex items-center gap-6 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-sm">
                <MapPin className="text-indigo-400 w-8 h-8 shrink-0" />
                <span className="text-slate-200">5 El Nakheel St, Mohandessin</span>
              </div>
              <div className="flex items-center gap-6 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-sm">
                <Phone className="text-indigo-400 w-8 h-8 shrink-0" />
                <span className="text-slate-200">+20 101-333-0409</span>
              </div>
              <div className="flex items-center gap-6 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-sm">
                <Mail className="text-indigo-400 w-8 h-8 shrink-0" />
                <span className="text-slate-200">Info@iwib-eg.com</span>
              </div>
              <div className="flex items-center gap-6 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-sm">
                <Globe className="text-indigo-400 w-8 h-8 shrink-0" />
                <span className="text-slate-200">www.iwib-eg.com</span>
              </div>
            </div>
          </div>
        </Slide>

      </div>
    );
  }
);

OfferPDFTemplate.displayName = 'OfferPDFTemplate';
