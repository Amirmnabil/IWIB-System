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
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDoc, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Company, Activity } from "@/lib/types";
import FormDialog from "@/components/shared/FormDialog";
import { Separator } from "@/components/ui/separator";
import { syncContact } from "@/lib/contact-sync";

export default function CompanyProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();
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

  if (companyLoading) return <div className="p-8 text-center"><Clock className="animate-spin inline mr-2" /> Loading profile...</div>;
  if (!company) return <div className="p-8 text-center text-slate-500">Company record not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/companies')} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{company.name}</h1>
              <StatusBadge status={company.status} />
            </div>
            <p className="text-sm text-slate-500 font-medium">{company.name_ar} • {company.industry}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl font-bold h-11" onClick={handleEditOpen}>
            <Edit className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
          <Button className="bg-indigo-900 rounded-xl font-bold h-11" onClick={() => setMeetingDialogOpen(true)}>
            <Calendar className="w-4 h-4 mr-2" /> Schedule Meeting
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Info */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-white border-2 rounded-2xl w-full justify-start h-auto p-1.5 shadow-sm">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white">Profile Overview</TabsTrigger>
              <TabsTrigger value="activities" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white">Activity Log</TabsTrigger>
              <TabsTrigger value="contacts" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white">Full Directory</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm font-black uppercase text-indigo-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Company Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <InfoRow label="Company Code" value={company.code} />
                    <InfoRow label="Industry" value={company.industry} />
                    <InfoRow label="Employee Count" value={company.employee_count?.toString()} />
                    <InfoRow label="CR Number" value={company.cr_number} />
                    <InfoRow label="Tax Card" value={company.tax_card} />
                    <InfoRow label="Current Insurer" value={company.current_insurer} />
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm font-black uppercase text-indigo-900 flex items-center gap-2">
                      <Users className="w-4 h-4" /> HR Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-6 border-b">
                      <p className="text-xs font-black text-slate-400 uppercase mb-2">Primary Contact</p>
                      <p className="font-bold text-slate-900">{company.primary_contact_name || 'Not Assigned'}</p>
                      <p className="text-sm text-slate-500">{company.primary_contact_title}</p>
                      <div className="flex gap-4 mt-3">
                        {company.primary_contact_phone && <a href={`tel:${company.primary_contact_phone}`} className="text-indigo-600"><Phone className="w-4 h-4" /></a>}
                        {company.primary_contact_email && <a href={`mailto:${company.primary_contact_email}`} className="text-indigo-600"><Mail className="w-4 h-4" /></a>}
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-black text-slate-400 uppercase mb-2">HR Department</p>
                      <p className="font-bold text-slate-900">{company.hr_name || 'N/A'}</p>
                      <p className="text-sm text-slate-500">{company.hr_email}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-none shadow-sm bg-indigo-50/30">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase text-indigo-900">Notes & Background</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed italic">{company.notes || 'No notes added for this company.'}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Timeline</h3>
                <Button variant="outline" size="sm" onClick={() => setFeedbackDialogOpen(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Log Feedback
                </Button>
              </div>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 border-2 border-dashed rounded-2xl">No recorded interactions yet.</p>
                ) : (
                  activities.map((act) => (
                    <Card key={act.id} className="rounded-xl border-none shadow-sm">
                      <CardContent className="p-4 flex gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          act.activity_type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                          act.activity_type === 'call' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {act.activity_type === 'meeting' ? <Calendar className="w-5 h-5" /> : 
                           act.activity_type === 'call' ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900">{act.subject}</h4>
                            <span className="text-[10px] text-slate-400 uppercase font-black">{format(new Date(act.created_at), 'MMM d, p')}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{act.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Engagement & Links */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-indigo-900 text-white">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Engagement Context</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-xs text-slate-400 uppercase font-black">Account Manager</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {company.assigned_user_name?.charAt(0)}
                  </div>
                  <p className="font-bold text-slate-900">{company.assigned_user_name || 'Unassigned'}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <EngagementRow icon={Globe} label="Website" value={company.website} isLink />
                <EngagementRow icon={Users} label="LinkedIn" value={company.linkedin_page} isLink />
                <EngagementRow icon={MapPin} label="Location" value={company.city} />
                <EngagementRow icon={Clock} label="Renewal Month" value={company.renewal_month} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-sm p-6 bg-slate-900 text-white">
            <h4 className="text-xs font-black uppercase text-indigo-400 mb-4">Engagement Pulse</h4>
            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Last Contact</span>
                <span className="font-bold">{company.last_contact_date || 'Never'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Follow Up Due</span>
                <span className="font-bold text-amber-400">{company.follow_up_date || 'N/A'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

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
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value?: string }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="font-bold text-slate-900">{value || '-'}</span>
    </div>
  );
}

function EngagementRow({ icon: Icon, label, value, isLink }: { icon: any, label: string, value?: string, isLink?: boolean }) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
        {isLink && value ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" className="text-sm font-bold text-indigo-600 hover:underline truncate block">
            {value}
          </a>
        ) : (
          <p className="text-sm font-bold text-slate-700 truncate">{value || 'Not provided'}</p>
        )}
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange }: { label: string, value: any, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || ''} onChange={e => onChange(e.target.value)} className="h-10" />
    </div>
  );
}