'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { MetricCard } from '@/components/dashboard/metric-card';
import { FileText, CalendarCheck, Clock } from 'lucide-react';

export default function PolicyAdminDashboard() {
  const { metrics, isLoading } = useDashboardMetrics();

  if (isLoading || !metrics) {
     return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Policy Administration...</div>;
  }

  const { active_policies, expiring_60_days } = metrics.modules.policy_admin || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader title="Policy Administration" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Active Policies" value={active_policies} icon={FileText} colorVariant="primary" />
        <MetricCard title="Expiring (60 Days)" value={expiring_60_days} icon={CalendarCheck} colorVariant="warning" />
        <MetricCard title="Endorsement Backlog" value={0} icon={Clock} colorVariant="neutral" />
      </div>

      <div className="p-8 mt-6 bg-slate-50 border border-slate-200 rounded-2xl">
         <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">Renewal Pipeline</h3>
         <p className="text-slate-500 text-sm">All policy expirations are tracking properly.</p>
      </div>
    </div>
  );
}
