'use client';
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useRef } from "react";
import { Users, Building2, Edit, Trash2, User, Upload, Download, FileText, Shield, CreditCard, Landmark, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/lib/hooks/use-toast";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import type { CensusMember, Company, InsuranceCompany, TPA } from "@/lib/types";
import * as XLSX from 'xlsx';
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";

// Supabase & React Query Imports
import { supabase } from "@/lib/supabase";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useQueryClient } from "@tanstack/react-query";

const CENSUS_HEADERS = [
  "Insurance Company Name", "Insurance company Code", "insurance line", "Policy Name", "Policy Number", 
  "TPA Name", "Start Date", "Expiry Date", "Member Ins Code", "Staff Code", "Member TPA Code", "Head Family Code", 
  "Member Full Name", "Nationality", "National ID", "Date Of Birth", "Gender", "Relation", 
  "Category", "Branch", "Area", "Department", "Job Title", "Salary", "Premium", 
  "Addition Date", "Deletion Date", "Mobile Number", "Notes"
];

const emptyForm: Omit<CensusMember, 'id' | 'created_at'> = {
  insurance_company_name: "",
  insurance_company_code: "",
  insurance_line: "Medical",
  policy_name: "",
  policy_number: "",
  tpa_name: "",
  start_date: "",
  expiry_date: "",
  member_code: "",
  staff_code: "",
  member_tpa_code: "",
  head_family_code: "",
  member_full_name: "",
  nationality: "",
  national_id: "",
  date_of_birth: "",
  gender: "Male",
  relation: "Employee",
  category: "A",
  branch: "",
  area: "",
  department: "",
  job_title: "",
  salary: 0,
  premium: 0,
  addition_date: "",
  deletion_date: "",
  mobile_number: "",
  notes: "",
  company_id: "",
  company_name: "",
  status: "active"
};

const STATIC_DEPARTMENTS = [
  { id: "1", name: "HR" },
  { id: "2", name: "Finance" },
  { id: "3", name: "Operations" },
  { id: "4", name: "IT & Tech" },
  { id: "5", name: "Sales & Marketing" }
];

const STATIC_LOCATIONS = [
  { id: "1", name: "Cairo" },
  { id: "2", name: "Alexandria" },
  { id: "3", name: "Giza" },
  { id: "4", name: "Tanta" }
];

