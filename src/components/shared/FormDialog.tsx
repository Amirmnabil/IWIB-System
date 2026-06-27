'use client';
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "default"
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  title: string,
  description?: string,
  children: React.ReactNode,
  footer?: React.ReactNode,
  size?: "sm" | "default" | "lg" | "xl"
}) {
  const { isRtl } = useI18n();

  const sizeClasses = {
    sm: "max-w-md",
    default: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        dir={isRtl ? 'rtl' : 'ltr'}
        className={cn(
          sizeClasses[size], 
          "max-h-[85vh] overflow-hidden flex flex-col p-0 border border-border shadow-2xl shadow-slate-500/10 rounded-[2rem] bg-card",
          isRtl && "font-arabic"
        )}
      >
        <div className="px-8 pt-8 pb-4 border-b border-border bg-card">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground mt-1.5">
              {description}
            </DialogDescription>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 px-8 pt-6 pb-6 bg-card scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className={cn("space-y-5", isRtl ? "pl-2" : "pr-2")}>
            {children}
          </div>
        </div>

        {footer && (
          <div className="p-6 px-8 border-t border-border bg-card">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
