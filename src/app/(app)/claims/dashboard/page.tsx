'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ClipboardList, ShieldAlert, DollarSign } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';

export default function ClaimsDashboard() {
  const { metrics, isLoading } = useDashboardMetrics();

  if (isLoading || !metrics) {
     return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Claims Engine...</div>;
  }

  const { open_claims, settlement_ratio, fraud_cases } = metrics.modules.claims || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader title="Claims Operations" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Open Claims" value={open_claims} icon={ClipboardList} colorVariant="primary" />
        <MetricCard title="Settlement Ratio" value={settlement_ratio != null ? `${Number(settlement_ratio).toFixed(1)}%` : 'N/A'} icon={DollarSign} colorVariant="success" />
        <MetricCard title="Fraud / Escalations" value={0} icon={ShieldAlert} colorVariant="danger" />
      </div>

      <div className="p-8 mt-6 bg-background border border-border rounded-2xl">
         <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">Live Claims Queue</h3>
         <p className="text-muted-foreground text-sm">All open claims are currently processing within SLA bounds.</p>
      </div>
    </div>
  );
}
