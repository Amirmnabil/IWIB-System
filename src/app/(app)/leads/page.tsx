'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Target, Building2, Calendar, User, DollarSign, Edit, Trash2, Briefcase,
  TrendingUp, CheckCircle2, Loader2, AlertCircle, Percent, Timer, MapPin, Globe,
  UserCircle, MoreVertical, FileText, Send, XCircle, Info, Activity, SlidersHorizontal, RotateCcw, Search
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CompanyCard } from "@/components/shared/CompanyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { useToast } from "@/lib/hooks/use-toast";
import { KPICard } from "@/components/dashboard/metric-card";
import type { Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/components/i18n-context";
import { TranslationSchema } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { cn, formatCompactNumber } from "@/lib/utils";

// Supabase & Local/Service Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useMasterData } from "@/lib/hooks/use-master-data";
import { LeadService } from "@/services/lead.service";
import { LeadForm } from "@/components/crm/LeadForm";
import { ConvertToProspectForm } from "@/components/crm/ConvertToProspectForm";

const EMPTY_ARRAY: any[] = [];

const LOB_OPTIONS = [
  "type_medical", "type_life", "type_motor", "type_property", "type_liability",
  "type_marine", "type_engineering", "type_financial_lines", "type_cyber",
  "type_travel", "type_personal_accident"
];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const calculateOfferDate = (monthName: string) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const targetMonth = MONTHS.indexOf(monthName.toLowerCase());
  if (targetMonth === -1) return '';
  
  let targetYear = currentYear;
  // If target month is before current month, assume it's for next year
  if (targetMonth < currentMonth) {
    targetYear++;
  }
  
  // Create date for 1st of target month
  const targetDate = new Date(targetYear, targetMonth, 1);
  
  // Subtract 60 days
  targetDate.setDate(targetDate.getDate() - 60);
  
  // Format as YYYY-MM-DD
  return targetDate.toISOString().split('T')[0];
};

const emptyForm: any = {
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
  notes: "",
  estimated_premium: 0,
  meeting_date: "",
  requirements: ""
};

