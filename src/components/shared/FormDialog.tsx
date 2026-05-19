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
          "max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[2rem]",
          isRtl && "font-arabic"
        )}
      >
        <DialogHeader className={cn("p-6 pb-2", isRtl ? "text-right" : "text-left")}>
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-slate-500 font-medium">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className={cn("space-y-4 pt-2", isRtl ? "pl-4" : "pr-4")}>
            {children}
          </div>
        </div>

        {footer && (
          <div className="p-6 pt-4 border-t bg-slate-50/50">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
