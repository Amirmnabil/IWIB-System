'use client';
import React, { useState, useEffect } from "react";
import { UserCircle, Mail, Phone, Building2, Edit, Trash2, Star, GitMerge, AlertTriangle, ShieldCheck, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import FormDialog from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-context";
import { useToast } from "@/hooks/use-toast";
import type { Contact, Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import { usePermissions } from '@/lib/hooks/use-permissions';
import { 
  normalizePhoneNumber, 
  normalizeEmail, 
  isValidEmail, 
  getStringSimilarity, 
  calculateQualityScore 
} from "@/lib/data-quality";
import { logAuditEvent } from "@/lib/audit-logger";

// Supabase & React Query Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_TYPES = ["HR", "Finance", "CEO", "Procurement", "Broker Contact", "Claims Manager", "Other"];
const CONTACT_METHODS = ["Email", "Phone", "WhatsApp", "In Person"];

const emptyForm: Omit<Contact, 'id' | 'created_at'> = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  mobile: "",
  job_title: "",
  role_type: "",
  company_id: "",
  company_name: "",
  preferred_contact_method: "Email",
  is_primary: false,
  notes: ""
};

export default function Contacts() {
  const { t, isRtl } = useI18n();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin } = usePermissions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Omit<Contact, 'id' | 'created_at'>>(emptyForm);

  // Supabase Queries
  const { data: contactsData, isLoading } = useSupabaseCollection<Contact>('contacts');
  const contacts = contactsData || [];
  
  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const companies = companiesData || [];

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Autocomplete suggestions state
  const [companySearch, setCompanySearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Real-time duplicates & override states
  const [strictDuplicate, setStrictDuplicate] = useState<{ type: 'email' | 'phone' | 'name_company'; message: string; contact: Contact } | null>(null);
  const [fuzzyDuplicate, setFuzzyDuplicate] = useState<{ similarity: number; message: string; contact: Contact } | null>(null);
  const [adminOverride, setAdminOverride] = useState(false);

  // Merge state variables
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  // Current authenticated user state
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser({
          uid: data.user.id,
          displayName: data.user.email,
          email: data.user.email
        });
      }
    }
    fetchUser();
  }, []);

  // Sync search input with company selected in formData
  useEffect(() => {
    if (dialogOpen) {
      if (formData.company_id) {
        const company = companies.find(c => c.id === formData.company_id);
        setCompanySearch(company?.name || "");
      } else {
        setCompanySearch("");
      }
    }
  }, [dialogOpen, formData.company_id, companies]);

  // Real-time duplication analysis hook
  useEffect(() => {
    if (!dialogOpen) {
      setStrictDuplicate(null);
      setFuzzyDuplicate(null);
      setAdminOverride(false);
      return;
    }

    const { first_name, last_name, email, phone, mobile, company_id } = formData;
    const currentId = selectedContact?.id;

    const normEmail = normalizeEmail(email);
    const normPhone = normalizePhoneNumber(phone || "");
    const normMobile = normalizePhoneNumber(mobile || "");
    const normFirstName = first_name.trim().toLowerCase();
    const normLastName = last_name.trim().toLowerCase();

    // 1. Check strict rules
    for (const c of contacts) {
      if (currentId && c.id === currentId) continue;

      // Duplicate Email
      if (normEmail && normalizeEmail(c.email || "") === normEmail) {
        setStrictDuplicate({
          type: 'email',
          message: `This email belongs to ${c.first_name} ${c.last_name}`,
          contact: c
        });
        setFuzzyDuplicate(null);
        return;
      }

      // Duplicate Phone / Mobile
      const cNormPhone = normalizePhoneNumber(c.phone || "");
      const cNormMobile = normalizePhoneNumber(c.mobile || "");
      if (
        (normPhone && (normPhone === cNormPhone || normPhone === cNormMobile)) ||
        (normMobile && (normMobile === cNormPhone || normMobile === cNormMobile))
      ) {
        setStrictDuplicate({
          type: 'phone',
          message: `This phone number belongs to ${c.first_name} ${c.last_name}`,
          contact: c
        });
        setFuzzyDuplicate(null);
        return;
      }

      // Composite Unique Match (Name + Company ID)
      if (
        normFirstName && normLastName && company_id &&
        c.first_name?.trim().toLowerCase() === normFirstName &&
        c.last_name?.trim().toLowerCase() === normLastName &&
        c.company_id === company_id
      ) {
        setStrictDuplicate({
          type: 'name_company',
          message: `Contact with this name is already registered under this company`,
          contact: c
        });
        setFuzzyDuplicate(null);
        return;
      }
    }
    setStrictDuplicate(null);

    // 2. Fuzzy matches check (Name similarity > 80%)
    if (normFirstName && normLastName) {
      const currentFullName = `${normFirstName} ${normLastName}`;
      for (const c of contacts) {
        if (currentId && c.id === currentId) continue;

        const otherFullName = `${(c.first_name || "").trim().toLowerCase()} ${(c.last_name || "").trim().toLowerCase()}`;
        const similarity = getStringSimilarity(currentFullName, otherFullName);

        if (similarity > 0.8) {
          const comp = companies.find(org => org.id === c.company_id);
          setFuzzyDuplicate({
            similarity,
            message: `⚠️ Possible duplicate: "${c.first_name} ${c.last_name}" at ${comp?.name || 'No Company'} (Levenshtein Name Match: ${Math.round(similarity * 100)}%)`,
            contact: c
          });
          return;
        }
      }
    }
    setFuzzyDuplicate(null);
  }, [formData, contacts, dialogOpen, selectedContact, companies]);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedContact(null);
    setStrictDuplicate(null);
    setFuzzyDuplicate(null);
    setAdminOverride(false);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      mobile: contact.mobile || "",
      job_title: contact.job_title || "",
      role_type: contact.role_type || "",
      company_id: contact.company_id || "",
      company_name: contact.company_name || "",
      preferred_contact_method: contact.preferred_contact_method || "Email",
      is_primary: contact.is_primary || false,
      notes: contact.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict block validation
    if (strictDuplicate && !adminOverride) {
      toast({ 
        title: "Persistence Blocked", 
        description: strictDuplicate.message, 
        variant: "destructive" 
      });
      
      // Log duplicate attempt in audit logs
      await logAuditEvent(null, currentUser, {
        action: 'duplicate_attempt',
        resource_type: 'contact',
        resource_name: `${formData.first_name} ${formData.last_name}`,
        changes: { reason: strictDuplicate.message, type: strictDuplicate.type }
      });
      return;
    }

    try {
        // Enforce Egyptian/Global telephone & email normalization
        const cleanPhone = normalizePhoneNumber(formData.phone || "");
        const cleanMobile = normalizePhoneNumber(formData.mobile || "");
        const cleanEmail = normalizeEmail(formData.email || "");

        const normalizedSave = {
          ...formData,
          phone: cleanPhone,
          mobile: cleanMobile,
          email: cleanEmail
        };

        if (selectedContact) {
            const { company_name, preferred_contact_method, ...saveData } = normalizedSave;
            
            const { error } = await supabase
              .from("contacts")
              .update(saveData)
              .eq("id", selectedContact.id);

            if (error) throw error;
            
            await logAuditEvent(null, currentUser, {
              action: 'update',
              resource_type: 'contact',
              resource_id: selectedContact.id,
              resource_name: `${saveData.first_name} ${saveData.last_name}`,
              changes: saveData
            });
            
            toast({ title: t('saveChanges') });
        } else {
            const { company_name, preferred_contact_method, ...saveData } = normalizedSave;
            
            const { data: newContact, error } = await supabase
              .from("contacts")
              .insert({
                ...saveData,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (error) throw error;
            
            await logAuditEvent(null, currentUser, {
              action: 'create',
              resource_type: 'contact',
              resource_id: newContact.id,
              resource_name: `${saveData.first_name} ${saveData.last_name}`,
              changes: saveData
            });
            
            toast({ title: t('add') });
        }
        
        queryClient.invalidateQueries({ queryKey: ['supabase', 'contacts'] });
        setDialogOpen(false);
        resetForm();
    } catch(error: any) {
        console.error("Error submitting form: ", error);
        toast({ title: "An error occurred.", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedContact) {
      try {
        const { error } = await supabase
          .from("contacts")
          .delete()
          .eq("id", selectedContact.id);

        if (error) throw error;
        
        await logAuditEvent(null, currentUser, {
          action: 'delete',
          resource_type: 'contact',
          resource_id: selectedContact.id,
          resource_name: `${selectedContact.first_name} ${selectedContact.last_name}`
        });

        toast({ title: t('delete') });
        queryClient.invalidateQueries({ queryKey: ['supabase', 'contacts'] });
      } catch (error: any) {
        console.error("Error deleting document: ", error);
        toast({ title: "An error occurred while deleting.", description: error.message, variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedContact(null);
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) return;
    if (mergeSourceId === mergeTargetId) {
      toast({ title: "Validation Error", description: "Cannot merge a contact into itself.", variant: "destructive" });
      return;
    }

    setIsMerging(true);
    try {
      const source = contacts.find(c => c.id === mergeSourceId);
      const target = contacts.find(c => c.id === mergeTargetId);
      
      if (!source || !target) throw new Error("Contact not found");

      // Consolidate target with source fields (preserving existing target fields)
      const mergedFields: any = {
        email: target.email || source.email || "",
        phone: target.phone || source.phone || "",
        mobile: target.mobile || source.mobile || "",
        job_title: target.job_title || source.job_title || "",
        role_type: target.role_type || source.role_type || "",
        company_id: target.company_id || source.company_id || "",
        company_name: target.company_name || source.company_name || "",
        notes: target.notes && source.notes 
          ? `${target.notes}\n[Merged Notes from ${source.first_name} ${source.last_name}]: ${source.notes}`
          : target.notes || source.notes || "",
      };

      // 1. Update Target Record
      const { error: targetError } = await supabase
        .from("contacts")
        .update(mergedFields)
        .eq("id", target.id);

      if (targetError) throw targetError;

      // 2. Re-route associated activities history
      const { data: activitiesSnapshot, error: actError } = await supabase
        .from("activities")
        .select("*");

      if (actError) throw actError;

      if (activitiesSnapshot) {
        for (const act of activitiesSnapshot) {
          if (act.related_id === source.id) {
            await supabase
              .from("activities")
              .update({
                related_id: target.id,
                related_name: `${target.first_name} ${target.last_name}`,
                updated_at: new Date().toISOString()
              })
              .eq("id", act.id);
          }
          if (act.assigned_to_id === source.id) {
            await supabase
              .from("activities")
              .update({
                assigned_to_id: target.id,
                assigned_to_name: `${target.first_name} ${target.last_name}`,
                updated_at: new Date().toISOString()
              })
              .eq("id", act.id);
          }
        }
      }

      // 3. Log Audit Merge Trail
      await logAuditEvent(null, currentUser, {
        action: 'merge',
        resource_type: 'contact',
        resource_id: target.id,
        resource_name: `${target.first_name} ${target.last_name}`,
        changes: {
          consolidated_source_id: source.id,
          consolidated_source_name: `${source.first_name} ${source.last_name}`,
          source_previous_state: source,
          target_previous_state: target,
          merged_fields: mergedFields
        }
      });

      // 4. Delete Source Record
      const { error: deleteError } = await supabase
        .from("contacts")
        .delete()
        .eq("id", source.id);

      if (deleteError) throw deleteError;

      toast({ 
        title: "Deduplication Merge Successful", 
        description: `Successfully merged and consolidated ${source.first_name} into ${target.first_name}.` 
      });
      
      queryClient.invalidateQueries({ queryKey: ['supabase', 'contacts'] });
      setMergeDialogOpen(false);
      setMergeSourceId("");
      setMergeTargetId("");
    } catch (error: any) {
      console.error("Duplicate merge execution error:", error);
      toast({ title: "Merge Failed", description: error.message || "Could not execute database merge consolidation.", variant: "destructive" });
    } finally {
      setIsMerging(false);
    }
  };

  const columns = [
    {
      header: t('contacts'),
      accessorKey: "first_name",
      cell: ({row}: any) => {
        const contact = row.original as Contact;
        
        // Dynamic duplication visual analyzer inside the table
        const normEmail = normalizeEmail(contact.email || "");
        const normPhone = normalizePhoneNumber(contact.phone || "");
        const normMobile = normalizePhoneNumber(contact.mobile || "");
        const fullName = `${(contact.first_name || "").trim().toLowerCase()} ${(contact.last_name || "").trim().toLowerCase()}`;
        
        let duplicateReason = "";
        let isFuzzy = false;
        
        for (const other of contacts) {
          if (other.id === contact.id) continue;
          
          const otherEmail = normalizeEmail(other.email || "");
          const otherPhone = normalizePhoneNumber(other.phone || "");
          const otherMobile = normalizePhoneNumber(other.mobile || "");
          const otherFullName = `${(other.first_name || "").trim().toLowerCase()} ${(other.last_name || "").trim().toLowerCase()}`;
          
          if (normEmail && normEmail === otherEmail) {
            duplicateReason = `Strict duplicate Email address matched with ${other.first_name} ${other.last_name}`;
            break;
          }
          if (
            (normPhone && (normPhone === otherPhone || normPhone === otherMobile)) ||
            (normMobile && (normMobile === otherPhone || normMobile === otherMobile))
          ) {
            duplicateReason = `Strict duplicate Phone number matched with ${other.first_name} ${other.last_name}`;
            break;
          }
          if (
            contact.first_name?.trim().toLowerCase() === other.first_name?.trim().toLowerCase() &&
            contact.last_name?.trim().toLowerCase() === other.last_name?.trim().toLowerCase() &&
            contact.company_id === other.company_id &&
            contact.company_id
          ) {
            duplicateReason = `Duplicate composite Name found at the same company`;
            break;
          }
          
          const nameSim = getStringSimilarity(fullName, otherFullName);
          if (nameSim > 0.8) {
            duplicateReason = `Fuzzy name match (Levenshtein similarity: ${Math.round(nameSim * 100)}%) with ${other.first_name} ${other.last_name}`;
            isFuzzy = true;
            break;
          }
        }

        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-slate-600">
                {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">{contact.first_name} {contact.last_name}</p>
                {contact.is_primary && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
                {duplicateReason && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 rounded cursor-help ${isFuzzy ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"}`}>
                          {isFuzzy ? "Possible Duplicate" : "Duplicate"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="p-2 text-xs bg-slate-900 text-white rounded-lg border-none">
                        {duplicateReason}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-sm text-slate-500 font-medium">{contact.job_title}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: t('companies'),
      accessorKey: "company_id",
      cell: ({row}: any) => {
        const contact = row.original as Contact;
        const company = companies.find(c => c.id === contact.company_id);
        return (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">{company?.name || contact.company_name || '-'}</span>
          </div>
        );
      }
    },
    {
      header: t('role') || "Role",
      accessorKey: "role_type",
      cell: ({row}: any) => row.original.role_type ? <Badge variant="outline" className="font-semibold">{row.original.role_type}</Badge> : '-'
    },
    {
      header: t('email'),
      accessorKey: "email",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2 text-xs">
          <Mail className="w-4 h-4 text-slate-400" />
          <a href={`mailto:${row.original.email}`} className="text-indigo-600 hover:text-indigo-700 font-medium">
            {row.original.email || '-'}
          </a>
        </div>
      )
    },
    {
      header: t('phone'),
      accessorKey: "phone",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Phone className="w-4 h-4 text-slate-400" />
          <span>{row.original.phone || row.original.mobile || '-'}</span>
        </div>
      )
    },
    {
      header: "Data Cleanliness",
      accessorKey: "quality",
      cell: ({ row }: any) => {
        const contact = row.original as Contact;
        const q = calculateQualityScore(contact);
        const scoreColor = q.score >= 80 
          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
          : q.score >= 50 
            ? "bg-amber-50 text-amber-700 border-amber-200" 
            : "bg-rose-50 text-rose-700 border-rose-200";
            
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`font-bold px-2 py-0.5 rounded-full cursor-help shadow-sm ${scoreColor}`}>
                  {q.score}%
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="p-3 space-y-1.5 text-xs rounded-xl bg-slate-900 border-none text-white max-w-[220px]">
                <p className="font-black text-slate-300 uppercase tracking-widest text-[9px] border-b border-slate-800 pb-1 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Quality Audit</p>
                <div className="space-y-1 mt-1 font-semibold text-[10px]">
                  <div className="flex justify-between gap-4"><span>Name Provided:</span> <span className={contact.first_name && contact.last_name ? "text-emerald-400" : "text-rose-400"}>✓ 20%</span></div>
                  <div className="flex justify-between gap-4"><span>Phone/Mobile:</span> <span className={q.hasPhone ? "text-emerald-400" : "text-rose-400"}>✓ 30%</span></div>
                  <div className="flex justify-between gap-4"><span>Valid Email:</span> <span className={q.hasEmail ? "text-emerald-400" : "text-rose-400"}>✓ 25%</span></div>
                  <div className="flex justify-between gap-4"><span>Linked Company:</span> <span className={q.hasCompany ? "text-emerald-400" : "text-rose-400"}>✓ 15%</span></div>
                  <div className="flex justify-between gap-4"><span>Job Title:</span> <span className={q.hasJobTitle ? "text-emerald-400" : "text-rose-400"}>✓ 5%</span></div>
                  <div className="flex justify-between gap-4"><span>Role Defined:</span> <span className={q.hasRoleType ? "text-emerald-400" : "text-rose-400"}>✓ 5%</span></div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({row}: any) => {
        const contact = row.original as Contact;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(contact); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedContact(contact);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )
      }
    }
  ];

  const table = useReactTable({
      data: contacts,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      onGlobalFilterChange: setGlobalFilter,
      getFilteredRowModel: getFilteredRowModel(),
      state: {
          sorting,
          globalFilter,
      },
      initialState: {
          pagination: {
              pageSize: 10,
          },
      },
  });

  return (
    <div>
      <PageHeader
        title={t('contacts')}
        onAction={() => { resetForm(); setDialogOpen(true); }}
        actionLabel="Add Contact"
        ActionIcon={UserCircle}
      >
        {isAdmin && (
          <Button 
            onClick={() => { setMergeSourceId(""); setMergeTargetId(""); setMergeDialogOpen(true); }} 
            variant="outline" 
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm rounded-xl px-5 h-11 font-bold"
          >
            <GitMerge className="w-4 h-4 mr-2" />
            Merge Contacts
          </Button>
        )}
      </PageHeader>

      <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
        <CardContent className="p-6">
          {contacts.length === 0 && !isLoading ? (
            <EmptyState
              icon={UserCircle}
              title={t('noContacts') || "No contacts yet"}
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel={t('add')}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder={t('searchPlaceholder')}
              onRowClick={handleEdit}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>

      {/* Contact Form Dialog */}
      <FormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        title={selectedContact ? t('edit') : t('add')}
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button 
              type="submit" 
              form="contact-form"
              disabled={!!strictDuplicate && !adminOverride}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedContact ? t('save') : t('add')}
            </Button>
          </div>
        }
      >
        <form id="contact-form" onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
          
          {/* Strict Duplicates Warning Box */}
          {strictDuplicate && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="font-black text-rose-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-rose-500" /> Strict Duplicate Blocked</p>
                <p className="text-slate-600 font-medium">{strictDuplicate.message}</p>
              </div>
              <div className="flex gap-2 items-center">
                {isAdmin && (
                  <div className="flex items-center gap-1.5 bg-white border border-rose-200 px-3 py-1.5 rounded-xl shadow-sm">
                    <input 
                      type="checkbox" 
                      id="strict-bypass" 
                      checked={adminOverride} 
                      onChange={(e) => setAdminOverride(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <Label htmlFor="strict-bypass" className="text-[9px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">Bypass</Label>
                  </div>
                )}
                <Button 
                  type="button" 
                  size="sm" 
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-4 rounded-xl text-[10px]"
                  onClick={() => {
                    setDialogOpen(false);
                    setMergeSourceId("");
                    setMergeTargetId(strictDuplicate.contact.id);
                    setMergeDialogOpen(true);
                  }}
                >
                  Merge Tool
                </Button>
              </div>
            </div>
          )}

          {/* Fuzzy/Levenshtein Warnings Warning Box */}
          {fuzzyDuplicate && !strictDuplicate && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-semibold flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="font-black text-amber-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Fuzzy Similarity Detected</p>
                <p className="text-slate-600 font-medium">{fuzzyDuplicate.message}</p>
              </div>
              <div className="flex gap-2 items-center">
                {isAdmin && (
                  <div className="flex items-center gap-1.5 bg-white border border-amber-200 px-3 py-1.5 rounded-xl shadow-sm">
                    <input 
                      type="checkbox" 
                      id="fuzzy-bypass" 
                      checked={adminOverride} 
                      onChange={(e) => setAdminOverride(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <Label htmlFor="fuzzy-bypass" className="text-[9px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">Bypass</Label>
                  </div>
                )}
                <Button 
                  type="button" 
                  size="sm" 
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-4 rounded-xl text-[10px]"
                  onClick={() => {
                    setDialogOpen(false);
                    setMergeSourceId("");
                    setMergeTargetId(fuzzyDuplicate.contact.id);
                    setMergeDialogOpen(true);
                  }}
                >
                  Merge Tool
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('name')} *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="e.g., Ahmed"
                required
                className={strictDuplicate?.type === 'name_company' ? "border-rose-300 focus-visible:ring-rose-500 bg-rose-50/10" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('name')} (2) *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="e.g., Ali"
                required
                className={strictDuplicate?.type === 'name_company' ? "border-rose-300 focus-visible:ring-rose-500 bg-rose-50/10" : ""}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('email')} *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@company.com"
                required
                className={strictDuplicate?.type === 'email' ? "border-rose-300 focus-visible:ring-rose-500 bg-rose-50/10" : ""}
              />
              {strictDuplicate?.type === 'email' && (
                <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {strictDuplicate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +20 101 234 5678"
                className={strictDuplicate?.type === 'phone' ? "border-rose-300 focus-visible:ring-rose-500 bg-rose-50/10" : ""}
              />
              {strictDuplicate?.type === 'phone' && (
                <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {strictDuplicate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('mobile') || "Mobile"}</Label>
              <Input
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g., 01112345678"
                className={strictDuplicate?.type === 'phone' ? "border-rose-300 focus-visible:ring-rose-500 bg-rose-50/10" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('title')}</Label>
              <Input
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="e.g., HR Manager"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('role') || "Role"}</Label>
              <Select value={formData.role_type} onValueChange={(v) => setFormData({ ...formData, role_type: v })}>
                <SelectTrigger className="rounded-xl h-10 border-slate-200">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                  {ROLE_TYPES.map(r => (
                    <SelectItem key={r} value={r} className="text-xs font-semibold rounded-xl">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Smart Suggestions Company Autocomplete */}
            <div className="space-y-2 relative">
              <Label>{t('companies')}</Label>
              <div className="relative">
                <Input
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowSuggestions(true);
                    if (e.target.value === "") {
                      setFormData({ ...formData, company_id: "", company_name: "" });
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search & autocomplete company..."
                  className={strictDuplicate?.type === 'name_company' ? "border-rose-300 focus-visible:ring-rose-500 bg-rose-50/10" : ""}
                />
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {showSuggestions && companySearch && (
                <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto mt-1 z-[999]">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => {
                          setFormData({ ...formData, company_id: c.id, company_name: c.name });
                          setCompanySearch(c.name);
                          setShowSuggestions(false);
                        }}
                        className="p-3 hover:bg-indigo-50 cursor-pointer text-xs font-semibold text-slate-700 flex items-center gap-2.5 border-b last:border-none"
                      >
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        {c.name}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400 italic">No companies found</div>
                  )}
                </div>
              )}
              {strictDuplicate?.type === 'name_company' && (
                <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {strictDuplicate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('preferredContactMethod') || "Preferred Contact Method"}</Label>
              <Select value={formData.preferred_contact_method} onValueChange={(v) => setFormData({ ...formData, preferred_contact_method: v })}>
                <SelectTrigger className="rounded-xl h-10 border-slate-200">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                  {CONTACT_METHODS.map(m => (
                    <SelectItem key={m} value={m} className="text-xs font-semibold rounded-xl">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 shadow-sm">
            <Switch
              checked={formData.is_primary}
              onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
            />
            <div>
              <Label className="text-amber-700 font-bold">{t('primaryContact')}</Label>
              <p className="text-[11px] text-amber-600 font-medium">Mark as the main decision-maker for this company</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('internalNotes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional contact history notes..."
              rows={3}
              className="rounded-xl border-slate-200"
            />
          </div>

        </form>
      </FormDialog>

      {/* Duplicate Merging Admin Tool Dialog */}
      <FormDialog 
        open={mergeDialogOpen} 
        onOpenChange={setMergeDialogOpen}
        title="Deduplication Merge & Consolidation Center"
        size="xl"
        footer={
          <div className="flex justify-end gap-3 w-full border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setMergeDialogOpen(false)}>{t('cancel')}</Button>
            <Button 
              onClick={handleMerge} 
              disabled={isMerging || !mergeSourceId || !mergeTargetId}
              className="bg-indigo-600 hover:bg-indigo-700 font-black px-10 rounded-xl gap-2 shadow-md shadow-indigo-100"
            >
              {isMerging && <AlertTriangle className="w-4 h-4 animate-spin" />}
              <CheckCircle className="w-4 h-4" /> Consolidate & Merge Records
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-indigo-900 font-semibold leading-relaxed shadow-sm">
            <p className="font-bold flex items-center gap-1.5 text-indigo-800 uppercase tracking-wider text-[10px] mb-1"><GitMerge className="w-4 h-4 text-indigo-500" /> Enterprise Merge protocol</p>
            This tool enables admins to consolidate two duplicate profiles. Select the **Source Profile** (the duplicate record that will be merged and deleted) and the **Target Profile** (the master record to maintain). All call histories, activities, tasks, and empty parameters will be consolidated.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source Contact Selector */}
            <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-slate-50/30 p-5 space-y-4">
              <div>
                <Label className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Step 1: Duplicate Contact (Source)</Label>
                <p className="text-[11px] text-slate-400 font-bold mb-2">This record will be merged and DELETED</p>
                <Select value={mergeSourceId} onValueChange={setMergeSourceId}>
                  <SelectTrigger className="bg-white rounded-xl h-11 border-slate-200">
                    <SelectValue placeholder="Select duplicate record..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl p-1 max-h-60">
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-semibold rounded-xl">
                        {c.first_name} {c.last_name} ({c.email || 'No Email'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mergeSourceId && (() => {
                const s = contacts.find(c => c.id === mergeSourceId);
                if (!s) return null;
                const comp = companies.find(org => org.id === s.company_id);
                const score = calculateQualityScore(s).score;
                return (
                  <div className="space-y-2 border-t pt-4 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between"><span>Full Name:</span> <span className="font-black text-slate-800">{s.first_name} {s.last_name}</span></div>
                    <div className="flex justify-between"><span>Company:</span> <span className="text-indigo-600 font-bold">{comp?.name || s.company_name || '-'}</span></div>
                    <div className="flex justify-between"><span>Email Address:</span> <span>{s.email || '-'}</span></div>
                    <div className="flex justify-between"><span>Phone Number:</span> <span>{s.phone || '-'}</span></div>
                    <div className="flex justify-between"><span>Mobile Number:</span> <span>{s.mobile || '-'}</span></div>
                    <div className="flex justify-between"><span>Job Title:</span> <span>{s.job_title || '-'}</span></div>
                    <div className="flex justify-between"><span>Profile Quality:</span> <Badge variant="outline" className="font-black bg-rose-50 text-rose-600 border-rose-200 px-2 py-0.5 rounded-full">{score}%</Badge></div>
                  </div>
                );
              })()}
            </Card>

            {/* Target Contact Selector */}
            <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-slate-50/30 p-5 space-y-4">
              <div>
                <Label className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Step 2: Master Contact (Target)</Label>
                <p className="text-[11px] text-slate-400 font-bold mb-2">This record will consolidate data and be KEPT</p>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger className="bg-white rounded-xl h-11 border-slate-200">
                    <SelectValue placeholder="Select master record..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl p-1 max-h-60">
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-semibold rounded-xl">
                        {c.first_name} {c.last_name} ({c.email || 'No Email'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mergeTargetId && (() => {
                const t = contacts.find(c => c.id === mergeTargetId);
                if (!t) return null;
                const comp = companies.find(org => org.id === t.company_id);
                const score = calculateQualityScore(t).score;
                return (
                  <div className="space-y-2 border-t pt-4 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between"><span>Full Name:</span> <span className="font-black text-slate-800">{t.first_name} {t.last_name}</span></div>
                    <div className="flex justify-between"><span>Company:</span> <span className="text-indigo-600 font-bold">{comp?.name || t.company_name || '-'}</span></div>
                    <div className="flex justify-between"><span>Email Address:</span> <span>{t.email || '-'}</span></div>
                    <div className="flex justify-between"><span>Phone Number:</span> <span>{t.phone || '-'}</span></div>
                    <div className="flex justify-between"><span>Mobile Number:</span> <span>{t.mobile || '-'}</span></div>
                    <div className="flex justify-between"><span>Job Title:</span> <span>{t.job_title || '-'}</span></div>
                    <div className="flex justify-between"><span>Profile Quality:</span> <Badge variant="outline" className="font-black bg-emerald-50 text-emerald-600 border-emerald-200 px-2 py-0.5 rounded-full">{score}%</Badge></div>
                  </div>
                );
              })()}
            </Card>
          </div>
        </div>
      </FormDialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">{t('confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
                {t('deleteConfirmationMessage').replace('{name}', `${selectedContact?.first_name || ""} ${selectedContact?.last_name || ""}`)}
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-xl font-bold h-12">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-black h-12 px-8"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