export default function Census() {
  const { t, isRtl, lang } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CensusMember | null>(null);
  const [formData, setFormData] = useState<Omit<CensusMember, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Queries
  const { data: membersData, isLoading } = useSupabaseCollection<CensusMember>('census_members');
  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const { data: insurersData } = useSupabaseCollection<any>('insurance_companies');
  const { data: tpasData } = useSupabaseCollection<TPA>('tpas');
  const { data: deptsData } = useSupabaseCollection<any>('master_departments');
  const { data: locsData } = useSupabaseCollection<any>('master_locations');

  const members = membersData || [];
  const companies = companiesData || [];
  const insurers = insurersData || [];
  const tpas = tpasData || [];
  const departments = deptsData && deptsData.length > 0 ? deptsData : STATIC_DEPARTMENTS;
  const locations = locsData && locsData.length > 0 ? locsData : STATIC_LOCATIONS;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedMember(null);
  };

  const handleEdit = (member: CensusMember) => {
    setSelectedMember(member);
    const { id, created_at, ...rest } = member;
    setFormData({ ...emptyForm, ...rest });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        const memberData = {
            ...formData,
            created_at: selectedMember?.created_at || new Date().toISOString()
        };
        if (selectedMember) {
            const { error } = await supabase
              .from("census_members")
              .update(memberData)
              .eq("id", selectedMember.id);

            if (error) throw error;
            toast({ title: t('memberRecordUpdated' as any) || "Member record updated" });
        } else {
            const { error } = await supabase
              .from("census_members")
              .insert(sanitizeUUIDs(memberData));

            if (error) throw error;
            toast({ title: t('memberRecordCreated' as any) || "Member record created" });
        }
        queryClient.invalidateQueries({ queryKey: ['supabase', 'census_members'] });
        setDialogOpen(false);
        resetForm();
    } catch(error: any) {
        console.error("Error submitting form: ", error);
        toast({ title: t('syncFailed' as any) || "An error occurred.", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (selectedMember) {
      try {
        const { error } = await supabase
          .from("census_members")
          .delete()
          .eq("id", selectedMember.id);

        if (error) throw error;
        toast({ title: t('memberDeletedSuccessfully' as any) || "Member deleted successfully" });
        queryClient.invalidateQueries({ queryKey: ['supabase', 'census_members'] });
      } catch (error: any) {
        toast({ title: t('syncFailed' as any) || "An error occurred while deleting.", description: error.message, variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
    setSelectedMember(null);
  }

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([CENSUS_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Census Template");
    XLSX.writeFile(wb, "census_template.xlsx");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          toast({ variant: 'destructive', title: t('uploadFailed' as any) || 'Upload Failed', description: 'The Excel sheet is empty.' });
          return;
        }

        try {
          const newMembers = json.map(row => ({
            ...emptyForm,
            insurance_company_name: row["Insurance Company Name"] || "",
            insurance_company_code: row["Insurance company Code"] || "",
            insurance_line: row["insurance line"] || "Medical",
            policy_name: row["Policy Name"] || "",
            policy_number: row["Policy Number"] || "",
            tpa_name: row["TPA Name"] || "",
            start_date: row["Start Date"] || "",
            expiry_date: row["Expiry Date"] || "",
            member_code: row["Member Ins Code"] || "",
            staff_code: row["Staff Code"] || "",
            member_tpa_code: row["Member TPA Code"] || "",
            head_family_code: row["Head Family Code"] || "",
            member_full_name: row["Member Full Name"] || "",
            nationality: row["Nationality"] || "",
            national_id: row["National ID"] || "",
            date_of_birth: row["Date Of Birth"] || "",
            gender: row["Gender"] || "Male",
            relation: row["Relation"] || "Employee",
            category: row["Category"] || "",
            branch: row["Branch"] || "",
            area: row["Area"] || "",
            department: row["Department"] || "",
            job_title: row["Job Title"] || "",
            salary: Number(row["Salary"]) || 0,
            premium: Number(row["Premium"]) || 0,
            addition_date: row["Addition Date"] || "",
            deletion_date: row["Deletion Date"] || "",
            mobile_number: row["Mobile Number"] || "",
            notes: row["Notes"] || "",
            created_at: new Date().toISOString()
          }));

          const { error } = await supabase
            .from("census_members")
            .insert(sanitizeUUIDs(newMembers));

          if (error) throw error;
          
          toast({ title: t('uploadSuccessful' as any) || "Upload Successful", description: `${json.length} records processed.` });
          queryClient.invalidateQueries({ queryKey: ['supabase', 'census_members'] });
        } catch (error: any) {
          console.error("Error uploading census data: ", error);
          toast({ 
            variant: 'destructive', 
            title: t('uploadFailed' as any) || 'Upload Failed', 
            description: error.message || 'Verify formatting and try again.' 
          });
        }
      };
      reader.readAsBinaryString(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const columns = [
    {
      header: t('member' as any) || "Member",
      accessorKey: "member_full_name",
      cell: ({row}: any) => {
        const member = row.original as CensusMember;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground leading-none">{member.member_full_name}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">{member.member_code || member.national_id}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: t('policyPlan' as any) || "Policy & Plan",
      accessorKey: "policy_number",
      cell: ({row}: any) => {
        const member = row.original as CensusMember;
        return (
          <div>
            <p className="text-standard">{member.policy_number || '-'}</p>
            <p className="text-xs text-muted-foreground">{member.insurance_company_name}</p>
          </div>
        )
      }
    },
    {
      header: t('relation' as any) || "Relation",
      accessorKey: "relation",
      cell: ({row}: any) => <Badge variant="outline" className="bg-background">{row.original.relation}</Badge>
    },
    {
      header: t('department' as any) || "Department",
      accessorKey: "department",
      cell: ({row}: any) => row.original.department || '-'
    },
    {
      header: t('status') || "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status || 'active'} />
    },
    {
      id: "actions",
      header: t('action' as any) || "Actions",
      cell: ({row}: any) => {
        const member = row.original as CensusMember;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(member); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedMember(member);
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
      data: members,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      autoResetPageIndex: false,
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      onGlobalFilterChange: setGlobalFilter,
      getFilteredRowModel: getFilteredRowModel(),
      state: { sorting, globalFilter },
  });

  return (
    <div>
      <PageHeader
        title={t('censusDatabase' as any) || "Census Database"}
        actionLabel={t('addMember' as any) || "Add Member"}
        onAction={() => { resetForm(); setDialogOpen(true); }}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" />
        <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
          <Download className="h-4 w-4" /> {t('template' as any) || "Template"}
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" /> {t('upload' as any) || "Upload"}
        </Button>
      </PageHeader>

      <Card className="border-none shadow-sm">
        <CardContent className="p-6">
          {members.length === 0 && !isLoading ? (
            <EmptyState
              icon={Users}
              title={t('noMembersYet' as any) || "No members yet"}
              onAction={() => { resetForm(); setDialogOpen(true); }}
              actionLabel={t('addMember' as any) || "Add Member"}
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder={t('searchCensusPlaceholder' as any) || "Search by name, ID, or policy..."}
              onRowClick={handleEdit}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedMember ? (t('editMemberProfile' as any) || "Edit Member Profile") : (t('enrollNewMember' as any) || "Enroll New Member")}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8 p-1">
          {/* Section 1: Insurance & Policy Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" /> {t('insurancePolicyInfo' as any) || "Insurance & Policy Information"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('clientCompany' as any) || "Client Company"} *</Label>
                <Select value={formData.company_id} onValueChange={(v) => { const c = companies.find(x => x.id === v); setFormData({...formData, company_id: v, company_name: c?.name || ""}) }}>
                  <SelectTrigger><SelectValue placeholder={t('selectClient' as any) || "Select Client"} /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('insurerName' as any) || "Insurer Name"}</Label>
                <Select value={formData.insurance_company_name} onValueChange={(v) => { const i = insurers.find(x => x.companyName === v || x.name === v); setFormData({...formData, insurance_company_name: v, insurance_company_code: i?.companyCode || i?.code || ""}) }}>
                  <SelectTrigger><SelectValue placeholder={t('selectInsurer' as any) || "Select Insurer"} /></SelectTrigger>
                  <SelectContent>{insurers.map(i => <SelectItem key={i.id} value={i.companyName || i.name}>{i.companyName || i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('insurerCode' as any) || "Insurer Code"}</Label>
                <Input value={formData.insurance_company_code} readOnly disabled className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>{t('insuranceLine' as any) || "Insurance Line"}</Label>
                <Select value={formData.insurance_line} onValueChange={(v) => setFormData({...formData, insurance_line: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Life">Life</SelectItem>
                    <SelectItem value="Motor">Motor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('policyName' as any) || "Policy Name"}</Label>
                <Input value={formData.policy_name} onChange={e => setFormData({...formData, policy_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('policyNumber' as any) || "Policy Number"}</Label>
                <Input value={formData.policy_number} onChange={e => setFormData({...formData, policy_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('tpaName' as any) || "TPA Name"}</Label>
                <Select value={formData.tpa_name} onValueChange={(v) => setFormData({...formData, tpa_name: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectTpa' as any) || "Select TPA"} /></SelectTrigger>
                  <SelectContent>{tpas.map(tOption => <SelectItem key={tOption.id} value={tOption.name}>{tOption.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('startDate' as any) || "Start Date"}</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('expiryDate' as any) || "Expiry Date"}</Label>
                <Input type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Personal Identification */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" /> {t('personalIdentification' as any) || "Personal Identification"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>{t('memberFullName' as any) || "Member Full Name"} *</Label>
                <Input value={formData.member_full_name} onChange={e => setFormData({...formData, member_full_name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{t('gender' as any) || "Gender"}</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('dateOfBirth' as any) || "Date of Birth"}</Label>
                <Input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('nationality' as any) || "Nationality"}</Label>
                <Input value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('nationalId' as any) || "National ID"}</Label>
                <Input value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('memberInsCode' as any) || "Member Ins Code"}</Label>
                <Input value={formData.member_code} onChange={e => setFormData({...formData, member_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('staffCode' as any) || "Staff Code"}</Label>
                <Input value={formData.staff_code} onChange={e => setFormData({...formData, staff_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('memberTpaCode' as any) || "Member TPA Code"}</Label>
                <Input value={formData.member_tpa_code} onChange={e => setFormData({...formData, member_tpa_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('headFamilyCode' as any) || "Head of Family Code"}</Label>
                <Input value={formData.head_family_code} onChange={e => setFormData({...formData, head_family_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('relation' as any) || "Relation"}</Label>
                <Select value={formData.relation} onValueChange={(v) => setFormData({...formData, relation: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Child">Child</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('categoryClass' as any) || "Category/Class"}</Label>
                <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. VIP, A, B" />
              </div>
              <div className="space-y-2">
                <Label>{t('mobileNumber' as any) || "Mobile Number"}</Label>
                <Input value={formData.mobile_number} onChange={e => setFormData({...formData, mobile_number: e.target.value})} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Employment & Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-500" /> {t('employmentLocation' as any) || "Employment & Location"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('department' as any) || "Department"}</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectDepartment' as any) || "Select Department"} /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('jobTitle' as any) || "Job Title"}</Label>
                <Input value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('branch' as any) || "Branch"}</Label>
                <Input value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('areaLocation' as any) || "Area / Location"}</Label>
                <Select value={formData.area} onValueChange={(v) => setFormData({...formData, area: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectLocation' as any) || "Select Location"} /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l: any) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('salary' as any) || "Salary"}</Label>
                <Input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{t('monthlyPremium' as any) || "Monthly Premium"}</Label>
                <Input type="number" value={formData.premium} onChange={e => setFormData({...formData, premium: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 4: Operational Dates & Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" /> {t('enrollmentLifecycle' as any) || "Enrollment Lifecycle"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('additionDate' as any) || "Addition Date"}</Label>
                <Input type="date" value={formData.addition_date} onChange={e => setFormData({...formData, addition_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('deletionDate' as any) || "Deletion Date"}</Label>
                <Input type="date" value={formData.deletion_date} onChange={e => setFormData({...formData, deletion_date: e.target.value})} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('notes' as any) || "Notes"}</Label>
                <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel' as any) || "Cancel"}</Button>
            <Button type="submit" className="bg-primary hover:bg-indigo-700 shadow-md">
              {selectedMember ? (t('updateRecord' as any) || "Update Record") : (t('createRecord' as any) || "Create Record")}
            </Button>
          </div>
        </form>
      </FormDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteMemberRecord' as any) || "Delete Member Record"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteMemberConfirm' as any) || "Are you sure you want to remove"} "{selectedMember?.member_full_name}" {t('fromDatabasePermanent' as any) || "from the database? This action is permanent."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel' as any) || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('deletePermanently' as any) || "Delete Permanently"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
