
'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, Briefcase, FileText, ChevronLeft, Plus, Mail, Phone, Globe, MapPin, 
  DollarSign, Calendar, Edit, Trash2, CheckCircle2, Lock, Loader2, FolderOpen,
  X, PlusCircle, Scale, Info, ShieldAlert, Zap, Calculator
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { useSupabaseDoc } from "@/lib/hooks/use-supabase-doc";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { supabase } from "@/lib/supabase";
import { useCallback } from "react";
import type { 
  InsuranceCompany, InsurerContact, CommissionAgreement 
} from "@/lib/types";
import { format, isValid } from "date-fns";
import FormDialog from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { syncContact } from "@/lib/contact-sync";

const PRODUCT_TYPES = [
  "Medical", "Life", "Motor", "Property", "Liability", 
  "Marine", "Engineering", "Financial Lines", "Cyber", 
  "Travel", "Personal Accident"
];
const COMPANY_TYPES = ["Takaful", "Investment"];
const SUB_CATEGORIES = ["Sales", "Underwriting", "Claims", "Approvals", "Finance", "Legal", "Other"];
const COMMISSION_BASES = ["Gross Premium", "Net Premium", "Collected Premium"];
const FREQUENCIES = ["Monthly", "Quarterly", "Semi-Annual", "Annual"];
const PAYMENT_TARGETS = ["Immediate", "All Installments", "Specific Installment"];
const INSURER_STATUSES = ["Active", "Inactive", "Suspended", "Under Negotiation", "Contract Expired", "Blacklisted"];

