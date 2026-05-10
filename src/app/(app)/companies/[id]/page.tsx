'use client';
import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, 
  ChevronLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Plus, 
  Briefcase,
  Users,
  Activity as ActivityIcon,
  Target,
  Zap,
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { useDoc, useFirestore, useCollection, useMemoFirebase, doc, updateDoc, collection, addDoc, serverTimestamp, query, where, orderBy } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import { format } from "date-fns";
import type { Company, Activity } from "@/lib/types";
import FormDialog from "@/components/shared/FormDialog";
import { Separator } from "@/components/ui/separator";
import { syncContact } from "@/lib/contact-sync";
import { cn } from "@/lib/utils";

export default function CompanyProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();
  const firestore = useFirestore();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  // Firestore Data
  const companyRef = useMemoFirebase(() => doc(firestore!, 'companies', id), [firestore, id]);
  const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

  const activitiesQuery = useMemoFirebase(() => {
    return query(
      collection(firestore!, 'activities'),
      where('related_id', '==', id),
      orderBy('created_at', 'desc')
    );
  }, [firestore, id]);
  const { data: activitiesData } = useCollection<Activity>(activitiesQuery);
  const activities = activitiesData || [];

  const [formData, setFormData] = useState<Partial<Company>>({});
  const [activityForm, setActivityForm] = useState({
    subject: "",
    description: "",
    activity_type: "note",
    due_date: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  const handleEditOpen = () => {
    if (company) {
      setFormData({ ...company });
      setEditDialogOpen(true);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "companies", id), formData);
      
      // Sync Contacts
      if (formData.primary_contact_name && formData.primary_contact_email) {
        await syncContact(firestore, {
          name: formData.primary_contact_name,
          email: formData.primary_contact_email,
          phone: formData.primary_contact_phone,
          job_title: formData.primary_contact_title,
          company_id: id,
          company_name: formData.name,
          is_primary: true
        });
      }
      
      if (formData.hr_name && formData.hr_email) {
        await syncContact(firestore, {
          name: formData.hr_name,
          email: formData.hr_email,
          role_type: 'HR',
          company_id: id,
          company_name: formData.name
        });
      }

      toast({ title: "Company updated successfully" });
      setEditDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error updating company" });
    }
  };

  const handleAddActivity = async (type: 'note' | 'meeting' | 'call') => {
    if (!firestore) return;
    try {
      const data = {
        ...activityForm,
        activity_type: type,
        related_id: id,
        related_name: company?.name,
        related_type: "company",
        status: type === 'note' ? 'completed' : 'pending',
        created_at: new Date().toISOString()
      };
      await addDoc(collection(firestore, "activities"), data);
      toast({ title: "Interaction logged" });
      setMeetingDialogOpen(false);
      setFeedbackDialogOpen(false);
      setActivityForm({ subject: "", description: "", activity_type: "note", due_date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
    } catch (error) {
      toast({ variant: "destructive", title: "Error logging activity" });
    }
  };

  if (companyLoading) return <div className="p-8 text-center flex flex-col items-center gap-4"><Clock className="animate-spin w-12 h-12 text-indigo-600" /> <p className="font-bold text-slate-500">{t('loading')}...</p></div>;
  if (!company) return <div className="p-8 text-center text-slate-500 border-2 border-dashed rounded-3xl mt-12">Company record not found.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={cn("space-y-6 pb-12", isRtl && "font-arabic")}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/companies')} 
            className="rounded-full w-12 h-12 border-2 hover:bg-slate-50 transition-all"
          >
            <ChevronLeft className={cn("w-6 h-6", isRtl && "rotate-180")} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                {isRtl ? company.name_ar || company.name : company.name}
              </h1>
              <StatusBadge status={company.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3">{company.industry}</Badge>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{company.code}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-2xl font-black h-12 px-6 border-2 hover:shadow-lg transition-all" onClick={handleEditOpen}>
            <Edit className="w-4 h-4 mr-2" /> {t('edit')}
          </Button>
          <Button className="bg-indigo-900 hover:bg-indigo-800 rounded-2xl font-black h-12 px-6 shadow-xl shadow-indigo-200 transition-all active:scale-95" onClick={() => setMeetingDialogOpen(true)}>
            <Calendar className="w-4 h-4 mr-2" /> {t('requestMeeting')}
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('headcount')}
          value={company.employee_count?.toLocaleString() || '0'}
          icon={Users}
          color="bg-blue-600"
          description="Total Policy Members"
        />
        <StatCard
          title={t('lossRatio')}
          value="64.2%"
          icon={TrendingUp}
          color="bg-emerald-500"
          description="Engagement Health"
        />
        <StatCard
          title={t('activePremium')}
          value="EGP 1.2M"
          icon={Zap}
          color="bg-indigo-600"
          description="Annualized Revenue"
        />
        <StatCard
          title="Last Touch"
          value={company.last_contact_date ? format(new Date(company.last_contact_date), 'MMM d') : 'Never'}
          icon={Clock}
          color="bg-slate-800"
          description="Recent Interaction"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Info */}
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-white border-2 rounded-3xl w-full justify-start h-auto p-1.5 shadow-sm overflow-hidden">
              <TabsTrigger value="overview" className="rounded-2xl px-8 py-3 font-black text-sm data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all">
                {t('executiveOverview')}
              </TabsTrigger>
              <TabsTrigger value="activities" className="rounded-2xl px-8 py-3 font-black text-sm data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all">
                {t('activities')}
              </TabsTrigger>
              <TabsTrigger value="contacts" className="rounded-2xl px-8 py-3 font-black text-sm data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all">
                {t('multiLevelContacts')}
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="overview" className="mt-8 space-y-8 focus-visible:outline-none">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <Card className="rounded-3xl border-none shadow-xl shadow-slate-100 overflow-hidden group">
                    <CardHeader className="bg-slate-50/50 border-b p-6">
                      <CardTitle className="text-xs font-black uppercase text-indigo-900 flex items-center gap-3 tracking-widest">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Building2 className="w-4 h-4" /></div>
                        {t('coreProfile')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <InfoRow label={t('clientCode')} value={company.code} />
                      <InfoRow label={t('industry')} value={company.industry} />
                      <InfoRow label={t('headcount')} value={company.employee_count?.toString()} />
                      <InfoRow label="CR Number" value={company.cr_number} />
                      <InfoRow label="Tax Card" value={company.tax_card} />
                      <InfoRow label={t('currentInsurer')} value={company.current_insurer} />
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-xl shadow-slate-100 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b p-6">
                      <CardTitle className="text-xs font-black uppercase text-indigo-900 flex items-center gap-3 tracking-widest">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><Users className="w-4 h-4" /></div>
                        {t('multiLevelContacts')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-6 border-b hover:bg-slate-50/50 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-tighter">{t('primaryContact')}</p>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-black text-slate-900 text-lg leading-tight">{company.primary_contact_name || 'Not Assigned'}</p>
                            <p className="text-sm text-slate-500 font-medium">{company.primary_contact_title}</p>
                          </div>
                          <div className="flex gap-2">
                            {company.primary_contact_phone && (
                              <Button variant="outline" size="icon" className="rounded-xl border-2 hover:text-indigo-600" asChild>
                                <a href={`tel:${company.primary_contact_phone}`}><Phone className="w-4 h-4" /></a>
                              </Button>
                            )}
                            {company.primary_contact_email && (
                              <Button variant="outline" size="icon" className="rounded-xl border-2 hover:text-indigo-600" asChild>
                                <a href={`mailto:${company.primary_contact_email}`}><Mail className="w-4 h-4" /></a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-6 hover:bg-slate-50/50 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-tighter">{t('hrLeft')}</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500">{company.hr_name?.charAt(0) || '?'}</div>
                          <div>
                            <p className="font-bold text-slate-900">{company.hr_name || 'N/A'}</p>
                            <p className="text-xs text-slate-500 font-medium">{company.hr_email || 'No email provided'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <Card className="rounded-3xl border-none shadow-xl shadow-indigo-100/30 bg-gradient-to-br from-indigo-50/50 to-white relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 opacity-5"><BrainCircuit className="w-64 h-64" /></div>
                  <CardHeader className="p-6">
                    <CardTitle className="text-xs font-black uppercase text-indigo-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> {t('interactionNotes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-slate-700 leading-relaxed font-medium italic relative z-10">
                      {company.notes || 'No strategic context added for this account yet.'}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activities" className="mt-8 focus-visible:outline-none">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black tracking-tighter text-slate-900">{t('recentUserActivity')}</h3>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold border-2" onClick={() => setFeedbackDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> {t('add')}
                  </Button>
                </div>
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 text-slate-400 border-4 border-dashed rounded-[2rem] bg-slate-50/50">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-xs">No Timeline Records Found</p>
                    </motion.div>
                  ) : (
                    activities.map((act, index) => (
                      <motion.div 
                        key={act.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all cursor-default group overflow-hidden">
                          <CardContent className="p-5 flex gap-5">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                              act.activity_type === 'meeting' ? 'bg-purple-100 text-purple-600 shadow-lg shadow-purple-100' :
                              act.activity_type === 'call' ? 'bg-blue-100 text-blue-600 shadow-lg shadow-blue-100' : 
                              'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-100'
                            )}>
                              {act.activity_type === 'meeting' ? <Calendar className="w-6 h-6" /> : 
                               act.activity_type === 'call' ? <Phone className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{act.subject}</h4>
                                <Badge variant="outline" className="text-[9px] px-2 border-slate-200 text-slate-400 uppercase font-black tracking-widest h-5">
                                  {format(new Date(act.created_at), 'MMM d')}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mt-2 font-medium leading-relaxed">{act.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>

        {/* Right Column: Engagement & Links */}
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-indigo-200/40 overflow-hidden bg-white">
            <CardHeader className="bg-indigo-900 text-white p-8">
              <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em]">{t('telesalesWorkflowSuite')}</CardTitle>
                <Target className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-black text-xl border border-white/20">
                  {company.assigned_user_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Lead Manager</p>
                  <p className="text-xl font-black leading-tight">{company.assigned_user_name || 'Unassigned'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                <EngagementRow icon={Globe} label="Digital Surface" value={company.website} isLink />
                <EngagementRow icon={Users} label="Social Footprint" value={company.linkedin_page} isLink />
                <EngagementRow icon={MapPin} label={t('city')} value={company.city} />
                <EngagementRow icon={Clock} label={t('renewalMonth')} value={company.renewal_month} />
              </div>
              
              <Separator className="bg-slate-100" />
              
              <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ActivityIcon className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Engagement Pulse</span>
                </div>
                <div className="space-y-5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-400 font-black uppercase">{t('lastContact')}</span>
                    <span className="text-sm font-black text-slate-900">{company.last_contact_date ? format(new Date(company.last_contact_date), 'MMM yyyy') : 'Never'}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: '75%' }} 
                      className="bg-emerald-500 h-full rounded-full shadow-lg shadow-emerald-500/20" 
                    />
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-400 font-black uppercase">{t('followUpDate')}</span>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black px-3">
                      {company.follow_up_date || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-100 p-8 bg-slate-900 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-24 h-24" /></div>
            <div className="relative z-10">
              <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-6 tracking-[0.2em]">{t('forecastingAndMl')}</h4>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold">{t('riskAssessment')}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black">LOW RISK</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold">{t('conversionRate')}</span>
                  <span className="font-black text-2xl">84%</span>
                </div>
              </div>
              <Button className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 rounded-2xl h-12 font-black shadow-lg shadow-indigo-600/20">
                Generate Proposal <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogs... */}
      {/* Edit Dialog */}
      <FormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} title="Full Profile Editor" size="xl">
        <form onSubmit={handleUpdate} className="space-y-8 p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="English Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
            <FormInput label="Arabic Name" value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} />
            <FormInput label="Industry" value={formData.industry} onChange={v => setFormData({...formData, industry: v})} />
            <FormInput label="Code" value={formData.code} onChange={v => setFormData({...formData, code: v})} />
            <FormInput label="CR Number" value={formData.cr_number} onChange={v => setFormData({...formData, cr_number: v})} />
            <FormInput label="Tax Card" value={formData.tax_card} onChange={v => setFormData({...formData, tax_card: v})} />
            <FormInput label="City" value={formData.city} onChange={v => setFormData({...formData, city: v})} />
            <FormInput label="Source" value={formData.source} onChange={v => setFormData({...formData, source: v})} />
            <FormInput label="Renewal Month" value={formData.renewal_month} onChange={v => setFormData({...formData, renewal_month: v})} />
          </div>
          <Separator />
          <h4 className="font-bold text-indigo-900">HR Contacts</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput label="HR Name" value={formData.hr_name} onChange={v => setFormData({...formData, hr_name: v})} />
            <FormInput label="HR Email" value={formData.hr_email} onChange={v => setFormData({...formData, hr_email: v})} />
            <FormInput label="Primary Contact" value={formData.primary_contact_name} onChange={v => setFormData({...formData, primary_contact_name: v})} />
            <FormInput label="Primary Mobile" value={formData.primary_contact_phone} onChange={v => setFormData({...formData, primary_contact_phone: v})} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={4} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-900 font-bold px-8">Save All Changes</Button>
          </div>
        </form>
      </FormDialog>

      {/* Meeting Dialog */}
      <FormDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} title="Schedule Engagement">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Meeting Subject</Label>
            <Input value={activityForm.subject} onChange={e => setActivityForm({...activityForm, subject: e.target.value})} placeholder="e.g. Benefits Presentation" />
          </div>
          <div className="space-y-2">
            <Label>Scheduled Date & Time</Label>
            <Input type="datetime-local" value={activityForm.due_date} onChange={e => setActivityForm({...activityForm, due_date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Agenda / Description</Label>
            <Textarea value={activityForm.description} onChange={e => setActivityForm({...activityForm, description: e.target.value})} rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleAddActivity('meeting')} className="bg-indigo-900 font-bold">Schedule Appointment</Button>
          </div>
        </div>
      </FormDialog>

      {/* Feedback Dialog */}
      <FormDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen} title="Log Interaction">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Summary</Label>
            <Input value={activityForm.subject} onChange={e => setActivityForm({...activityForm, subject: e.target.value})} placeholder="e.g. Post-call feedback" />
          </div>
          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea value={activityForm.description} onChange={e => setActivityForm({...activityForm, description: e.target.value})} rows={4} placeholder="Note down key points discussed..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleAddActivity('note')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Save Feedback</Button>
          </div>
        </div>
      </FormDialog>
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string, value?: string }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 group">
      <span className="text-slate-400 font-bold">{label}</span>
      <span className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{value || '-'}</span>
    </div>
  );
}

function EngagementRow({ icon: Icon, label, value, isLink }: { icon: any, label: string, value?: string, isLink?: boolean }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:scale-110 transition-all border border-slate-100 group-hover:border-indigo-100">
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        {isLink && value ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" className="text-sm font-black text-indigo-600 hover:text-indigo-700 hover:underline truncate block flex items-center gap-1">
            {value} <ArrowUpRight className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm font-black text-slate-900 truncate">{value || 'Not provided'}</p>
        )}
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange }: { label: string, value: any, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-black uppercase text-slate-500 tracking-widest">{label}</Label>
      <Input value={value || ''} onChange={e => onChange(e.target.value)} className="h-12 rounded-xl border-2 focus-visible:ring-indigo-500" />
    </div>
  );
}