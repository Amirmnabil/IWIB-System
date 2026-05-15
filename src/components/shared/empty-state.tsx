
'use client';
import React from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-context";
import { Plus, LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  onAction,
  actionLabel
}: {
  icon?: LucideIcon,
  title: string,
  description?: string,
  onAction?: () => void,
  actionLabel?: string
}) {
  const { t } = useI18n();
  const finalActionLabel = actionLabel || t('add');
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 text-center max-w-sm mb-4">{description}</p>
      {onAction && (
        <Button onClick={onAction} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          {finalActionLabel}
        </Button>
      )}
    </div>
  );
}
