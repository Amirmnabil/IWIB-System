'use client';

import React, { useMemo } from 'react';
import { 
  Users, Target, Phone, Briefcase, ChevronRight, DollarSign, 
  Activity, TrendingUp, CheckCircle2, Award, AlertCircle, Calendar, Clock, BarChart4,
  Percent, Coins, Sparkles, Trophy, Navigation, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useI18n } from '@/components/i18n-context';
import { formatCompactNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Progress } from "@/components/ui/progress";

const EMPTY_ARRAY: any[] = [];

export default function CrmDashboard() {
  const { t, isRtl } = useI18n();
  const router = useRouter();
  const { isAdmin, internalUserId } = usePermissions();

  // Fetch Supabase data collection hooks
  const { data: leadsData, isLoading: leadsLoading } = useSupabaseCollection<any>('leads');
  const { data: prospectsData, isLoading: prospectsLoading } = useSupabaseCollection<any>('prospects');
  const { data: activitiesData, isLoading: activitiesLoading } = useSupabaseCollection<any>('activities');
  const { data: usersData, isLoading: usersLoading } = useSupabaseCollection<any>('users');

  const isLoading = leadsLoading || prospectsLoading || activitiesLoading || usersLoading;

  // Filter collections based on permission (Agents only see their assignments)
  const filteredLeads = useMemo(() => {
    if (!leadsData) return EMPTY_ARRAY;
    if (!isAdmin && internalUserId) {
      return leadsData.filter((l: any) => l.assigned_user_id === internalUserId);
    }
    return leadsData;
  }, [leadsData, isAdmin, internalUserId]);

  const filteredProspects = useMemo(() => {
    if (!prospectsData) return EMPTY_ARRAY;
    if (!isAdmin && internalUserId) {
      return prospectsData.filter((p: any) => p.assigned_user_id === internalUserId);
    }
    return prospectsData;
  }, [prospectsData, isAdmin, internalUserId]);

  const filteredActivities = useMemo(() => {
    if (!activitiesData) return EMPTY_ARRAY;
    if (!isAdmin && internalUserId) {
      return activitiesData.filter((a: any) => a.assigned_to_id === internalUserId);
    }
    return activitiesData;
  }, [activitiesData, isAdmin, internalUserId]);

  const users = usersData || EMPTY_ARRAY;

  // Calculate high-level KPIs
  const totalLeadsCount = filteredLeads.length;
  
  const activeProspectsList = useMemo(() => {
    return filteredProspects.filter(p => !['closed_won', 'closed_lost', 'won', 'lost'].includes(p.pipeline_stage?.toLowerCase()));
  }, [filteredProspects]);

  const activeProspectsCount = activeProspectsList.length;

  const pipelineValue = useMemo(() => {
    return activeProspectsList.reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);
  }, [activeProspectsList]);

  const weightedForecast = useMemo(() => {
    return activeProspectsList.reduce((sum, p) => sum + (Number(p.estimated_value || 0) * (Number(p.probability || 50) / 100)), 0);
  }, [activeProspectsList]);

  const winRate = useMemo(() => {
    const resolved = filteredProspects.filter(p => ['closed_won', 'closed_lost', 'won', 'lost'].includes(p.pipeline_stage?.toLowerCase()));
    const won = filteredProspects.filter(p => ['closed_won', 'won'].includes(p.pipeline_stage?.toLowerCase()));
    return resolved.length > 0 ? (won.length / resolved.length) * 100 : 0;
  }, [filteredProspects]);

  // Lead Conversion Rate (Percentage of leads that successfully generated active prospects/deals)
  const leadConversionRate = useMemo(() => {
    const convertedLeadsCount = new Set(filteredProspects.map(p => p.lead_id).filter(Boolean)).size;
    return totalLeadsCount > 0 ? (convertedLeadsCount / totalLeadsCount) * 100 : 0;
  }, [filteredProspects, totalLeadsCount]);

  // Average Deal Size
  const avgDealSize = useMemo(() => {
    return activeProspectsCount > 0 ? pipelineValue / activeProspectsCount : 0;
  }, [pipelineValue, activeProspectsCount]);

  // Monthly Sales Target Progress (Closed Won value in current month against 2.5M EGP Target)
  const targetGoal = 2500000;
  const currentMonthWonValue = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return filteredProspects
      .filter((p: any) => {
        if (!['closed_won', 'won'].includes(p.pipeline_stage?.toLowerCase())) return false;
        // Check if date falls in current month
        const date = p.expected_close_date ? new Date(p.expected_close_date) : null;
        return date && date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      })
      .reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);
  }, [filteredProspects]);

  const targetProgressPercent = Math.min(100, Math.round((currentMonthWonValue / targetGoal) * 100));

  // Chart 1: Sales Funnel (Leads -> Qualified -> Negotiation -> Won)
  const funnelData = useMemo(() => {
    return [
      { name: 'Leads', value: totalLeadsCount },
      { name: 'Qualified', value: filteredProspects.filter(p => ['qualification', 'needs_analysis'].includes(p.pipeline_stage?.toLowerCase())).length },
      { name: 'Negotiation', value: filteredProspects.filter(p => ['negotiation', 'proposal'].includes(p.pipeline_stage?.toLowerCase())).length },
      { name: 'Won Clients', value: filteredProspects.filter(p => ['closed_won', 'won'].includes(p.pipeline_stage?.toLowerCase())).length },
    ];
  }, [totalLeadsCount, filteredProspects]);

  // Chart 2: Product (LOB) Pipeline Share (Donut Chart)
  const lobPipelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProspects.forEach((p: any) => {
      if (['closed_lost', 'lost'].includes(p.pipeline_stage?.toLowerCase())) return;
      const products = p.requested_products || ['Medical'];
      const val = Number(p.estimated_value || 0);
      products.forEach((prod: string) => {
        counts[prod] = (counts[prod] || 0) + val;
      });
    });
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredProspects]);

  // Chart 3: Lead Sources Performance (Bar Chart)
  const leadSourcesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach((l: any) => {
      const src = l.lead_source || 'Direct';
      counts[src] = (counts[src] || 0) + 1;
    });
    const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#14b8a6'];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Chart 4: Monthly Lead Generation Trend (Line Chart)
  const leadGenerationTrendData = useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string, monthName: string, value: number }> = {};
    
    // Seed last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('en-US', { month: 'short' });
      monthlyMap[key] = { monthKey: key, monthName: name, value: 0 };
    }

    filteredLeads.forEach((l: any) => {
      const dateObj = l.created_at ? new Date(l.created_at) : new Date();
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].value += 1;
      }
    });

    return Object.values(monthlyMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredLeads]);

  // Chart 5: Monthly Weighted Revenue Forecast (Area Chart)
  const forecastData = useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string, monthName: string, value: number }> = {};
    
    // Seed next 6 months
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap[key] = { monthKey: key, monthName: name, value: 0 };
    }

    filteredProspects.forEach((p: any) => {
      if (['closed_lost', 'lost'].includes(p.pipeline_stage?.toLowerCase())) return;
      
      let dateObj = p.expected_close_date ? new Date(p.expected_close_date) : null;
      if (!dateObj || isNaN(dateObj.getTime())) {
        dateObj = p.created_at ? new Date(p.created_at) : new Date();
      }
      
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const val = Number(p.estimated_value || 0) * (Number(p.probability || 50) / 100);
      
      if (monthlyMap[key]) {
        monthlyMap[key].value += val;
      } else {
        const name = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyMap[key] = { monthKey: key, monthName: name, value: val };
      }
    });

    return Object.values(monthlyMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredProspects]);

  // Chart 6: Client Interaction Breakdown (Pie Chart)
  const activityTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredActivities.forEach((a: any) => {
      const type = a.activity_type || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });
    
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  }, [filteredActivities]);

  // Leaderboard: Agent Performance
  const agentLeaderboard = useMemo(() => {
    return users.map((user: any) => {
      const agentLeads = leadsData?.filter((l: any) => l.assigned_user_id === user.id) || [];
      const agentProspects = prospectsData?.filter((p: any) => p.assigned_user_id === user.id) || [];
      const agentActivities = activitiesData?.filter((a: any) => a.assigned_to_id === user.id) || [];

      const totalPipelineVal = agentProspects
        .filter(p => !['closed_lost', 'lost'].includes(p.pipeline_stage?.toLowerCase()))
        .reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);

      const weightedForecastVal = agentProspects
        .filter(p => !['closed_lost', 'lost'].includes(p.pipeline_stage?.toLowerCase()))
        .reduce((sum, p) => sum + (Number(p.estimated_value || 0) * (Number(p.probability || 50) / 100)), 0);

      const wonVal = agentProspects
        .filter(p => ['closed_won', 'won'].includes(p.pipeline_stage?.toLowerCase()))
        .reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);

      const completedActs = agentActivities.filter(a => ['completed', 'done'].includes(a.status?.toLowerCase())).length;

      return {
        id: user.id,
        name: user.name || user.email || 'Unknown Agent',
        leads: agentLeads.length,
        prospects: agentProspects.length,
        pipeline: totalPipelineVal,
        weightedForecast: weightedForecastVal,
        wonValue: wonVal,
        completedActivities: completedActs
      };
    }).sort((a, b) => b.weightedForecast - a.weightedForecast);
  }, [users, leadsData, prospectsData, activitiesData]);

  // Urgent Follow-up Center
  const requiresFollowUpList = useMemo(() => {
    const items: any[] = [];
    const now = new Date();

    filteredLeads.forEach((l: any) => {
      if (l.next_follow_up) {
        const followUpDate = new Date(l.next_follow_up);
        if (followUpDate <= now || followUpDate.toDateString() === now.toDateString()) {
          items.push({
            id: l.id,
            type: 'lead',
            title: `Follow up: ${l.company_name}`,
            subtitle: l.contact_name ? `Contact: ${l.contact_name}` : 'No contact name',
            due: followUpDate,
            agent: l.assigned_user_name || 'Unassigned',
            priority: l.priority || 'medium'
          });
         }
       }
    });

    filteredActivities.forEach((a: any) => {
       if (a.status?.toLowerCase() === 'pending' && a.due_date) {
         const dueDate = new Date(a.due_date);
         if (dueDate <= now || dueDate.toDateString() === now.toDateString()) {
           items.push({
             id: a.id,
             type: 'activity',
             title: `${a.activity_type || 'Task'}: ${a.subject}`,
             subtitle: a.related_name ? `Related: ${a.related_name}` : a.description || 'No description',
             due: dueDate,
             agent: a.assigned_to_name || 'Unassigned',
             priority: a.priority || 'medium'
           });
         }
       }
    });

    return items.sort((a, b) => a.due.getTime() - b.due.getTime()).slice(0, 5);
  }, [filteredLeads, filteredActivities]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4">
      {/* Top Title Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader title="CRM & Sales Dashboard" />
        <div className="flex items-center gap-2 self-start md:self-auto bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-1.5 text-xs text-indigo-700 font-bold shadow-sm">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
          SaaS Enterprise Mode Active
        </div>
      </div>

      {/* Row 1: Premium KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-2">
          <MetricCard title="Weighted Forecast" value={`${formatCompactNumber(weightedForecast)} EGP`} icon={TrendingUp} colorVariant="success" loading={isLoading} />
        </div>
        <MetricCard title="Total Leads" value={totalLeadsCount} icon={Target} colorVariant="primary" loading={isLoading} />
        <MetricCard title="Active Deals" value={activeProspectsCount} icon={Briefcase} colorVariant="primary" loading={isLoading} />
        <MetricCard title="Win Rate" value={`${Math.round(winRate || 0)}%`} icon={Award} colorVariant="primary" loading={isLoading} />
        <MetricCard title="Avg Deal Size" value={`${formatCompactNumber(avgDealSize)} EGP`} icon={Coins} colorVariant="primary" loading={isLoading} />
      </div>

      {/* Row 2: Targets & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quota Gauge Component */}
        <Card className="rounded-3xl border-none shadow-sm flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 to-indigo-900 text-white relative p-6">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-36 h-36" />
          </div>
          <div className="z-10 space-y-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none font-black uppercase text-[10px] tracking-wider px-2 py-0.5">Monthly Quota</Badge>
            <h3 className="text-sm font-bold text-slate-300">Closed Sales Target</h3>
            <p className="text-3xl font-black mt-2">{currentMonthWonValue.toLocaleString()} EGP</p>
            <p className="text-xs text-indigo-300 font-medium">Monthly Team Target: {targetGoal.toLocaleString()} EGP</p>
          </div>
          
          <div className="z-10 mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Progress</span>
              <span>{targetProgressPercent}%</span>
            </div>
            <Progress value={targetProgressPercent} className="h-2.5 bg-indigo-900/60" indicatorClassName="bg-emerald-400" />
            <p className="text-[11px] text-indigo-200 mt-2 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> 
              {targetProgressPercent >= 100 ? "Quota fully achieved!" : `${(targetGoal - currentMonthWonValue).toLocaleString()} EGP left to hit target`}
            </p>
          </div>
        </Card>

        {/* Lead Generation Trends */}
        <Card className="rounded-3xl border-none shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" /> Lead Acquisition Trend
            </CardTitle>
            <CardDescription className="text-xs">Count of incoming sales leads generated monthly over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[250px]">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadGenerationTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" dot={{r: 4, strokeWidth: 2}} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Funnel & Product Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Sales Funnel */}
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Conversion Funnel</CardTitle>
            <CardDescription className="text-xs">Progression rates of leads into closed-won customers</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[280px]">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* LOB Donut Share */}
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Pipeline Share by LOB</CardTitle>
            <CardDescription className="text-xs">Active sales pipeline values grouped by insurance types</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[280px] flex flex-col justify-between">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : lobPipelineData.length > 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center relative">
                <ResponsiveContainer width="100%" height="75%">
                  <PieChart>
                    <Pie
                      data={lobPipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {lobPipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => [`${Number(val).toLocaleString()} EGP`, 'Pipeline']}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Custom Legend */}
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600 mt-2">
                  {lobPipelineData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center gap-1 shrink-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span>{item.name} ({formatCompactNumber(item.value)})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No active products pipeline</div>
            )}
          </CardContent>
        </Card>

        {/* Lead Sources Breakdown */}
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Lead Sources Acquisition</CardTitle>
            <CardDescription className="text-xs">Performance of channels generating new client leads</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[280px]">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : leadSourcesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadSourcesData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                    {leadSourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">No source data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Forecast, Interactions & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weighted Revenue Forecasting */}
        <Card className="rounded-3xl border-none shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Revenue Projection (Weighted)</CardTitle>
            <CardDescription className="text-xs">Cash flow forecast based on probabilities of deals expected to close in the next 6 months</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorForecastSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11}} 
                    tickFormatter={(val) => `${formatCompactNumber(val)}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toLocaleString()} EGP`, 'Projected Value']}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorForecastSales)" dot={{r: 4, strokeWidth: 2}} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Action Center - Urgent Follow-ups */}
        <Card className="rounded-3xl border-none shadow-sm flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500 animate-pulse" /> Action Center
            </CardTitle>
            <CardDescription className="text-xs">Urgent items requiring immediate agent follow-up</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-auto scrollbar-thin max-h-[300px]">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : requiresFollowUpList.length > 0 ? (
              <div className="space-y-3">
                {requiresFollowUpList.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => router.push(item.type === 'lead' ? '/leads' : `/activities`)}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 transition-all cursor-pointer flex items-start justify-between gap-2 group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase font-black text-slate-400">{item.type}</span>
                        {item.priority === 'critical' || item.priority === 'high' ? (
                          <Badge className="bg-red-100 hover:bg-red-200 text-red-700 border-none font-bold text-[9px] h-4 px-1 rounded-sm">Critical</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{item.subtitle}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" />
                        {item.due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold truncate max-w-[80px]">{item.agent}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 opacity-70" />
                <span>All caught up! No urgent follow-ups.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Agent Performance Leaderboard */}
      {isAdmin && (
        <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-indigo-600" /> Sales Leaderboard
            </CardTitle>
            <CardDescription className="text-xs">Stack ranking of agents based on total weighted sales forecasting volume</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : agentLeaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                      <th className="p-4 pl-6 text-slate-500">Agent Name</th>
                      <th className="p-4 text-center text-slate-500">Leads</th>
                      <th className="p-4 text-center text-slate-500">Active Deals</th>
                      <th className="p-4 text-right text-slate-500">Pipeline Volume</th>
                      <th className="p-4 text-right text-slate-500">Weighted Forecast</th>
                      <th className="p-4 text-right text-slate-500">Closed Sales</th>
                      <th className="p-4 text-center text-slate-500">Completed Acts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {agentLeaderboard.map((agent, index) => (
                      <tr key={agent.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 pl-6 font-bold flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${
                            index === 0 ? 'bg-amber-100 border-amber-300 text-amber-800' :
                            index === 1 ? 'bg-slate-100 border-slate-300 text-slate-800' :
                            index === 2 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-slate-50 border-slate-100 text-slate-500'
                          }`}>
                            {index + 1}
                          </span>
                          <span>{agent.name}</span>
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-600">{agent.leads}</td>
                        <td className="p-4 text-center font-semibold text-slate-600">{agent.prospects}</td>
                        <td className="p-4 text-right font-semibold text-slate-600">{Number(agent.pipeline).toLocaleString()} EGP</td>
                        <td className="p-4 text-right font-black text-indigo-900">{Number(agent.weightedForecast).toLocaleString()} EGP</td>
                        <td className="p-4 text-right font-bold text-green-600">{Number(agent.wonValue).toLocaleString()} EGP</td>
                        <td className="p-4 text-center">
                          <Badge className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-none font-bold">{agent.completedActivities}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">No agent data available</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
