'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, 
  ChevronLeft, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  Clock, 
  Users,
  FileText,
  UserX,
  Send,
  CheckCircle,
  XCircle,
  PhoneOff,
  AlertCircle,
  Save,
  Briefcase,
  Shield,
  Activity,
  FileSignature,
  MessageSquare,
  MapPin,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useDoc, useFirestore, doc, updateDoc, collection, addDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/i18n-context";
import { format } from "date-fns";
import type { Company } from "@/lib/types";
import { syncContact } from "@/lib/contact-sync";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function CompanyEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();
  const firestore = useFirestore();

  const companyRef = React.useMemo(() => doc(firestore!, 'companies', id), [firestore, id]);
  const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

  const [formData, setFormData] = useState<Partial<Company>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);

  const handleUpdate = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, "companies", id), formData);
      
      if (formData.primary_contact_name && formData.primary_contact_email) {
        await syncContact(firestore, {
          name: formData.primary_contact_name,
          email: formData.primary_contact_email,
          phone: formData.primary_contact_phone,
          job_title: formData.primary_contact_title,
          company_id: id,
          company_name: formData.name || "",
          is_primary: true
        });
      }
      
      toast({ title: t('companyUpdated') });
    } catch (error) {
      toast({ variant: "destructive", title: t('persistenceError') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusAction = async (status: string, message: string) => {
    setFormData(prev => ({ ...prev, status }));
    // Ideally save immediately when an action card is clicked
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "companies", id), { status });
      await addDoc(collection(firestore, "activities"), {
        subject: `Status updated to ${status}`,
        description: message,
        activity_type: "note",
        related_id: id,
        related_name: formData.name,
        related_type: "company",
        status: "completed",
        created_at: new Date().toISOString()
      });
      toast({ title: message });
    } catch (error) {
      toast({ variant: "destructive", title: t('persistenceError') });
    }
  };

  if (companyLoading) return <div className="p-8 text-center flex flex-col items-center gap-4"><Clock className="animate-spin w-8 h-8 text-indigo-600" /></div>;
  if (!company) return <div className="p-8 text-center text-slate-500">Company not found.</div>;

  return (
    <div className={cn("pb-12 max-w-7xl mx-auto space-y-4 antialiased tracking-wide text-slate-800", isRtl && "font-arabic")}>
      {/* Header Optimization */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/companies')} 
            className="hover:bg-slate-100 rounded-xl"
          >
            <ChevronLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
          </Button>
          <h1 className="text-xl font-semibold text-slate-800">
            {isRtl ? formData.name_ar || formData.name : formData.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="font-medium text-slate-500 hover:text-slate-800" onClick={() => setFormData(company)}>
            <X className="w-4 h-4 mr-2" /> {t('cancel')}
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-md shadow-indigo-200" 
            onClick={handleUpdate}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" /> {isSaving ? t('loading') + '...' : t('save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (70%) - Form */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Core Info & Business Details */}
          <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <Briefcase className="w-4 h-4 text-indigo-500" /> {t("businessDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label={t("companyEn")} value={formData.name} onChange={v => setFormData({...formData, name: v})} />
              <FormInput label={t("companyAr")} value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} />
              <FormInput label={t("industry")} value={formData.industry} onChange={v => setFormData({...formData, industry: v})} />
              <FormInput label={t("city")} value={formData.city} onChange={v => setFormData({...formData, city: v})} />
              <div className="sm:col-span-2">
                <FormInput label={t("address")} value={formData.address} onChange={v => setFormData({...formData, address: v})} />
              </div>
              <FormInput label={t("website")} value={formData.website} onChange={v => setFormData({...formData, website: v})} />
              <FormInput label={t("linkedin")} value={formData.linkedin_page} onChange={v => setFormData({...formData, linkedin_page: v})} />
            </CardContent>
          </Card>

          {/* Insurance Details */}
          <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <Shield className="w-4 h-4 text-emerald-500" /> {t("insuranceDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormInput label={t("currentInsurer")} value={formData.current_insurer} onChange={v => setFormData({...formData, current_insurer: v})} />
              <FormSelect 
                label={t("insuranceType")} 
                value={formData.insurance_type || ""} 
                onChange={v => setFormData({...formData, insurance_type: v as any})}
                options={["type_medical", "type_life", "type_motor", "type_property", "type_liability", "type_other"]}
              />
              <FormInput label={t("medicalSubtype")} value={formData.medical_subtype} onChange={v => setFormData({...formData, medical_subtype: v as any})} />
              <FormInput label={t("headcount")} type="number" value={formData.employee_count} onChange={v => setFormData({...formData, employee_count: parseInt(v) || 0})} />
              <FormInput label={t("renewalMonth")} value={formData.renewal_month} onChange={v => setFormData({...formData, renewal_month: v})} />
              <FormInput label={t("exSubmitOfferDate")} type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
            </CardContent>
          </Card>

          {/* Sales Tracking & Legal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <Activity className="w-4 h-4 text-blue-500" /> {t("salesTracking")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <FormSelect 
                  label={t("status")} 
                  value={formData.status || ""} 
                  onChange={v => setFormData({...formData, status: v})}
                  options={["status_prospect", "status_client", "status_not_interested", "status_wrong_number", "status_waiting_for_data", "status_call_back"]}
                />
                <FormInput label={t("source")} value={formData.source} onChange={v => setFormData({...formData, source: v})} />
                <FormInput label={t("followUpDate")} type="date" value={formData.follow_up_date} onChange={v => setFormData({...formData, follow_up_date: v})} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <FileSignature className="w-4 h-4 text-purple-500" /> {t("legalInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <FormInput label={t("crNumber")} value={formData.cr_number} onChange={v => setFormData({...formData, cr_number: v})} />
                <FormInput label={t("taxCard")} value={formData.tax_card} onChange={v => setFormData({...formData, tax_card: v})} />
                <FormInput label={t("clientCode")} value={formData.code} onChange={v => setFormData({...formData, code: v})} />
              </CardContent>
            </Card>
          </div>

          {/* Contacts - Accordion for levels */}
          <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <Users className="w-4 h-4 text-orange-500" /> {t("contacts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion type="single" collapsible defaultValue="level1" className="w-full">
                <AccordionItem value="level1" className="border-b border-slate-100">
                  <AccordionTrigger className="px-5 py-3 hover:bg-slate-50/50 font-medium text-sm">{t("level1")}</AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label={t("name")} value={formData.primary_contact_name} onChange={v => setFormData({...formData, primary_contact_name: v})} />
                    <FormInput label={t("title")} value={formData.primary_contact_title} onChange={v => setFormData({...formData, primary_contact_title: v})} />
                    <FormInput label={t("phone")} value={formData.primary_contact_phone} onChange={v => setFormData({...formData, primary_contact_phone: v})} />
                    <FormInput label={t("email")} value={formData.primary_contact_email} onChange={v => setFormData({...formData, primary_contact_email: v})} />
                    <div className="col-span-1 md:col-span-2 border-t my-2 border-slate-100" />
                    <FormInput label={t("name")} value={formData.hr_name} onChange={v => setFormData({...formData, hr_name: v})} />
                    <FormInput label={t("email")} value={formData.hr_email} onChange={v => setFormData({...formData, hr_email: v})} />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="level2" className="border-b border-slate-100">
                  <AccordionTrigger className="px-5 py-3 hover:bg-slate-50/50 font-medium text-sm">{t("level2")}</AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-2">
                    <div className="text-sm text-slate-500 italic">{t("secondaryContactInfo")}</div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="level3" className="border-none">
                  <AccordionTrigger className="px-5 py-3 hover:bg-slate-50/50 font-medium text-sm">{t("level3")}</AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-2">
                    <div className="text-sm text-slate-500 italic">{t("tertiaryContactInfo")}</div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <MessageSquare className="w-4 h-4 text-indigo-500" /> {t("internalNotes")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <Textarea 
                value={formData.notes || ""} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                rows={3}
                placeholder={t("internalNotes")}
                className="resize-y min-h-[80px] focus-visible:ring-indigo-500 text-sm font-normal"
              />
            </CardContent>
          </Card>

        </div>

        {/* Right Column (30%) - Action Cards */}
        <div className="lg:col-span-4 space-y-4">
          <div className="sticky top-24 space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2">{t("quickActions")}</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <ActionCard 
                icon={Calendar} 
                title={t("requestMeeting")} 
                gradient="from-indigo-50 to-blue-50" 
                iconColor="text-indigo-600"
                onClick={() => handleStatusAction("meeting_requested", "Meeting Requested")}
              />
              <ActionCard 
                icon={FileText} 
                title={t("requestQuotation")} 
                gradient="from-purple-50 to-pink-50" 
                iconColor="text-purple-600"
                onClick={() => handleStatusAction("quote_requested", "Quotation Requested")}
              />
              <ActionCard 
                icon={Clock} 
                title={t("waitingForData")} 
                gradient="from-amber-50 to-yellow-50" 
                iconColor="text-amber-600"
                onClick={() => handleStatusAction("waiting_for_data", "Marked as Waiting for Data")}
              />
              <ActionCard 
                icon={Phone} 
                title={t("callBack")} 
                gradient="from-cyan-50 to-blue-50" 
                iconColor="text-cyan-600"
                onClick={() => handleStatusAction("call_back", "Scheduled for Call Back")}
              />
              <ActionCard 
                icon={Send} 
                title={t("sendProfile")} 
                gradient="from-sky-50 to-indigo-50" 
                iconColor="text-sky-600"
                onClick={() => handleStatusAction("send_profile", "Company Profile Sent")}
              />
              <ActionCard 
                icon={CheckCircle} 
                title={t("renewed")} 
                gradient="from-emerald-50 to-teal-50" 
                iconColor="text-emerald-600"
                onClick={() => handleStatusAction("renewed", "Contract Renewed")}
              />
            </div>

            <div className="border-t border-slate-200 my-4" />
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2">{t("negativeOutcomes")}</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <ActionCard 
                icon={XCircle} 
                title={t("notInterested")} 
                gradient="from-red-50 to-rose-50" 
                iconColor="text-red-600"
                onClick={() => handleStatusAction("not_interested", "Marked as Not Interested")}
              />
              <ActionCard 
                icon={PhoneOff} 
                title={t("wrongNumber")} 
                gradient="from-slate-100 to-slate-50" 
                iconColor="text-slate-600"
                onClick={() => handleStatusAction("wrong_number", "Marked as Wrong Number")}
              />
              <ActionCard 
                icon={AlertCircle} 
                title={t("noAnswer")} 
                gradient="from-orange-50 to-amber-50" 
                iconColor="text-orange-600"
                onClick={() => handleStatusAction("no_answer", "Logged as No Answer")}
              />
              <ActionCard 
                icon={UserX} 
                title={t("hrLeft")} 
                gradient="from-zinc-100 to-slate-100" 
                iconColor="text-zinc-600"
                onClick={() => handleStatusAction("hr_left", "Noted: HR Contact Left")}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, gradient, iconColor, onClick }: any) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 border border-slate-100 shadow-sm bg-gradient-to-br transition-all hover:shadow-md",
        gradient
      )}
    >
      <Icon className={cn("w-5 h-5", iconColor)} />
      <span className="text-[11px] font-semibold text-slate-700 leading-tight">{title}</span>
    </motion.div>
  );
}

function FormInput({ label, value, type = "text", onChange }: { label: string, value: any, type?: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <Input 
        type={type}
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        className="h-9 text-sm font-normal text-slate-800 rounded-lg border-slate-200 focus-visible:ring-indigo-500 bg-white" 
      />
    </div>
  );
}

function FormSelect({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm font-normal text-slate-800 rounded-lg border-slate-200 bg-white">
          <SelectValue placeholder={t("search")} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="text-sm">
              {t(opt as any)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}