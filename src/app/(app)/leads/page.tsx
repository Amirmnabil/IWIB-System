
'use client';
import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { 
  Target, Building2, Calendar, User, DollarSign, Edit, Trash2, Briefcase, 
  TrendingUp, CheckCircle2, Loader2, AlertCircle, Percent, Timer, MapPin, Globe,
  UserCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/hooks/use-toast";
import type { Company, Lead, Prospect } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { doc, updateDoc, deleteDoc, addDoc, collection } from "firebase/firestore";
import { useI18n } from "@/components/i18n-context";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { syncContact } from "@/lib/contact-sync";

const LOB_OPTIONS = [
  "Medical", "Life", "Motor", "Property", "Liability", 
  "Marine", "Engineering", "Financial Lines", "Cyber", 
  "Travel", "Personal Accident"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SOURCES = ["Referral", "Cold Call", "Website", "LinkedIn", "Trade Show", "Partner", "Facebook", "Other"];

const emptyForm: Omit<Company, 'id' | 'created_at'> = {
  code: "",
  name: "",
  name_ar: "",
  industry: "",
  employee_count: 0,
  status: "lead",
  priority: "medium",
  city: "",
  address: "",
  cr_number: "",
  tax_card: "",
  current_insurer: "",
  insurance_type: "Medical",
  medical_subtype: "SME",
  checklist_status: {},
  checklist_completion: "Pending",
  expected_renewal_date: "January",
  expected_offer_date: "",
  actual_renewal_date: "January",
  actual_offer_date: "",
  primary_contact_title: "",
  primary_contact_name: "",
  primary_contact_phone: "",
  primary_contact_email: "",
  second_contact_title: "",
  second_contact_name: "",
  second_contact_mobile: "",
  second_contact_email: "",
  third_contact_title: "",
  third_contact_name: "",
  third_contact_mobile: "",
  third_contact_email: "",
  website: "",
  linkedin_page: "",
  landline: "",
  assigned_user_id: "",
  assigned_user_name: "",
  source: "",
  last_contact_date: "",
  call_date: "",
  follow_up_date: "",
  renewal_month: "January",
  notes: ""
};

export default function Leads() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);
  const { data: companiesData, isLoading } = useCollection<Company>(companiesRef);
  const companies = companiesData || [];
  
  const leads = useMemo(() => companies.filter(c => c.status === 'lead'), [companies]);
  
  const usersRef = useMemoFirebase(() => collection(firestore!, 'users'), [firestore]);
  const { data: usersData } = useCollection<any>(usersRef);
  const users = usersData || [];

  const industriesRef = useMemoFirebase(() => collection(firestore!, 'master_industries'), [firestore]);
  const { data: industriesData } = useCollection<any>(industriesRef);
  const industries = useMemo(() => {
    const data = industriesData || [];
    return data.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
  }, [industriesData]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Omit<Company, 'id' | 'created_at'>>(emptyForm);
  const [conversionData, setConversionData] = useState({
    estimated_value: 0,
    probability: 50,
    expected_close_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ""
  });

  const [globalFilter, setGlobalFilter] = useState('');

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedLead(null);
  };

  const handleEdit = (lead: Company) => {
    setSelectedLead(lead);
    setFormData({ ...emptyForm, ...lead });
    setDialogOpen(true);
  };

  const handleConvertToProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !firestore) return;
    
    setIsProcessing(true);
    try {
      const prospectData: Omit<Prospect, 'id' | 'created_at'> = {
        company_name: selectedLead.name,
        company_id: selectedLead.id,
        pipeline_stage: 'qualification',
        probability: conversionData.probability,
        estimated_value: conversionData.estimated_value,
        expected_close_date: conversionData.expected_close_date,
        assigned_user_name: selectedLead.assigned_user_name || user?.displayName || "",
        assigned_user_id: selectedLead.assigned_user_id || user?.uid || "",
        notes: conversionData.notes,
        requested_products: [selectedLead.insurance_type || "Other"]
      };

      await addDoc(collection(firestore, 'prospects'), {
        ...prospectData,
        created_at: new Date().toISOString()
      });

      await updateDoc(doc(firestore, "companies", selectedLead.id), {
        status: 'prospect',
        previous_status: 'lead'
      });

      toast({ title: "Lead Converted to Prospect" });
      setConversionDialogOpen(false);
    } catch (error) {
      console.error("Conversion failed:", error);
      toast({ variant: 'destructive', title: "Conversion Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    try {
      if (selectedLead) {
        await updateDoc(doc(firestore, "companies", selectedLead.id), { ...formData } as any);
        
        // Sync Contacts
        const company_id = selectedLead.id;
        const company_name = formData.name;

        if (formData.primary_contact_name && formData.primary_contact_email) {
          await syncContact(firestore, {
            name: formData.primary_contact_name,
            email: formData.primary_contact_email,
            phone: formData.primary_contact_phone,
            job_title: formData.primary_contact_title,
            company_id, company_name, is_primary: true
          });
        }
        if (formData.second_contact_name && formData.second_contact_email) {
          await syncContact(firestore, {
            name: formData.second_contact_name,
            email: formData.second_contact_email,
            mobile: formData.second_contact_mobile,
            job_title: formData.second_contact_title,
            company_id, company_name
          });
        }
        if (formData.third_contact_name && formData.third_contact_email) {
          await syncContact(firestore, {
            name: formData.third_contact_name,
            email: formData.third_contact_email,
            mobile: formData.third_contact_mobile,
            job_title: formData.third_contact_title,
            company_id, company_name
          });
        }

        toast({ title: "Lead profile updated" });
      } else {
        const docRef = await addDoc(collection(firestore, "companies"), { ...formData, status: 'lead', created_at: new Date().toISOString() } as any);
        
        // Sync Contacts
        const company_id = docRef.id;
        const company_name = formData.name;

        if (formData.primary_contact_name && formData.primary_contact_email) {
          await syncContact(firestore, {
            name: formData.primary_contact_name,
            email: formData.primary_contact_email,
            phone: formData.primary_contact_phone,
            job_title: formData.primary_contact_title,
            company_id, company_name, is_primary: true
          });
        }
        if (formData.second_contact_name && formData.second_contact_email) {
          await syncContact(firestore, {
            name: formData.second_contact_name,
            email: formData.second_contact_email,
            mobile: formData.second_contact_mobile,
            job_title: formData.second_contact_title,
            company_id, company_name
          });
        }
        if (formData.third_contact_name && formData.third_contact_email) {
          await syncContact(firestore, {
            name: formData.third_contact_name,
            email: formData.third_contact_email,
            mobile: formData.third_contact_mobile,
            job_title: formData.third_contact_title,
            company_id, company_name
          });
        }

        toast({ title: "New lead created" });
      }
      setDialogOpen(false);
      resetForm();
    } catch(error) {
      toast({ title: "Error saving profile", variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (selectedLead && firestore) {
      await deleteDoc(doc(firestore, "companies", selectedLead.id));
      toast({ title: "Lead removed" });
    }
    setDeleteDialogOpen(false);
  };

  const columns = [
    { 
      header: "Company", 
      accessorKey: "name",
      cell: ({row}: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.original.name}</span>
          <span className="text-xs text-slate-500">{row.original.industry}</span>
        </div>
      )
    },
    { 
      header: "Details", 
      accessorKey: "insurance_type",
      cell: ({row}: any) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-indigo-600">{row.original.insurance_type}</span>
          <span className="text-slate-400">{row.original.employee_count} Employees</span>
        </div>
      )
    },
    { 
      header: "Assigned To", 
      accessorKey: "assigned_user_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
            {row.original.assigned_user_name?.charAt(0) || "U"}
          </div>
          <span className="text-sm">{row.original.assigned_user_name || "Unassigned"}</span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold gap-1"
            onClick={(e) => { 
              e.stopPropagation(); 
              setSelectedLead(row.original); 
              setConversionDialogOpen(true); 
            }}
          >
            <TrendingUp className="w-3 h-3" />
            Convert to Prospect
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-600" onClick={(e) => { e.stopPropagation(); setSelectedLead(row.original); setDeleteDialogOpen(true); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const table = useReactTable({
      data: leads,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      onGlobalFilterChange: setGlobalFilter,
      getFilteredRowModel: getFilteredRowModel(),
      state: { globalFilter },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('leads')}
        description="Companies ready for active sales qualification."
        onAction={() => { resetForm(); setDialogOpen(true); }}
      />
      
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <DataTable 
            table={table} 
            columns={columns} 
            isLoading={isLoading} 
            globalFilter={globalFilter} 
            setGlobalFilter={setGlobalFilter} 
            onRowClick={handleEdit} 
          />
        </CardContent>
      </Card>

      <FormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        title={selectedLead ? `Lead Profile: ${formData.name}` : "Capture New Lead"} 
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-10 py-6 px-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Building2 className="w-4 h-4" /> Identity & Categorization
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput label="Company English Name *" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
              <FormInput label="Company Arabic Name" value={formData.name_ar} onChange={v => setFormData({...formData, name_ar: v})} dir="rtl" />
              <FormInput label="Code" value={formData.code} onChange={v => setFormData({...formData, code: v})} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase">Industry</Label>
                <Select value={formData.industry} onValueChange={v => setFormData({...formData, industry: v})}>
                  <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {industries.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FormInput label="Employee Count" value={formData.employee_count} type="number" onChange={v => setFormData({...formData, employee_count: Number(v)})} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase">Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v as any})}>
                  <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Timer className="w-4 h-4" /> Milestones & Renewals
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase">EX Renewal</Label>
                <Select value={formData.expected_renewal_date} onValueChange={v => setFormData({...formData, expected_renewal_date: v})}>
                  <SelectTrigger className="bg-slate-50 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <FormInput label="Ex Submit offer Date" type="date" value={formData.expected_offer_date} onChange={v => setFormData({...formData, expected_offer_date: v})} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase">Actual Renewal</Label>
                <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({...formData, actual_renewal_date: v})}>
                  <SelectTrigger className="bg-slate-50 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <FormInput label="Actual Offer Receiving Date" type="date" value={formData.actual_offer_date} onChange={v => setFormData({...formData, actual_offer_date: v})} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <MapPin className="w-4 h-4" /> Registration & Location
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput label="CR Number" value={formData.cr_number} onChange={v => setFormData({...formData, cr_number: v})} />
              <FormInput label="Tax Card" value={formData.tax_card} onChange={v => setFormData({...formData, tax_card: v})} />
              <FormInput label="City" value={formData.city} onChange={v => setFormData({...formData, city: v})} />
              <div className="md:col-span-2">
                <FormInput label="Full Address" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
              </div>
              <FormInput label="Current Insurer" value={formData.current_insurer} onChange={v => setFormData({...formData, current_insurer: v})} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Briefcase className="w-4 h-4" /> Multi-Level Contacts
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-indigo-50/30 p-4 rounded-xl space-y-4 border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase">Contact Level 1: Primary Decision Maker</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <FormInput label="Title" value={formData.primary_contact_title} onChange={v => setFormData({...formData, primary_contact_title: v})} />
                  <FormInput label="Name" value={formData.primary_contact_name} onChange={v => setFormData({...formData, primary_contact_name: v})} />
                  <FormInput label="Phone" value={formData.primary_contact_phone} onChange={v => setFormData({...formData, primary_contact_phone: v})} />
                  <FormInput label="Email" value={formData.primary_contact_email} onChange={v => setFormData({...formData, primary_contact_email: v})} />
                </div>
              </div>

              <div className="bg-slate-50/30 p-4 rounded-xl space-y-4 border border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase">Contact Level 2: Secondary Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <FormInput label="Title" value={formData.second_contact_title} onChange={v => setFormData({...formData, second_contact_title: v})} />
                  <FormInput label="Name" value={formData.second_contact_name} onChange={v => setFormData({...formData, second_contact_name: v})} />
                  <FormInput label="Phone" value={formData.second_contact_mobile} onChange={v => setFormData({...formData, second_contact_mobile: v})} />
                  <FormInput label="Email" value={formData.second_contact_email} onChange={v => setFormData({...formData, second_contact_email: v})} />
                </div>
              </div>

              <div className="bg-slate-50/30 p-4 rounded-xl space-y-4 border border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase">Contact Level 3: Auxiliary Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <FormInput label="Title" value={formData.third_contact_title} onChange={v => setFormData({...formData, third_contact_title: v})} />
                  <FormInput label="Name" value={formData.third_contact_name} onChange={v => setFormData({...formData, third_contact_name: v})} />
                  <FormInput label="Phone" value={formData.third_contact_mobile} onChange={v => setFormData({...formData, third_contact_mobile: v})} />
                  <FormInput label="Email" value={formData.third_contact_email} onChange={v => setFormData({...formData, third_contact_email: v})} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Globe className="w-4 h-4" /> Communication & Ops
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput label="Website" value={formData.website} onChange={v => setFormData({...formData, website: v})} />
              <FormInput label="Assigned User" value={formData.assigned_user_name} onChange={v => setFormData({...formData, assigned_user_name: v})} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase">Line of Business</Label>
                <Select value={formData.insurance_type} onValueChange={v => setFormData({...formData, insurance_type: v as any})}>
                  <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOB_OPTIONS.map(lob => (
                      <SelectItem key={lob} value={lob}>{lob}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormInput label="Lead Source" value={formData.source} onChange={v => setFormData({...formData, source: v})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Management Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={4} className="bg-slate-50" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-indigo-900 font-bold px-8 shadow-lg">Save Lead Profile</Button>
          </div>
        </form>
      </FormDialog>

      <FormDialog open={conversionDialogOpen} onOpenChange={setConversionDialogOpen} title="Convert Lead to Pipeline Prospect" size="lg">
        <form onSubmit={handleConvertToProspect} className="space-y-8 py-4 px-1">
          <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="text-sm text-indigo-900">
              <p className="font-bold">Moving {selectedLead?.name} to Sales Pipeline</p>
              <p className="opacity-70">Define the opportunity parameters to start tracking in the Kanban board.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">Estimated Premium (EGP)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="number" 
                  className="pl-10 h-12 text-lg font-bold" 
                  value={conversionData.estimated_value} 
                  onChange={e => setConversionData({...conversionData, estimated_value: Number(e.target.value)})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">Closing Probability (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="number" 
                  className="pl-10 h-12 text-lg font-bold" 
                  value={conversionData.probability} 
                  max={100} min={0}
                  onChange={e => setConversionData({...conversionData, probability: Number(e.target.value)})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">Expected Close Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="date" 
                  className="pl-10 h-12" 
                  value={conversionData.expected_close_date} 
                  onChange={e => setConversionData({...conversionData, expected_close_date: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-slate-400">Pipeline Notes / Negotiation Strategy</Label>
            <Textarea 
              rows={4} 
              placeholder="Record initial feedback, competitive landscape or specialized requirements..."
              value={conversionData.notes}
              onChange={e => setConversionData({...conversionData, notes: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setConversionDialogOpen(false)} disabled={isProcessing}>{t('cancel')}</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 shadow-md" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Finalize Conversion
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>This lead will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false, dir, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-slate-600 uppercase tracking-tight">{label}</Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        required={required}
        dir={dir}
        className={cn("h-10 bg-slate-50 border-slate-200 focus:border-indigo-500", dir === 'rtl' && "font-arabic")} 
        {...props}
      />
    </div>
  );
}
