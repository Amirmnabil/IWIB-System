
'use client';
import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  subtitle = false,
  onAction,
  actionLabel,
  ActionIcon = Plus,
  children
}: {
  title: React.ReactNode,
  description?: React.ReactNode,
  subtitle?: boolean,
  onAction?: () => void,
  actionLabel?: string,
  ActionIcon?: LucideIcon,
  children?: React.ReactNode
}) {
  const { t, isRtl } = useI18n();

  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5", isRtl && "font-arabic")}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && description && <p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        
        {onAction && (
          <Button 
            onClick={onAction} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-lg px-3 h-8 text-xs font-semibold"
          >
            <ActionIcon className={cn("w-3.5 h-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
            {actionLabel || t('add')}
          </Button>
        )}
      </div>
    </div>
  );
}
