'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { MetricCard } from '@/components/dashboard/metric-card';
import { FileText, CalendarCheck, Clock } from 'lucide-react';
import { useI18n } from '@/components/i18n-context';

export default function PolicyAdminDashboard() {
  const { t } = useI18n();
  const { metrics, isLoading } = useDashboardMetrics();

  if (isLoading || !metrics) {
     return <div className="p-8 text-center text-muted-foreground animate-pulse">{t('loadingPolicyAdministration' as any) || "Loading Policy Administration..."}</div>;
  }

  const { active_policies, expiring_60_days } = metrics.modules.policy_admin || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader title={t('policyAdministration' as any) || "Policy Administration"} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title={t('activePolicies' as any) || "Active Policies"} value={active_policies} icon={FileText} colorVariant="primary" />
        <MetricCard title={t('expiring60Days' as any) || "Expiring (60 Days)"} value={expiring_60_days} icon={CalendarCheck} colorVariant="warning" />
        <MetricCard title={t('endorsementBacklog' as any) || "Endorsement Backlog"} value={0} icon={Clock} colorVariant="neutral" />
      </div>

      <div className="p-8 mt-6 bg-background border border-border rounded-2xl">
         <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">{t('renewalPipeline' as any) || "Renewal Pipeline"}</h3>
         <p className="text-muted-foreground text-sm">{t('allExpirationsTracking' as any) || "All policy expirations are tracking properly."}</p>
      </div>
    </div>
  );
}