const formatLocalToInput = (isoStringOrDate?: string | Date) => {
  if (!isoStringOrDate) return "";
  const date = new Date(isoStringOrDate);
  if (isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

interface SyncContactData {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_id?: string;
  company_name?: string;
  role_type?: string;
  role_id?: string;
  is_primary?: boolean;
  notes?: string;
}

// Utility to ensure UUID formats are valid for Postgres constraints
const cleanUuid = (uuidStr?: string) => {
  if (!uuidStr) return null;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuidStr) ? uuidStr : null;
};

export default function Leads() {
  const { t, isRtl } = useI18n();
  const trans = (key: string) => t(key as any) || key;
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Supabase User Fetch
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.warn("Supabase auth check returned error:", error);
          return;
        }
        if (user) {
          setCurrentUser({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          });
        }
      } catch (err) {
        console.error("Failed to contact Supabase Auth server:", err);
      }
    };
    fetchUser();
  }, []);

  // Supabase Collections — fetch lead_details 1-to-1 relations in a single query
  const { data: leadsData, isLoading } = useSupabaseCollection<any>('leads', undefined, {
    select: '*, lead_details(*)',
    filterKey: 'leads-all-with-details',
  });
  const leads = leadsData || EMPTY_ARRAY;

  // Companies: need id/name/status/insurance_type/employee_count for display & duplicate check
  const { data: companiesData } = useSupabaseCollection<any>('companies', undefined, {
    select: 'id, name, status, insurance_type, employee_count, primary_contact_email, primary_contact_phone',
    filterKey: 'companies-leads-lookup',
  });
  const companies = companiesData || EMPTY_ARRAY;

  // Users: only need id/name for assignment dropdown
  const { data: usersData } = useSupabaseCollection<any>('users', undefined, {
    select: 'id, name, email, department, level',
    filterKey: 'users-dropdown',
  });
  const users = usersData || EMPTY_ARRAY;

  const { data: industriesData } = useSupabaseCollection<any>('master_industries', undefined, {
    select: 'id, name, name_ar',
    filterKey: 'master-industries',
  });
  const industries = industriesData || EMPTY_ARRAY;

  const { data: sourcesData } = useSupabaseCollection<any>('master_sources', undefined, {
    select: 'id, name, name_ar',
    filterKey: 'master-sources',
  });
  const sources = sourcesData || EMPTY_ARRAY;

  const { data: productTypes } = useMasterData('product_types');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCompany, setPreviewCompany] = useState<Company | null>(null);

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const [conversionData, setConversionData] = useState({
    estimated_value: 0,
    probability: 50,
    expected_close_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ""
  });

  // Action Dialog States
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");

  const [requirementsDialogOpen, setRequirementsDialogOpen] = useState(false);
  const [requirementsText, setRequirementsText] = useState("");
  const [quickPrem, setQuickPrem] = useState(0);
  const [quickSource, setQuickSource] = useState("");

  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const [disqualifyDialogOpen, setDisqualifyDialogOpen] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("Not Interested");
  const [disqualifyNotes, setDisqualifyNotes] = useState("");

  const [globalFilter, setGlobalFilter] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const checkForDuplicates = (name: string, email?: string, phone?: string) => {
    if (!name || name.length < 3) return;

    const duplicate = companies.find(c =>
      c.name.toLowerCase() === name.toLowerCase() ||
      (email && c.primary_contact_email === email) ||
      (phone && c.primary_contact_phone === phone)
    );

    if (duplicate) {
      setDuplicateWarning(`${t('duplicateFound') || "Potential duplicate found"}: ${duplicate.name}`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedLead(null);
  };

  const handleEdit = (lead: any) => {
    setSelectedLead(lead);
    const companyId = lead.company_id || lead.id;
    const companyObj = companies.find(c => c.id === companyId);
    const leadDetails = (Array.isArray(lead.lead_details) ? lead.lead_details[0] : lead.lead_details) || lead.details || {};
    
    setFormData({
      ...emptyForm,
      ...(companyObj || {}),
      name: lead.company_name || companyObj?.name || "",
      primary_contact_name: lead.contact_name || companyObj?.primary_contact_name || "",
      primary_contact_email: lead.email || companyObj?.primary_contact_email || "",
      primary_contact_phone: lead.phone || companyObj?.primary_contact_phone || "",
      priority: lead.priority || companyObj?.priority || "medium",
      assigned_user_id: lead.assigned_user_id || companyObj?.assigned_user_id || "",
      assigned_user_name: lead.assigned_user_name || companyObj?.assigned_user_name || "",
      notes: lead.notes || companyObj?.notes || "",
      source: lead.lead_source || lead.source || leadDetails.source || companyObj?.source || "",
      estimated_premium: leadDetails.estimated_premium || lead.estimated_premium || 0,
      meeting_date: leadDetails.meeting_date ? formatLocalToInput(leadDetails.meeting_date) : "",
      requirements: leadDetails.requirements || ""
    });
    setDialogOpen(true);
  };

  const handleConvertToProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setIsProcessing(true);
    try {
      await LeadService.convertToProspect(selectedLead, conversionData, currentUser, companies);
      toast({ title: t('prospectCreated') });
      setConversionDialogOpen(false);
    } catch (error: any) {
      console.error("Conversion failed:", error);
      toast({ 
        variant: 'destructive', 
        title: t('persistenceError'),
        description: error?.message || String(error)
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedLead) {
        await LeadService.updateLead(selectedLead.id, selectedLead.company_id, formData);
        toast({ title: t('recordUpdated') });
      } else {
        await LeadService.createLead(formData);
        toast({ title: t('userAdded') });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: t('persistenceError'), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (selectedLead) {
      try {
        await LeadService.deleteLead(selectedLead.id, selectedLead.company_id);
        toast({ title: t('recordRemoved') });
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: t('persistenceError') });
      }
    }
    setDeleteDialogOpen(false);
  };

  const [rowSelection, setRowSelection] = useState({});


  // Quick Actions Handlers
  const handleQuickMeeting = (lead: any) => {
    setSelectedLead(lead);
    const leadDetails = (Array.isArray(lead.lead_details) ? lead.lead_details[0] : lead.lead_details) || lead.details || {};
    setMeetingDate(leadDetails.meeting_date ? formatLocalToInput(leadDetails.meeting_date) : "");
    setMeetingNotes("");
    setMeetingDialogOpen(true);
  };

  const submitQuickMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const companyId = selectedLead.company_id;
      // 1. Log Activity
      const startIso = new Date(meetingDate).toISOString();
      const endIso = new Date(new Date(startIso).getTime() + 60 * 60000).toISOString();
      await supabase.from('activities').insert(sanitizeUUIDs({
        activity_type: 'meeting',
        subject: `Scheduled Meeting: ${selectedLead.company_name}`,
        description: meetingNotes || "Scheduled via Lead actions toolbar.",
        status: 'pending',
        priority: 'medium',
        due_date: startIso,
        end_date: endIso,
        duration_minutes: 60,
        related_type: 'company',
        related_id: companyId,
        related_name: selectedLead.company_name,
        assigned_to_id: currentUser?.id,
        assigned_to_name: currentUser?.name || "Agent",
        created_at: new Date().toISOString()
      }));

      // 2. Update Lead Details Table
      await supabase.from('lead_details').upsert(sanitizeUUIDs({
        lead_id: selectedLead.id,
        company_id: companyId,
        meeting_date: startIso,
        updated_at: new Date().toISOString()
      }), { onConflict: 'lead_id' });

      // 3. Update Company status
      await supabase.from('companies').update({ status: 'lead', last_contact_date: new Date().toISOString() }).eq('id', companyId);

      queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
      toast({ title: "Meeting Scheduled", description: "Activity created and synced to Calendar." });
      setMeetingDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to schedule meeting" });
    }
  };

  const handleQuickRequirements = (lead: any) => {
    setSelectedLead(lead);
    const leadDetails = (Array.isArray(lead.lead_details) ? lead.lead_details[0] : lead.lead_details) || lead.details || {};
    setRequirementsText(leadDetails.requirements || "");
    setQuickPrem(leadDetails.estimated_premium || lead.estimated_premium || 0);
    setQuickSource(leadDetails.source || lead.lead_source || "");
    setRequirementsDialogOpen(true);
  };

  const submitQuickRequirements = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const companyId = selectedLead.company_id;
      // 1. Update Details Table
      await supabase.from('lead_details').upsert(sanitizeUUIDs({
        lead_id: selectedLead.id,
        company_id: companyId,
        requirements: requirementsText,
        estimated_premium: quickPrem,
        source: quickSource,
        updated_at: new Date().toISOString()
      }), { onConflict: 'lead_id' });

      // 2. Update Estimated Premium on Leads Table
      await supabase.from('leads').update({
        estimated_premium: quickPrem,
        lead_source: quickSource
      }).eq('id', selectedLead.id);

      queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
      toast({ title: "Lead Requirements Saved" });
      setRequirementsDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to save requirements" });
    }
  };

  const handleQuickQuotation = async (lead: any) => {
    try {
      // Transition to Proposal Sent status
      await supabase.from('companies').update({ status: 'proposal_sent' }).eq('id', lead.company_id);
      await supabase.from('leads').update({ status: 'proposal_sent' }).eq('id', lead.id);

      // Log Follow-up task automatically
      await LeadService.createAutomatedTask(
        lead.company_id,
        lead.company_name,
        `Follow Up on Quotation: ${lead.company_name}`,
        lead.assigned_user_id,
        lead.assigned_user_name,
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        "Quotation sent. Check back in 3 days."
      );

      queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
      toast({ title: "Quotation Sent", description: "Status updated to Proposal Sent. Automated follow-up task logged." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Quotation log failed" });
    }
  };

  const handleQuickFollowUp = (lead: any) => {
    setSelectedLead(lead);
    setFollowUpDate(formatLocalToInput(new Date(Date.now() + 86400000)));
    setFollowUpNotes("");
    setFollowUpDialogOpen(true);
  };

  const submitQuickFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const companyId = selectedLead.company_id;
      const startIso = new Date(followUpDate).toISOString();
      const endIso = new Date(new Date(startIso).getTime() + 30 * 60000).toISOString();
      
      await supabase.from('activities').insert(sanitizeUUIDs({
        activity_type: 'follow_up',
        subject: `Follow-up: ${selectedLead.company_name}`,
        description: followUpNotes || "Lead follow-up logged from dashboard.",
        status: 'pending',
        priority: 'high',
        due_date: startIso,
        end_date: endIso,
        duration_minutes: 30,
        related_type: 'company',
        related_id: companyId,
        related_name: selectedLead.company_name,
        assigned_to_id: currentUser?.id,
        assigned_to_name: currentUser?.name || "Agent",
        created_at: new Date().toISOString()
      }));

      // Update next follow up field
      await supabase.from('leads').update({ next_follow_up: startIso }).eq('id', selectedLead.id);

      queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
      toast({ title: "Follow-up Scheduled" });
      setFollowUpDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: "Follow-up failed" });
    }
  };

  const handleDisqualify = (lead: any) => {
    setSelectedLead(lead);
    setDisqualifyReason("Not Interested");
    setDisqualifyNotes("");
    setDisqualifyDialogOpen(true);
  };

  const submitDisqualify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const companyId = selectedLead.company_id;
      
      // Update Company Profile status to lost or not_interested
      await supabase.from('companies').update({
        status: disqualifyReason === 'Not Interested' ? 'not_interested' : 'lost',
        notes: `[Disqualified: ${disqualifyReason}] ${disqualifyNotes}`
      }).eq('id', companyId);

      // Create a deal outcome (lost) if needed, but since it's lead stage, deleting from leads is sufficient
      await supabase.from('leads').delete().eq('id', selectedLead.id);

      queryClient.invalidateQueries({ queryKey: ['supabase', 'leads'] });
      toast({ title: "Lead Disqualified", description: "Record removed from leads list." });
      setDisqualifyDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: "Disqualification failed" });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }: any) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          aria-label="Select all"
          className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4"
        />
      ),
      cell: ({ row }: { row: any }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          aria-label="Select row"
          className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      header: t('companies'),
      accessorKey: "company_name",
      cell: ({ row }: { row: any }) => {
        const companyId = row.original.company_id || row.original.id;
        const name = row.original.company_name || row.original.name || "Unknown";
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-bold shadow-sm border border-indigo-200 shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const comp = companies.find((c: any) => c.id === companyId);
                  if (comp) setPreviewCompany(comp);
                  else router.push(`/companies/${companyId}`);
                }}
                className="font-bold text-indigo-900 hover:text-primary hover:underline cursor-pointer transition-colors"
              >
                {name}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mt-0.5">
                {row.original.contact_name && <><User className="w-3.5 h-3.5 text-slate-400" /> {row.original.contact_name}</>}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: "Contact Info",
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex flex-col text-xs text-muted-foreground space-y-1">
            {row.original.email && <span className="font-medium text-slate-700">{row.original.email}</span>}
            {row.original.phone && <span className="font-semibold text-primary">{row.original.phone}</span>}
          </div>
        );
      }
    },
    {
      header: "Lead Details",
      cell: ({ row }: { row: any }) => {
        const details = (Array.isArray(row.original.lead_details) ? row.original.lead_details[0] : row.original.lead_details) || row.original.details || {};
        const companyId = row.original.company_id;
        const comp = companies.find(c => c.id === companyId);
        const insType = comp?.insurance_type || "Medical";
        const prem = row.original.estimated_premium || details.estimated_premium || 0;
        
        return (
          <div className="flex flex-col text-xs space-y-1">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {trans(insType as any)}
            </span>
            {prem > 0 && (
              <span className="font-black text-indigo-900 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> {formatCompactNumber(prem)} EGP
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Meeting Date",
      cell: ({ row }: { row: any }) => {
        const details = (Array.isArray(row.original.lead_details) ? row.original.lead_details[0] : row.original.lead_details) || row.original.details || {};
        return (
          <div className="flex flex-col text-xs">
            {details.meeting_date ? (
              <span className="font-semibold text-indigo-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {format(new Date(details.meeting_date), 'MMM d, yyyy h:mm a')}
              </span>
            ) : (
              <span className="text-slate-400 italic">No Meeting</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Requirements",
      cell: ({ row }: { row: any }) => {
        const details = (Array.isArray(row.original.lead_details) ? row.original.lead_details[0] : row.original.lead_details) || row.original.details || {};
        return (
          <div className="max-w-[200px] text-xs text-muted-foreground truncate" title={details.requirements}>
            {details.requirements ? (
              <span className="flex items-center gap-1 text-slate-700">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {details.requirements}
              </span>
            ) : (
              <span className="text-slate-400 italic">None logged</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Source",
      cell: ({ row }: { row: any }) => {
        const details = (Array.isArray(row.original.lead_details) ? row.original.lead_details[0] : row.original.lead_details) || row.original.details || {};
        const src = row.original.lead_source || details.source || "Direct";
        return (
          <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-slate-50 border-slate-200">
            {src}
          </Badge>
        );
      }
    },
    {
      header: t('priority') || "Priority",
      accessorKey: "priority",
      cell: ({ row }: { row: any }) => {
        const priority = row.original.priority || "medium";
        const colors: Record<string, string> = {
          low: "text-muted-foreground bg-slate-100 border-border",
          medium: "text-blue-700 bg-primary/10 border-blue-200",
          high: "text-amber-700 bg-amber-50 border-amber-200",
          critical: "text-red-700 bg-destructive/10 border-red-200 shadow-sm"
        };
        return (
          <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border", colors[priority] || colors.medium)}>
            {priority}
          </span>
        );
      }
    },
    {
      header: t('status') || "Status",
      accessorKey: "status",
      cell: ({ row }: { row: any }) => {
        const companyId = row.original.company_id;
        const comp = companies.find(c => c.id === companyId);
        const rawStatus = comp?.status || row.original.status || "new";
        
        const outcomeLabels: Record<string, string> = {
          new: 'New',
          contacted: 'Contacted',
          waiting_for_data: 'Waiting for Data',
          proposal_sent: 'Proposal Sent',
          lost: 'Lost',
          not_interested: 'Disqualified'
        };
        
        const label = outcomeLabels[rawStatus] || rawStatus;
        if (!label) return <span className="text-slate-400">-</span>;

        let badgeClass = "bg-background text-muted-foreground border-border";
        if (rawStatus === 'new') badgeClass = "bg-sky-50 text-sky-700 border-sky-200";
        else if (rawStatus === 'contacted') badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
        else if (rawStatus === 'waiting_for_data') badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        else if (rawStatus === 'proposal_sent') badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        else if (['lost', 'not_interested'].includes(rawStatus)) badgeClass = "bg-destructive/10 text-red-700 border-red-200";

        return (
          <span className={cn("inline-flex items-center font-bold text-xs whitespace-nowrap border rounded-full px-2.5 py-0.5 shadow-sm", badgeClass)}>
            {label}
          </span>
        );
      }
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({ row }: { row: any }) => {
        const details = (Array.isArray(row.original.lead_details) ? row.original.lead_details[0] : row.original.lead_details) || row.original.details || {};
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-indigo-200 text-primary hover:bg-primary/10 font-bold gap-1 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLead(row.original);
                setConversionData({
                  estimated_value: row.original.estimated_premium || details.estimated_premium || 0,
                  probability: 50,
                  expected_close_date: format(new Date(), 'yyyy-MM-dd'),
                  notes: row.original.notes || ""
                });
                setConversionDialogOpen(true);
              }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              {trans('convertToProspect')}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()} className="h-8 w-8 hover:bg-slate-100 rounded-lg">
                  <MoreVertical className="w-4 h-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-md rounded-xl p-1">
                <DropdownMenuItem onClick={() => handleEdit(row.original)} className="rounded-lg font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Edit className="w-4 h-4 mr-2 text-indigo-500" /> {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickMeeting(row.original)} className="rounded-lg font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Calendar className="w-4 h-4 mr-2 text-emerald-500" /> Schedule Meeting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickRequirements(row.original)} className="rounded-lg font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <FileText className="w-4 h-4 mr-2 text-amber-500" /> Edit Requirements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickQuotation(row.original)} className="rounded-lg font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Send className="w-4 h-4 mr-2 text-sky-500" /> Send Quotation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickFollowUp(row.original)} className="rounded-lg font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Activity className="w-4 h-4 mr-2 text-violet-500" /> Log Follow-up
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem className="rounded-lg font-semibold text-xs text-amber-600 focus:text-amber-600 hover:bg-amber-50/50 cursor-pointer" onClick={() => handleDisqualify(row.original)}>
                  <XCircle className="w-4 h-4 mr-2" /> Disqualify
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg font-semibold text-xs text-destructive focus:text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => { setSelectedLead(row.original); setDeleteDialogOpen(true); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ];

  // Advanced Filter & Sorting States
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLOB, setSelectedLOB] = useState<string>('all');
  const [selectedAssignedUser, setSelectedAssignedUser] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Dynamic filter lists from Master Data
  const availableLOBs = useMemo(() => {
    if (!productTypes) return EMPTY_ARRAY;
    return productTypes.map((pt: any) => pt.name).filter(Boolean);
  }, [productTypes]);

  const availableSources = useMemo(() => {
    if (!sources) return EMPTY_ARRAY;
    return sources.map((src: any) => isRtl ? src.name_ar : src.name).filter(Boolean);
  }, [sources, isRtl]);

  // Combined Advanced Filtering & Sorting
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // 1. Filter by Priority
    if (selectedPriority !== 'all') {
      result = result.filter(lead => lead.priority === selectedPriority);
    }

    // 2. Filter by Status
    if (selectedStatus !== 'all') {
      result = result.filter(lead => {
        const companyId = lead.company_id;
        const comp = companies.find(c => c.id === companyId);
        const rawStatus = comp?.status || lead.status || "new";
        return rawStatus === selectedStatus;
      });
    }

    // 3. Filter by Line of Business (LOB)
    if (selectedLOB !== 'all') {
      result = result.filter(lead => {
        const companyId = lead.company_id;
        const comp = companies.find(c => c.id === companyId);
        const insType = comp?.insurance_type || "Medical";
        return insType.toLowerCase() === selectedLOB.toLowerCase();
      });
    }

    // 4. Filter by Assigned Agent
    if (selectedAssignedUser !== 'all') {
      result = result.filter(lead => lead.assigned_user_id === selectedAssignedUser);
    }

    // 5. Filter by Source
    if (selectedSource !== 'all') {
      result = result.filter(lead => {
        const details = (Array.isArray(lead.lead_details) ? lead.lead_details[0] : lead.lead_details) || {};
        const src = lead.lead_source || details.source || "Direct";
        return src.toLowerCase() === selectedSource.toLowerCase();
      });
    }

    // 6. Sorting Logic
    const priorityWeight: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortBy === 'name_asc') {
        const nameA = a.company_name || a.name || '';
        const nameB = b.company_name || b.name || '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name_desc') {
        const nameA = a.company_name || a.name || '';
        const nameB = b.company_name || b.name || '';
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'priority_desc') {
        return (priorityWeight[b.priority || 'medium'] || 2) - (priorityWeight[a.priority || 'medium'] || 2);
      }
      if (sortBy === 'priority_asc') {
        return (priorityWeight[a.priority || 'medium'] || 2) - (priorityWeight[b.priority || 'medium'] || 2);
      }
      if (sortBy === 'premium_desc') {
        const detailsA = (Array.isArray(a.lead_details) ? a.lead_details[0] : a.lead_details) || {};
        const detailsB = (Array.isArray(b.lead_details) ? b.lead_details[0] : b.lead_details) || {};
        const premA = a.estimated_premium || detailsA.estimated_premium || 0;
        const premB = b.estimated_premium || detailsB.estimated_premium || 0;
        return premB - premA;
      }
      if (sortBy === 'premium_asc') {
        const detailsA = (Array.isArray(a.lead_details) ? a.lead_details[0] : a.lead_details) || {};
        const detailsB = (Array.isArray(b.lead_details) ? b.lead_details[0] : b.lead_details) || {};
        const premA = a.estimated_premium || detailsA.estimated_premium || 0;
        const premB = b.estimated_premium || detailsB.estimated_premium || 0;
        return premA - premB;
      }
      return 0;
    });

    return result;
  }, [leads, selectedPriority, selectedStatus, selectedLOB, selectedAssignedUser, selectedSource, sortBy, companies]);

  const table = useReactTable({
    data: filteredAndSortedLeads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { globalFilter, rowSelection },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(t('confirmBulkDelete') || `Are you sure you want to delete ${selectedRows.length} items?`)) return;

    setIsProcessing(true);
    try {
      const ids = selectedRows.map(row => (row.original as any).id);
      const companyIds = selectedRows.map(row => (row.original as any).company_id).filter(Boolean);

      await LeadService.bulkDelete(ids, companyIds);

      toast({ title: t('bulkDeleted') || "Records deleted successfully" });
      setRowSelection({});
    } catch (error) {
      toast({ variant: 'destructive', title: t('persistenceError') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAssign = async (userId: string, userName: string) => {
    if (selectedRows.length === 0) return;
    setIsProcessing(true);
    try {
      const ids = selectedRows.map(row => (row.original as any).id);
      const companyIds = selectedRows.map(row => (row.original as any).company_id).filter(Boolean);

      await LeadService.bulkAssign(ids, companyIds, userId, userName);

      toast({ title: t('bulkAssigned') || "Records assigned successfully" });
      setRowSelection({});
    } catch (error) {
      toast({ variant: 'destructive', title: t('persistenceError') });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('leads')}
        onAction={() => { resetForm(); setDialogOpen(true); }}
      />

      <div className="flex flex-wrap items-center gap-2 bg-card p-3 rounded-xl border border-border shadow-sm">
        {/* Search Field */}
        <div className="relative w-full sm:w-60">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
          <Input
            placeholder={trans('search') || "Search leads..."}
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className={cn("h-9 text-xs bg-background border-border", isRtl ? "pr-9" : "pl-9")}
          />
        </div>

        {/* LOB Selector */}
        <Select value={selectedLOB} onValueChange={setSelectedLOB}>
          <SelectTrigger className="h-9 text-xs bg-background w-fit gap-1.5 px-3 min-w-[110px]">
            <span className="text-slate-500 font-medium">LOB:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[250px]">
            <SelectItem value="all" className="font-semibold">All LOBs</SelectItem>
            {availableLOBs.map(lob => (
              <SelectItem key={lob} value={lob}>{trans(lob)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Selector */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="h-9 text-xs bg-background w-fit gap-1.5 px-3 min-w-[110px]">
            <span className="text-slate-500 font-medium">Status:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-semibold">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="waiting_for_data">Waiting for Data</SelectItem>
            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="not_interested">Disqualified</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Selector */}
        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
          <SelectTrigger className="h-9 text-xs bg-background w-fit gap-1.5 px-3 min-w-[110px]">
            <span className="text-slate-500 font-medium">Priority:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-semibold">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        {/* Agent Selector */}
        <Select value={selectedAssignedUser} onValueChange={setSelectedAssignedUser}>
          <SelectTrigger className="h-9 text-xs bg-background w-fit gap-1.5 px-3 min-w-[120px] max-w-[200px]">
            <span className="text-slate-500 font-medium">Agent:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[250px]">
            <SelectItem value="all" className="font-semibold">All Agents</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Selector */}
        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger className="h-9 text-xs bg-background w-fit gap-1.5 px-3 min-w-[120px] max-w-[200px]">
            <span className="text-slate-500 font-medium">Source:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[250px]">
            <SelectItem value="all" className="font-semibold">All Sources</SelectItem>
            {availableSources.map(src => (
              <SelectItem key={src} value={src}>{src}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sorting control */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 text-xs bg-background w-fit gap-1.5 px-3 min-w-[130px] sm:ml-auto">
            <span className="text-indigo-600 font-bold">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
            <SelectItem value="priority_desc">Priority: High-Low</SelectItem>
            <SelectItem value="priority_asc">Priority: Low-High</SelectItem>
            <SelectItem value="premium_desc">Premium: High-Low</SelectItem>
            <SelectItem value="premium_asc">Premium: Low-High</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {(selectedPriority !== 'all' || selectedStatus !== 'all' || selectedLOB !== 'all' || selectedAssignedUser !== 'all' || selectedSource !== 'all' || sortBy !== 'newest' || globalFilter !== '') && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSelectedPriority('all');
              setSelectedStatus('all');
              setSelectedLOB('all');
              setSelectedAssignedUser('all');
              setSelectedSource('all');
              setSortBy('newest');
              setGlobalFilter('');
            }}
            className="h-9 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 flex items-center gap-1 px-2.5 rounded-lg border border-red-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {selectedRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-indigo-100 p-3 rounded-xl flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-indigo-900">{selectedRows.length} {t('rowsSelected')}</span>
              <Separator orientation="vertical" className="h-4 bg-indigo-200" />
              <Button variant="ghost" size="sm" className="text-destructive hover:text-red-700 hover:bg-destructive/10 font-bold gap-2" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4" /> {t('delete')}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-indigo-100 font-bold gap-2">
                    <UserCircle className="w-4 h-4" /> {t('assign')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {users.map(u => (
                    <DropdownMenuItem key={u.id} onClick={() => handleBulkAssign(u.id, u.name)}>
                      {u.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
              {t('clear')}
            </Button>
          </motion.div>
        )}

        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              hideSearch={true}
              onRowClick={(row) => {
                const comp = companies.find((c: any) => c.id === (row.company_id || row.id));
                if (comp) setPreviewCompany(comp);
                else router.push(`/companies/${row.company_id || row.id}`);
              }}
            />
          </CardContent>
        </Card>
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedLead ? `${t('editProfile') || "Edit Profile"}: ${formData.name}` : (t('add') || "Add")}
        size="xl"
      >
        <LeadForm
          formData={formData}
          setFormData={setFormData}
          duplicateWarning={duplicateWarning}
          checkForDuplicates={checkForDuplicates}
          industries={industries}
          users={users}
          productTypes={productTypes}
          sources={sources}
          selectedLead={selectedLead}
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
        />
      </FormDialog>

      <FormDialog 
        open={conversionDialogOpen} 
        onOpenChange={setConversionDialogOpen} 
        title={t('convertToProspect') || "Convert to Prospect"} 
        size="lg"
      >
        <ConvertToProspectForm
          conversionData={conversionData}
          setConversionData={setConversionData}
          selectedLead={selectedLead}
          isProcessing={isProcessing}
          onSubmit={handleConvertToProspect}
          onCancel={() => setConversionDialogOpen(false)}
        />
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmationMessage').replace('{name}', '')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewCompany} onOpenChange={(open) => !open && setPreviewCompany(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Company Preview</DialogTitle>
          {previewCompany && (
            <CompanyCard 
              company={previewCompany} 
              onClick={() => router.push(`/companies/${previewCompany.id}`)}
              className="w-full"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* QUICK ACTION MODALS */}
      {/* 1. Schedule Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Schedule Lead Meeting
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitQuickMeeting} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Meeting Date & Time *</Label>
              <Input
                type="datetime-local"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                required
                className="h-11 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Meeting Notes / Discussion Agenda</Label>
              <Textarea
                value={meetingNotes}
                onChange={e => setMeetingNotes(e.target.value)}
                placeholder="Details about the meeting..."
                rows={3}
                className="bg-background"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setMeetingDialogOpen(false)} className="h-11 font-bold">Cancel</Button>
              <Button type="submit" className="h-11 font-bold bg-primary hover:bg-indigo-700">Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Requirements Dialog */}
      <Dialog open={requirementsDialogOpen} onOpenChange={setRequirementsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Lead Requirements & Details
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitQuickRequirements} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Premium (EGP)</Label>
                <Input
                  type="number"
                  value={quickPrem || ""}
                  onChange={e => setQuickPrem(Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className="h-11 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Input
                  type="text"
                  value={quickSource}
                  onChange={e => setQuickSource(e.target.value)}
                  placeholder="e.g. Web, Cold Call"
                  className="h-11 bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Requirements & Diagnostics</Label>
              <Textarea
                value={requirementsText}
                onChange={e => setRequirementsText(e.target.value)}
                placeholder="Enter client specifications, diagnostic details, or document links..."
                rows={4}
                className="bg-background"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setRequirementsDialogOpen(false)} className="h-11 font-bold">Cancel</Button>
              <Button type="submit" className="h-11 font-bold bg-primary hover:bg-indigo-700">Save Requirements</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Log Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-500" />
              Schedule Follow-up Task
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitQuickFollowUp} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Follow-up Date & Time *</Label>
              <Input
                type="datetime-local"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                required
                className="h-11 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Task Notes</Label>
              <Textarea
                value={followUpNotes}
                onChange={e => setFollowUpNotes(e.target.value)}
                placeholder="What needs to be done next?..."
                rows={3}
                className="bg-background"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setFollowUpDialogOpen(false)} className="h-11 font-bold">Cancel</Button>
              <Button type="submit" className="h-11 font-bold bg-primary hover:bg-indigo-700">Log Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Disqualify Dialog */}
      <Dialog open={disqualifyDialogOpen} onOpenChange={setDisqualifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <XCircle className="w-5 h-5" />
              Disqualify Lead: {selectedLead?.company_name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitDisqualify} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={disqualifyReason} onValueChange={setDisqualifyReason}>
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Interested">Not Interested</SelectItem>
                  <SelectItem value="Budget Issue">Budget Issue</SelectItem>
                  <SelectItem value="No Response">No Response</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details / Reason Explanation</Label>
              <Textarea
                value={disqualifyNotes}
                onChange={e => setDisqualifyNotes(e.target.value)}
                placeholder="Add explanation notes..."
                rows={3}
                className="bg-background"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDisqualifyDialogOpen(false)} className="h-11 font-bold">Cancel</Button>
              <Button type="submit" className="h-11 font-bold bg-destructive hover:bg-destructive/90 text-white">Disqualify Lead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", required = false, dir, className, ...props }: { label: string, value: any, onChange: (v: string) => void, type?: string, required?: boolean, dir?: 'ltr' | 'rtl', readOnly?: boolean, disabled?: boolean, className?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{label}</Label>
      <Input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        dir={dir}
        className={cn("h-10 bg-background border-border focus:border-indigo-500", dir === 'rtl' && "font-arabic", className)}
        {...props}
      />
    </div>
  );
}
