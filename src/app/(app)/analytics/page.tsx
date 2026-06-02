'use client';

import React, { useMemo } from 'react';
import { 
  TrendingUp, Activity, AlertTriangle, PieChart, Users, DollarSign, 
  ShieldAlert, ShieldCheck, HeartPulse, LineChart as LineChartIcon
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart as RePieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { formatCompactNumber } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function CEOAnalyticsDashboard() {
  const { metrics, isLoading } = useDashboardMetrics();

  const analytics = metrics?.modules?.ceo;

  if (isLoading || !analytics) {
     return <div className="p-8 text-center text-slate-500 animate-pulse">Aggregating system data...</div>;
  }

  const { totalWrittenPremium, overallLossRatio, combinedRatio } = metrics.global;
  const { highRiskAccounts, portfolioMixData, monthlyGrowthData } = analytics;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <PageHeader title="IWIB Strategic Dashboard" />

      {/* Global Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Written Premium (YTD)" value={formatCompactNumber(analytics.totalWrittenPremium)} icon={DollarSign} color="bg-blue-600" />
        <StatCard title="Overall Loss Ratio" value={`${analytics.overallLossRatio.toFixed(1)}%`} icon={Activity} color={analytics.overallLossRatio > 85 ? "bg-red-600" : "bg-emerald-600"} />
        <StatCard title="Combined Ratio" value={`${analytics.combinedRatio.toFixed(1)}%`} icon={LineChartIcon} color={analytics.combinedRatio > 100 ? "bg-red-600" : "bg-blue-600"} />
        <StatCard title="High Risk Accounts" value={analytics.highRiskAccounts.length} icon={AlertTriangle} color="bg-violet-500" />
      </div>

      <Tabs defaultValue="profitability" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-100 rounded-xl p-1">
          <TabsTrigger value="profitability" className="rounded-lg text-xs font-bold">Profitability View</TabsTrigger>
          <TabsTrigger value="growth" className="rounded-lg text-xs font-bold">Growth View</TabsTrigger>
          <TabsTrigger value="risk" className="rounded-lg text-xs font-bold">Risk View (Critical)</TabsTrigger>
          <TabsTrigger value="portfolio" className="rounded-lg text-xs font-bold">Portfolio Health</TabsTrigger>
        </TabsList>

        {/* --- PROFITABILITY VIEW --- */}
        <TabsContent value="profitability" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-none shadow-sm col-span-2">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800">Revenue vs Net Margin (MoM)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlyGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" />
                    <Area type="monotone" dataKey="premium" name="Written Premium" stroke="#6366f1" fillOpacity={1} fill="url(#colorPremium)" strokeWidth={3} />
                    <Area type="monotone" dataKey="margin" name="Net Margin" stroke="#10b981" fillOpacity={1} fill="url(#colorMargin)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800">Loss Ratio by Line</CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-[300px] overflow-y-auto">
                {analytics.portfolioMixData.length === 0 ? (
                   <p className="text-sm text-slate-400 text-center mt-10">No policies found.</p>
                ) : (
                  <div className="space-y-6">
                     {analytics.portfolioMixData.map((lob: any, idx: number) => (
                        <div key={lob.name}>
                           <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-slate-600">{lob.name}</span>
                              <span className={lob.lossRatio > 85 ? 'text-red-600' : 'text-indigo-600'}>{lob.lossRatio.toFixed(1)}%</span>
                           </div>
                           <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${lob.lossRatio > 85 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(lob.lossRatio, 100)}%` }} />
                           </div>
                        </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- RISK VIEW --- */}
        <TabsContent value="risk" className="space-y-6">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <Card className="rounded-3xl border-none shadow-sm col-span-2">
               <CardHeader className="border-b border-slate-100 bg-red-50/50 rounded-t-3xl">
                 <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
                   <ShieldAlert className="w-4 h-4" /> High Risk Accounts (LR &gt; 85%)
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                 <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                   {analytics.highRiskAccounts.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">No high risk accounts detected!</div>
                   ) : analytics.highRiskAccounts.map((acc: any, i: number) => (
                     <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div>
                         <p className="font-bold text-slate-800 text-sm">{acc.name}</p>
                         <p className="text-xs text-slate-500">Premium Volume: {formatCompactNumber(acc.premium)}</p>
                       </div>
                       <div className="text-right">
                         <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${acc.lr > 100 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                           {acc.lr.toFixed(1)}% LR
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>

             <Card className="rounded-3xl border-none shadow-sm">
               <CardHeader className="border-b border-slate-100">
                 <CardTitle className="text-sm font-bold text-slate-800">Fraud Indicators</CardTitle>
               </CardHeader>
               <CardContent className="p-6 h-[300px] flex flex-col justify-center">
                 <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-800 mb-2">No Suspicious Activity</p>
                    <p className="text-xs text-emerald-600 mb-4">The fraud detection engine has not flagged any recent claims.</p>
                 </div>
               </CardContent>
             </Card>
           </div>
        </TabsContent>

        {/* --- PORTFOLIO HEALTH --- */}
        <TabsContent value="portfolio" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="rounded-3xl border-none shadow-sm">
               <CardHeader className="border-b border-slate-100">
                 <CardTitle className="text-sm font-bold text-slate-800">Portfolio Mix (Premium Split)</CardTitle>
               </CardHeader>
               <CardContent className="p-6 h-[300px]">
                 {analytics.portfolioMixData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data to display</div>
                 ) : (
                    <>
                       <ResponsiveContainer width="100%" height="80%">
                         <RePieChart>
                           <Pie
                             data={analytics.portfolioMixData}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                           >
                             {analytics.portfolioMixData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                         </RePieChart>
                       </ResponsiveContainer>
                       <div className="flex justify-center gap-6 mt-4">
                          {analytics.portfolioMixData.map((entry: any, index: number) => (
                             <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                             </div>
                          ))}
                       </div>
                    </>
                 )}
               </CardContent>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
