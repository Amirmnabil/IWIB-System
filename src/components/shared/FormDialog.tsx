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
  size = "default"
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  title: string,
  description?: string,
  children: React.ReactNode,
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
          "max-h-[90vh] overflow-hidden flex flex-col p-0",
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
        
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className={cn("space-y-4", isRtl ? "pl-4" : "pr-4")}>
            {children}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