export default function InsurerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();
  const { data: insurer, isLoading: insurerLoading } = useSupabaseDoc<InsuranceCompany>('insurance_companies', id);
  
  const contactsFilter = useCallback((q: any) => q.eq('insurer_id', id), [id]);
  const { data: contactsData } = useSupabaseCollection<InsurerContact>('insurer_contacts', contactsFilter, {
    filterKey: "insurer_contacts-filter"
  });
  const contacts = contactsData || [];
  
  const agreementsFilter = useCallback((q: any) => q.eq('insurer_id', id), [id]);
  const { data: agreementsData } = useSupabaseCollection<CommissionAgreement>('commission_agreements', agreementsFilter, {
    filterKey: "commission_agreements-filter"
  });
  const agreements = agreementsData || [];
  
  const [activeTab, setActiveTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"contact" | "agreement" | "insurer">("contact");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState({ 
    name: "", position: "", department: "", insuranceType: "Medical", subCategory: "Sales", email: "", mobile: "", isPrimary: false, notes: "" 
  });
  
  const [insurerForm, setInsurerForm] = useState<Partial<InsuranceCompany>>({
    companyName: "",
    companyCode: "",
    companyType: "Takaful",
    status: "Active",
    rating: "",
    type: [],
    commercialRegistration: "",
    taxCard: "",
    website: "",
    email: "",
    telephones: [""],
    address: "",
    internalComments: "",
    proration_method: "monthly",
    allowDeletionIfUtilized: false,
    waitingPeriodDays: 30
  });
  
  const initialAgreementState = {
    productType: "Medical",
    effectiveFrom: "",
    effectiveTo: "",
    status: "Active" as CommissionAgreement['status'],
    notes: "",
    essential: { rate: 0.15, calculationBase: "Gross Premium" as any, paymentFrequency: "Monthly" as any, conditions: "" },
    supplementary: { enabled: false, rate: 0, calculationBase: "Gross Premium" as any, paymentFrequency: "Monthly" as any, conditions: "" },
    motivational: { enabled: false, rate: 0, calculationBase: "Collected Premium" as any, paymentFrequency: "Annual" as any, conditions: "", targetPremium: 0, paymentTarget: "Immediate" as any, targetInstallmentNumber: 1 },
    retentionIncentive: { enabled: false, rate: 0, calculationBase: "Collected Premium" as any, paymentFrequency: "Annual" as any, conditions: "", targetPremium: 0, paymentTarget: "Immediate" as any, targetInstallmentNumber: 1 },
    volumeBonus: { enabled: false, rate: 0, calculationBase: "Collected Premium" as any, paymentFrequency: "Annual" as any, conditions: "", targetPremium: 0, paymentTarget: "Immediate" as any, targetInstallmentNumber: 1 }

  };
  
  const [agreementForm, setAgreementForm] = useState(initialAgreementState);

  const safeFormatDate = (dateValue: any, formatStr: string = 'MMM d, yyyy') => {
    if (!dateValue) return 'N/A';
    let date: Date;
    if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    if (!isValid(date)) return 'Invalid Date';
    return format(date, formatStr);
  };

  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
      return address.fullAddress || [address.area, address.city, address.country].filter(Boolean).join(', ');
    }
    return 'N/A';
  };

  const handleEditInsurer = () => {
    if (!insurer) return;
    setInsurerForm({
      companyName: insurer.companyName || "",
      companyCode: insurer.companyCode || "",
      companyType: insurer.companyType || "Takaful",
      status: insurer.status || "Active",
      rating: insurer.rating || "",
      type: insurer.type || [],
      email: insurer.email || "",
      telephones: (insurer.telephones?.length || 0) > 0 ? insurer.telephones : [""],
      website: insurer.website || "",
      internalComments: insurer.internalComments || "",
      notes: insurer.notes || "",
      address: formatAddress(insurer.address),
      commercialRegistration: insurer.commercialRegistration || "",
      taxCard: insurer.taxCard || "",
      proration_method: insurer.proration_method || "monthly",
      allowDeletionIfUtilized: !!insurer.allowDeletionIfUtilized,
      waitingPeriodDays: insurer.waitingPeriodDays || 30
    });
    setDialogType('insurer');
    setDialogOpen(true);
  };

  const handleAddPhone = () => setInsurerForm(prev => ({ ...prev, telephones: [...(prev.telephones || []), ""] }));
  const handleRemovePhone = (idx: number) => setInsurerForm(prev => ({ ...prev, telephones: (prev.telephones || []).filter((_, i) => i !== idx) }));
  const handlePhoneChange = (idx: number, val: string) => {
    const newPhones = [...(insurerForm.telephones || [])];
    newPhones[idx] = val;
    setInsurerForm(prev => ({ ...prev, telephones: newPhones }));
  };

  const handleEditAgreement = (agreement: CommissionAgreement) => {
    setEditingId(agreement.id);
    setAgreementForm({
      productType: agreement.productType,
      effectiveFrom: agreement.effectiveFrom ? safeFormatDate(agreement.effectiveFrom, 'yyyy-MM-dd') : "",
      effectiveTo: agreement.effectiveTo ? safeFormatDate(agreement.effectiveTo, 'yyyy-MM-dd') : "",
      status: agreement.status,
      notes: agreement.notes || "",
      essential: { 
        rate: agreement.commissionStructure.essential.rate, 
        calculationBase: agreement.commissionStructure.essential.calculationBase, 
        paymentFrequency: agreement.commissionStructure.essential.paymentFrequency,
        conditions: agreement.commissionStructure.essential.conditions || ""
      },
      supplementary: { 
        enabled: !!agreement.commissionStructure.supplementary,
        rate: agreement.commissionStructure.supplementary?.rate || 0, 
        calculationBase: agreement.commissionStructure.supplementary?.calculationBase || "Gross Premium", 
        paymentFrequency: agreement.commissionStructure.supplementary?.paymentFrequency || "Monthly",
        conditions: agreement.commissionStructure.supplementary?.conditions || ""
      },
      motivational: { 
        enabled: !!agreement.commissionStructure.motivational,
        rate: agreement.commissionStructure.motivational?.rate || 0, 
        calculationBase: agreement.commissionStructure.motivational?.calculationBase || "Collected Premium",
        paymentFrequency: agreement.commissionStructure.motivational?.paymentFrequency || "Annual",
        conditions: agreement.commissionStructure.motivational?.conditions || "",
        targetPremium: agreement.commissionStructure.motivational?.targetPremium || 0,
        paymentTarget: agreement.commissionStructure.motivational?.paymentTarget || "Immediate",
        targetInstallmentNumber: agreement.commissionStructure.motivational?.targetInstallmentNumber || 1
      },
      retentionIncentive: { 
        enabled: !!agreement.commissionStructure.retentionIncentive,
        rate: agreement.commissionStructure.retentionIncentive?.rate || 0, 
        calculationBase: agreement.commissionStructure.retentionIncentive?.calculationBase || "Collected Premium",
        paymentFrequency: agreement.commissionStructure.retentionIncentive?.paymentFrequency || "Annual",
        conditions: agreement.commissionStructure.retentionIncentive?.conditions || "",
        targetPremium: agreement.commissionStructure.retentionIncentive?.targetPremium || 0,
        paymentTarget: agreement.commissionStructure.retentionIncentive?.paymentTarget || "Immediate",
        targetInstallmentNumber: agreement.commissionStructure.retentionIncentive?.targetInstallmentNumber || 1
      },
      volumeBonus: { 
        enabled: !!agreement.commissionStructure.volumeBonus,
        rate: agreement.commissionStructure.volumeBonus?.rate || 0, 
        calculationBase: agreement.commissionStructure.volumeBonus?.calculationBase || "Collected Premium",
        paymentFrequency: agreement.commissionStructure.volumeBonus?.paymentFrequency || "Annual",
        conditions: agreement.commissionStructure.volumeBonus?.conditions || "",
        targetPremium: agreement.commissionStructure.volumeBonus?.targetPremium || 0,
        paymentTarget: agreement.commissionStructure.volumeBonus?.paymentTarget || "Immediate",
        targetInstallmentNumber: agreement.commissionStructure.volumeBonus?.targetInstallmentNumber || 1
      }
    });
    setDialogType('agreement');
    setDialogOpen(true);
  };

  const handleEditContact = (contact: InsurerContact) => {
    setEditingId(contact.id);
    setContactForm({
      name: contact.name,
      position: contact.position || "",
      department: contact.department || "",
      insuranceType: contact.insuranceType || "Medical",
      subCategory: contact.subCategory || "Sales",
      email: contact.email,
      mobile: contact.mobile || "",
      isPrimary: contact.isPrimary || false,
      notes: contact.notes || ""
    });
    setDialogType('contact');
    setDialogOpen(true);
  };

  const handleDeleteSub = (subCol: string, subId: string) => {
    if (!id || !confirm("Confirm deletion?")) return;
    const table = subCol === 'contacts' ? 'insurer_contacts' : 'commission_agreements';
    supabase.from(table).delete().eq('id', subId).then(() => toast({ title: "Removed successfully" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (dialogType === 'insurer') {
      supabase.from("insurance_companies").update({ ...insurerForm, updated_at: new Date().toISOString() }).eq("id", id).then(() => {
        toast({ title: "Partner profile updated" });
        setDialogOpen(false);
      });
      return;
    }

    let collectionPath = "";
    let data: any = {};

    if (dialogType === 'contact') {
      const typeCount = contacts.filter(c => c.insuranceType === contactForm.insuranceType).length;
      if (!editingId && typeCount >= 10) {
        toast({ variant: 'destructive', title: "Limit Reached", description: `You cannot add more than 10 contacts for ${contactForm.insuranceType}.` });
        return;
      }
      collectionPath = 'insurer_contacts';
      data = { ...contactForm, insurer_id: id, status: 'Active', created_at: new Date().toISOString() };
    } else if (dialogType === 'agreement') {
      collectionPath = 'commission_agreements';
      data = {
        productType: agreementForm.productType,
        effectiveFrom: agreementForm.effectiveFrom,
        effectiveTo: agreementForm.effectiveTo,
        status: agreementForm.status,
        notes: agreementForm.notes,
        commissionStructure: {
          essential: agreementForm.essential,
          supplementary: agreementForm.supplementary.enabled ? agreementForm.supplementary : null,
          motivational: agreementForm.motivational.enabled ? agreementForm.motivational : null,
          retentionIncentive: agreementForm.retentionIncentive.enabled ? agreementForm.retentionIncentive : null,
          volumeBonus: agreementForm.volumeBonus.enabled ? agreementForm.volumeBonus : null,
        },
        updated_at: new Date().toISOString(),
        insurer_id: id
      };
    }

    if (!collectionPath) return;

    if (editingId) {
      supabase.from(collectionPath).update(data).eq("id", editingId).then(async () => {
        if (dialogType === 'contact') {
          await syncContact(null, {
            name: data.name,
            email: data.email,
            mobile: data.mobile,
            role_type: data.subCategory,
            company_name: insurer?.companyName,
            notes: data.notes,
            is_primary: data.isPrimary
          });
        }
        toast({ title: "Updated successfully" });
        setDialogOpen(false);
        setEditingId(null);
      });
    } else {
      supabase.from(collectionPath).insert(sanitizeUUIDs({ ...data, created_at: new Date().toISOString() })).then(async () => {
        if (dialogType === 'contact') {
          await syncContact(null, {
            name: data.name,
            email: data.email,
            mobile: data.mobile,
            role_type: data.subCategory,
            company_name: insurer?.companyName,
            notes: data.notes,
            is_primary: data.isPrimary
          });
        }
        toast({ title: "Added successfully" });
        setDialogOpen(false);
      });
    }
  };

  const IncentiveTierForm = ({ tier, label, colorClass, tierKey }: { tier: any, label: string, colorClass: string, tierKey: 'supplementary' | 'motivational' | 'retentionIncentive' | 'volumeBonus' }) => (
    <Card className={cn("border-l-4 shadow-sm", colorClass.replace('bg-', 'border-'))}>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-background/50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider">{label}</CardTitle>
        <label className="flex items-center gap-2 text-small cursor-pointer">
          <input 
            type="checkbox" 
            checked={agreementForm[tierKey].enabled} 
            onChange={e => setAgreementForm({...agreementForm, [tierKey]: {...agreementForm[tierKey], enabled: e.target.checked}})} 
            className="rounded" 
          />
          Enable
        </label>
      </CardHeader>
      {agreementForm[tierKey].enabled && (
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <div className="space-y-2">
            <Label>Rate (e.g. 0.05)</Label>
            <Input type="number" step="0.01" value={agreementForm[tierKey].rate} onChange={e => setAgreementForm({...agreementForm, [tierKey]: {...agreementForm[tierKey], rate: parseFloat(e.target.value) || 0}})} />
          </div>
          <div className="space-y-2">
            <Label>Base</Label>
            <Select value={agreementForm[tierKey].calculationBase} onValueChange={v => setAgreementForm({...agreementForm, [tierKey]: {...agreementForm[tierKey], calculationBase: v as any}})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COMMISSION_BASES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={agreementForm[tierKey].paymentFrequency} onValueChange={v => setAgreementForm({...agreementForm, [tierKey]: {...agreementForm[tierKey], paymentFrequency: v as any}})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {tierKey !== 'supplementary' && (
            <>
              <div className="space-y-2">
                <Label>Target Premium (EGP)</Label>
                <Input type="number" value={agreementForm[tierKey].targetPremium} onChange={e => setAgreementForm({...agreementForm, [tierKey]: {...agreementForm[tierKey], targetPremium: parseFloat(e.target.value) || 0}})} />
              </div>
              <div className="space-y-2">
                <Label>Application</Label>
                <Select value={agreementForm[tierKey].paymentTarget} onValueChange={v => setAgreementForm({...agreementForm, [tierKey]: {...agreementForm[tierKey], paymentTarget: v as any}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Specific Conditions</Label>
            <Input value={agreementForm[tierKey].conditions} onChange={e => setAgreementForm({...agreementForm, [tierKey]: {...agreementForm[tierKey], conditions: e.target.value}})} placeholder="Threshold rules or exclusions" />
          </div>
        </CardContent>
      )}
    </Card>
  );

  if (insurerLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-primary" /></div>;
  if (!insurer) return <div className="p-8 text-center">Insurer not found.</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/insurance-companies')} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-metric text-foreground tracking-tight">{insurer.companyName}</h1>
              <StatusBadge status={insurer.status} />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-1">Code: {insurer.companyCode} • {insurer.companyType}</p>
          </div>
        </div>
        <Button variant="outline" className="h-11 rounded-xl font-bold gap-2 border-2" onClick={handleEditInsurer}>
          <Edit className="w-4 h-4" /> Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-indigo-900 text-white pb-6">
              <CardTitle className="text-lg font-bold">Contact Directory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-bold uppercase">Email Address</p>
                    <p className="text-sm font-semibold text-slate-700 truncate">{insurer.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Telephones</p>
                    { (insurer.telephones?.length || 0) > 0 ? insurer.telephones?.map((t, idx) => (
                      <p key={idx} className="text-sm font-semibold text-slate-700">{t}</p>
                    )) : <p className="text-sm font-semibold text-slate-700">{insurer.phone || 'N/A'}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-bold uppercase">Website</p>
                    <p className="text-sm font-semibold text-primary truncate">{insurer.website || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Full Address</p>
                    <p className="text-sm font-semibold text-slate-700">{formatAddress(insurer.address)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl bg-primary/10/50">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-indigo-900">Portfolio Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {insurer.type?.map(t => (
                  <Badge key={t} className="bg-primary text-white rounded-lg px-3 py-1">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card border-2 rounded-2xl w-full justify-start h-auto p-1.5 shadow-sm overflow-x-auto">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="contacts" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all whitespace-nowrap">Contacts</TabsTrigger>
              <TabsTrigger value="endorsement-rules" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all whitespace-nowrap">Endorsement Rules</TabsTrigger>
              <TabsTrigger value="docs" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-900 data-[state=active]:text-white transition-all whitespace-nowrap">Doc Field</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="rounded-2xl border-none shadow-sm bg-card p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Registration</p>
                      <p className="text-lg font-bold text-foreground">{insurer.commercialRegistration || '-'}</p>
                      <p className="text-xs text-muted-foreground font-semibold uppercase mt-1">Comm. Register</p>
                    </div>
                    <FileText className="w-8 h-8 text-indigo-100" />
                  </div>
                </Card>
                <Card className="rounded-2xl border-none shadow-sm bg-card p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Fiscal ID</p>
                      <p className="text-lg font-bold text-foreground">{insurer.taxCard || '-'}</p>
                      <p className="text-xs text-muted-foreground font-semibold uppercase mt-1">Tax Card Number</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-indigo-100" />
                  </div>
                </Card>
              </div>

              <Card className="rounded-2xl border-none shadow-sm bg-amber-50/30 border-l-4 border-l-amber-400">
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-amber-900 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Internal Operations Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {insurer.internalComments || "No internal comments recorded for this partner."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-card-header text-foreground">Partner Contacts</h3>
                <Button onClick={() => { setDialogType('contact'); setEditingId(null); setDialogOpen(true); }} className="rounded-xl bg-indigo-900 font-bold h-10 px-6">
                  <Plus className="w-4 h-4 mr-2" /> Add Contact
                </Button>
              </div>

              <Accordion type="multiple" className="space-y-4">
                {PRODUCT_TYPES.map(type => {
                  const typeContacts = contacts.filter(c => c.insuranceType === type);
                  if (typeContacts.length === 0) return null;
                  
                  return (
                    <AccordionItem key={type} value={type} className="border-2 rounded-2xl px-4 bg-card overflow-hidden shadow-sm">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {typeContacts.length}
                          </div>
                          <span className="font-bold text-foreground">{type} Portfolio</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-6">
                        <div className="space-y-6 pt-2">
                          {SUB_CATEGORIES.map(sub => {
                            const subContacts = typeContacts.filter(c => c.subCategory === sub);
                            if (subContacts.length === 0) return null;
                            
                            return (
                              <div key={sub} className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 border-b border-indigo-50 pb-1">{sub} Department</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {subContacts.map(contact => (
                                    <div key={contact.id} className="group p-4 border-2 rounded-xl hover:border-indigo-200 hover:bg-primary/10/20 transition-all">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="font-bold text-foreground leading-tight">{contact.name}</p>
                                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{contact.position}</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleEditContact(contact)}><Edit className="w-3.5 h-3.5" /></Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSub('contacts', contact.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </div>
                                      </div>
                                      <div className="space-y-1 mt-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Mail className="w-3 h-3 text-slate-400" /> {contact.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Phone className="w-3 h-3 text-slate-400" /> {contact.mobile || contact.phone || '-'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </TabsContent>



            <TabsContent value="endorsement-rules" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-card-header text-foreground">Addition & Deletion Policy</h3>
                <Badge variant="outline" className="bg-primary/10 text-indigo-700 border-indigo-100 font-bold px-3 py-1">Operational Rules</Badge>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card className="rounded-2xl border-none shadow-sm bg-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <PlusCircle className="w-5 h-5 text-success" />
                    <h4 className="font-black text-slate-700 uppercase text-xs tracking-widest">Addition Settings</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Proration Method</p>
                      <p className="text-2xl font-black text-foreground capitalize">{insurer.proration_method || 'monthly'}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Determines how premium is prorated for new joiners.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Billing Lag</p>
                      <p className="text-2xl font-black text-foreground">{insurer.waitingPeriodDays || 30} Days</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Days before issuing Addition invoice.</p>
                    </div>
                  </div>
                </Card>

                <Card className={cn("rounded-2xl border-none shadow-sm p-6", insurer.allowDeletionIfUtilized ? "bg-success/10/50" : "bg-destructive/10/50")}>
                  <div className="flex items-center gap-3 mb-4">
                    <X className="w-5 h-5 text-destructive" />
                    <h4 className="font-black text-slate-700 uppercase text-xs tracking-widest">Deletion Settings</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Utilization Check</p>
                      <p className="text-2xl font-black text-foreground">{insurer.allowDeletionIfUtilized ? 'Bypassed' : 'Active Block'}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {insurer.allowDeletionIfUtilized 
                          ? 'Deletion allowed even with usage.' 
                          : 'Blocked if any utilization detected.'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Billing Lag</p>
                      <p className="text-2xl font-black text-foreground">{insurer.waitingPeriodDays || 30} Days</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Days before issuing Deletion invoice.</p>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="mt-6">
              <Card className="rounded-2xl border-none shadow-sm p-8 text-center bg-background border-2 border-dashed">
                <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-foreground">Document Management</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">Historical and legal documentation storage.</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <FormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        title={`${editingId ? 'Edit' : 'Add'} ${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)}`}
        size={dialogType === 'agreement' || dialogType === 'insurer' ? "xl" : "lg"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 py-2 px-1">
          {dialogType === 'insurer' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-500" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Company Name *</Label>
                    <Input value={insurerForm.companyName} onChange={(e) => setInsurerForm({...insurerForm, companyName: e.target.value})} required placeholder="Enter insurer name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Code</Label>
                    <Input value={insurerForm.companyCode} onChange={(e) => setInsurerForm({...insurerForm, companyCode: e.target.value.toUpperCase()})} placeholder="Auto-generated if blank" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Type</Label>
                    <Select value={insurerForm.companyType} onValueChange={(v) => setInsurerForm({...insurerForm, companyType: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={insurerForm.status} onValueChange={(v) => setInsurerForm({...insurerForm, status: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INSURER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <Input value={insurerForm.rating} onChange={(e) => setInsurerForm({...insurerForm, rating: e.target.value})} placeholder="e.g. A+" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-500" /> Addition & Deletion Policy
                </h3>
                
                {/* Addition Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl bg-background/30">
                  <div className="space-y-2 md:col-span-2 flex items-center gap-2 border-b pb-2">
                    <PlusCircle className="w-4 h-4 text-success" />
                    <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Addition Policy Settings</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-bold">
                      Proration Method
                      <Info className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Select value={insurerForm.proration_method} onValueChange={(v) => setInsurerForm({...insurerForm, proration_method: v as any})}>
                      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground font-medium">Monthly: charge full/prorated month. Daily: charge per exact day count.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-bold">
                      Waiting Period (Days)
                      <Info className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input 
                      type="number" 
                      value={insurerForm.waitingPeriodDays} 
                      onChange={(e) => setInsurerForm({...insurerForm, waitingPeriodDays: Number(e.target.value)})}
                      placeholder="e.g. 30"
                      className="bg-card"
                    />
                    <p className="text-[10px] text-muted-foreground font-medium">Days before issuing Addition/Deletion invoice after transaction date.</p>
                  </div>
                </div>

                {/* Deletion Row */}
                <div className="grid grid-cols-1 gap-6 p-4 border rounded-xl bg-background/30">
                  <div className="space-y-2 flex items-center gap-2 border-b pb-2">
                    <X className="w-4 h-4 text-destructive" />
                    <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Deletion Policy Settings</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Utilization Check</Label>
                      <p className="text-[10px] text-muted-foreground font-medium">Allow deletion if member has medical utilization?</p>
                    </div>
                    <Switch 
                      checked={insurerForm.allowDeletionIfUtilized} 
                      onCheckedChange={(v) => setInsurerForm({...insurerForm, allowDeletionIfUtilized: v})} 
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Insurance Lines Portfolio</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PRODUCT_TYPES.map(type => (
                    <label key={type} className={cn(
                      "flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors",
                      insurerForm.type?.includes(type) ? "bg-primary/10 border-indigo-200" : "hover:bg-background"
                    )}>
                      <input
                        type="checkbox"
                        checked={insurerForm.type?.includes(type)}
                        onChange={(e) => {
                          const types = e.target.checked 
                            ? [...(insurerForm.type || []), type]
                            : (insurerForm.type || []).filter(t => t !== type);
                          setInsurerForm({...insurerForm, type: types});
                        }}
                        className="rounded text-primary focus:ring-indigo-500"
                      />
                      <span className="text-standard">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Legal & Registration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commercial Registration Number</Label>
                    <Input value={insurerForm.commercialRegistration} onChange={(e) => setInsurerForm({...insurerForm, commercialRegistration: e.target.value})} placeholder="CR Number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Card Number</Label>
                    <Input value={insurerForm.taxCard} onChange={(e) => setInsurerForm({...insurerForm, taxCard: e.target.value})} placeholder="Tax ID" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={insurerForm.website} onChange={(e) => setInsurerForm({...insurerForm, website: e.target.value})} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Email</Label>
                    <Input type="email" value={insurerForm.email} onChange={(e) => setInsurerForm({...insurerForm, email: e.target.value})} placeholder="corporate@email.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Telephone Numbers</Label>
                    <div className="space-y-2">
                      {insurerForm.telephones?.map((phone, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input value={phone} onChange={(e) => handlePhoneChange(idx, e.target.value)} placeholder="Enter phone number" />
                          <Button type="button" variant="outline" size="icon" onClick={() => handleRemovePhone(idx)} disabled={insurerForm.telephones?.length === 1}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={handleAddPhone} className="text-primary">
                        <Plus className="w-4 h-4 mr-1" /> Add Number
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Textarea 
                      value={typeof insurerForm.address === 'string' ? insurerForm.address : ''} 
                      onChange={(e) => setInsurerForm({...insurerForm, address: e.target.value})} 
                      placeholder="Full physical address" 
                      rows={2} 
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" /> Internal Section
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>General Notes</Label>
                    <Textarea value={insurerForm.notes} onChange={(e) => setInsurerForm({...insurerForm, notes: e.target.value})} placeholder="Public notes..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Internal Comments</Label>
                    <Textarea value={insurerForm.internalComments} onChange={(e) => setInsurerForm({...insurerForm, internalComments: e.target.value})} placeholder="Confidential broker comments..." rows={2} className="bg-amber-50/30 border-amber-100" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {dialogType === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} required /></div>
              <div className="space-y-2">
                <Label>Insurance Line Focus</Label>
                <Select value={contactForm.insuranceType} onValueChange={v => setContactForm({...contactForm, insuranceType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department / Category</Label>
                <Select value={contactForm.subCategory} onValueChange={v => setContactForm({...contactForm, subCategory: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUB_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} required /></div>
              <div className="space-y-2"><Label>Direct Phone</Label><Input value={contactForm.mobile} onChange={e => setContactForm({...contactForm, mobile: e.target.value})} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={contactForm.notes} onChange={e => setContactForm({...contactForm, notes: e.target.value})} rows={2} /></div>
            </div>
          )}

          {dialogType === 'agreement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Insurance Line</Label>
                  <Select value={agreementForm.productType} onValueChange={v => setAgreementForm({...agreementForm, productType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={agreementForm.effectiveFrom} onChange={e => setAgreementForm({...agreementForm, effectiveFrom: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={agreementForm.effectiveTo} onChange={e => setAgreementForm({...agreementForm, effectiveTo: e.target.value})} required /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={agreementForm.status} onValueChange={v => setAgreementForm({...agreementForm, status: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="border-l-4 border-indigo-900 shadow-sm">
                  <CardHeader className="py-3 px-4 bg-background/50"><CardTitle className="text-sm font-bold uppercase tracking-wider">1. Essential Commission (Mandatory)</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    <div className="space-y-2"><Label>Rate (e.g. 0.15)</Label><Input type="number" step="0.01" value={agreementForm.essential.rate} onChange={e => setAgreementForm({...agreementForm, essential: {...agreementForm.essential, rate: parseFloat(e.target.value) || 0}})} required /></div>
                    <div className="space-y-2">
                      <Label>Calculation Base</Label>
                      <Select value={agreementForm.essential.calculationBase} onValueChange={v => setAgreementForm({...agreementForm, essential: {...agreementForm.essential, calculationBase: v as any}})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{COMMISSION_BASES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Frequency</Label>
                      <Select value={agreementForm.essential.paymentFrequency} onValueChange={v => setAgreementForm({...agreementForm, essential: {...agreementForm.essential, paymentFrequency: v as any}})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <IncentiveTierForm tier={agreementForm.supplementary} label="2. Supplementary Commission" colorClass="bg-primary/10" tierKey="supplementary" />
                <IncentiveTierForm tier={agreementForm.motivational} label="3. Motivational Incentive" colorClass="bg-amber-50" tierKey="motivational" />
                <IncentiveTierForm tier={agreementForm.retentionIncentive} label="4. Retention Incentive" colorClass="bg-success/10" tierKey="retentionIncentive" />
                <IncentiveTierForm tier={agreementForm.volumeBonus} label="5. Volume Bonus Incentive" colorClass="bg-primary/10" tierKey="volumeBonus" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-6" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-xl px-8 bg-indigo-900 font-bold shadow-lg">Save Changes</Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
