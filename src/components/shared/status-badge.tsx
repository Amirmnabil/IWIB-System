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
  
  // Legacy mappings for backward compatibility during transition
  lead: "bg-[#10A5E9]/10 text-[#10A5E9] border-[#10A5E9]/20",
  interested: "bg-[#27C26C]/10 text-[#27C26C] border-[#27C26C]/20",
  follow_up: "bg-[#FF991F]/10 text-[#FF991F] border-[#FF991F]/20",
  refused: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20",
  
  // Generic
  active: "bg-[#27C26C]/10 text-[#27C26C] border-[#27C26C]/20",
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
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
