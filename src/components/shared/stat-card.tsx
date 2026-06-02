
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
  color = "bg-blue-600",
  loading = false
}: {
  title: string,
  value: string | number | null | undefined,
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
      <Card className={cn("rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col justify-center text-white", color)}>
        <CardContent className="p-4 flex items-center gap-4 relative z-10">
          <div className="flex items-center justify-center text-white/90">
             <Icon className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">{title}</p>
             {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mt-1 text-white/50" />
              ) : (
                <p className="text-xl font-bold text-white leading-none mt-1">{value ?? 'N/A'}</p>
              )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
