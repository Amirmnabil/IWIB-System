
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
  Layers,
  Search,
  Filter,
  UserCheck,
  Briefcase
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
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
import { useCollection, useFirestore, useMemoFirebase, collection } from '@/firebase';
import { format, subDays, isAfter } from 'date-fns';
import { 
  SalesPipelineChart, 
  ClaimsDistributionChart, 
  ActivityTrendChart,
} from './charts';
import type { Company, Activity as UserActivity, Prospect, Claim, Policy } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-context';

type DashboardView = 'overview' | 'crm_activity' | 'sales_performance' | 'ops_claims';

export default function Dashboard() {
  const { t } = useI18n();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const firestore = useFirestore();

  // Firestore Subscriptions
  const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);
  const activitiesRef = useMemoFirebase(() => collection(firestore!, 'activities'), [firestore]);
  const prospectsRef = useMemoFirebase(() => collection(firestore!, 'prospects'), [firestore]);
  const claimsRef = useMemoFirebase(() => collection(firestore!, 'claims'), [firestore]);
  const policiesRef = useMemoFirebase(() => collection(firestore!, 'policies'), [firestore]);

  const { data: companiesData, isLoading: loadingComps } = useCollection<Company>(companiesRef);
  const { data: activitiesData, isLoading: loadingActs } = useCollection<UserActivity>(activitiesRef);
  const { data: prospectsData, isLoading: loadingPros } = useCollection<Prospect>(prospectsRef);
  const { data: claimsData, isLoading: loadingClaims } = useCollection<Claim>(claimsRef);
  const { data: policiesData, isLoading: loadingPols } = useCollection<Policy>(policiesRef);

  // Standardize data to always be an array to avoid null-pointer errors during calculations
  const companies = companiesData || [];
  const activities = activitiesData || [];
  const prospects = prospectsData || [];
  const claims = claimsData || [];
  const policies = policiesData || [];

  const isLoading = loadingComps || loadingActs || loadingPros || loadingClaims || loadingPols;

  // --- ANALYTICAL CALCULATIONS ---

  const stats = useMemo(() => {
    if (isLoading) return {
      totalPremium: 0,
      leadsCount: 0,
      callsCount: 0,
      meetingsCount: 0,
      pipelineValue: 0,
      weightedValue: 0,
      openClaimsCount: 0,
      lossRatio: 0,
      activePoliciesCount: 0
    };

    // Basic Counts
    const activePolicies = policies.filter(p => p.policy_status === 'active');
    const totalPremium = activePolicies.reduce((sum, p) => sum + (p.premium_total || 0), 0);
    const leadsCount = companies.filter(c => c.status === 'lead').length;
    
    // CRM Activity (Last 7 Days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentActivities = activities.filter(a => a.created_at && isAfter(new Date(a.created_at), sevenDaysAgo));
    const callsCount = recentActivities.filter(a => a.activity_type === 'call').length;
    const meetingsCount = recentActivities.filter(a => a.activity_type === 'meeting').length;

    // Sales Pipeline
    const pipelineValue = prospects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    const weightedValue = prospects.reduce((sum, p) => sum + ((p.estimated_value || 0) * ((p.probability || 0) / 100)), 0);

    // Claims
    const openClaims = claims.filter(c => !['paid', 'rejected', 'cancelled'].includes(c.status?.toLowerCase()));
    const totalClaimValue = claims.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
    const lossRatio = totalPremium > 0 ? (totalClaimValue / totalPremium) * 100 : 0;

    return {
      totalPremium,
      leadsCount,
      callsCount,
      meetingsCount,
      pipelineValue,
      weightedValue,
      openClaimsCount: openClaims.length,
      lossRatio,
      activePoliciesCount: activePolicies.length
    };
  }, [isLoading, companies, activities, prospects, claims, policies]);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader 
        title={t('intelligenceDashboard')} 
        description="Cross-module analytical measurement and performance metrics."
      >
        <div className="flex items-center gap-2">
          <Label className="text-xs font-black uppercase text-slate-400">View Section:</Label>
          <Select value={currentView} onValueChange={(v) => setCurrentView(v as DashboardView)}>
            <SelectTrigger className="w-[240px] h-11 bg-white border-2 border-indigo-100 shadow-sm font-bold">
              <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
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
            <StatCard title={t('activePremium')} value={`EGP ${(stats.totalPremium / 1000000).toFixed(2)}M`} icon={DollarSign} color="bg-indigo-600" loading={isLoading} />
            <StatCard title={t('lossRatio')} value={`${stats.lossRatio.toFixed(1)}%`} icon={Activity} color={stats.lossRatio > 70 ? "bg-red-500" : "bg-emerald-500"} loading={isLoading} />
            <StatCard title={t('activePolicies')} value={stats.activePoliciesCount} icon={FileText} color="bg-blue-500" loading={isLoading} />
            <StatCard title={t('qualifiedLeads')} value={stats.leadsCount} icon={Target} color="bg-violet-500" loading={isLoading} />
          </>
        )}
        {currentView === 'crm_activity' && (
          <>
            <StatCard title={t('calls7d')} value={stats.callsCount} icon={PhoneCall} color="bg-blue-600" loading={isLoading} />
            <StatCard title={t('meetings7d')} value={stats.meetingsCount} icon={Calendar} color="bg-purple-600" loading={isLoading} />
            <StatCard title={t('avgInteractions')} value={(activities.length / 30).toFixed(1)} icon={TrendingUp} color="bg-amber-500" loading={isLoading} />
            <StatCard title={t('pendingTasks')} value={activities.filter(a => a.status === 'pending').length} icon={Clock} color="bg-slate-700" loading={isLoading} />
          </>
        )}
        {currentView === 'sales_performance' && (
          <>
            <StatCard title={t('pipelineValue')} value={`EGP ${(stats.pipelineValue / 1000).toFixed(0)}K`} icon={DollarSign} color="bg-indigo-600" loading={isLoading} />
            <StatCard title={t('weightedForecast')} value={`EGP ${(stats.weightedValue / 1000).toFixed(0)}K`} icon={TrendingUp} color="bg-emerald-600" loading={isLoading} />
            <StatCard title={t('activeProspects')} value={prospects.length} icon={Briefcase} color="bg-amber-500" loading={isLoading} />
            <StatCard title={t('conversionRate')} value={`${((policies.length / Math.max(companies.length, 1)) * 100).toFixed(1)}%`} icon={CheckCircle2} color="bg-blue-500" loading={isLoading} />
          </>
        )}
        {currentView === 'ops_claims' && (
          <>
            <StatCard title={t('openClaims')} value={stats.openClaimsCount} icon={Activity} color="bg-red-500" loading={isLoading} />
            <StatCard title={t('claimsVol')} value={claims.length} icon={Layers} color="bg-indigo-500" loading={isLoading} />
            <StatCard title={t('avgClaimAmt')} value={`EGP ${(stats.openClaimsCount > 0 ? (stats.totalPremium / claims.length) / 10 : 0).toFixed(0)}`} icon={DollarSign} color="bg-emerald-500" loading={isLoading} />
            <StatCard title={t('kycCompliance')} value={`${((companies.filter(c => c.checklist_completion === 'Completed').length / Math.max(companies.length, 1)) * 100).toFixed(0)}%`} icon={UserCheck} color="bg-blue-600" loading={isLoading} />
          </>
        )}
      </div>

      {/* ANALYTICAL BLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PRIMARY CHARTS */}
        <div className="lg:col-span-8 space-y-6">
          {currentView === 'overview' && (
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900">{t('revenueRiskTrend')}</CardTitle>
                <CardDescription>Monthly movement of written premiums vs. claim exposures.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ActivityTrendChart activities={activities} />
              </CardContent>
            </Card>
          )}

          {currentView === 'crm_activity' && (
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900">{t('agentActivityBreakdown')}</CardTitle>
                <CardDescription>Measurement of calls, meetings, and notes by user.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[400px]">
                  <ActivityTrendChart activities={activities} byUser />
                </div>
              </CardContent>
            </Card>
          )}

          {currentView === 'sales_performance' && (
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900">{t('salesPipelineFunnel')}</CardTitle>
                <CardDescription>Distribution of opportunities across the sales cycle.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <SalesPipelineChart prospects={prospects} />
              </CardContent>
            </Card>
          )}

          {currentView === 'ops_claims' && (
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900">{t('claimsProcessingCycle')}</CardTitle>
                <CardDescription>Current volume of claims grouped by processing status.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ClaimsDistributionChart claims={claims} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIONABLE LISTS / SECONDARY METRICS */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-indigo-900 text-white">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                {currentView === 'crm_activity' ? t('recentUserActivity') : t('criticalPriorities')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {(currentView === 'crm_activity' ? activities : companies.filter(c => c.priority === 'critical' || c.priority === 'high'))
                  .slice(0, 15)
                  .map((item: any, idx) => (
                    <div key={item.id || idx} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        currentView === 'crm_activity' ? "bg-indigo-50 text-indigo-600" : "bg-red-50 text-red-600"
                      )}>
                        {currentView === 'crm_activity' ? (
                          item.activity_type === 'call' ? <PhoneCall className="w-5 h-5" /> : <Calendar className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">{item.subject || item.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {currentView === 'crm_activity' ? `${item.assigned_to_name} • ${item.related_name || 'Internal'}` : `${item.industry} • ${item.status}`}
                        </p>
                        <div className="flex justify-between items-center mt-1">
                          <StatusBadge status={item.status} className="h-5 text-[9px]" />
                          <span className="text-[9px] font-black text-slate-400 uppercase">
                            {item.created_at ? format(new Date(item.created_at), 'MMM d, p') : 'Just now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                {companies.length === 0 && !isLoading && (
                  <div className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">No critical items detected.</p>
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
