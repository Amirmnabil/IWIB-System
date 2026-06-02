'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  loading?: boolean;
}

const colorConfig = {
  primary: {
    bg: 'bg-blue-600',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/20',
    trendBg: 'bg-white/20',
    trendText: 'text-white',
    titleText: 'text-blue-100',
  },
  success: {
    bg: 'bg-emerald-500',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/20',
    trendBg: 'bg-white/20',
    trendText: 'text-white',
    titleText: 'text-emerald-100',
  },
  warning: {
    bg: 'bg-orange-500',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/20',
    trendBg: 'bg-white/20',
    trendText: 'text-white',
    titleText: 'text-orange-100',
  },
  danger: {
    bg: 'bg-violet-500',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/20',
    trendBg: 'bg-white/20',
    trendText: 'text-white',
    titleText: 'text-violet-100',
  },
  neutral: {
    bg: 'bg-slate-800',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/20',
    trendBg: 'bg-white/20',
    trendText: 'text-white',
    titleText: 'text-slate-300',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  colorVariant = 'primary',
  loading = false,
}) => {
  const styles = colorConfig[colorVariant];

  return (
    <motion.div whileHover={{ y: -2 }} className="h-full">
      <Card className={cn("rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden", styles.bg)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", styles.iconBg, styles.iconText)}>
              <Icon className="w-6 h-6" />
            </div>
            {trend && (
              <div className={cn("flex items-center text-xs font-bold px-2 py-1 rounded-full", styles.trendBg, styles.trendText)}>
                {trend.isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {trend.value}%
              </div>
            )}
          </div>
          
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-widest", styles.titleText)}>{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-white/20 rounded-lg animate-pulse mt-1"></div>
            ) : (
              <p className={cn("text-3xl font-black mt-1 tracking-tight", styles.valueText)}>
                {value ?? 'N/A'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
