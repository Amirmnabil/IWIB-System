'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  LucideIcon, ArrowUpRight, ArrowDownRight, Users, Target, Briefcase, 
  TrendingUp, Activity, DollarSign, Clock, FileText, Database, Scale, 
  ClipboardList, AlertTriangle, CheckCircle2, Shield, Phone, FileSignature, 
  CalendarCheck, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Mapping string icons to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  target: Target,
  users: Users,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  activity: Activity,
  'dollar-sign': DollarSign,
  clock: Clock,
  'file-text': FileText,
  database: Database,
  scale: Scale,
  'clipboard-list': ClipboardList,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle2,
  shield: Shield,
  phone: Phone,
  'file-signature': FileSignature,
  'calendar-check': CalendarCheck,
  'shield-alert': ShieldAlert,
};

export interface MetricCardProps {
  title: string;
  value: string | number | null | undefined;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'teal';
  loading?: boolean;
}

export interface KPICardProps {
  title: string;
  value: string | number | null | undefined;
  icon: string | LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate' | 'teal';
  format?: 'number' | 'currency' | 'percent' | 'compact';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

const colorConfig = {
  primary: { // Blue
    bg: 'bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6]',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/10',
    trendBg: 'bg-white/15',
    trendText: 'text-white',
    titleText: 'text-white/80',
  },
  success: { // Green
    bg: 'bg-gradient-to-br from-[#16A34A] to-[#22C55E]',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/10',
    trendBg: 'bg-white/15',
    trendText: 'text-white',
    titleText: 'text-white/80',
  },
  warning: { // Orange
    bg: 'bg-gradient-to-br from-[#F97316] to-[#FB923C]',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/10',
    trendBg: 'bg-white/15',
    trendText: 'text-white',
    titleText: 'text-white/80',
  },
  danger: { // Red
    bg: 'bg-gradient-to-br from-[#DC2626] to-[#EF4444]',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/10',
    trendBg: 'bg-white/15',
    trendText: 'text-white',
    titleText: 'text-white/80',
  },
  neutral: { // Purple
    bg: 'bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6]',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/10',
    trendBg: 'bg-white/15',
    trendText: 'text-white',
    titleText: 'text-white/80',
  },
  teal: { // Teal
    bg: 'bg-gradient-to-br from-[#0D9488] to-[#14B8A6]',
    iconText: 'text-white',
    valueText: 'text-white',
    iconBg: 'bg-white/10',
    trendBg: 'bg-white/15',
    trendText: 'text-white',
    titleText: 'text-white/80',
  },
};

const kpiColorMap = {
  blue: 'primary',
  green: 'success',
  orange: 'warning',
  red: 'danger',
  purple: 'neutral',
  slate: 'primary',
  teal: 'teal',
} as const;

// High fidelity regex and parser for dynamic numeric metrics
function parseMetricValue(val: string | number | null | undefined): {
  targetValue: number;
  prefix: string;
  suffix: string;
  isNumeric: boolean;
  rawString: string;
} {
  if (val === null || val === undefined) {
    return { targetValue: 0, prefix: '', suffix: '', isNumeric: false, rawString: 'N/A' };
  }
  if (typeof val === 'number') {
    return { targetValue: val, prefix: '', suffix: '', isNumeric: true, rawString: String(val) };
  }
  
  const rawString = String(val).trim();
  if (rawString === '' || rawString === 'N/A' || rawString.toLowerCase() === 'none') {
    return { targetValue: 0, prefix: '', suffix: '', isNumeric: false, rawString };
  }

  // Regex matches prefix (e.g. '$' or 'AED '), number, and suffix (e.g. 'K', 'M', '%')
  const regex = /^([^\d\s,.-]*\s*)?([0-9,.]+)?(\s*[^\d\s]*)$/;
  const match = rawString.match(regex);
  if (!match) {
    return { targetValue: 0, prefix: '', suffix: '', isNumeric: false, rawString };
  }

  const prefix = match[1] || '';
  const numStr = match[2] || '';
  const suffix = match[3] || '';

  if (!numStr) {
    return { targetValue: 0, prefix: '', suffix: '', isNumeric: false, rawString };
  }

  const cleanNumStr = numStr.replace(/,/g, '');
  const targetValue = parseFloat(cleanNumStr);

  if (isNaN(targetValue)) {
    return { targetValue: 0, prefix: '', suffix: '', isNumeric: false, rawString };
  }

  return {
    targetValue,
    prefix,
    suffix,
    isNumeric: true,
    rawString
  };
}

// RequestAnimationFrame custom animated counter hook with old->new transition
export function useAnimatedCounter(
  rawValue: string | number | null | undefined,
  durationMs: number = 1000
) {
  const { targetValue, prefix, suffix, isNumeric, rawString } = parseMetricValue(rawValue);
  
  const [displayValue, setDisplayValue] = useState<string>(rawString);
  const [glowState, setGlowState] = useState<'up' | 'down' | null>(null);
  
  const prevNumericValueRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  const getDecimalPlaces = (str: string) => {
    const parts = str.split('.');
    return parts.length > 1 ? parts[1].length : 0;
  };
  const decimals = typeof rawValue === 'string' ? getDecimalPlaces(rawValue.replace(/[^\d.]/g, '')) : 0;

  useEffect(() => {
    if (!isNumeric) {
      setDisplayValue(rawString);
      return;
    }

    const startValue = prevNumericValueRef.current !== null ? prevNumericValueRef.current : 0;
    const endValue = targetValue;

    // Detect if value increased or decreased to trigger the corresponding glow
    if (prevNumericValueRef.current !== null && prevNumericValueRef.current !== endValue) {
      if (endValue > prevNumericValueRef.current) {
        setGlowState('up');
      } else {
        setGlowState('down');
      }
      
      const timer = setTimeout(() => setGlowState(null), 1200);
      prevNumericValueRef.current = endValue;
      
      // We animate from the previous value to the new value
    } else if (prevNumericValueRef.current === null) {
      prevNumericValueRef.current = endValue;
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const easeProgress = progress * (2 - progress); // Ease Out Quad
      const currentValue = startValue + (endValue - startValue) * easeProgress;

      let formattedVal = currentValue.toFixed(decimals);
      if (rawString.includes(',')) {
        const parts = formattedVal.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formattedVal = parts.join('.');
      }

      setDisplayValue(`${prefix}${formattedVal}${suffix}`);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevNumericValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, prefix, suffix, isNumeric, rawString, durationMs, decimals]);

  return { displayValue, glowState };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  colorVariant = 'primary',
  loading = false,
}) => {
  const styles = colorConfig[colorVariant];
  
  // Connect the live counter hook
  const { displayValue, glowState } = useAnimatedCounter(loading ? '' : value, 1000);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="h-full group"
    >
      <Card 
        className={cn(
          "rounded-2xl border-2 border-transparent shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-300 hover:shadow-[0_15px_35px_rgba(0,0,0,0.15)] h-full overflow-hidden relative", 
          styles.bg,
          glowState === 'up' && "glow-up-active",
          glowState === 'down' && "glow-down-active"
        )}
      >
        {/* Subtle Animated Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none opacity-30 animate-gradient" />

        <CardContent className="p-4 md:p-5 relative z-10 flex items-center justify-between gap-4 h-full">
          {/* Left Side: Icon & Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 text-white p-2">
              <Icon className="w-5 h-5" />
            </div>
            <span className={cn("text-[11px] font-semibold uppercase tracking-wider truncate", styles.titleText)}>
              {title}
            </span>
          </div>

          {/* Right Side: Value & Trend */}
          <div className="flex flex-col items-end shrink-0">
            {loading ? (
              <div className="h-8 w-16 bg-white/20 rounded-lg animate-pulse"></div>
            ) : (
              <p className={cn("text-2xl md:text-3xl font-black tracking-tight transition-all duration-300 text-right leading-none", styles.valueText)}>
                {displayValue}
              </p>
            )}
            {trend && (
              <div className={cn("flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 leading-none", styles.trendBg, styles.trendText)}>
                {trend.isPositive ? <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                {trend.value}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color = 'blue',
  format,
  trend,
  loading = false,
}) => {
  // Resolve icon component
  const IconComponent = typeof icon === 'string' ? (iconMap[icon.toLowerCase()] || Target) : icon;

  // Resolve color variant
  const variant = kpiColorMap[color] || 'primary';

  // Format value mapping if format is specified
  let formattedValue = value;
  if (value != null && typeof value === 'number' && format) {
    if (format === 'currency') {
      formattedValue = `$${value.toLocaleString()}`;
    } else if (format === 'percent') {
      formattedValue = `${value}%`;
    } else if (format === 'compact') {
      if (value >= 1.0e6) {
        formattedValue = `${(value / 1.0e6).toFixed(1)}M`;
      } else if (value >= 1.0e3) {
        formattedValue = `${(value / 1.0e3).toFixed(1)}K`;
      } else {
        formattedValue = String(value);
      }
    }
  }

  return (
    <MetricCard
      title={title}
      value={formattedValue}
      icon={IconComponent}
      colorVariant={variant}
      trend={trend}
      loading={loading}
    />
  );
};
