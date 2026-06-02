'use client';

import React from 'react';
import { Users, Target, Phone, Briefcase, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { formatCompactNumber } from '@/lib/utils';

const activityData: any[] = [];

export default function CrmDashboard() {
  const { metrics, isLoading } = useDashboardMetrics();

  const { leads, prospects, pipeline_value, win_rate } = metrics?.modules?.sales || {};
  const { activities } = metrics?.modules?.crm || {};
  const clients = metrics?.modules?.policy_admin?.active_policies;

  const funnelData = [
    { name: 'Leads', value: leads || 0 },
    { name: 'Prospects', value: prospects || 0 },
    { name: 'Quotations', value: metrics?.modules?.underwriting?.pending_quotes || 0 },
    { name: 'Clients', value: clients || 0 },
  ];
  
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <PageHeader title="CRM & Sales Dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Leads" value={leads} icon={Target} colorVariant="primary" loading={isLoading} />
        <MetricCard title="Active Prospects" value={prospects} icon={Briefcase} colorVariant="primary" loading={isLoading} />
        <MetricCard title="Win Rate" value={`${Math.round(win_rate || 0)}%`} icon={Users} colorVariant="success" loading={isLoading} />
        <MetricCard title="Activities This Week" value={activities} icon={Phone} colorVariant="neutral" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">Sales Funnel</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">Weekly Activity Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="meetings" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No activity data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-bold text-slate-800">Requires Follow-up</CardTitle>
          <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center">View All <ChevronRight className="w-3 h-3 ml-1"/></button>
        </CardHeader>
        <CardContent className="p-0">
           <div className="p-6 text-center text-sm text-slate-400">
              No pending follow-ups at this time.
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
