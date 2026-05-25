
'use client';
import React, { useState, useMemo } from 'react';
import {
  Activity,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  PhoneCall,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  BarChart3,
  UserCheck,
  Briefcase
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { format, subDays, isAfter } from 'date-fns';
import { 
  SalesPipelineChart, 
  ClaimsDistributionChart, 
  ActivityTrendChart,
  RevenueTrendChart,
  ConversionFunnelChart
} from './charts';
import { cn, formatCompactNumber } from '@/lib/utils';
import { useI18n } from '@/components/i18n-context';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';


export default function Dashboard() {
  const { t, isRtl } = useI18n();

  // Supabase data - all from one source of truth
  const { data: companiesData, isLoading: loadingComps } = useSupabaseCollection<any>('companies');
  const { data: activitiesData, isLoading: loadingActs } = useSupabaseCollection<any>('activities');
  const { data: prospectsData, isLoading: loadingPros } = useSupabaseCollection<any>('prospects');
  const { data: claimsData, isLoading: loadingClaims } = useSupabaseCollection<any>('claims');
  const { data: policiesData, isLoading: loadingPols } = useSupabaseCollection<any>('policies');

  const companies = companiesData || [];
  const activities = activitiesData || [];
  const prospects = prospectsData || [];
  const claims = claimsData || [];
  const policies = policiesData || [];

  const isLoading = loadingComps || loadingActs || loadingPros || loadingClaims || loadingPols;

  const stats = useMemo(() => {
    // Basic Counts
    const activePolicies = policies.filter((p: any) => p.policy_status === 'active');
    const totalPremium = activePolicies.reduce((sum: number, p: any) => sum + (p.premium_total || 0), 0);
    const leadsCount = companies.filter((c: any) => c.status === 'lead' || c.status === 'interested').length;

    // CRM Activity (Last 7 Days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentActivities = activities.filter((a: any) => a.created_at && isAfter(new Date(a.created_at), sevenDaysAgo));
    const callsCount = recentActivities.filter((a: any) => a.activity_type === 'call').length;
    const meetingsCount = recentActivities.filter((a: any) => a.activity_type === 'meeting').length;
    const pendingTasks = activities.filter((a: any) => a.status === 'pending').length;

    // Sales Pipeline
    const pipelineValue = prospects.reduce((sum: number, p: any) => sum + (p.estimated_value || 0), 0);
    const weightedValue = prospects.reduce((sum: number, p: any) => sum + ((p.estimated_value || 0) * ((p.probability || 0) / 100)), 0);

    // Claims
    const openClaims = claims.filter((c: any) => !['paid', 'rejected', 'cancelled'].includes((c.status || '').toLowerCase()));
    const totalClaimValue = claims.reduce((sum: number, c: any) => sum + (c.claim_amount || 0), 0);
    const lossRatio = totalPremium > 0 ? (totalClaimValue / totalPremium) * 100 : 0;

    // Conversion rate (prospects that became policies)
    const conversionRate = companies.length > 0 ? ((policies.length / companies.length) * 100) : 0;

    // Pipeline health: percentage of prospects with high probability (>60%)
    const highProbProspects = prospects.filter((p: any) => (p.probability || 0) >= 60).length;
    const pipelineHealthScore = prospects.length > 0 ? Math.round((highProbProspects / prospects.length) * 100) : 0;

    // Top Agents from activities
    const agentPerformance: Record<string, { count: number }> = {};
    activities.forEach((a: any) => {
      if (a.assigned_to_name) {
        if (!agentPerformance[a.assigned_to_name]) agentPerformance[a.assigned_to_name] = { count: 0 };
        agentPerformance[a.assigned_to_name].count++;
      }
    });
    const topAgents = Object.entries(agentPerformance)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // KYC Compliance
    const completedKyc = companies.filter((c: any) => c.checklist_completion === 'Completed').length;
    const kycCompliance = companies.length > 0 ? Math.round((completedKyc / companies.length) * 100) : 0;

    return {
      totalPremium,
      leadsCount,
      callsCount,
      meetingsCount,
      pendingTasks,
      pipelineValue,
      weightedValue,
      openClaimsCount: openClaims.length,
      lossRatio,
      activePoliciesCount: activePolicies.length,
      topAgents,
      conversionRate,
      pipelineHealthScore,
      kycCompliance,
    };
  }, [companies, activities, prospects, claims, policies]);

  const formatCurrency = (val: number, notation: 'standard' | 'compact' = 'standard') => {
    if (notation === 'compact') {
      return formatCompactNumber(val);
    }
    return new Intl.NumberFormat('en-EG', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className={cn("space-y-4 pb-12", isRtl && "font-arabic")}>
      <PageHeader title={t('intelligenceDashboard')}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold">
            <Calendar className="w-3 h-3 mr-1" /> Last 30 Days
          </Button>
          <Button size="sm" className="h-8 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Save Layout
          </Button>
        </div>
      </PageHeader>

      {/* DYNAMIC KPI STRIP (High Density, 6 per row on UHD) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title={t('activePremium')} value={formatCompactNumber(stats.totalPremium)} icon={DollarSign} color="bg-indigo-600" loading={isLoading} />
        <StatCard title={t('pipelineValue')} value={formatCompactNumber(stats.pipelineValue)} icon={TrendingUp} color="bg-blue-600" loading={isLoading} />
        <StatCard title={t('activePolicies')} value={stats.activePoliciesCount} icon={FileText} color="bg-emerald-600" loading={isLoading} />
        <StatCard title={t('qualifiedLeads')} value={stats.leadsCount} icon={Target} color="bg-violet-600" loading={isLoading} />
        <StatCard title={t('openClaims')} value={stats.openClaimsCount} icon={Activity} color="bg-red-500" loading={isLoading} />
        <StatCard title={t('lossRatio')} value={`${stats.lossRatio.toFixed(1)}%`} icon={AlertTriangle} color={stats.lossRatio > 70 ? "bg-red-500" : "bg-emerald-500"} loading={isLoading} />
      </div>

      {/* ROW 1: PRIMARY ANALYTICS (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue vs Loss Trend */}
        <Card className="rounded-xl border border-slate-100 shadow-sm col-span-1 lg:col-span-2 flex flex-col">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <Activity className={cn("w-3.5 h-3.5 text-indigo-500", isRtl ? "ml-1" : "mr-1")} /> Revenue & Loss Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 h-[220px]">
            <RevenueTrendChart />
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card className="rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <Target className={cn("w-3.5 h-3.5 text-indigo-500", isRtl ? "ml-1" : "mr-1")} /> Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 h-[220px]">
            <ConversionFunnelChart />
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: SECONDARY ANALYTICS (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Sales Pipeline by Stage */}
        <Card className="rounded-xl border border-slate-100 shadow-sm flex flex-col col-span-1 xl:col-span-2">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <Briefcase className={cn("w-3.5 h-3.5 text-indigo-500", isRtl ? "ml-1" : "mr-1")} /> Pipeline Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 h-[200px]">
            <SalesPipelineChart prospects={prospects} />
          </CardContent>
        </Card>

        {/* Claims Distribution */}
        <Card className="rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className={cn("w-3.5 h-3.5 text-indigo-500", isRtl ? "ml-1" : "mr-1")} /> Claims Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 h-[200px]">
            <ClaimsDistributionChart claims={claims} />
          </CardContent>
        </Card>

        {/* Pipeline Health Gauge */}
        <Card className="rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Pipeline Health
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center justify-center h-[200px]">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                <circle
                  cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={314}
                  strokeDashoffset={314 * (1 - stats.pipelineHealthScore / 100)}
                  className={stats.pipelineHealthScore >= 60 ? "text-emerald-500" : stats.pipelineHealthScore >= 30 ? "text-amber-500" : "text-red-500"}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900">{stats.pipelineHealthScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: AGENTS & LISTS (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Activity Bar */}
        <Card className="rounded-xl border border-slate-100 shadow-sm col-span-1 flex flex-col">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <Users className={cn("w-3.5 h-3.5 text-indigo-500", isRtl ? "ml-1" : "mr-1")} /> Agent Activity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 h-[250px]">
            <ActivityTrendChart activities={activities} byUser />
          </CardContent>
        </Card>

        {/* Top Performers (Dense List) */}
        <Card className="rounded-xl border border-slate-100 shadow-sm col-span-1 flex flex-col">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[250px]">
            {stats.topAgents.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-8">No agent activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.topAgents.map((agent, i) => (
                  <div key={agent.name} className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-800 truncate">{agent.name}</p>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(agent.count / (stats.topAgents[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-indigo-600">{agent.count} acts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Priorities */}
        <Card className="rounded-xl border border-slate-100 shadow-sm col-span-1 flex flex-col">
          <CardHeader className="py-2.5 px-4 border-b border-slate-100">
            <CardTitle className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Critical Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[250px]">
            <div className="divide-y divide-slate-100">
              {companies
                .filter((c: any) => c.priority === 'critical' || c.priority === 'high')
                .slice(0, 10)
                .map((item: any, idx: number) => (
                  <div key={item.id || idx} className="p-3 hover:bg-slate-50 transition-colors flex gap-2">
                    <div className="w-7 h-7 rounded bg-red-50 flex items-center justify-center shrink-0 text-red-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-[12px] truncate">{item.name}</p>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className="text-[10px] text-slate-500 font-medium truncate">{item.industry}</p>
                        <StatusBadge status={item.status} className="h-4 text-[9px] px-1.5 py-0" />
                      </div>
                    </div>
                  </div>
                ))}
              {companies.length === 0 && !isLoading && (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 opacity-20" />
                  <p className="text-[10px] font-bold">{t('noCriticalItems')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
