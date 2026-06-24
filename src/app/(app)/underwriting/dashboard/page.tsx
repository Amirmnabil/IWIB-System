'use client';

import React from 'react';
import { Scale, FileSignature, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';

const COLORS = ['#6366f1', '#10b981'];

export default function UnderwritingDashboard() {
  const { metrics, isLoading } = useDashboardMetrics();

  const { pending_quotes, avg_tat_hours, approved_quotes } = metrics?.modules?.underwriting || {};
  
  // Real data binding (Empty states if no data)
  const splitData: any[] = [];
  const workflowData: any[] = [];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <PageHeader title="Underwriting Dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Pending Quotations" value={pending_quotes} icon={FileSignature} colorVariant="warning" loading={isLoading} />
        <MetricCard title="Avg TAT (Hrs)" value={avg_tat_hours != null ? Number(avg_tat_hours).toFixed(1) : 'N/A'} icon={Clock} colorVariant="primary" loading={isLoading} />
        <MetricCard title="Approved Quotes" value={approved_quotes} icon={Scale} colorVariant="success" loading={isLoading} />
        <MetricCard title="High Risk Flags" value={'None'} icon={AlertTriangle} colorVariant="neutral" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">SME vs Motor Split</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
             {splitData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={splitData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {splitData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex items-center justify-center h-full text-sm text-slate-400">No split data available</div>
             )}
             {splitData.length > 0 && (
               <div className="flex justify-center gap-6 mt-4">
                  {splitData.map((entry, index) => (
                     <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        <span className="text-xs font-bold text-muted-foreground">{entry.name}</span>
                     </div>
                  ))}
               </div>
             )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Approval Workflow</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            {workflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workflowData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No workflow data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader className="border-b border-border flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-bold text-foreground">High-Priority Pricing Requests</CardTitle>
          <button className="text-xs font-bold text-primary hover:text-indigo-800 flex items-center">View All <ChevronRight className="w-3 h-3 ml-1"/></button>
        </CardHeader>
        <CardContent className="p-0">
           <div className="p-6 text-center text-sm text-slate-400">
              No high-priority requests at this time.
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
