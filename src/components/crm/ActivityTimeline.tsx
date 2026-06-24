'use client';
import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  MoreVertical,
  Plus,
  Trash2,
  Edit2,
  FileText,
  User,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/components/i18n-context';
import type { Activity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityTimelineProps {
  activities: Activity[];
  onAddActivity?: () => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (id: string) => void;
  isLoading?: boolean;
}

const activityIconMap: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle2,
  note: MessageSquare,
  follow_up: Clock,
  feedback: AlertCircle,
};

const activityColorMap: Record<string, string> = {
  call: 'bg-blue-100 text-primary border-blue-200',
  email: 'bg-purple-100 text-purple-600 border-purple-200',
  meeting: 'bg-indigo-100 text-primary border-indigo-200',
  task: 'bg-emerald-100 text-success border-emerald-200',
  note: 'bg-slate-100 text-muted-foreground border-border',
  follow_up: 'bg-amber-100 text-amber-600 border-amber-200',
  feedback: 'bg-rose-100 text-rose-600 border-rose-200',
};

export function ActivityTimeline({ 
  activities, 
  onAddActivity, 
  onEditActivity, 
  onDeleteActivity,
  isLoading 
}: ActivityTimelineProps) {
  const { t, isRtl } = useI18n();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-100 rounded w-1/4" />
              <div className="h-10 bg-background rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-background/50 rounded-2xl border-2 border-dashed border-border">
        <div className="w-16 h-16 bg-card rounded-2xl shadow-sm flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-card-header text-foreground">{t('noActivities')}</h3>
        <p className="text-muted-foreground text-sm max-w-xs mt-1 mb-6">
          {t('noActivitiesDescription') || "Keep track of all interactions, calls, and meetings here."}
        </p>
        <Button onClick={onAddActivity} className="bg-primary hover:bg-indigo-700 shadow-lg shadow-indigo-200 gap-2">
          <Plus className="w-4 h-4" /> {t('addActivity')}
        </Button>
      </div>
    );
  }

  // Sort activities by date descending
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
      <AnimatePresence initial={false}>
        {sortedActivities.map((activity, index) => {
          const Icon = activityIconMap[activity.activity_type] || MessageSquare;
          const colorClass = activityColorMap[activity.activity_type] || activityColorMap.note;
          
          return (
            <motion.div 
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative flex items-start gap-6 group"
            >
              {/* Timeline Dot & Icon */}
              <div className={cn(
                "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-sm shrink-0 transition-transform group-hover:scale-110 group-hover:shadow-md",
                colorClass
              )}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content Card */}
              <Card className="flex-1 rounded-2xl border-border shadow-sm overflow-hidden group-hover:shadow-md group-hover:border-border transition-all duration-300">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5", colorClass)}>
                          {t(activity.activity_type as any)}
                        </Badge>
                        <span className="text-small text-slate-400">
                          {format(new Date(activity.created_at), 'PPP p')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onEditActivity?.(activity)} className="gap-2">
                              <Edit2 className="w-3.5 h-3.5" /> {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteActivity?.(activity.id)} className="gap-2 text-destructive focus:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-foreground mb-1 leading-tight">
                      {activity.subject}
                    </h4>
                    
                    {activity.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {activity.description}
                      </p>
                    )}

                    {(activity.assigned_to_name || activity.result) && (
                      <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap items-center gap-4">
                        {activity.assigned_to_name && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <span className="text-xs text-muted-foreground">{activity.assigned_to_name}</span>
                          </div>
                        )}
                        {activity.status && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-muted-foreground hover:bg-slate-200 border-none px-2">
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Footer Action (if any) */}
                  {activity.activity_type === 'call' && activity.status === 'completed' && (
                    <div className="px-5 py-3 bg-background/50 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-small text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {activity.duration_minutes || 0} {t('minutes')}
                      </span>
                      {activity.result && (
                        <span className="text-xs font-semibold text-primary flex items-center gap-1">
                          {activity.result} <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
