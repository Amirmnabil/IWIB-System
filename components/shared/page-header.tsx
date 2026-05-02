
'use client';
import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n-context";

export function PageHeader({
  title,
  description,
  onAction,
  actionLabel,
  ActionIcon = Plus,
  children
}: {
  title: string,
  description?: string,
  onAction?: () => void,
  actionLabel?: string,
  ActionIcon?: LucideIcon,
  children?: React.ReactNode
}) {
  const { t, isRtl } = useI18n();

  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="text-slate-500 mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        
        {onAction && (
          <Button onClick={onAction} className="bg-indigo-600 hover:bg-indigo-700">
            <ActionIcon className="w-4 h-4 mr-2" />
            {actionLabel || t('add')}
          </Button>
        )}
      </div>
    </div>
  );
}
