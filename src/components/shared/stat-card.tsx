
'use client';
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const StatCard = React.memo(function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = "bg-indigo-500",
  loading = false
}: {
  title: string,
  value: string | number,
  icon: LucideIcon,
  description?: string,
  color?: string,
  loading?: boolean
}) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 rounded-full opacity-10 transition-transform group-hover:scale-110",
        color
      )} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin mt-2 text-slate-400" />
            ) : (
              <p className="text-2xl font-black text-slate-900">{value}</p>
            )}
            {description && !loading && (
              <p className="text-[10px] font-medium text-slate-500 mt-1">{description}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl bg-opacity-20 shrink-0 ml-4", color)}>
            <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
