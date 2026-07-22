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
import { useToast } from "@/lib/hooks/use-toast";
import { KPICard } from "@/components/dashboard/metric-card";
import type { Company } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table";
import { useI18n } from "@/components/i18n-context";
import { TranslationSchema } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Supabase & Local/Service Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useMasterData } from "@/lib/hooks/use-master-data";
import { LeadService } from "@/services/lead.service";
import { LeadForm } from "@/components/crm/LeadForm";
import { ConvertToProspectForm } from "@/components/crm/ConvertToProspectForm";

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

  // Supabase Collections — use explicit column projections to reduce over-fetching
  const { data: leadsData, isLoading } = useSupabaseCollection<any>('leads', undefined, {
    filterKey: 'leads-all',
  });
  const leads = leadsData || [];

  // Companies: need id/name/status/insurance_type/employee_count for display & duplicate check
  const { data: companiesData } = useSupabaseCollection<any>('companies', undefined, {
    select: 'id, name, status, insurance_type, employee_count, primary_contact_email, primary_contact_phone',
    filterKey: 'companies-leads-lookup',
  });
  const companies = companiesData || [];

  // Users: only need id/name for assignment dropdown
  const { data: usersData } = useSupabaseCollection<any>('users', undefined, {
    select: 'id, name, email, department, level',
    filterKey: 'users-dropdown',
  });
  const users = usersData || [];

  const { data: industriesData } = useSupabaseCollection<any>('master_industries', undefined, {
    select: 'id, name, name_ar',
    filterKey: 'master-industries',
  });
  const industries = industriesData || [];

  const { data: sourcesData } = useSupabaseCollection<any>('master_sources', undefined, {
    select: 'id, name, name_ar',
    filterKey: 'master-sources',
  });
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title={t('totalLeads') || 'Total Leads'}
          value={leads.length}
          icon={Target}
          color="purple"
          loading={isLoading}
        />
        <KPICard
          title={t('newLeads') || 'New Leads'}
          value={leads.filter((l: any) => l.status === 'new').length}
          icon={TrendingUp}
          color="green"
          loading={isLoading}
        />
        <KPICard
          title={t('highPriority') || 'High Priority'}
          value={leads.filter((l: any) => l.priority === 'high' || l.priority === 'critical').length}
          icon={AlertCircle}
          color="orange"
          loading={isLoading}
        />
        <KPICard
          title={t('converted') || 'Converted to Prospect'}
          value={companies.filter((c: any) => c.status === 'prospect').length}
          icon={CheckCircle2}
          color="blue"
          loading={isLoading}
        />
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
