'use client';
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2, ChevronLeft, Mail, Phone, Globe, Calendar, Clock, Users, FileText,
  Shield, Activity as ActivityIcon, Plus, Edit2, MoreVertical, ArrowUpRight,
  TrendingUp, DollarSign, Briefcase, AlertCircle, FileSignature, Target, RefreshCw, Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n-context";
import { format } from "date-fns";
import { cn, formatCompactNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { LogActivityButton } from "@/components/crm/LogActivityButton";

export default function CompanyDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const [company, setCompany] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: comp },
        { data: acts },
        { data: pols },
        { data: cons },
        { data: { user } },
      ] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('related_id', id).order('created_at', { ascending: false }),
        supabase.from('policies').select('*').eq('client_company_id', id),
        supabase.from('contacts').select('*').eq('company_id', id),
        supabase.auth.getUser(),
      ]);
      setCompany(comp);
      setActivities(acts || []);
      setPolicies(pols || []);
      setContacts(cons || []);
      if (user) {
        const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
        setCurrentUser(userData || { id: user.id, name: user.email });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return (
    <div className="p-8 text-center flex flex-col items-center gap-4 justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">{t('loading')}...</p>
    </div>
  );

  if (!company) return <div className="p-8 text-center text-slate-500">{t('companyNotFound')}</div>;

  const totalPremium = policies.reduce((s, p) => s + (p.premium_total || 0), 0);

  const activityTypeIcon: Record<string, any> = {
    call: Phone, meeting: Calendar, email: Mail, task: FileText, note: FileText,
  };

  return (
    <div className={cn("pb-12 max-w-7xl mx-auto space-y-6 antialiased", isRtl && "font-arabic")}>

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 leading-none">
                {isRtl ? company.name_ar || company.name : company.name}
              </h1>
              <StatusBadge status={company.status} />
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-sm">
              {company.website && <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> {company.website}</span>}
              {company.city && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {company.city}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 px-5 rounded-xl border-slate-200 hover:bg-slate-50 gap-2" onClick={() => router.push(`/companies/${id}/edit`)}>
            <Edit2 className="w-4 h-4" /> {t('edit')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-100 p-1">
              <DropdownMenuItem className="rounded-lg gap-2" onClick={fetchAll}>
                <RefreshCw className="w-4 h-4" /> Refresh Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="flex-1 md:flex-none h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 gap-2 font-semibold"
            onClick={() => router.push(`/prospects?company_id=${id}&company_name=${encodeURIComponent(company.name)}`)}
          >
            <Plus className="w-4 h-4" /> {t('createDeal') || "Create Deal"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('pipelineValue') || "Pipeline Value"} value={formatCompactNumber(totalPremium)} icon={DollarSign} color="text-emerald-500" bg="bg-emerald-50" />
        <KPICard title={t('activePolicies')} value={policies.length} icon={Shield} color="text-blue-600" bg="bg-blue-50" />
        <KPICard title={t('headcount')} value={company.employee_count || 0} icon={Users} color="text-violet-500" bg="bg-violet-50" />
        <KPICard title="Activities" value={activities.length} icon={ActivityIcon} color="text-orange-500" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Tabs */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-slate-100/50 p-1 rounded-2xl mb-6 w-full sm:w-auto overflow-x-auto justify-start h-auto">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">{t('overview')}</TabsTrigger>
              <TabsTrigger value="activities" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                {t('activitiesTimeline')} {activities.length > 0 && <Badge className="ml-1 h-4 text-[9px] bg-indigo-100 text-indigo-600 border-none">{activities.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="policies" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">{t('policies')}</TabsTrigger>
              <TabsTrigger value="contacts" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">{t('contacts')}</TabsTrigger>
              <TabsTrigger value="offers" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Offers</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-slate-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-500" /> {t('businessSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    <DetailItem label={t('industry')} value={company.industry} t={t} />
                    <DetailItem label={t('clientType') || 'Client Type'} value={company.client_type} t={t} />
                    <DetailItem label={t('currentInsurer')} value={company.current_insurer} t={t} />
                    <DetailItem label={t('insuranceType')} value={company.insurance_type} t={t} />
                    <DetailItem label={t('renewalMonth')} value={company.renewal_month} t={t} />
                    <DetailItem label={t('headcount')} value={company.employee_count} t={t} />
                    <DetailItem label={t('crNumber')} value={company.cr_number} t={t} />
                    {(() => {
                      const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
                      const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name || ''}`.trim() : null;
                      const contactPhone = primaryContact?.phone || primaryContact?.mobile || null;
                      return (
                        <>
                          <DetailItem label="Primary Contact" value={contactName} t={t} />
                          <DetailItem label="Phone" value={contactPhone} t={t} />
                        </>
                      );
                    })()}
                  </div>
                  {company.notes && (
                    <div className="pt-4 border-t border-slate-50">
                      <DetailItem label={t('note')} value={company.notes} fullWidth t={t} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities Timeline */}
            <TabsContent value="activities" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 flex items-center justify-between border-b border-slate-100">
                  <h3 className="text-lg font-bold">{t('activityHistory')}</h3>
                  <LogActivityButton
                    companyId={id}
                    companyName={company.name}
                    currentUserId={currentUser?.id}
                    currentUserName={currentUser?.name}
                    onSuccess={fetchAll}
                    variant="full"
                    label={t('logActivity')}
                  />
                </div>
                <CardContent className="p-0">
                  {activities.length === 0 ? (
                    <div className="py-16 text-center">
                      <ActivityIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No activities logged yet. Log the first one!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {activities.map((act) => {
                        const Icon = activityTypeIcon[act.activity_type] || FileText;
                        return (
                          <div key={act.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              act.activity_type === 'call' ? 'bg-blue-50 text-blue-600' :
                              act.activity_type === 'meeting' ? 'bg-purple-50 text-purple-600' :
                              act.activity_type === 'email' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-slate-50 text-slate-600'
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-slate-900 text-sm truncate">{act.subject}</p>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {act.created_at ? format(new Date(act.created_at), 'MMM d, yyyy') : ''}
                                </span>
                              </div>
                              {act.description && <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>}
                              {act.result && <p className="text-xs text-indigo-600 mt-1 font-medium">Outcome: {act.result}</p>}
                              <div className="flex items-center gap-3 mt-1">
                                <StatusBadge status={act.status} className="h-4 text-[9px]" />
                                {act.assigned_to_name && <span className="text-[10px] text-slate-400">{act.assigned_to_name}</span>}
                                {act.duration_minutes > 0 && <span className="text-[10px] text-slate-400">{act.duration_minutes} min</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Policies */}
            <TabsContent value="policies" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold">{t('policies')}</h3>
                  <Button className="bg-indigo-600 rounded-xl gap-2 h-10 px-4" onClick={() => router.push('/policies')}>
                    <Plus className="w-4 h-4" /> {t('newPolicy')}
                  </Button>
                </div>
                {policies.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50/50 mx-6 mb-6 rounded-2xl border-2 border-dashed border-slate-200">
                    <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">{t('noActivePoliciesFound')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('policyNumber')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('insurer')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('premiumAmount')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('expiry')}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policies.map(policy => (
                          <tr key={policy.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => router.push(`/policies`)}>
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-900">{policy.policy_number}</span>
                              <p className="text-[10px] text-slate-500 uppercase mt-0.5">{policy.policy_type}</p>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600">{policy.insurer_name}</td>
                            <td className="px-6 py-4 font-bold text-emerald-600">{formatCompactNumber(policy.premium_total || 0)}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{policy.end_date ? format(new Date(policy.end_date), 'MMM d, yyyy') : '-'}</td>
                            <td className="px-6 py-4"><StatusBadge status={policy.policy_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Contacts */}
            <TabsContent value="contacts" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">{t('contacts')}</h3>
                    <Button className="bg-indigo-600 rounded-xl gap-2 h-10 px-4" onClick={() => router.push(`/contacts`)}>
                      <Plus className="w-4 h-4" /> {t('addContact')}
                    </Button>
                  </div>
                  {contacts.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">{t('noContactsFound')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contacts.map(contact => (
                        <div key={contact.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                            {(contact.first_name || 'C').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{contact.first_name} {contact.last_name}</h4>
                            <p className="text-[10px] text-slate-500 font-medium">{contact.role_type}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {contact.email && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>}
                              {contact.phone && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>}
                            </div>
                          </div>
                          {contact.is_primary && <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[8px] uppercase px-1.5 py-0">{t('primaryContact')}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Offers */}
            <TabsContent value="offers" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Quotations & Offers</h3>
                    <Button className="bg-indigo-600 rounded-xl gap-2 h-10 px-4">
                      <Upload className="w-4 h-4" /> Upload Offer
                    </Button>
                  </div>
                  <div className="py-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No offers uploaded yet.</p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">
          {/* Assigned Agent */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> {t('assignedTeam')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                  {(company.assigned_user_name || 'A').charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800">{company.assigned_user_name || t('unassigned')}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{t('primaryAccountManager')}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{t('source')}</span>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none px-2 py-0.5 text-[10px]">{company.source || t('direct')}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions — ALL WIRED */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-amber-500" /> {t('nextSteps')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-2">
              {company.follow_up_date && (
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 mb-4">
                  <div className="flex items-center gap-2 mb-1 text-amber-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold">{t('nextFollowUp')}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {format(new Date(company.follow_up_date), 'PPPP')}
                  </p>
                </div>
              )}
              <LogActivityButton companyId={id} companyName={company.name} currentUserId={currentUser?.id} currentUserName={currentUser?.name} onSuccess={fetchAll} prefillType="call" label="Log a Call" />
              <LogActivityButton companyId={id} companyName={company.name} currentUserId={currentUser?.id} currentUserName={currentUser?.name} onSuccess={fetchAll} prefillType="email" label="Log an Email" />
              <LogActivityButton companyId={id} companyName={company.name} currentUserId={currentUser?.id} currentUserName={currentUser?.name} onSuccess={fetchAll} prefillType="meeting" label="Schedule Meeting" />
              <LogActivityButton companyId={id} companyName={company.name} currentUserId={currentUser?.id} currentUserName={currentUser?.name} onSuccess={fetchAll} prefillType="note" label="Add a Note" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, bg }: any) {
  // convert text-color-xxx to bg-color-xxx for solid background
  const solidBg = color ? color.replace('text-', 'bg-') : 'bg-blue-600';
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Card className={cn("rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden text-white", solidBg)}>
        <CardContent className="p-6 flex flex-col gap-1">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{title}</p>
          <h3 className="text-xl font-black text-white">{value}</h3>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DetailItem({ label, value, fullWidth = false, t }: { label: string; value: any; fullWidth?: boolean; t: (k: any) => string }) {
  return (
    <div className={cn("space-y-1.5", fullWidth && "col-span-full")}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="text-sm font-semibold text-slate-800 leading-tight">
        {value || <span className="text-slate-300 font-normal italic">{t('notProvided')}</span>}
      </div>
    </div>
  );
}