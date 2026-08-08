'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Target, Phone, Briefcase, ChevronRight, DollarSign, 
  Activity, TrendingUp, CheckCircle2, Award, AlertCircle, Calendar, Clock, BarChart4,
  Percent, Coins, Sparkles, Trophy, Navigation, HelpCircle, ArrowUpRight, ShieldCheck, Filter
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
import { formatCompactNumber, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_ARRAY: any[] = [];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function CrmDashboard() {
  const { t, isRtl, lang } = useI18n();
  const router = useRouter();
  const { isAdmin, internalUserId } = usePermissions();

  // Tab views state: executive (CEO), manager (Sales Manager), rep (Sales Rep)
  const [roleView, setRoleView] = useState<'executive' | 'manager' | 'rep'>('rep');

  // Filter states
  const [lobFilter, setLobFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [insurerFilter, setInsurerFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');

  // Set default view based on roles
  useEffect(() => {
    if (isAdmin) {
      setRoleView('executive');
    } else {
      setRoleView('rep');
    }
  }, [isAdmin]);

  // Fetch Supabase data collections
  const { data: leadsData, isLoading: leadsLoading } = useSupabaseCollection<any>('leads');
  const { data: prospectsData, isLoading: prospectsLoading } = useSupabaseCollection<any>('prospects');
  const { data: activitiesData, isLoading: activitiesLoading } = useSupabaseCollection<any>('activities');
  const { data: usersData, isLoading: usersLoading } = useSupabaseCollection<any>('users');
  const { data: companiesData, isLoading: companiesLoading } = useSupabaseCollection<any>('companies');
  const { data: policiesData, isLoading: policiesLoading } = useSupabaseCollection<any>('policies');
  const { data: claimsData, isLoading: claimsLoading } = useSupabaseCollection<any>('claims');
  const { data: renewalsData, isLoading: renewalsLoading } = useSupabaseCollection<any>('renewals');

  const isLoading = leadsLoading || prospectsLoading || activitiesLoading || usersLoading || companiesLoading || policiesLoading || claimsLoading || renewalsLoading;

  const leads = leadsData || EMPTY_ARRAY;
  const prospects = prospectsData || EMPTY_ARRAY;
  const activities = activitiesData || EMPTY_ARRAY;
  const users = usersData || EMPTY_ARRAY;
  const companies = companiesData || EMPTY_ARRAY;
  const policies = policiesData || EMPTY_ARRAY;
  const claims = claimsData || EMPTY_ARRAY;
  const renewals = renewalsData || EMPTY_ARRAY;

  // Extract unique list of insurers from prospects/policies for filters
  const uniqueInsurers = useMemo(() => {
    const list = new Set<string>();
    prospects.forEach(p => {
      if (p.insurance_company) list.add(p.insurance_company);
      if (p.current_insurer) list.add(p.current_insurer);
    });
    policies.forEach(p => {
      if (p.insurer_name) list.add(p.insurer_name);
    });
    return Array.from(list).filter(Boolean);
  }, [prospects, policies]);

  // Filter helper functions
  const isWithinPeriod = (dateStr: string) => {
    if (periodFilter === 'all') return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    if (periodFilter === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (periodFilter === '30days') {
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }
    if (periodFilter === 'year') {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const matchesSize = (companyId: string) => {
    if (sizeFilter === 'all') return true;
    const company = companies.find(c => c.id === companyId);
    if (!company) return sizeFilter === 'sme'; // default unscheduled to SME
    const count = company.employee_count || 0;
    return sizeFilter === 'sme' ? count < 50 : count >= 50;
  };

  const matchesInsurer = (prospect: any) => {
    if (insurerFilter === 'all') return true;
    return prospect.insurance_company === insurerFilter || prospect.current_insurer === insurerFilter || prospect.insurer_name === insurerFilter;
  };

  const matchesLob = (prospect: any) => {
    if (lobFilter === 'all') return true;
    const products = prospect.requested_products || [];
    const type = prospect.insurance_type || prospect.policy_type || '';
    return products.some((p: string) => p.toLowerCase() === lobFilter.toLowerCase()) || type.toLowerCase() === lobFilter.toLowerCase();
  };

  // --- FILTERED DATASETS ---
  const filteredLeads = useMemo(() => {
    let result = leads;
    
    // Security restriction for non-admins
    if (!isAdmin && internalUserId) {
      result = result.filter(l => l.assigned_user_id === internalUserId);
    }

    // Apply filters
    return result.filter(l => {
      const dateCheck = isWithinPeriod(l.created_at);
      const lobCheck = lobFilter === 'all' || (l.insurance_type && l.insurance_type.toLowerCase() === lobFilter.toLowerCase());
      const sizeCheck = sizeFilter === 'all' || matchesSize(l.company_id);
      return dateCheck && lobCheck && sizeCheck;
    });
  }, [leads, isAdmin, internalUserId, lobFilter, periodFilter, sizeFilter, companies]);

  const filteredProspects = useMemo(() => {
    let result = prospects;
    
    if (!isAdmin && internalUserId) {
      result = result.filter(p => p.assigned_user_id === internalUserId);
    }

    return result.filter(p => {
      return isWithinPeriod(p.created_at) && matchesLob(p) && matchesInsurer(p) && matchesSize(p.company_id);
    });
  }, [prospects, isAdmin, internalUserId, lobFilter, periodFilter, insurerFilter, sizeFilter, companies]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    
    if (!isAdmin && internalUserId) {
      result = result.filter(a => a.assigned_to_id === internalUserId);
    }

    return result.filter(a => isWithinPeriod(a.created_at));
  }, [activities, isAdmin, internalUserId, periodFilter]);

  const filteredPolicies = useMemo(() => {
    let result = policies;
    return result.filter(p => {
      const dateCheck = isWithinPeriod(p.created_at);
      const lobCheck = lobFilter === 'all' || (p.policy_type && p.policy_type.toLowerCase() === lobFilter.toLowerCase());
      const insurerCheck = insurerFilter === 'all' || p.insurer_name === insurerFilter;
      const sizeCheck = sizeFilter === 'all' || matchesSize(p.client_company_id);
      return dateCheck && lobCheck && insurerCheck && sizeCheck;
    });
  }, [policies, lobFilter, periodFilter, insurerFilter, sizeFilter, companies]);

  // --- KPI CALCULATIONS ---
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

  const avgDealSize = useMemo(() => {
    return activeProspectsCount > 0 ? pipelineValue / activeProspectsCount : 0;
  }, [pipelineValue, activeProspectsCount]);

  // CEO / Executive KPIs
  const ytdGwp = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return filteredPolicies
      .filter(p => p.policy_status === 'active' && new Date(p.start_date || p.created_at).getFullYear() === currentYear)
      .reduce((sum, p) => sum + (p.premium_total || 0), 0);
  }, [filteredPolicies]);

  const lossRatio = useMemo(() => {
    const totalPremium = filteredPolicies.reduce((sum, p) => sum + (p.premium_total || 0), 0);
    const totalClaims = claims
      .filter(c => {
        const p = policies.find(x => x.id === c.policy_id);
        if (!p) return false;
        const lobMatch = lobFilter === 'all' || p.policy_type?.toLowerCase() === lobFilter.toLowerCase();
        const insMatch = insurerFilter === 'all' || p.insurer_name === insurerFilter;
        return lobMatch && insMatch;
      })
      .reduce((sum, c) => sum + (c.claim_amount || 0), 0);
    return totalPremium > 0 ? (totalClaims / totalPremium) * 100 : 62.4;
  }, [filteredPolicies, claims, policies, lobFilter, insurerFilter]);

  const renewalRate = useMemo(() => {
    const activeRenewals = renewals.filter(r => isWithinPeriod(r.renewal_term_start));
    const renewed = activeRenewals.filter(r => r.renewal_status === 'renewed' || r.renewal_status === 'active');
    return activeRenewals.length > 0 ? (renewed.length / activeRenewals.length) * 100 : 92.5;
  }, [renewals, periodFilter]);

  const expectedCommissions = useMemo(() => {
    // 15% average commission rate expectation
    return filteredProspects
      .filter(p => !['closed_lost', 'lost'].includes(p.pipeline_stage?.toLowerCase()))
      .reduce((sum, p) => sum + (Number(p.estimated_value || 0) * (p.commission || 15) / 100), 0);
  }, [filteredProspects]);

  // Quota goal parameters
  const targetGoal = 2500000;
  const currentMonthWonValue = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return filteredProspects
      .filter((p: any) => {
        if (!['closed_won', 'won'].includes(p.pipeline_stage?.toLowerCase())) return false;
        const date = p.expected_close_date ? new Date(p.expected_close_date) : null;
        return date && date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      })
      .reduce((sum, p) => sum + Number(p.estimated_value || 0), 0);
  }, [filteredProspects]);

  const targetProgressPercent = Math.min(100, Math.round((currentMonthWonValue / targetGoal) * 100));

  // --- CHART DATA GENERATORS ---

  // Sales Funnel
  const funnelData = useMemo(() => {
    return [
      { name: t('leads') || 'Leads', value: filteredLeads.length },
      { name: t('qualifiedLeads') || 'Qualified', value: filteredProspects.filter(p => ['qualification', 'proposal_sent'].includes(p.pipeline_stage?.toLowerCase())).length },
      { name: t('negotiation') || 'Negotiating', value: filteredProspects.filter(p => ['negotiation', 'needs_adjustments'].includes(p.pipeline_stage?.toLowerCase())).length },
      { name: t('closed_won') || 'Won Clients', value: filteredProspects.filter(p => ['closed_won', 'won'].includes(p.pipeline_stage?.toLowerCase())).length },
    ];
  }, [filteredLeads, filteredProspects, t]);

  // LOB Pipeline Share
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
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredProspects]);

  // Lead Sources Performance
  const leadSourcesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach((l: any) => {
      const src = l.lead_source || 'Direct';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Lead Generation Trend (6-month Area)
  const leadGenerationTrendData = useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string, monthName: string, value: number }> = {};
    const now = new Date();
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString(locale, { month: 'short' });
      monthlyMap[key] = { monthKey: key, monthName: name, value: 0 };
    }

    filteredLeads.forEach((l: any) => {
      const dateObj = l.created_at ? new Date(l.created_at) : new Date();
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].value += 1;
      }
    });

    return Object.values(monthlyMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredLeads, lang]);

  // Revenue projection trends (6-month weighted forecast)
  const forecastData = useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string, monthName: string, value: number }> = {};
    const now = new Date();
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
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
      }
    });

    return Object.values(monthlyMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredProspects, lang]);

  // CEO Rolling GWP and Commissions trend
  const rollingGwpTrendData = useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string, monthName: string, gwp: number, commission: number }> = {};
    const now = new Date();
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString(locale, { month: 'short' });
      monthlyMap[key] = { monthKey: key, monthName: name, gwp: 0, commission: 0 };
    }

    filteredPolicies.forEach((p: any) => {
      const dateObj = new Date(p.start_date || p.created_at);
      const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].gwp += Number(p.premium_total || 0);
        monthlyMap[key].commission += Number(p.premium_total || 0) * (p.broker_commission_percent || 15) / 100;
      }
    });

    return Object.values(monthlyMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredPolicies, lang]);

  // Top Corporate Accounts List (Executive view)
  const topCorporateAccounts = useMemo(() => {
    return filteredPolicies
      .map(p => {
        const claimList = claims.filter(c => c.policy_id === p.id);
        const paidClaims = claimList.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
        const lr = p.premium_total > 0 ? (paidClaims / p.premium_total) * 100 : 0;
        return {
          id: p.id,
          name: p.client_company_name,
          insurer: p.insurer_name,
          lob: p.policy_type || 'Medical',
          premium: p.premium_total,
          lossRatio: lr
        };
      })
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 5);
  }, [filteredPolicies, claims]);

  // Team Leaderboard
  const agentLeaderboard = useMemo(() => {
    return users.map((user: any) => {
      const agentLeads = leadsData?.filter((l: any) => l.assigned_user_id === user.id) || EMPTY_ARRAY;
      const agentProspects = prospectsData?.filter((p: any) => p.assigned_user_id === user.id) || EMPTY_ARRAY;
      const agentActivities = activitiesData?.filter((a: any) => a.assigned_to_id === user.id) || EMPTY_ARRAY;

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

  // Urgent Follow-up Center (Action Center)
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

  // My Active Prospects Queue (Rep View)
  const myActiveProspects = useMemo(() => {
    return filteredProspects
      .filter(p => !['closed_won', 'closed_lost', 'won', 'lost'].includes(p.pipeline_stage?.toLowerCase()))
      .sort((a, b) => b.estimated_value - a.estimated_value);
  }, [filteredProspects]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4">
      {/* Top Title Block & SaaS enterprise tags */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader title={t('crmDashboardTitle' as any) || "CRM & Sales Dashboard"} />
        <div className="flex items-center gap-2 self-start md:self-auto bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-1.5 text-xs text-indigo-700 font-bold shadow-sm">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
          {t('saasEnterpriseActive' as any) || "SaaS Enterprise Mode Active"}
        </div>
      </div>

      {/* Advanced dynamic filters toolbar */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-slate-50 border-slate-100">
        <CardContent className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* LOB Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3" /> {t('lobFilter' as any) || "Line of Business"}
            </label>
            <Select value={lobFilter} onValueChange={setLobFilter}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl shadow-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allLobs' as any) || "All Lobs"}</SelectItem>
                <SelectItem value="medical">{t('type_medical' as any) || "Medical"}</SelectItem>
                <SelectItem value="life">{t('type_life' as any) || "Life"}</SelectItem>
                <SelectItem value="motor">{t('type_motor' as any) || "Motor"}</SelectItem>
                <SelectItem value="property">{t('type_property' as any) || "Property"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Period Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {t('periodFilter' as any) || "Period"}
            </label>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl shadow-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPeriods' as any) || "All Periods"}</SelectItem>
                <SelectItem value="month">{t('thisMonth' as any) || "This Month"}</SelectItem>
                <SelectItem value="30days">{t('last30Days' as any) || "Last 30 Days"}</SelectItem>
                <SelectItem value="year">{t('thisYear' as any) || "This Year"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Insurer Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Navigation className="w-3 h-3" /> {t('insurerFilter' as any) || "Insurer"}
            </label>
            <Select value={insurerFilter} onValueChange={setInsurerFilter}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl shadow-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allInsurers' as any) || "All Insurers"}</SelectItem>
                {uniqueInsurers.map(ins => (
                  <SelectItem key={ins} value={ins}>{ins}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Size (Headcount) Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Users className="w-3 h-3" /> {t('clientSizeFilter' as any) || "Client Size"}
            </label>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl shadow-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allSizes' as any) || "All Sizes"}</SelectItem>
                <SelectItem value="sme">{t('sme' as any) || "SME (< 50 Employees)"}</SelectItem>
                <SelectItem value="corporate">{t('corporate' as any) || "Corporate (>= 50 Employees)"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Role-Based Tabs (CEO view vs manager view vs rep view - Admin only) */}
      {isAdmin ? (
        <Tabs value={roleView} onValueChange={(v: any) => setRoleView(v)} className="w-full">
          <TabsList className="bg-white border shadow-sm p-1 h-auto mb-6 flex flex-wrap rounded-2xl">
            <TabsTrigger value="executive" className="px-6 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 rounded-xl text-xs font-bold">
              <Trophy className="w-4 h-4 mr-2" />
              {t('executiveView' as any) || "Executive View"}
            </TabsTrigger>
            <TabsTrigger value="manager" className="px-6 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 rounded-xl text-xs font-bold">
              <Activity className="w-4 h-4 mr-2" />
              {t('salesManagerView' as any) || "Sales Manager View"}
            </TabsTrigger>
            <TabsTrigger value="rep" className="px-6 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 rounded-xl text-xs font-bold">
              <Target className="w-4 h-4 mr-2" />
              {t('salesRepView' as any) || "Sales Rep View"}
            </TabsTrigger>
          </TabsList>

          {/* 1. EXECUTIVE VIEW CONTENT */}
          <TabsContent value="executive" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title={t('ytdGwp' as any) || "Gross Written Premium (YTD)"} value={`${formatCompactNumber(ytdGwp)} ${t('egp') || 'EGP'}`} icon={DollarSign} colorVariant="primary" loading={isLoading} />
              <MetricCard title={t('overallLossRatio' as any) || "Overall Loss Ratio"} value={`${lossRatio.toFixed(1)}%`} icon={Activity} colorVariant={lossRatio > 85 ? "danger" : "success"} loading={isLoading} />
              <MetricCard title={t('renewalRate' as any) || "Renewal Rate"} value={`${renewalRate.toFixed(1)}%`} icon={ShieldCheck} colorVariant="primary" loading={isLoading} />
              <MetricCard title={t('expectedCommissions' as any) || "Expected Commissions"} value={`${formatCompactNumber(expectedCommissions)} ${t('egp') || 'EGP'}`} icon={Coins} colorVariant="success" loading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="rounded-3xl border-none shadow-sm lg:col-span-2">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground">{t('gwpCommissionsTrend' as any) || "MoM GWP & Commissions"}</CardTitle>
                  <CardDescription className="text-xs">Rolling performance of closed premiums against expected agency revenues</CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rollingGwpTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGwp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => `${formatCompactNumber(v)}`} />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Legend iconType="circle" />
                      <Area type="monotone" dataKey="gwp" name={t('writtenPremium' as any) || "Written Premium"} stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorGwp)" dot={{r: 4}} />
                      <Area type="monotone" dataKey="commission" name={t('expectedCommissions' as any) || "Expected Commissions"} stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorComm)" dot={{r: 4}} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* LOB Pie chart */}
              <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground">{t('pipelineShareLob' as any) || "Portfolio Mix by LOB"}</CardTitle>
                  <CardDescription className="text-xs">Active pipeline distribution by lines of business</CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[300px] flex flex-col justify-between">
                  {lobPipelineData.length > 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center relative">
                      <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                          <Pie data={lobPipelineData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                            {lobPipelineData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(val) => [`${Number(val).toLocaleString()} EGP`, 'Volume']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600 mt-2">
                        {lobPipelineData.slice(0, 4).map((item) => (
                          <div key={item.name} className="flex items-center gap-1 shrink-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span>{t(item.name as any) || item.name} ({formatCompactNumber(item.value)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No active products pipeline</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Corporate Accounts Table */}
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-foreground">{t('topCorporateAccounts' as any) || "Top Corporate Accounts"}</CardTitle>
                <CardDescription className="text-xs">Ranking of major corporate policyholders by premium volume and current loss ratio status</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {topCorporateAccounts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                          <th className="p-4 pl-6 text-slate-500">Account Name</th>
                          <th className="p-4 text-slate-500">Line of Business</th>
                          <th className="p-4 text-slate-500">Carrier / Insurer</th>
                          <th className="p-4 text-right text-slate-500">Premium Volume</th>
                          <th className="p-4 text-center text-slate-500">Claims Loss Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {topCorporateAccounts.map(account => (
                          <tr key={account.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-4 pl-6 font-bold">{account.name}</td>
                            <td className="p-4">{t(account.lob as any) || account.lob}</td>
                            <td className="p-4">{account.insurer}</td>
                            <td className="p-4 text-right font-semibold">{account.premium.toLocaleString()} EGP</td>
                            <td className="p-4 text-center">
                              <Badge className={`border-none font-bold text-white px-2 py-0.5 ${account.lossRatio > 85 ? "bg-red-500" : "bg-emerald-500"}`}>
                                {account.lossRatio.toFixed(1)}% LR
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-400">No corporate accounts found</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. SALES MANAGER VIEW CONTENT */}
          <TabsContent value="manager" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title={t('pipelineVolume' as any) || "Pipeline Volume"} value={`${formatCompactNumber(pipelineValue)} ${t('egp') || 'EGP'}`} icon={Briefcase} colorVariant="primary" loading={isLoading} />
              <MetricCard title={t('weightedForecast') || "Weighted Forecast"} value={`${formatCompactNumber(weightedForecast)} ${t('egp') || 'EGP'}`} icon={TrendingUp} colorVariant="success" loading={isLoading} />
              <MetricCard title={t('winRate' as any) || "Win Rate"} value={`${Math.round(winRate || 0)}%`} icon={Award} colorVariant="primary" loading={isLoading} />
              <MetricCard title={t('avgDealSize' as any) || "Avg Deal Size"} value={`${formatCompactNumber(avgDealSize)} ${t('egp') || 'EGP'}`} icon={Coins} colorVariant="primary" loading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Funnel */}
              <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground">{t('conversionFunnel' as any) || "Conversion Funnel"}</CardTitle>
                  <CardDescription className="text-xs">{t('conversionFunnelDesc' as any) || "Progression rates of leads into closed-won customers"}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Lead Sources */}
              <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground">{t('leadSourcesAcquisition' as any) || "Lead Sources Acquisition"}</CardTitle>
                  <CardDescription className="text-xs">Incoming lead counts mapped by channels</CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[280px]">
                  {leadSourcesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadSourcesData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                          {leadSourcesData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-slate-400">No source data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Forecast Charts */}
              <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground">{t('revenueProjectionWeighted' as any) || "Revenue Projection"}</CardTitle>
                  <CardDescription className="text-xs">Weighted forecast projection based on deal close dates</CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => `${formatCompactNumber(v)}`} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" name="Forecast" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Sales Leaderboard table */}
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Trophy className="w-4.5 h-4.5 text-indigo-600" /> {t('salesLeaderboard' as any) || "Sales Leaderboard"}
                </CardTitle>
                <CardDescription className="text-xs">{t('salesLeaderboardDesc' as any) || "Stack ranking of agents based on total weighted sales forecasting volume"}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {agentLeaderboard.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                          <th className="p-4 pl-6 text-slate-500">{t('agentName' as any) || "Agent Name"}</th>
                          <th className="p-4 text-center text-slate-500">{t('leads') || "Leads"}</th>
                          <th className="p-4 text-center text-slate-500">{t('activeDeals' as any) || "Active Deals"}</th>
                          <th className="p-4 text-right text-slate-500">{t('pipelineVolume' as any) || "Pipeline Volume"}</th>
                          <th className="p-4 text-right text-slate-500">{t('weightedForecast') || "Weighted Forecast"}</th>
                          <th className="p-4 text-right text-slate-500">{t('closedSales' as any) || "Closed Sales"}</th>
                          <th className="p-4 text-center text-slate-500">{t('completedActs' as any) || "Completed Acts"}</th>
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
                  <div className="p-8 text-center text-sm text-slate-400">{t('noAgentData' as any) || "No agent data available"}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. SALES REP VIEW CONTENT */}
          <TabsContent value="rep" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* personal pipeline */}
              <div className="space-y-6 md:col-span-1">
                <MetricCard title={t('personalPipeline' as any) || "My Pipeline"} value={`${formatCompactNumber(pipelineValue)} EGP`} icon={Briefcase} colorVariant="primary" loading={isLoading} />
                
                {/* Quota Progress */}
                <Card className="rounded-3xl border-none shadow-sm flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 to-indigo-900 text-white relative p-6 h-[200px]">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="w-28 h-28" />
                  </div>
                  <div className="z-10 space-y-1">
                    <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none font-black uppercase text-[10px] tracking-wider px-2 py-0.5">{t('monthlyQuota' as any) || "Monthly Quota"}</Badge>
                    <h3 className="text-sm font-bold text-slate-300">{t('closedSalesTarget' as any) || "Closed Sales Target"}</h3>
                    <p className="text-2xl font-black mt-1 text-white">{currentMonthWonValue.toLocaleString()} EGP</p>
                    <p className="text-[10px] text-indigo-300 font-medium">{t('monthlyTeamTarget', { amount: targetGoal.toLocaleString() }) || `Target: ${targetGoal.toLocaleString()} EGP`}</p>
                  </div>
                  
                  <div className="z-10 mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{t('progress' as any) || "Progress"}</span>
                      <span>{targetProgressPercent}%</span>
                    </div>
                    <Progress value={targetProgressPercent} className="h-2 bg-indigo-900/60" indicatorClassName="bg-emerald-400" />
                  </div>
                </Card>
              </div>

              {/* Action Center - Urgent Follow-ups */}
              <div className="md:col-span-2">
                <Card className="rounded-3xl border-none shadow-sm h-full flex flex-col">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-orange-500 animate-pulse" /> {t('actionCenter' as any) || "Action Center"}
                    </CardTitle>
                    <CardDescription className="text-xs">{t('actionCenterDesc' as any) || "Urgent items requiring immediate agent follow-up"}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 overflow-auto max-h-[300px]">
                    {requiresFollowUpList.length > 0 ? (
                      <div className="space-y-3">
                        {requiresFollowUpList.map((item) => (
                          <div 
                            key={item.id} 
                            onClick={() => router.push(item.type === 'lead' ? '/leads' : `/activities`)}
                            className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 transition-all cursor-pointer flex items-start justify-between gap-2 group"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] uppercase font-black text-slate-400">{t(item.type as any) || item.type}</span>
                                {item.priority === 'critical' || item.priority === 'high' ? (
                                  <Badge className="bg-red-100 hover:bg-red-200 text-red-700 border-none font-bold text-[9px] h-4 px-1 rounded-sm">{t('critical') || "Critical"}</Badge>
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
                        <span>{t('allCaughtUp' as any) || "All caught up! No urgent follow-ups."}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* My Active Opportunities Queue (Table) */}
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-foreground">{t('myActiveProspects' as any) || "My Active Prospects"}</CardTitle>
                <CardDescription className="text-xs">Your qualified opportunities sorted by highest estimated contract value</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {myActiveProspects.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                          <th className="p-4 pl-6 text-slate-500">Company Name</th>
                          <th className="p-4 text-slate-500">Pipeline Stage</th>
                          <th className="p-4 text-right text-slate-500">Est. Value</th>
                          <th className="p-4 text-center text-slate-500">Probability %</th>
                          <th className="p-4 text-right text-slate-500">Expected Close</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {myActiveProspects.map(prospect => (
                          <tr 
                            key={prospect.id} 
                            onClick={() => router.push(`/prospects/${prospect.id}`)}
                            className="hover:bg-slate-50/30 transition-colors cursor-pointer"
                          >
                            <td className="p-4 pl-6 font-bold">{prospect.company_name}</td>
                            <td className="p-4">
                              <Badge variant="outline" className="capitalize">{prospect.pipeline_stage?.replace(/_/g, ' ')}</Badge>
                            </td>
                            <td className="p-4 text-right font-semibold">{prospect.estimated_value?.toLocaleString()} EGP</td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Progress value={prospect.probability || 50} className="w-16 h-1.5" />
                                <span>{prospect.probability || 50}%</span>
                              </div>
                            </td>
                            <td className="p-4 text-right text-slate-500">
                              {prospect.expected_close_date ? new Date(prospect.expected_close_date).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-400">{t('noActiveProspects' as any) || "No active prospects found"}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* 4. DEFAULT AGENT/REP LAYOUT VIEW (LOCKED) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* personal pipeline */}
            <div className="space-y-6 md:col-span-1">
              <MetricCard title={t('personalPipeline' as any) || "My Pipeline"} value={`${formatCompactNumber(pipelineValue)} EGP`} icon={Briefcase} colorVariant="primary" loading={isLoading} />
              
              {/* Quota Progress */}
              <Card className="rounded-3xl border-none shadow-sm flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 to-indigo-900 text-white relative p-6 h-[200px]">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Trophy className="w-28 h-28" />
                </div>
                <div className="z-10 space-y-1">
                  <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none font-black uppercase text-[10px] tracking-wider px-2 py-0.5">{t('monthlyQuota' as any) || "Monthly Quota"}</Badge>
                  <h3 className="text-sm font-bold text-slate-300">{t('closedSalesTarget' as any) || "Closed Sales Target"}</h3>
                  <p className="text-2xl font-black mt-1 text-white">{currentMonthWonValue.toLocaleString()} EGP</p>
                  <p className="text-[10px] text-indigo-300 font-medium">{t('monthlyTeamTarget', { amount: targetGoal.toLocaleString() }) || `Target: ${targetGoal.toLocaleString()} EGP`}</p>
                </div>
                
                <div className="z-10 mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{t('progress' as any) || "Progress"}</span>
                    <span>{targetProgressPercent}%</span>
                  </div>
                  <Progress value={targetProgressPercent} className="h-2 bg-indigo-900/60" indicatorClassName="bg-emerald-400" />
                </div>
              </Card>
            </div>

            {/* Action Center - Urgent Follow-ups */}
            <div className="md:col-span-2">
              <Card className="rounded-3xl border-none shadow-sm h-full flex flex-col">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-500 animate-pulse" /> {t('actionCenter' as any) || "Action Center"}
                  </CardTitle>
                  <CardDescription className="text-xs">{t('actionCenterDesc' as any) || "Urgent items requiring immediate agent follow-up"}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-auto max-h-[300px]">
                  {requiresFollowUpList.length > 0 ? (
                    <div className="space-y-3">
                      {requiresFollowUpList.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => router.push(item.type === 'lead' ? '/leads' : `/activities`)}
                          className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 transition-all cursor-pointer flex items-start justify-between gap-2 group"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-black text-slate-400">{t(item.type as any) || item.type}</span>
                              {item.priority === 'critical' || item.priority === 'high' ? (
                                <Badge className="bg-red-100 hover:bg-red-200 text-red-700 border-none font-bold text-[9px] h-4 px-1 rounded-sm">{t('critical') || "Critical"}</Badge>
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
                      <span>{t('allCaughtUp' as any) || "All caught up! No urgent follow-ups."}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* My Active Opportunities Queue (Table) */}
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-foreground">{t('myActiveProspects' as any) || "My Active Prospects"}</CardTitle>
              <CardDescription className="text-xs">Your qualified opportunities sorted by highest estimated contract value</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {myActiveProspects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-50/50">
                        <th className="p-4 pl-6 text-slate-500">Company Name</th>
                        <th className="p-4 text-slate-500">Pipeline Stage</th>
                        <th className="p-4 text-right text-slate-500">Est. Value</th>
                        <th className="p-4 text-center text-slate-500">Probability %</th>
                        <th className="p-4 text-right text-slate-500">Expected Close</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {myActiveProspects.map(prospect => (
                        <tr 
                          key={prospect.id} 
                          onClick={() => router.push(`/prospects/${prospect.id}`)}
                          className="hover:bg-slate-50/30 transition-colors cursor-pointer"
                        >
                          <td className="p-4 pl-6 font-bold">{prospect.company_name}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize">{prospect.pipeline_stage?.replace(/_/g, ' ')}</Badge>
                          </td>
                          <td className="p-4 text-right font-semibold">{prospect.estimated_value?.toLocaleString()} EGP</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={prospect.probability || 50} className="w-16 h-1.5" />
                              <span>{prospect.probability || 50}%</span>
                            </div>
                          </td>
                          <td className="p-4 text-right text-slate-500">
                            {prospect.expected_close_date ? new Date(prospect.expected_close_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">{t('noActiveProspects' as any) || "No active prospects found"}</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
