import React from 'react';
import { NavigationBar } from '@/components/shared/navbar';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react';

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <NavigationBar />
      
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest mb-6">
          <ShieldCheck className="w-4 h-4" /> B2B Enterprise Insurance
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black text-[#0A4174] tracking-tight max-w-4xl leading-tight">
          Enterprise Insurance Brokerage & Portfolio Management
        </h1>
        
        <p className="mt-6 text-lg text-slate-500 max-w-2xl font-medium leading-relaxed">
          Manage policies, calculate premiums instantly, track claims in real-time, and get AI-powered insights for your corporate health, motor, and property insurance needs.
        </p>
        
        <div className="mt-10 flex items-center gap-4">
          <a href="/dashboard" className="px-8 py-4 bg-[#0A4174] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-[#08335a] hover:-translate-y-0.5 transition-all">
            Access Dashboard
          </a>
          <a href="/contact" className="px-8 py-4 bg-white text-[#0A4174] font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:-translate-y-0.5 transition-all">
            Talk to an Expert
          </a>
        </div>
        
        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0A4174]">Secure Policy Admin</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Enterprise-grade security for your sensitive employee medical census and corporate assets.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0A4174]">Real-time Analytics</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Track utilization ratios, predict loss ratios, and optimize your premiums across all portfolios.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0A4174]">Seamless CRM</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Manage corporate clients, automate renewal reminders, and track broker commissions instantly.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
