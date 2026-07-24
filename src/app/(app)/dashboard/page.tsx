'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Scale, FileText, ClipboardList, DollarSign, Database,
  ArrowRight, Activity, TrendingUp, AlertTriangle, CheckCircle2, Shield
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { formatCompactNumber } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useUser } from '@/lib/auth-provider';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { MetricCard } from '@/components/dashboard/metric-card';

// Hardcoded configs for the module launchers
const MODULE_CONFIGS = [
  {
    id: 'crm',
    title: 'CRM & Sales',
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    color: 'text-primary',
    bg: 'bg-primary/10',
    route: '/crm/dashboard',
  },
  {
    id: 'underwriting',
    title: 'Underwriting',
    icon: Scale,
    gradient: 'from-amber-400 to-orange-500',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    route: '/underwriting/dashboard',
  },
  {
    id: 'policy_admin',
    title: 'Policy Admin',
    icon: FileText,
    gradient: 'from-emerald-400 to-teal-500',
    color: 'text-success',
    bg: 'bg-success/10',
    route: '/policy-admin/dashboard',
  },
  {
    id: 'claims',
    title: 'Claims',
    icon: ClipboardList,
    gradient: 'from-rose-400 to-red-500',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    route: '/claims/dashboard',
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-green-600',
    color: 'text-success',
    bg: 'bg-success/10',
    route: '/finance/dashboard',
  },
  {
    id: 'master_data',
    title: 'Master Data',
    icon: Database,
    gradient: 'from-slate-500 to-slate-700',
    color: 'text-muted-foreground',
    bg: 'bg-background',
    route: '/master-data/dashboard',
  }
];

export default function ExecutiveDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const { allowedModules, isAdmin, isLoading: permsLoading } = usePermissions();

  // Redirect non-admins to their first allowed module if possible
  React.useEffect(() => {
    if (permsLoading) return;
    if (!isAdmin && allowedModules.length > 0) {
      const firstAllowed = MODULE_CONFIGS.find(mod => allowedModules.includes(mod.id as any));
      if (firstAllowed) {
        router.replace(firstAllowed.route);
      }
    }
  }, [isAdmin, allowedModules, permsLoading, router]);

  const { metrics, isLoading } = useDashboardMetrics(isAdmin && !permsLoading);

  // Filter modules based on RBAC
  const visibleModules = MODULE_CONFIGS.filter(mod =>
    isAdmin || allowedModules.includes(mod.id as any)
  );

  if (permsLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Executive Dashboard...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-xl mx-auto my-12 bg-card rounded-3xl border border-border shadow-sm">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          The Executive Overview is restricted to Administrator accounts. You do not have permission to view this page or its metrics.
        </p>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          Please use the sidebar to navigate to your authorized modules.
        </p>
      </div>
    );
  }

  // Extract executive metrics
  const execMetrics = metrics?.modules?.executive || {};

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-headline font-black text-foreground tracking-tight">
            Executive Overview
          </h1>
          <p className="text-standard text-muted-foreground mt-1">
            Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}. Here is the real-time health of the brokerage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase font-bold py-1 bg-card border-border">
            Data Layer: <span className="text-primary ml-1 flex items-center"><Shield className="w-3 h-3 inline mr-1" /> Canonical V1.0</span>
          </Badge>
        </div>
      </div>

      {/* EXECUTIVE KPI RIBBON */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Clients"
          value={execMetrics.active_clients || 0}
          icon={Users}
          colorVariant="primary"
          loading={isLoading}
        />
        <MetricCard
          title="Portfolio GWP"
          value={formatCompactNumber(execMetrics.total_gwp || 0)}
          icon={TrendingUp}
          colorVariant="success"
          loading={isLoading}
        />
        <MetricCard
          title="Claims Paid"
          value={formatCompactNumber(execMetrics.claims_paid || 0)}
          icon={Activity}
          colorVariant="danger"
          loading={isLoading}
        />
        <MetricCard
          title="Outstanding Receivables"
          value={formatCompactNumber(execMetrics.receivables || 0)}
          icon={DollarSign}
          colorVariant="warning"
          loading={isLoading}
        />
      </div>

      <h2 className="text-sm font-black text-foreground uppercase tracking-widest mt-12 mb-4 border-b border-border pb-2">
        Operational Modules
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleModules.map((mod, i) => {
          const Icon = mod.icon;

          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(mod.route)}
              className="cursor-pointer group"
            >
              <Card className="rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-card h-full flex flex-col hover:-translate-y-1">
                <div className={`h-2 w-full bg-gradient-to-r ${mod.gradient}`} />
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mod.bg} ${mod.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background hover:bg-slate-100">
                      <ArrowRight className={`w-4 h-4 ${mod.color}`} />
                    </Button>
                  </div>

                  <h3 className="text-xl font-black text-foreground tracking-tight mt-4">{mod.title}</h3>
                  <p className="text-small text-slate-400 mt-1">Access departmental KPIs and workflows.</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
        {visibleModules.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-3xl">
            <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">You do not have permission to view any modules.</p>
          </div>
        )}
      </div>
    </div>
  );
}
