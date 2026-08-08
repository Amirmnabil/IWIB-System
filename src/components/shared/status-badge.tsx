'use client';
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";

const statusStyles: Record<string, string> = {
  // CRM & Telesales
  waiting_for_data: "bg-[#2A75F3]/10 text-[#2A75F3] border-[#2A75F3]/20",
  call_back: "bg-[#FF991F]/10 text-[#FF991F] border-[#FF991F]/20",
  send_profile: "bg-[#8E44AD]/10 text-[#8E44AD] border-[#8E44AD]/20",
  renewed: "bg-[#27C26C]/10 text-[#27C26C] border-[#27C26C]/20",
  not_interested: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  wrong_number: "bg-slate-900 text-white border-slate-800",
  no_answer: "bg-[#FF991F]/10 text-[#FF991F] border-[#FF991F]/20",
  request_meeting: "bg-[#8E44AD]/10 text-[#8E44AD] border-[#8E44AD]/20",
  request_quotation: "bg-[#27C26C]/10 text-[#27C26C] border-[#27C26C]/20",
  hr_left: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  
  // Pipeline sub-stages
  qualification: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  needs_analysis: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  proposal: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  proposal_sent: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  needs_adjustments: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  negotiation: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  closed_won: "bg-[#27C26C]/10 text-[#27C26C] border-[#27C26C]/20",
  closed_lost: "bg-red-500/10 text-red-600 border-red-500/20",

  // Legacy mappings for backward compatibility during transition
  lead: "bg-[#10A5E9]/10 text-[#10A5E9] border-[#10A5E9]/20",
  interested: "bg-[#27C26C]/10 text-[#27C26C] border-[#27C26C]/20",
  follow_up: "bg-[#FF991F]/10 text-[#FF991F] border-[#FF991F]/20",
  refused: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  
  // Generic
  active: "bg-[#27C26C]/10 text-[#27C26C] border-[#27C26C]/20",
  inactive: "bg-slate-100 text-slate-700 border-border",
  suspended: "bg-[#FF991F]/10 text-[#FF991F] border-[#FF991F]/20",
  
  // Insurance Company Statuses
  under_negotiation: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
  contract_expired: "bg-[#FF991F]/10 text-[#FF991F] border-[#FF991F]/20",
  blacklisted: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  
  // Product & Agreement
  expired: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  draft: "bg-[#10A5E9]/10 text-[#10A5E9] border-[#10A5E9]/20",
  discontinued: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  
  // Default
  default: "bg-slate-100 text-slate-700 border-border"
};

export const StatusBadge = React.memo(function StatusBadge({ status, className }: { status: string, className?: string}) {
  const { t } = useI18n();
  const normalizedStatus = status?.toLowerCase().replace(/ /g, '_');
  const style = statusStyles[normalizedStatus] || statusStyles.default;
  const translationKey = `status_${normalizedStatus}` as any;
  
  let label = t(translationKey);
  if (!label || label === translationKey) {
    label = normalizedStatus
      ?.split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || status;
  }
  
  return (
    <Badge 
      variant="outline" 
      className={cn(style, "font-medium whitespace-nowrap", className)}
    >
      {label}
    </Badge>
  );
});
