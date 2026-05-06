
"use client"

import { 
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, 
  Cell, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
  Line, LineChart
} from "recharts"
import { ChartTooltipContent, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { useMemo } from "react"
import type { Prospect, Claim, Activity } from "@/lib/types"

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const chartConfig = {
  value: { label: "Value", color: "#94a3b8" },
  qualification: { label: "Qualification", color: "#3b82f6" },
  needs_analysis: { label: "Needs Analysis", color: "#6366f1" },
  proposal: { label: "Proposal", color: "#f59e0b" },
  negotiation: { label: "Negotiation", color: "#f97316" },
  closed_won: { label: "Closed Won", color: "#22c55e" },
  closed_lost: { label: "Closed Lost", color: "#ef4444" },
} satisfies Record<string, any>

export function SalesPipelineChart({ prospects }: { prospects: Prospect[] }) {
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

const claimsChartConfig = {
  submitted: { label: 'Submitted', color: '#3b82f6' },
  under_review: { label: 'Under Review', color: '#f97316' },
  pending_documents: { label: 'Pending Docs', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#22c55e' },
  partially_approved: { label: 'Partial', color: '#a855f7' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  paid: { label: 'Paid', color: '#14b8a6' },
  appealed: { label: 'Appealed', color: '#6366f1' },
}

export function ClaimsDistributionChart({ claims }: { claims: Claim[] }) {
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
        <Bar dataKey="calls" fill="#3b82f6" radius={byUser ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId="a" name="Calls" />
        <Bar dataKey="meetings" fill="#8b5cf6" radius={byUser ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId="a" name="Meetings" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConversionFunnelChart() {
  // Placeholder for complex funnel visualization
  return null;
}
