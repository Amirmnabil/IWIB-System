import React, { forwardRef } from 'react';
import type { SMEPlan, CalculationBreakdown } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OfferPDFTemplateProps {
  offerName: string;
  companyName: string;
  date: string;
  plans: SMEPlan[];
  snapshots: Record<string, { premium: number; breakdown: CalculationBreakdown }>;
}

export const OfferPDFTemplate = forwardRef<HTMLDivElement, OfferPDFTemplateProps>(
  ({ offerName, companyName, date, plans, snapshots }, ref) => {

    // Prepare data for comparison chart
    const chartData = plans.map(p => ({
      name: p.name,
      'Total Premium': snapshots[p.id]?.premium || 0,
      'Annual Limit': p.annualLimitValue || 0
    }));

    return (
      <div ref={ref} className="bg-white text-slate-800 p-8 w-[800px] flex flex-col gap-8" style={{ minHeight: '1122px' }}>
        {/* Cover Page Section */}
        <div className="flex flex-col items-center justify-center text-center space-y-6 pb-12 border-b-2 border-sme-primary">
          <div className="w-48 h-24 bg-sme-primary text-white flex items-center justify-center rounded-lg mb-4">
            <h1 className="text-4xl font-black">IWIB</h1>
            <span className="text-sm font-bold ml-2 mt-4">Brokerage</span>
          </div>
          <h1 className="text-4xl font-black text-sme-primary uppercase tracking-widest">{offerName || 'Medical Insurance Offer'}</h1>
          <h2 className="text-2xl font-bold text-slate-600">Prepared for: {companyName}</h2>
          <p className="text-slate-400 font-semibold">Date Issued: {date}</p>

          <div className="mt-8 pt-8 bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm font-medium w-full max-w-md text-left space-y-2">
            <h3 className="font-bold text-sme-primary border-b pb-2 mb-3">IWIB Contact Details</h3>
            <p><strong>Address:</strong> 5 Alnakheel St., Mohandessin</p>
            <p><strong>HOTLINE:</strong> 01013330409</p>
            <p><strong>Mobile:</strong> 01111296209 – 01113003119 – 01070031669</p>
            <p><strong>Email:</strong> Info@iwib-eg.com</p>
            <p><strong>Website:</strong> www.iwib-eg.com</p>
          </div>
        </div>

        {/* Comparison Section */}
        {plans.length > 1 && (
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-sme-primary border-l-4 border-sme-accent pl-3">Plans Comparison</h3>
            <div className="h-64 w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#4f46e5" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Total Premium" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Plans Details */}
        <div className="space-y-8 flex-1">
          <h3 className="text-2xl font-black text-sme-primary border-l-4 border-sme-accent pl-3">Selected Plans Breakdown</h3>

          <div className="grid grid-cols-1 gap-6">
            {plans.map(p => (
              <div key={p.id} className="border border-slate-200 rounded-2xl overflow-hidden page-break-inside-avoid">
                <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-xl text-slate-800">{p.company}</h4>
                    <p className="text-indigo-600 font-bold uppercase tracking-wider text-sm">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Premium</p>
                    <p className="text-2xl font-black text-indigo-700">{snapshots[p.id]?.premium.toLocaleString()} EGP</p>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><strong className="text-slate-500">Annual Limit:</strong> {p.annualLimit}</p>
                    <p><strong className="text-slate-500">TPA:</strong> {p.tpa}</p>
                    <p><strong className="text-slate-500">Network:</strong> {p.network}</p>
                    <p><strong className="text-slate-500">Inpatient:</strong> {p.inpatient}</p>
                    <p><strong className="text-slate-500">Consultations:</strong> {p.consultations}</p>
                  </div>
                  <div className="space-y-2">
                    <p><strong className="text-slate-500">Medications:</strong> {p.medications}</p>
                    <p><strong className="text-slate-500">Optical:</strong> {p.optical}</p>
                    <p><strong className="text-slate-500">Dental:</strong> {p.dental}</p>
                    <p><strong className="text-slate-500">Maternity:</strong> {p.maternity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
          This offer is generated automatically by IWIB System. Prices and benefits are subject to final underwriting approval.
        </div>
      </div>
    );
  }
);

OfferPDFTemplate.displayName = 'OfferPDFTemplate';
