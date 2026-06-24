'use client';;
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CompanyCard } from "@/components/shared/CompanyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table";
import { useI18n } from "@/components/i18n-context";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Supabase Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useMasterData } from "@/hooks/use-master-data";

function calculateLeadScore(company: Partial<Company>) {
  let score = 50; // Base score

  if (company.employee_count) {
    if (company.employee_count > 100) score += 20;
    else if (company.employee_count > 20) score += 10;
  }

  if (company.priority === 'high' || company.priority === 'critical') score += 15;
  if (company.primary_contact_email && company.primary_contact_phone) score += 10;
  if (company.industry) score += 5;

  return {
    related_id: (company as any).id,
    score: Math.min(score, 100),
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
    factors: [
      { factor: 'Initial Profile Completeness', points: score }
    ],
    last_calculated: new Date().toISOString()
  };
}

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
  const router = useRouter();
  const { toast } = useToast();

  // Supabase User Fetch
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        });
      }
    };
    fetchUser();
  }, []);

  // Supabase Collections
  const { data: leadsData, isLoading } = useSupabaseCollection<any>('leads');
  const leads = leadsData || [];

  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const companies = companiesData || [];

  const { data: usersData } = useSupabaseCollection<any>('users');
  const users = usersData || [];

  const { data: industriesData } = useSupabaseCollection<any>('master_industries');
  const industries = industriesData || [];

  const { data: sourcesData } = useSupabaseCollection<any>('master_sources');
  const sources = sourcesData || [];

  const { data: productTypes } = useMasterData('product_types');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCompany, setPreviewCompany] = useState<Company | null>(null);

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [formData, setFormData] = useState<Omit<Company, 'id' | 'created_at'>>(emptyForm);
  const [conversionData, setConversionData] = useState({
    estimated_value: 0,
    probability: 50,
    expected_close_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ""
  });

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
    
    if (companyObj) {
      setFormData({ ...emptyForm, ...companyObj });
    } else {
      setFormData({
        ...emptyForm,
        name: lead.company_name || lead.name || "",
        primary_contact_name: lead.contact_name || "",
        primary_contact_email: lead.email || "",
        primary_contact_phone: lead.phone || "",
        priority: lead.priority || "medium",
        assigned_user_id: lead.assigned_user_id || "",
        assigned_user_name: lead.assigned_user_name || "",
        notes: lead.notes || "",
        source: lead.source || ""
      });
    }
    setDialogOpen(true);
  };

  // Automated Task Creation Engine in Supabase
  const createAutomatedTaskSupabase = async (
    companyId: string,
    companyName: string,
    subject: string,
    assignedId?: string,
    assignedName?: string,
    dueDate?: string,
    notes?: string
  ) => {
    const { data: existing, error } = await supabase
      .from('activities')
      .select('id')
      .eq('related_id', companyId)
      .eq('subject', subject)
      .eq('status', 'pending');

    if (error || (existing && existing.length > 0)) return;

    const task = {
      activity_type: 'task',
      subject,
      description: notes ? `INTERACTION NOTES:\n${notes}` : "Automated CRM task.",
      status: 'pending',
      priority: 'high',
      due_date: dueDate || new Date(Date.now() + 86400000).toISOString(),
      related_type: 'company',
      related_id: cleanUuid(companyId),
      related_name: companyName,
      assigned_to_id: cleanUuid(assignedId),
      assigned_to_name: assignedName || "",
      created_at: new Date().toISOString()
    };

    await supabase.from('activities').insert(sanitizeUUIDs(task));
  };

  const processWorkflowTriggersSupabase = async (event: string, company: Company) => {
    if (event === 'new_lead') {
      const now = new Date();
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;

      const datesToCheck = [
        { date: company.expected_offer_date, label: 'Expected Offer' },
        { date: company.actual_offer_date, label: 'Actual Offer' }
      ];

      for (const item of datesToCheck) {
        if (item.date) {
          const d = new Date(item.date);
          const diff = d.getTime() - now.getTime();
          if (diff > 0 && diff <= twoWeeks) {
            await createAutomatedTaskSupabase(
              company.id,
              company.name,
              `${item.label} Deadline Approaching`,
              company.assigned_user_id,
              company.assigned_user_name,
              item.date
            );
          }
        }
      }
    }
  };

  // Sync Contacts natively using Supabase client
  const syncContactSupabase = async (data: SyncContactData) => {
    if (!data.name) return;

    try {
      const nameParts = data.name.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';
      const email = data.email?.toLowerCase().trim() || "";

      let existingId = "";

      if (email) {
        const { data: existingContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', email);
          
        if (existingContacts && existingContacts.length > 0) {
          existingId = existingContacts[0].id;
        }
      } else if (data.company_id) {
        const { data: existingContacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .eq('company_id', data.company_id);

        if (existingContacts) {
          const match = existingContacts.find((c: any) => {
            const dFirst = (c.first_name || "").toLowerCase().trim();
            const dLast = (c.last_name || "").toLowerCase().trim();
            const targetFirst = first_name.toLowerCase().trim();
            const targetLast = last_name.toLowerCase().trim();
            return dFirst === targetFirst && (dLast === targetLast || (dLast === "-" && targetLast === ""));
          });
          if (match) existingId = match.id;
        }
      }

      const contactPayload = {
        first_name,
        last_name,
        email,
        phone: data.phone || "",
        mobile: data.mobile || "",
        role_type: data.role_type || "",
        company_id: cleanUuid(data.company_id),
        is_primary: !!data.is_primary,
        notes: data.notes || "",
        updated_at: new Date().toISOString()
      };

      if (existingId) {
        await supabase
          .from('contacts')
          .update(contactPayload)
          .eq('id', existingId);
      } else {
        await supabase
          .from('contacts')
          .insert(sanitizeUUIDs({
            ...contactPayload,
            created_at: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error("Error syncing contact in Supabase:", error);
    }
  };

  // Assign Lead to Sales Manager by Default
  const assignLeadToSalesManager = async (companyId: string) => {
    // 1. Try to find active user who is a Manager in Sales department
    const { data: salesManagers } = await supabase
      .from('users')
      .select('id, name')
      .eq('status', 'active')
      .eq('department', 'Sales')
      .eq('level', 'Manager')
      .limit(1);

    let assignedUser = null;

    if (salesManagers && salesManagers.length > 0) {
      assignedUser = salesManagers[0];
    } else {
      // 2. Fallback: Try to find any active user in Sales department
      const { data: salesStaff } = await supabase
        .from('users')
        .select('id, name')
        .eq('status', 'active')
        .eq('department', 'Sales')
        .limit(1);
        
      if (salesStaff && salesStaff.length > 0) {
        assignedUser = salesStaff[0];
      } else {
        // 3. Fallback: Try to find any active user who is a Manager
        const { data: genericManagers } = await supabase
          .from('users')
          .select('id, name')
          .eq('status', 'active')
          .eq('level', 'Manager')
          .limit(1);
          
        if (genericManagers && genericManagers.length > 0) {
          assignedUser = genericManagers[0];
        } else {
          // 4. Fallback: Any active user
          const { data: anyActive } = await supabase
            .from('users')
            .select('id, name')
            .eq('status', 'active')
            .limit(1);
          if (anyActive && anyActive.length > 0) {
            assignedUser = anyActive[0];
          }
        }
      }
    }

    if (!assignedUser) return;

    // Update Companies Table
    await supabase
      .from('companies')
      .update({
        assigned_user_id: assignedUser.id,
        assigned_user_name: assignedUser.name || ""
      })
      .eq('id', companyId);

    // Update Leads Table
    await supabase
      .from('leads')
      .update({
        assigned_user_id: assignedUser.id,
        assigned_user_name: assignedUser.name || ""
      })
      .eq('company_id', companyId);
  };

  const handleConvertToProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setIsProcessing(true);
    try {
      const companyId = selectedLead.company_id || selectedLead.id;
      const companyName = selectedLead.company_name || selectedLead.name;
      const comp = companies.find(c => c.id === companyId);
      const insType = comp?.insurance_type || selectedLead.insurance_type || "Medical";

      const prospectPayload = {
        company_name: companyName,
        company_id: cleanUuid(companyId),
        lead_id: cleanUuid(selectedLead.id),
        pipeline_stage: 'qualification',
        probability: conversionData.probability,
        estimated_value: conversionData.estimated_value,
        expected_close_date: conversionData.expected_close_date,
        assigned_user_name: selectedLead.assigned_user_name || currentUser?.name || "",
        assigned_user_id: cleanUuid(selectedLead.assigned_user_id || currentUser?.id),
        notes: conversionData.notes,
        requested_products: [insType],
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('prospects')
        .insert(sanitizeUUIDs(prospectPayload));

      if (insertError) throw insertError;

      // Update companies table status if company exists
      if (selectedLead.company_id) {
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            status: 'prospect',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLead.company_id);

        if (updateError) throw updateError;
      }

      // Delete from leads table
      const { error: deleteLeadError } = await supabase
        .from('leads')
        .delete()
        .eq('id', selectedLead.id);

      if (deleteLeadError) throw deleteLeadError;

      toast({ title: t('prospectCreated') });
      setConversionDialogOpen(false);
    } catch (error: any) {
      console.error("Conversion failed:", error);
      if (error && typeof error === 'object') {
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      }
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

    // Remove virtual contact fields that do not exist in companies table
    const getCompanyPayload = (data: any) => {
      const {
        primary_contact_title, primary_contact_name, primary_contact_phone, primary_contact_email, primary_contact_role_id,
        second_contact_title, second_contact_name, second_contact_mobile, second_contact_email, second_contact_role_id,
        third_contact_title, third_contact_name, third_contact_mobile, third_contact_email, third_contact_role_id,
        ...rest
      } = data;
      return rest;
    };

    try {
      if (selectedLead) {
        const companyId = selectedLead.company_id;
        const companyPayload = getCompanyPayload(formData);

        // 1. Update Company profile if company exists
        if (companyId) {
          const { error: updateCompError } = await supabase
            .from('companies')
            .update({
              ...companyPayload,
              updated_at: new Date().toISOString()
            })
            .eq('id', companyId);

          if (updateCompError) throw updateCompError;
        }

        // 2. Update Leads record
        const { error: updateLeadError } = await supabase
          .from('leads')
          .update({
            company_name: formData.name,
            contact_name: formData.primary_contact_name || "",
            email: formData.primary_contact_email || "",
            phone: formData.primary_contact_phone || "",
            priority: formData.priority || "medium",
            assigned_user_name: formData.assigned_user_name || "",
            assigned_user_id: cleanUuid(formData.assigned_user_id),
            notes: formData.notes || "",
            source: formData.source || ""
          })
          .eq('id', selectedLead.id);

        if (updateLeadError) throw updateLeadError;

        const company_id = companyId || selectedLead.id;
        const company_name = formData.name;

        // Sync Multi-Level Contacts
        if (formData.primary_contact_name && formData.primary_contact_email) {
          await syncContactSupabase({
            name: formData.primary_contact_name,
            email: formData.primary_contact_email,
            phone: formData.primary_contact_phone,
            role_id: formData.primary_contact_role_id,
            company_id, company_name, is_primary: true
          });
        }
        if (formData.second_contact_name && formData.second_contact_email) {
          await syncContactSupabase({
            name: formData.second_contact_name,
            email: formData.second_contact_email,
            mobile: formData.second_contact_mobile,
            role_id: formData.second_contact_role_id,
            company_id, company_name
          });
        }
        if (formData.third_contact_name && formData.third_contact_email) {
          await syncContactSupabase({
            name: formData.third_contact_name,
            email: formData.third_contact_email,
            mobile: formData.third_contact_mobile,
            role_id: formData.third_contact_role_id,
            company_id, company_name
          });
        }

        toast({ title: t('recordUpdated') });
      } else {
        const companyPayload = getCompanyPayload(formData);
        // Create Company
        const { data: newCompany, error: insertCompError } = await supabase
          .from('companies')
          .insert(sanitizeUUIDs({
            ...companyPayload,
            status: 'lead',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
          .select()
          .single();

        if (insertCompError) throw insertCompError;

        const company_id = newCompany.id;
        const company_name = formData.name;

        // Create Lead
        const { error: insertLeadError } = await supabase
          .from('leads')
          .insert(sanitizeUUIDs({
            company_id: cleanUuid(company_id),
            company_name: company_name,
            contact_name: formData.primary_contact_name || "",
            email: formData.primary_contact_email || "",
            phone: formData.primary_contact_phone || "",
            status: 'new',
            priority: formData.priority || "medium",
            assigned_user_name: formData.assigned_user_name || "",
            assigned_user_id: cleanUuid(formData.assigned_user_id),
            notes: formData.notes || "",
            source: formData.source || "",
            created_at: new Date().toISOString()
          }));

        if (insertLeadError) throw insertLeadError;

        // Auto-Assignment (Sales Manager by default)
        await assignLeadToSalesManager(company_id);

        // Calculate and Insert Lead Score
        const score = calculateLeadScore({ ...formData, id: company_id } as any);
        await supabase
          .from('lead_scores')
          .insert(sanitizeUUIDs({
            related_id: cleanUuid(company_id),
            score: score.score,
            grade: score.grade,
            factors: score.factors,
            last_calculated: new Date().toISOString()
          }));

        // Process Workflow Triggers
        await processWorkflowTriggersSupabase('new_lead', { ...formData, id: company_id } as any);

        // Sync Multi-Level Contacts
        if (formData.primary_contact_name && formData.primary_contact_email) {
          await syncContactSupabase({
            name: formData.primary_contact_name,
            email: formData.primary_contact_email,
            phone: formData.primary_contact_phone,
            role_id: formData.primary_contact_role_id,
            company_id, company_name, is_primary: true
          });
        }
        if (formData.second_contact_name && formData.second_contact_email) {
          await syncContactSupabase({
            name: formData.second_contact_name,
            email: formData.second_contact_email,
            mobile: formData.second_contact_mobile,
            role_id: formData.second_contact_role_id,
            company_id, company_name
          });
        }
        if (formData.third_contact_name && formData.third_contact_email) {
          await syncContactSupabase({
            name: formData.third_contact_name,
            email: formData.third_contact_email,
            mobile: formData.third_contact_mobile,
            role_id: formData.third_contact_role_id,
            company_id, company_name
          });
        }

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
      // 1. Delete Lead record explicitly
      const { error: deleteLeadError } = await supabase
        .from('leads')
        .delete()
        .eq('id', selectedLead.id);

      if (deleteLeadError) {
        console.error("Error deleting lead:", deleteLeadError);
      }

      // 2. Delete Company if exists (cascades and deletes other deps)
      const companyId = selectedLead.company_id;
      if (companyId) {
        const { error: deleteCompError } = await supabase
          .from('companies')
          .delete()
          .eq('id', companyId);

        if (deleteCompError) {
          toast({ variant: 'destructive', title: t('persistenceError') });
          setDeleteDialogOpen(false);
          return;
        }
      }
      toast({ title: t('recordRemoved') });
    }
    setDeleteDialogOpen(false);
  };

  const [rowSelection, setRowSelection] = useState({});
  const { t: trans } = useI18n();

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
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                 {row.original.contact_name && <><User className="w-3 h-3" /> {row.original.contact_name}</>}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: t('details'),
      accessorKey: "estimated_premium",
      cell: ({ row }: { row: any }) => {
        const companyId = row.original.company_id;
        const comp = companies.find(c => c.id === companyId);
        const insType = comp?.insurance_type || "Medical";
        const empCount = comp?.employee_count || 0;
        return (
          <div className="flex flex-col text-xs space-y-1.5">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {trans(insType as any)}
            </span>
            {empCount > 0 && (
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> {empCount} {trans('headcount')}
              </span>
            )}
          </div>
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
          request_meeting: 'Request Meeting',
          request_quotation: 'Request Quotation',
          hr_left: 'HR Left',
          waiting_for_data: 'Waiting for Data',
          call_back: 'Call Back',
          send_profile: 'Send Profile',
          renewed: 'Renewed',
          not_interested: 'Not Interested',
          wrong_number: 'Wrong Number',
          no_answer: 'No Answer',
          new: 'New'
        };
        
        const label = outcomeLabels[rawStatus] || rawStatus;
        if (!label) return <span className="text-slate-400">-</span>;

        let badgeClass = "bg-background text-muted-foreground border-border";
        if (['request_meeting', 'request_quotation', 'new'].includes(rawStatus)) badgeClass = "bg-success/10 text-emerald-700 border-emerald-200";
        else if (['hr_left', 'call_back', 'send_profile', 'waiting_for_data'].includes(rawStatus)) badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        else if (['wrong_number', 'no_answer', 'not_interested'].includes(rawStatus)) badgeClass = "bg-destructive/10 text-red-700 border-red-200";

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
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-indigo-200 text-primary hover:bg-primary/10 font-bold gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLead(row.original);
              setConversionDialogOpen(true);
            }}
          >
            <TrendingUp className="w-3 h-3" />
            {trans('convertToProspect')}
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(row.original); }}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setSelectedLead(row.original); setDeleteDialogOpen(true); }}>
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

      // 1. Delete from leads table
      const { error: deleteLeadsError } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);

      if (deleteLeadsError) throw deleteLeadsError;

      // 2. Delete from companies table if present
      if (companyIds.length > 0) {
        const { error: deleteCompaniesError } = await supabase
          .from('companies')
          .delete()
          .in('id', companyIds);

        if (deleteCompaniesError) throw deleteCompaniesError;
      }

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

      // 1. Update leads table
      const { error: updateLeadsError } = await supabase
        .from('leads')
        .update({
          assigned_user_id: cleanUuid(userId),
          assigned_user_name: userName
        })
        .in('id', ids);

      if (updateLeadsError) throw updateLeadsError;

      // 2. Update companies table if present
      if (companyIds.length > 0) {
        const { error: updateCompaniesError } = await supabase
          .from('companies')
          .update({
            assigned_user_id: userId,
            assigned_user_name: userName,
            updated_at: new Date().toISOString()
          })
          .in('id', companyIds);

        if (updateCompaniesError) throw updateCompaniesError;
      }

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target className="w-24 h-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="space-y-1">
              <p className="text-indigo-100 text-[11px] font-black uppercase tracking-widest">{t('totalLeads') || 'Total Leads'}</p>
              <p className="text-4xl font-black">{leads.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-card overflow-hidden relative border-t-4 border-t-emerald-500">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp className="w-16 h-16 text-success" />
          </div>
          <CardContent className="p-6 relative z-10">
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">{t('newLeads') || 'New Leads'}</p>
             <p className="text-3xl font-black text-foreground">{leads.filter((l: any) => l.status === 'new').length}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden relative border-t-4 border-t-amber-500">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <AlertCircle className="w-16 h-16 text-amber-500" />
          </div>
          <CardContent className="p-6 relative z-10">
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">{t('highPriority') || 'High Priority'}</p>
             <p className="text-3xl font-black text-foreground">{leads.filter((l: any) => l.priority === 'high' || l.priority === 'critical').length}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden relative border-t-4 border-t-blue-500">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </div>
          <CardContent className="p-6 relative z-10">
             <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">{t('converted') || 'Converted to Prospect'}</p>
             <p className="text-3xl font-black text-foreground">{companies.filter((c: any) => c.status === 'prospect').length}</p>
          </CardContent>
        </Card>
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
        title={selectedLead ? `${t('editProfile')}: ${formData.name}` : t('add')}
        size="xl"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={(e) => handleSubmit(e as any)} className="bg-indigo-900 font-bold px-8 shadow-lg">{t('save')}</Button>
          </div>
        }
      >
        <div className="space-y-10 py-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Building2 className="w-4 h-4" /> {t('coreProfile')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <FormInput
                  label={t('companyEn')}
                  value={formData.name}
                  onChange={v => {
                    setFormData({ ...formData, name: v });
                    checkForDuplicates(v, formData.primary_contact_email, formData.primary_contact_phone);
                  }}
                  required
                />
                {duplicateWarning && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 animate-pulse">
                    <AlertCircle className="w-3 h-3" /> {duplicateWarning}
                  </div>
                )}
              </div>
              <FormInput label={t('companyAr')} value={formData.name_ar} onChange={v => setFormData({ ...formData, name_ar: v })} dir="rtl" />
              <FormInput label={t('clientCode')} value={formData.code} onChange={v => setFormData({ ...formData, code: v })} readOnly disabled className="h-10 bg-slate-100 border-border text-muted-foreground italic" />
              <FormInput label="Landline" value={formData.landline} onChange={v => setFormData({ ...formData, landline: v })} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">{t('industry')}</Label>
                <Select value={formData.industry} onValueChange={v => setFormData({ ...formData, industry: v })}>
                  <SelectTrigger className="h-10 bg-background text-sm"><SelectValue placeholder="Select Industry" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(() => {
                      const groups: Record<string, any[]> = {};
                      industries.forEach((ind: any) => {
                        const cat = isRtl ? ind.category_ar : ind.category_en;
                        if (!groups[cat]) groups[cat] = [];
                        groups[cat].push(ind);
                      });

                      return Object.entries(groups).map(([cat, items]) => (
                        <SelectGroup key={cat}>
                          <SelectLabel className="text-[10px] font-black text-primary bg-background py-1 px-2">{cat}</SelectLabel>
                          {items.map((ind: any) => (
                            <SelectItem key={ind.id} value={isRtl ? ind.subcategory_ar : ind.subcategory_en}>
                              {isRtl ? ind.subcategory_ar : ind.subcategory_en}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <FormInput label={t('headcount')} value={formData.employee_count} type="number" onChange={v => setFormData({ ...formData, employee_count: Number(v) })} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">{t('priority')}</Label>
                <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v as any })}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('negligible')}</SelectItem>
                    <SelectItem value="medium">{t('moderate')}</SelectItem>
                    <SelectItem value="high">{t('high')}</SelectItem>
                    <SelectItem value="critical">{t('critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Timer className="w-4 h-4" /> {t('milestonesRenewals')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">{t('exRenewal')}</Label>
                <Select value={formData.expected_renewal_date} onValueChange={v => setFormData({ ...formData, expected_renewal_date: v, expected_offer_date: calculateOfferDate(v) })}>
                  <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as any)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <FormInput label={t('exSubmitOfferDate')} type="date" value={formData.expected_offer_date} onChange={v => setFormData({ ...formData, expected_offer_date: v })} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">{t('actualRenewal')}</Label>
                <Select value={formData.actual_renewal_date} onValueChange={v => setFormData({ ...formData, actual_renewal_date: v, actual_offer_date: calculateOfferDate(v) })}>
                  <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{t(m as any)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <FormInput label={t('actualOfferReceivingDate')} type="date" value={formData.actual_offer_date} onChange={v => setFormData({ ...formData, actual_offer_date: v })} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <MapPin className="w-4 h-4" /> {t('registrationAndLocation') || "Registration & Location"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput label={t('crNumber')} value={formData.cr_number} onChange={v => setFormData({ ...formData, cr_number: v })} />
              <FormInput label={t('taxCard')} value={formData.tax_card} onChange={v => setFormData({ ...formData, tax_card: v })} />
              <FormInput label={t('city')} value={formData.city} onChange={v => setFormData({ ...formData, city: v })} />
              <div className="md:col-span-2">
                <FormInput label={t('address')} value={formData.address} onChange={v => setFormData({ ...formData, address: v })} />
              </div>
              <FormInput label="Landline" value={formData.landline} onChange={v => setFormData({ ...formData, landline: v })} />
              <FormInput label={t('currentInsurer')} value={formData.current_insurer} onChange={v => setFormData({ ...formData, current_insurer: v })} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Briefcase className="w-4 h-4" /> {t('multiLevelContacts')}
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Tabs defaultValue="primary" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-primary/10/50 p-1 rounded-xl">
                  <TabsTrigger value="primary" className="rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">{t('level')} 1: {t('primaryDecisionMaker')}</TabsTrigger>
                  <TabsTrigger value="secondary" className="rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">{t('level')} 2: {t('alternative')}</TabsTrigger>
                  <TabsTrigger value="tertiary" className="rounded-lg font-bold data-[state=active]:bg-card data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">{t('level')} 3: {t('alternative')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="primary" className="mt-4 bg-card p-4 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput label={t('name')} value={formData.primary_contact_name} onChange={v => setFormData({ ...formData, primary_contact_name: v })} />
                    <FormInput label={t('phone')} value={formData.primary_contact_phone} onChange={v => setFormData({ ...formData, primary_contact_phone: v })} />
                    <FormInput label={t('email')} value={formData.primary_contact_email} onChange={v => setFormData({ ...formData, primary_contact_email: v })} />
                  </div>
                </TabsContent>
                
                <TabsContent value="secondary" className="mt-4 bg-card p-4 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput label={t('name')} value={formData.second_contact_name} onChange={v => setFormData({ ...formData, second_contact_name: v })} />
                    <FormInput label={t('phone')} value={formData.second_contact_mobile} onChange={v => setFormData({ ...formData, second_contact_mobile: v })} />
                    <FormInput label={t('email')} value={formData.second_contact_email} onChange={v => setFormData({ ...formData, second_contact_email: v })} />
                  </div>
                </TabsContent>
                
                <TabsContent value="tertiary" className="mt-4 bg-card p-4 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput label={t('name')} value={formData.third_contact_name} onChange={v => setFormData({ ...formData, third_contact_name: v })} />
                    <FormInput label={t('phone')} value={formData.third_contact_mobile} onChange={v => setFormData({ ...formData, third_contact_mobile: v })} />
                    <FormInput label={t('email')} value={formData.third_contact_email} onChange={v => setFormData({ ...formData, third_contact_email: v })} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-black uppercase text-xs tracking-widest border-b pb-2">
              <Globe className="w-4 h-4" /> {t('communicationAndOps') || "Communication & Ops"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput label={t('website')} value={formData.website} onChange={v => setFormData({ ...formData, website: v })} />
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{t('assignedUser')}</Label>
                <Select 
                  value={formData.assigned_user_id || "none"} 
                  onValueChange={v => {
                    const isNone = v === "none";
                    const selectedUser = !isNone ? users.find((u: any) => u.id === v) : null;
                    setFormData({ 
                      ...formData, 
                      assigned_user_id: isNone ? "" : v, 
                      assigned_user_name: selectedUser ? selectedUser.name : "" 
                    });
                  }}
                >
                  <SelectTrigger className="h-10 bg-background border-border">
                    <SelectValue placeholder="Select Assigned User" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="none" className="italic text-slate-400">Unassigned</SelectItem>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} <span className="text-[10px] text-slate-400 ml-2">({u.role})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">{t('lineOfBusiness')}</Label>
                <Select value={formData.insurance_type} onValueChange={v => setFormData({ ...formData, insurance_type: v as any })}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {productTypes?.map((pt: any) => (
                      <SelectItem key={pt.id} value={isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}>
                        {isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">{t('source')}</Label>
                <Select value={formData.source} onValueChange={v => setFormData({ ...formData, source: v })}>
                  <SelectTrigger className="h-10 bg-background text-sm"><SelectValue placeholder="Select Source" /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const groups: Record<string, any[]> = {};
                      sources.forEach((src: any) => {
                        const cat = src.category || 'Other';
                        if (!groups[cat]) groups[cat] = [];
                        groups[cat].push(src);
                      });

                      return Object.entries(groups).map(([cat, items]) => (
                        <SelectGroup key={cat}>
                          <SelectLabel className="text-[10px] font-black text-slate-400 px-2 py-1 uppercase">{cat}</SelectLabel>
                          {items.map((src: any) => (
                            <SelectItem key={src.id} value={isRtl ? src.name_ar : src.name_en}>
                              {isRtl ? src.name_ar : src.name_en}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">{t('internalNotes')}</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={4} placeholder={t('internalNotes')} className="bg-background" />
            </div>
          </div>
        </div>
      </FormDialog>

      <FormDialog 
        open={conversionDialogOpen} 
        onOpenChange={setConversionDialogOpen} 
        title={t('convertToProspect')} 
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setConversionDialogOpen(false)} disabled={isProcessing}>{t('cancel')}</Button>
            <Button onClick={(e) => handleConvertToProspect(e as any)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-8 shadow-md" disabled={isProcessing}>
              {t('finalizeConversion')}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 py-2">
          <div className="flex items-center gap-3 p-4 bg-primary/10 border border-indigo-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
            <div className="text-sm text-indigo-900">
              <p className="font-bold">{t('convertToProspect')}: {selectedLead?.company_name || selectedLead?.name}</p>
              <p className="opacity-70">{t('readyForDiagnosticsDescription')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">{t('estimatedPremium')} (egp)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  className="pl-10 h-12 text-lg font-bold"
                  value={conversionData.estimated_value ?? ''}
                  onChange={e => setConversionData({ ...conversionData, estimated_value: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">{t('closingProbability')} (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  className="pl-10 h-12 text-lg font-bold"
                  value={conversionData.probability ?? ''}
                  max={100} min={0}
                  onChange={e => setConversionData({ ...conversionData, probability: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400">{t('expectedCloseDate')}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  className="pl-10 h-12"
                  value={conversionData.expected_close_date || ''}
                  onChange={e => setConversionData({ ...conversionData, expected_close_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-slate-400">{t('internalNotes')}</Label>
            <Textarea
              rows={4}
              placeholder={t('internalNotes')}
              value={conversionData.notes}
              onChange={e => setConversionData({ ...conversionData, notes: e.target.value })}
            />
          </div>
        </div>
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
