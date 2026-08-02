'use client';
import React from "react";
import { LucideIcon } from "lucide-react";
import { KPICard } from "@/components/dashboard/metric-card";

function getKPICardColor(bgClass: string): 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate' | 'teal' {
  const cls = bgClass.toLowerCase();
  if (cls.includes('amber') || cls.includes('orange') || cls.includes('warning')) return 'orange';
  if (cls.includes('teal') || cls.includes('cyan')) return 'teal';
  if (cls.includes('emerald') || cls.includes('green') || cls.includes('success')) return 'green';
  if (cls.includes('purple') || cls.includes('violet')) return 'purple';
  if (cls.includes('red') || cls.includes('rose') || cls.includes('danger') || cls.includes('destructive')) return 'red';
  if (cls.includes('blue') || cls.includes('indigo') || cls.includes('primary')) return 'blue';
  return 'blue';
}

export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon,
  color = "bg-primary",
  loading = false
}: {
  title: string,
  value: string | number | null | undefined,
  icon: LucideIcon,
  description?: string,
  color?: string,
  loading?: boolean
}) {
  const kpiColor = getKPICardColor(color);

  return (
    <KPICard
      title={title}
      value={value}
      icon={icon}
      color={kpiColor}
      loading={loading}
    />
  );
});
