
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
      initial={{ y: 0 }}
      animate={{ y: [0, -2, 0] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      whileHover={{ y: -4, rotateX: 2, rotateY: -2, scale: 1.02 }}
      style={{ perspective: 1000 }}
      className="h-full"
    >
      <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white h-full flex flex-col justify-center">
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 rounded-full opacity-10 transition-transform group-hover:scale-125 duration-500",
          color
        )} />
        <CardContent className="p-4 flex items-center gap-4 relative z-10">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-inner text-white", color)}>
             <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
             {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mt-1 text-slate-400" />
              ) : (
                <p className="text-xl font-bold text-slate-800 leading-none mt-1">{value}</p>
              )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
