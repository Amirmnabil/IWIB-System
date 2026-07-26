import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Edit3, Target, Mail, Phone, ArrowUpRight } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useI18n } from '@/components/i18n-context';
import { TranslationSchema } from '@/lib/i18n';
import { cn } from "@/lib/utils";
import type { Company } from '@/lib/types';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { getCompanyPriority } from '@/lib/company-utils';
import { Badge } from "@/components/ui/badge";

interface CompanyCardProps {
  company: Company;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  className?: string;
}

export const CompanyCard = ({ company, onClick, onEdit, className }: CompanyCardProps) => {
  const { t, isRtl } = useI18n();

  // Fetch real contacts and activities for the preview
  const filterContacts = React.useCallback((q: any) => q.eq('company_id', company.id), [company.id]);
  const filterActivities = React.useCallback((q: any) => q.eq('related_id', company.id), [company.id]);

  const { data: rawContacts } = useSupabaseCollection<any>('contacts', filterContacts, { filterKey: `contacts-${company.id}` });
  const { data: rawActivities } = useSupabaseCollection<any>('activities', filterActivities, { filterKey: `activities-${company.id}` });

  const companyContacts = rawContacts ?? [];
  const companyActivities = rawActivities ?? [];

  const primaryContact = companyContacts.find(c => c.is_primary) || companyContacts[0] || null;
  const recentActivities = React.useMemo(() => {
    return [...companyActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [companyActivities]);

  const priority = (company as any)._priority || getCompanyPriority(company);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={cn("cursor-pointer group h-full", className)}
    >
      <Card className="rounded-[2rem] border-border shadow-sm hover:shadow-xl transition-all overflow-hidden bg-card h-full flex flex-col">
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                 <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider whitespace-nowrap rounded-lg px-2 py-0.5", priority.badgeColor)}>
                   {priority.label}
                 </Badge>
                 <StatusBadge status={company.status} />
              </div>
              {onEdit && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary" onClick={onEdit}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-black text-foreground mb-1 group-hover:text-primary transition-colors">
            {isRtl ? company.name_ar || company.name : company.name}
          </h3>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 mb-4">
            <Target className="w-3 h-3" /> {company.insurance_type ? (t(`type_${company.insurance_type.toLowerCase()}` as keyof TranslationSchema) || company.insurance_type) : ''}
          </p>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <div className="w-6 h-6 rounded-lg bg-background flex items-center justify-center"><Mail className="w-3 h-3 text-slate-400" /></div>
              <span className="truncate">{primaryContact?.email || t('notProvided')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <div className="w-6 h-6 rounded-lg bg-background flex items-center justify-center"><Phone className="w-3 h-3 text-slate-400" /></div>
              <span>{primaryContact?.phone || primaryContact?.mobile || t('notProvided')}</span>
            </div>
          </div>

          {/* Real Activities Section */}
          {recentActivities.length > 0 && (
             <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
               <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Recent Activity</h4>
               {recentActivities.map((act: any) => (
                 <div key={act.id} className="flex flex-col gap-0.5 text-xs">
                    <span className="font-semibold text-slate-700">{act.subject}</span>
                    <span className="text-[10px] text-slate-400">{new Date(act.created_at).toLocaleDateString()} • {act.status}</span>
                 </div>
               ))}
             </div>
          )}
        </div>

        <div className="mt-auto border-t border-slate-50 p-4 bg-background/30 flex items-center justify-between">
           <div className="flex -space-x-2">
              {companyContacts.slice(0, 3).map((c, i) => (
                <div key={c.id || i} title={`${c.first_name} ${c.last_name}`} className="w-7 h-7 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-primary">
                  {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
                </div>
              ))}
              {companyContacts.length > 3 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +{companyContacts.length - 3}
                </div>
              )}
           </div>
           {onClick && (
             <div className="flex items-center gap-1 text-primary font-black text-[10px] uppercase tracking-tighter">
                {t('viewDetails')} <ArrowUpRight className="w-3 h-3" />
             </div>
           )}
        </div>
      </Card>
    </motion.div>
  );
};
