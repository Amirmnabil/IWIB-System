'use client';
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";

const statusStyles: Record<string, string> = {
  // CRM & Telesales
  waiting_for_data: "bg-blue-100 text-blue-700 border-blue-200",
  call_back: "bg-amber-100 text-amber-700 border-amber-200",
  send_profile: "bg-violet-100 text-violet-700 border-violet-200",
  renewed: "bg-green-100 text-green-700 border-green-200",
  not_interested: "bg-red-100 text-red-700 border-red-200",
  wrong_number: "bg-slate-900 text-white border-slate-800",
  no_answer: "bg-orange-100 text-orange-700 border-orange-200",
  request_meeting: "bg-indigo-100 text-indigo-700 border-indigo-200",
  request_quotation: "bg-emerald-100 text-emerald-700 border-emerald-200",
  hr_left: "bg-rose-100 text-rose-700 border-rose-200",
  
  // Legacy mappings for backward compatibility during transition
  lead: "bg-blue-100 text-blue-700 border-blue-200",
  interested: "bg-emerald-100 text-emerald-700 border-emerald-200",
  follow_up: "bg-amber-100 text-amber-700 border-amber-200",
  refused: "bg-red-100 text-red-700 border-red-200",
  
  // Generic
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
  suspended: "bg-orange-100 text-orange-700 border-orange-200",
  
  // Insurance Company Statuses
  under_negotiation: "bg-blue-100 text-blue-700 border-blue-200",
  contract_expired: "bg-amber-100 text-amber-700 border-amber-200",
  blacklisted: "bg-red-100 text-red-700 border-red-200",
  
  // Product & Agreement
  expired: "bg-red-100 text-red-700 border-red-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  discontinued: "bg-slate-100 text-slate-700 border-slate-200",
  
  // Default
  default: "bg-slate-100 text-slate-700 border-slate-200"
};

export const StatusBadge = React.memo(function StatusBadge({ status, className }: { status: string, className?: string}) {
  const { t } = useI18n();
  const normalizedStatus = status?.toLowerCase().replace(/ /g, '_');
  const style = statusStyles[normalizedStatus] || statusStyles.default;
  const translationKey = `status_${normalizedStatus}` as any;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(style, "font-medium whitespace-nowrap", className)}
    >
      {t(translationKey)}
    </Badge>
  );
});
