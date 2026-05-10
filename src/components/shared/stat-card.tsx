
'use client';
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-none shadow-sm bg-white">
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 rounded-full opacity-10 transition-transform group-hover:scale-125 duration-500",
          color
        )} />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-label font-headline text-slate-400 mb-2">{title}</p>
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin mt-2 text-slate-400" />
              ) : (
                <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
              )}
              {description && !loading && (
                <div className="flex items-center gap-1 mt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{description}</p>
                </div>
              )}
            </div>
            <div className={cn("p-4 rounded-2xl bg-opacity-10 shrink-0 ml-4 transition-all duration-500 group-hover:rotate-12", color)}>
              <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
