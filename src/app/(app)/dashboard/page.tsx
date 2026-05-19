
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
} from './charts';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-context';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';

type DashboardView = 'overview' | 'crm_activity' | 'sales_performance' | 'ops_claims';

export default function Dashboard() {
  const { t, isRtl } = useI18n();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');

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
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      notation,
      maximumFractionDigits: notation === 'compact' ? 1 : 0,
    }).format(val);
  };

  return (
    <div className={cn("space-y-6 pb-12", isRtl && "font-arabic")}>
      <PageHeader title={t('intelligenceDashboard')}>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-black uppercase text-slate-400">{t('viewSection')}</Label>
          <Select value={currentView} onValueChange={(v) => setCurrentView(v as DashboardView)}>
            <SelectTrigger className="w-[240px] h-11 bg-white border-2 border-indigo-100 shadow-sm font-bold">
              <BarChart3 className={cn("w-4 h-4 text-indigo-600", isRtl ? "ml-2" : "mr-2")} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">{t('executiveOverview')}</SelectItem>
              <SelectItem value="crm_activity">{t('crmUserActivity')}</SelectItem>
              <SelectItem value="sales_performance">{t('salesPerformance')}</SelectItem>
              <SelectItem value="ops_claims">{t('opsClaims')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* DYNAMIC KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentView === 'overview' && (
          <>
            <StatCard title={t('activePremium')} value={formatCurrency(stats.totalPremium, 'compact')} icon={DollarSign} color="bg-indigo-600" loading={isLoading} />
            <StatCard title={t('lossRatio')} value={`${stats.lossRatio.toFixed(1)}%`} icon={Activity} color={stats.lossRatio > 70 ? "bg-red-500" : "bg-emerald-500"} loading={isLoading} />
            <StatCard title={t('activePolicies')} value={stats.activePoliciesCount} icon={FileText} color="bg-blue-500" loading={isLoading} />
            <StatCard title={t('qualifiedLeads')} value={stats.leadsCount} icon={Target} color="bg-violet-500" loading={isLoading} />
          </>
        )}
        {currentView === 'crm_activity' && (
          <>
            <StatCard title={t('calls7d')} value={stats.callsCount} icon={PhoneCall} color="bg-blue-600" loading={isLoading} />
            <StatCard title={t('meetings7d')} value={stats.meetingsCount} icon={Calendar} color="bg-purple-600" loading={isLoading} />
            <StatCard title={t('pendingTasks')} value={stats.pendingTasks} icon={Clock} color="bg-amber-500" loading={isLoading} />
            <StatCard title={t('avgInteractions')} value={(activities.length > 0 ? (activities.length / 30).toFixed(1) : '0')} icon={TrendingUp} color="bg-slate-700" loading={isLoading} />
          </>
        )}
        {currentView === 'sales_performance' && (
          <>
            <StatCard title={t('pipelineValue')} value={formatCurrency(stats.pipelineValue, 'compact')} icon={DollarSign} color="bg-indigo-600" loading={isLoading} />
            <StatCard title={t('weightedForecast')} value={formatCurrency(stats.weightedValue, 'compact')} icon={TrendingUp} color="bg-emerald-600" loading={isLoading} />
            <StatCard title={t('activeProspects')} value={prospects.length} icon={Briefcase} color="bg-amber-500" loading={isLoading} />
            <StatCard title={t('conversionRate')} value={`${stats.conversionRate.toFixed(1)}%`} icon={CheckCircle2} color="bg-blue-500" loading={isLoading} />
          </>
        )}
        {currentView === 'ops_claims' && (
          <>
            <StatCard title={t('openClaims')} value={stats.openClaimsCount} icon={Activity} color="bg-red-500" loading={isLoading} />
            <StatCard title={t('claimsVol')} value={claims.length} icon={FileText} color="bg-indigo-500" loading={isLoading} />
            <StatCard title={t('lossRatio')} value={`${stats.lossRatio.toFixed(1)}%`} icon={DollarSign} color={stats.lossRatio > 70 ? "bg-red-500" : "bg-emerald-500"} loading={isLoading} />
            <StatCard title={t('kycCompliance')} value={`${stats.kycCompliance}%`} icon={UserCheck} color="bg-blue-600" loading={isLoading} />
          </>
        )}
      </div>

      {/* ANALYTICAL BLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PRIMARY CHARTS */}
        <div className="lg:col-span-8 space-y-6">
          {currentView === 'overview' && (
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className={cn("w-4 h-4 text-indigo-500", isRtl ? "ml-2" : "mr-2")} /> {t('revenueRiskTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ActivityTrendChart activities={activities} />
              </CardContent>
            </Card>
          )}

          {currentView === 'crm_activity' && (
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className={cn("w-4 h-4 text-indigo-500", isRtl ? "ml-2" : "mr-2")} /> {t('agentActivityBreakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[400px]">
                  <ActivityTrendChart activities={activities} byUser />
                </div>
              </CardContent>
            </Card>
          )}

          {currentView === 'sales_performance' && (
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Target className={cn("w-4 h-4 text-indigo-500", isRtl ? "ml-2" : "mr-2")} /> {t('salesPipelineFunnel')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <SalesPipelineChart prospects={prospects} />
              </CardContent>
            </Card>
          )}

          {currentView === 'ops_claims' && (
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className={cn("w-4 h-4 text-indigo-500", isRtl ? "ml-2" : "mr-2")} /> {t('claimsProcessingCycle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ClaimsDistributionChart claims={claims} />
              </CardContent>
            </Card>
          )}

          {/* Bottom widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Agents */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" /> {t('topPerformingAgents') || "Top Agents"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {stats.topAgents.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No agent activity recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {stats.topAgents.map((agent, i) => (
                      <div key={agent.name} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{agent.name}</p>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${(agent.count / (stats.topAgents[0]?.count || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-black text-indigo-600">{agent.count} acts</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pipeline Health */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> {t('pipelineHealth') || "Pipeline Health"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                    <circle
                      cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={364}
                      strokeDashoffset={364 * (1 - stats.pipelineHealthScore / 100)}
                      className={stats.pipelineHealthScore >= 60 ? "text-emerald-500" : stats.pipelineHealthScore >= 30 ? "text-amber-500" : "text-red-500"}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{stats.pipelineHealthScore}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Health</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">
                  {prospects.length === 0
                    ? "No prospects in pipeline yet."
                    : `${stats.topAgents.length > 0 ? stats.topAgents[0].name + ' leads activity.' : 'Based on prospect probability scores.'}`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIONABLE LISTS */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100 text-slate-700">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className={cn("w-4 h-4 text-amber-500", isRtl ? "ml-2" : "mr-2")} />
                {currentView === 'crm_activity' ? t('recentUserActivity') : t('criticalPriorities')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {currentView === 'crm_activity'
                  ? activities.slice(0, 15).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
                        {item.activity_type === 'call' ? <PhoneCall className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">{item.subject}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{item.assigned_to_name} • {item.related_name || t('internal')}</p>
                        <div className="flex justify-between items-center mt-1">
                          <StatusBadge status={item.status} className="h-5 text-[9px]" />
                          <span className="text-[9px] font-black text-slate-400 uppercase">
                            {item.created_at ? format(new Date(item.created_at), 'MMM d, p') : t('justNow')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                  : companies
                    .filter((c: any) => c.priority === 'critical' || c.priority === 'high')
                    .slice(0, 15)
                    .map((item: any, idx: number) => (
                      <div key={item.id || idx} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-600">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate">{item.industry} • {item.status}</p>
                          <div className="flex justify-between items-center mt-1">
                            <StatusBadge status={item.status} className="h-5 text-[9px]" />
                          </div>
                        </div>
                      </div>
                    ))}
                {companies.length === 0 && !isLoading && (
                  <div className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">{t('noCriticalItems')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
