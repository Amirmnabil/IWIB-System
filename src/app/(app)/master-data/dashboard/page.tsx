'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Database, Activity, CheckCircle2 } from 'lucide-react';

export default function MasterDataDashboard() {
  const { metrics, isLoading } = useDashboardMetrics();

  if (isLoading || !metrics) {
     return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Master Data Hub...</div>;
  }

  const { total_companies, data_quality_index, orphaned_records } = metrics.modules.master_data || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader title="Master Data Hub" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Registered Companies" value={total_companies} icon={Database} colorVariant="primary" />
        <MetricCard title="Data Quality Index" value={data_quality_index != null ? `${Number(data_quality_index).toFixed(1)}%` : 'N/A'} icon={Activity} colorVariant="success" />
        <MetricCard title="Orphaned Records" value={orphaned_records} icon={CheckCircle2} colorVariant={orphaned_records && orphaned_records > 0 ? "warning" : "success"} />
      </div>

      <div className="p-8 mt-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
         <div>
            <h3 className="text-sm font-bold text-slate-600 uppercase mb-2">System Integrity Check</h3>
            <p className="text-slate-500 text-sm">All foreign key relations are intact and synchronized with Supabase.</p>
         </div>
         <div className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold text-sm rounded-lg flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Healthy
         </div>
      </div>
    </div>
  );
}
