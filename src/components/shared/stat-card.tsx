'use client';
import React from "react";
import { LucideIcon } from "lucide-react";
import { KPICard } from "@/components/dashboard/metric-card";

function getKPICardColor(bgClass: string): 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate' | 'teal' {
  const cls = bgClass.toLowerCase();
  if (cls.includes('primary') || cls.includes('blue')) return 'blue';
  if (cls.includes('success') || cls.includes('green') || cls.includes('emerald')) return 'green';
  if (cls.includes('orange') || cls.includes('warning') || cls.includes('amber')) return 'orange';
  if (cls.includes('destructive') || cls.includes('red') || cls.includes('danger')) return 'red';
  if (cls.includes('purple') || cls.includes('violet') || cls.includes('neutral') || cls.includes('violet-500')) return 'purple';
  if (cls.includes('teal')) return 'teal';
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
