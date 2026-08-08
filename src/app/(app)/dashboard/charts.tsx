
"use client"

import { 
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, 
  Cell, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
  Line, LineChart
} from "recharts"
import { ChartTooltipContent, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { useMemo } from "react"
import type { Prospect, Claim, Activity } from "@/lib/types"
import { useI18n } from "@/components/i18n-context"

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function MiniSparkline({ data, color }: { data: any[], color: string }) {
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueTrendChart() {
  const { t } = useI18n();
  const data = [
    { name: 'Jan', revenue: 4000, loss: 2400 },
    { name: 'Feb', revenue: 3000, loss: 1398 },
    { name: 'Mar', revenue: 2000, loss: 9800 },
    { name: 'Apr', revenue: 2780, loss: 3908 },
    { name: 'May', revenue: 1890, loss: 4800 },
    { name: 'Jun', revenue: 2390, loss: 3800 },
    { name: 'Jul', revenue: 3490, loss: 4300 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tickMargin={8} />
        <YAxis axisLine={false} tickLine={false} fontSize={10} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fillOpacity={1} fill="url(#colorRev)" />
        <Area type="monotone" dataKey="loss" stroke="#EF4444" fillOpacity={1} fill="url(#colorLoss)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SalesPipelineChart({ prospects }: { prospects: Prospect[] }) {
  const { t } = useI18n();
  
  const chartConfig = {
    value: { label: t("value") || "Value", color: "#94a3b8" },
    qualification: { label: t("qualification") || "Qualification", color: "#3b82f6" },
    proposal_sent: { label: t("proposal_sent") || "Proposal sent", color: "#6366f1" },
    needs_adjustments: { label: t("needs_adjustments") || "Needs adjustments", color: "#f59e0b" },
    negotiation: { label: t("negotiation") || "Negotiation", color: "#f97316" },
    closed_won: { label: t("closed_won") || "Won", color: "#22c55e" },
    closed_lost: { label: t("closed_lost") || "Lost", color: "#ef4444" },
  } satisfies Record<string, any>

  const data = useMemo(() => {
    const stageCounts = prospects.reduce((acc, p) => {
      const stage = p.pipeline_stage || 'qualification';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
      fill: chartConfig[stage as keyof typeof chartConfig]?.color || '#94a3b8'
    }));
  }, [prospects]);
  
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="stage"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || value}
          fontSize={11}
          fontWeight="bold"
        />
        <YAxis axisLine={false} tickLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
           {data.map((entry) => (
            <Cell key={`cell-${entry.stage}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

export function ClaimsDistributionChart({ claims }: { claims: Claim[] }) {
  const { t } = useI18n();

  const claimsChartConfig = {
    submitted: { label: t('status_submitted') || 'Submitted', color: '#3b82f6' },
    under_review: { label: t('status_under_review') || 'Under Review', color: '#f97316' },
    pending_documents: { label: t('status_pending_documents') || 'Pending Docs', color: '#f59e0b' },
    approved: { label: t('status_approved') || 'Approved', color: '#22c55e' },
    partially_approved: { label: t('status_partially_approved') || 'Partial', color: '#a855f7' },
    rejected: { label: t('status_rejected') || 'Rejected', color: '#ef4444' },
    paid: { label: t('status_paid') || 'Paid', color: '#14b8a6' },
    appealed: { label: t('status_appealed') || 'Appealed', color: '#6366f1' },
  }

  const data = useMemo(() => {
    const statusCounts = claims.reduce((acc, claim) => {
      const status = claim.status || 'submitted';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      fill: claimsChartConfig[name as keyof typeof claimsChartConfig]?.color || '#94a3b8',
    }))
  }, [claims]);

  return (
    <ChartContainer config={claimsChartConfig} className="min-h-[300px] w-full aspect-square">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

export function ActivityTrendChart({ activities, byUser = false }: { activities: Activity[], byUser?: boolean }) {
  const { t } = useI18n();
  const data = useMemo(() => {
    if (byUser) {
      const userActivity: Record<string, { name: string, calls: number, meetings: number, tasks: number }> = {};
      activities.forEach(a => {
        const user = a.assigned_to_name || 'Unassigned';
        if (!userActivity[user]) userActivity[user] = { name: user, calls: 0, meetings: 0, tasks: 0 };
        if (a.activity_type === 'call') userActivity[user].calls++;
        else if (a.activity_type === 'meeting') userActivity[user].meetings++;
        else userActivity[user].tasks++;
      });
      return Object.values(userActivity).sort((a, b) => (b.calls + b.meetings) - (a.calls + a.meetings));
    }

    // Time-based trend logic (mocked for visualization)
    return [
      { day: 'Mon', calls: 12, meetings: 4 },
      { day: 'Tue', calls: 18, meetings: 6 },
      { day: 'Wed', calls: 15, meetings: 8 },
      { day: 'Thu', calls: 22, meetings: 5 },
      { day: 'Fri', calls: 10, meetings: 3 },
    ];
  }, [activities, byUser]);

  return (
    <ResponsiveContainer width="100%" height={byUser ? 400 : 300}>
      <BarChart data={data} layout={byUser ? 'vertical' : 'horizontal'}>
        <CartesianGrid strokeDasharray="3 3" vertical={!byUser} horizontal={byUser} stroke="#f1f5f9" />
        {byUser ? (
          <>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={100} fontWeight="bold" />
          </>
        ) : (
          <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={11} fontWeight="bold" />
        )}
        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
        <Legend verticalAlign="top" align="right" />
        <Bar dataKey="calls" fill="#3b82f6" radius={byUser ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId="a" name={t('calls7d')} />
        <Bar dataKey="meetings" fill="#8b5cf6" radius={byUser ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId="a" name={t('meetings7d')} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConversionFunnelChart() {
  const data = [
    { name: 'Leads', value: 1000, fill: '#3b82f6' },
    { name: 'Meetings', value: 800, fill: '#6366f1' },
    { name: 'Proposals', value: 600, fill: '#8b5cf6' },
    { name: 'Negotiation', value: 400, fill: '#d946ef' },
    { name: 'Closed', value: 200, fill: '#ec4899' },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" width={80} />
        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
