'use client';
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import React, { useState, useRef } from "react";
import { Users, Building2, Edit, Trash2, User, Upload, Download, FileText, Shield, CreditCard, Landmark, MapPin, Eye, EyeOff, Layers, Search, ChevronDown, ChevronRight } from "lucide-react";
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
import { downloadCensusTemplateFile, parseExcelRowToPayload } from "@/lib/census-excel-helper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Supabase & React Query Imports
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-logger";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useQueryClient } from "@tanstack/react-query";

const CENSUS_HEADERS = [
  "Member Name", "Member Ins Code", "Staff Code", "Member TPA Code",
  "Date Of Birth", "Gender", "Relation", "Nationality", "National ID",
  "Plan Category", "Location", "Department", "Job Title", "Addition Date", "Deletion Date"
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
  const [viewMember, setViewMember] = useState<any>(null);
  const [revealBankDetails, setRevealBankDetails] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        supabase.from('users').select('*').eq('email', user.email).single().then(({ data }: any) => {
          setUserProfile(data);
        });
      }
    });
  }, []);

  const logPIIReveal = async (memberName: string, memberId: string) => {
    try {
      await logAuditEvent(null, {
        uid: userProfile?.id,
        email: userProfile?.email,
        displayName: userProfile?.name
      }, {
        action: 'REVEAL_BANK_DETAILS' as any,
        resource_type: 'member_bank_details' as any,
        resource_id: memberId,
        resource_name: memberName,
        changes: {
          field_revealed: 'bank_account_and_iban'
        }
      });
    } catch (err) {
      console.error('Failed to log reveal event:', err);
    }
  };

  React.useEffect(() => {
    setRevealBankDetails(false);
  }, [viewMember]);
  const [formData, setFormData] = useState<Omit<CensusMember, 'id' | 'created_at'>>(emptyForm);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Queries
  const { data: membersData, isLoading: isCensusLoading } = useSupabaseCollection<CensusMember>('census_members');
  const { data: companiesData } = useSupabaseCollection<Company>('companies');
  const { data: insurersData } = useSupabaseCollection<any>('insurance_companies');
  const { data: tpasData } = useSupabaseCollection<TPA>('tpas');
  const { data: deptsData } = useSupabaseCollection<any>('master_departments');
  const { data: locsData } = useSupabaseCollection<any>('master_locations');
  const { data: policiesData } = useSupabaseCollection<any>('policies');
  const { data: policyMembersData, isLoading: isPolicyMembersLoading } = useSupabaseCollection<any>('policy_members');

  const isLoading = isCensusLoading || isPolicyMembersLoading;

  const companies = companiesData || [];
  const insurers = insurersData || [];
  const tpas = tpasData || [];
  const departments = deptsData && deptsData.length > 0 ? deptsData : STATIC_DEPARTMENTS;
  const locations = locsData && locsData.length > 0 ? locsData : STATIC_LOCATIONS;

  const mappedPolicyMembers = React.useMemo(() => {
    if (!policyMembersData || !policiesData) return [];
    const policyMap = new Map(policiesData.map((p: any) => [p.id, p]));

    return policyMembersData.map((pm: any) => {
      const policy = policyMap.get(pm.policy_id);
      
      let uiRelation = pm.relation;
      if (uiRelation === 'Principal') {
        uiRelation = 'Employee';
      }

      return {
        id: `policy-member-${pm.id}`,
        member_full_name: pm.member_name || "",
        member_code: pm.member_id_insurance || "",
        member_tpa_code: pm.member_id_tpa || "",
        staff_code: pm.staff_code || "",
        national_id: pm.national_id || "",
        nationality: pm.nationality || "",
        date_of_birth: pm.date_of_birth || "",
        gender: pm.gender || "Male",
        relation: uiRelation || "Employee",
        category: pm.plan_category || "",
        branch: pm.location || "",
        area: pm.location || "",
        department: pm.department || "",
        job_title: pm.job_title || "",
        salary: 0,
        premium: 0,
        addition_date: pm.addition_date || "",
        deletion_date: pm.deletion_date || "",
        mobile_number: pm.mobile_number || "",
        notes: pm.notes || "",
        company_id: policy?.client_company_id || "",
        company_name: policy?.client_company_name || "",
        policy_number: policy?.policy_number || "",
        policy_name: policy?.policy_name || policy?.policy_number || "",
        insurance_company_name: policy?.insurer_name || "",
        insurance_company_code: policy?.insurer_policy_number || "",
        tpa_name: policy?.tpa_name || "",
        start_date: policy?.start_date || "",
        expiry_date: policy?.end_date || "",
        status: pm.status || (policy?.policy_status?.toLowerCase() === 'active' ? 'active' : 'inactive'),
        is_from_contract: true
      };
    });
  }, [policyMembersData, policiesData]);

  const members = React.useMemo(() => {
    const censusList = membersData || [];
    return [...censusList, ...mappedPolicyMembers];
  }, [membersData, mappedPolicyMembers]);

  const isReadOnly = !!selectedMember?.is_from_contract;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (policyNumber: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [policyNumber]: !prev[policyNumber]
    }));
  };

  const filteredMembersForGroup = React.useMemo(() => {
    if (!globalFilter) return members;
    const search = globalFilter.toLowerCase();
    return members.filter(m => 
      (m.member_full_name || '').toLowerCase().includes(search) ||
      (m.member_code || '').toLowerCase().includes(search) ||
      (m.national_id || '').toLowerCase().includes(search) ||
      (m.policy_number || '').toLowerCase().includes(search) ||
      (m.insurance_company_name || '').toLowerCase().includes(search) ||
      (m.company_name || '').toLowerCase().includes(search)
    );
  }, [members, globalFilter]);

  const groupedMembers = React.useMemo(() => {
    const groups: Record<string, {
      policy_number: string;
      policy_name: string;
      company_name: string;
      insurance_company_name: string;
      tpa_name: string;
      start_date: string;
      expiry_date: string;
      members: CensusMember[];
    }> = {};

    filteredMembersForGroup.forEach(member => {
      const key = member.policy_number || 'unassociated';
      if (!groups[key]) {
        groups[key] = {
          policy_number: member.policy_number || '',
          policy_name: member.policy_name || member.policy_number || '',
          company_name: member.company_name || '',
          insurance_company_name: member.insurance_company_name || '',
          tpa_name: member.tpa_name || '',
          start_date: member.start_date || '',
          expiry_date: member.expiry_date || '',
          members: []
        };
      }
      groups[key].members.push(member);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.policy_number === '') return 1;
      if (b.policy_number === '') return -1;
      return a.policy_number.localeCompare(b.policy_number);
    });
  }, [filteredMembersForGroup]);

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
    downloadCensusTemplateFile("census_template.xlsx");
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
          const safeDate = (val: any) => {
            if (!val) return null;
            if (val instanceof Date) return val.toISOString().split('T')[0];
            const d = new Date(val);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return null;
          };

          const newMembers = json.map(row => {
            const parsed = parseExcelRowToPayload(row);
            return {
              ...emptyForm,
              ...parsed,
              member_full_name: parsed.member_name || "",
              member_code: parsed.member_id_insurance || "",
              member_tpa_code: parsed.member_id_tpa || "",
              created_at: new Date().toISOString()
            };
          });

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
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground leading-none">{member.member_full_name}</p>
                {member.is_from_contract && (
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[9px] px-1.5 py-0 font-medium border-indigo-100">
                    {t('contract' as any) || "Contract"}
                  </Badge>
                )}
              </div>
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
            <p className="text-standard font-medium">{member.policy_number || '-'}</p>
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
              {member.is_from_contract ? (
                <Eye className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Edit className="w-4 h-4" />
              )}
            </Button>
            {!member.is_from_contract && (
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
            )}
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

  const GroupedView = () => {
    if (groupedMembers.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title={t('noResultsFound' as any) || "No results found"}
          description={t('tryAdjustingSearch' as any) || "Try adjusting your search terms."}
        />
      );
    }

    return (
      <div className="space-y-6">
        {groupedMembers.map(group => {
          const isUnassociated = !group.policy_number;
          const groupKey = group.policy_number || 'unassociated';
          const isExpanded = expandedGroups[groupKey] !== false;

          return (
            <Card key={groupKey} className="border border-border/85 shadow-sm overflow-hidden bg-card hover:shadow-md transition-shadow duration-300">
              {/* Group Header Card */}
              <div 
                className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors duration-200"
                onClick={() => toggleGroup(groupKey)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
                  )}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                    isUnassociated 
                      ? "bg-slate-100 text-slate-500" 
                      : "bg-indigo-50 text-indigo-600 border border-indigo-100/50"
                  )}>
                    {isUnassociated ? <User className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground flex items-center gap-2 text-sm md:text-base">
                      {isUnassociated 
                        ? (t('unassociatedMembers' as any) || "Standalone Members") 
                        : `${t('policy' as any) || 'Policy'}: ${group.policy_name}`}
                      {!isUnassociated && (
                        <Badge variant="outline" className="bg-indigo-50/30 text-indigo-700 border-indigo-100 text-[10px] font-semibold">
                          {group.policy_number}
                        </Badge>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isUnassociated 
                        ? (t('membersNotLinkedToContract' as any) || "Members uploaded directly or not associated with any contract")
                        : `${t('clientCompany' as any) || 'Client'}: ${group.company_name}`}
                    </p>
                  </div>
                </div>

                {!isUnassociated && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground bg-background px-3 py-2 rounded-lg border border-border/60">
                    <div>
                      <span className="font-medium text-foreground">{t('insurer' as any) || "Insurer"}:</span> {group.insurance_company_name}
                    </div>
                    {group.tpa_name && (
                      <div>
                        <span className="font-medium text-foreground">TPA:</span> {group.tpa_name}
                      </div>
                    )}
                    {(group.start_date || group.expiry_date) && (
                      <div>
                        <span className="font-medium text-foreground">{t('validity' as any) || "Validity"}:</span> {group.start_date || '-'} {t('to' as any) || 'to'} {group.expiry_date || '-'}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 self-start md:self-center">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 font-bold border-none text-[11px] px-2.5 py-0.5">
                    {group.members.length} {group.members.length === 1 ? t('member' as any) || 'Member' : t('members' as any) || 'Members'}
                  </Badge>
                </div>
              </div>

              {/* Group Body Table */}
              {isExpanded && (
                <div className="overflow-x-auto border-t border-border/40">
                  <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-6">{t('member' as any) || "Member"}</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('relation' as any) || "Relation"}</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('department' as any) || "Department"}</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('status' as any) || "Status"}</th>
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">{t('action' as any) || "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {group.members.map(member => (
                      <tr 
                        key={member.id} 
                        className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 cursor-pointer transition-colors duration-150"
                        onClick={() => setViewMember(member)}
                      >
                        <td className="p-3 ps-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-foreground">{member.member_full_name}</p>
                                {member.is_from_contract && (
                                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[9px] px-1.5 py-0 font-medium border-indigo-100">
                                    {t('contract' as any) || "Contract"}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{member.member_code || member.national_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="bg-background">{member.relation}</Badge>
                        </td>
                        <td className="p-3 text-standard">{member.department || '-'}</td>
                        <td className="p-3">
                          <StatusBadge status={member.status || 'active'} />
                        </td>
                        <td className="p-3 text-right pe-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                              {member.is_from_contract ? (
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Edit className="w-4 h-4" />
                              )}
                            </Button>
                            {!member.is_from_contract && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-red-700"
                                onClick={() => { 
                                  setSelectedMember(member);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

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
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="relative w-full sm:max-w-xs">
                  <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                  <Input
                    placeholder={t('searchCensusPlaceholder' as any) || "Search by name, ID, or policy..."}
                    value={globalFilter ?? ''}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className={cn("h-10 bg-card border-border shadow-sm", isRtl ? "pr-10" : "pl-10")}
                  />
                </div>
                
                {/* View Mode Toggle Buttons */}
                <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/80 self-end sm:self-auto shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs font-semibold gap-1.5 transition-all duration-200",
                      viewMode === 'flat' 
                        ? "bg-background text-foreground shadow-sm hover:bg-background" 
                        : "text-muted-foreground hover:bg-transparent hover:text-foreground"
                    )}
                    onClick={() => setViewMode('flat')}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {t('listView' as any) || "List View"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs font-semibold gap-1.5 transition-all duration-200",
                      viewMode === 'grouped' 
                        ? "bg-background text-foreground shadow-sm hover:bg-background" 
                        : "text-muted-foreground hover:bg-transparent hover:text-foreground"
                    )}
                    onClick={() => setViewMode('grouped')}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {t('groupedByContract' as any) || "Group by Contract"}
                  </Button>
                </div>
              </div>

              {viewMode === 'flat' ? (
                <DataTable
                  table={table}
                  columns={columns}
                  isLoading={isLoading}
                  searchPlaceholder={t('searchCensusPlaceholder' as any) || "Search by name, ID, or policy..."}
                  onRowClick={(row) => setViewMember(row)}
                  globalFilter={globalFilter}
                  setGlobalFilter={setGlobalFilter}
                  hideSearch={true}
                />
              ) : (
                <GroupedView />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={isReadOnly ? (t('viewMemberProfile' as any) || "View Member Profile") : (selectedMember ? (t('editMemberProfile' as any) || "Edit Member Profile") : (t('enrollNewMember' as any) || "Enroll New Member"))}
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
                <Select disabled={isReadOnly} value={formData.company_id} onValueChange={(v) => { const c = companies.find(x => x.id === v); setFormData({...formData, company_id: v, company_name: c?.name || ""}) }}>
                  <SelectTrigger><SelectValue placeholder={t('selectClient' as any) || "Select Client"} /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('insurerName' as any) || "Insurer Name"}</Label>
                <Select disabled={isReadOnly} value={formData.insurance_company_name} onValueChange={(v) => { const i = insurers.find(x => x.companyName === v || x.name === v); setFormData({...formData, insurance_company_name: v, insurance_company_code: i?.companyCode || i?.code || ""}) }}>
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
                <Select disabled={isReadOnly} value={formData.insurance_line} onValueChange={(v) => setFormData({...formData, insurance_line: v})}>
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
                <Input disabled={isReadOnly} value={formData.policy_name} onChange={e => setFormData({...formData, policy_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('policyNumber' as any) || "Policy Number"}</Label>
                <Input disabled={isReadOnly} value={formData.policy_number} onChange={e => setFormData({...formData, policy_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('tpaName' as any) || "TPA Name"}</Label>
                <Select disabled={isReadOnly} value={formData.tpa_name} onValueChange={(v) => setFormData({...formData, tpa_name: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectTpa' as any) || "Select TPA"} /></SelectTrigger>
                  <SelectContent>{tpas.map(tOption => <SelectItem key={tOption.id} value={tOption.name}>{tOption.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('startDate' as any) || "Start Date"}</Label>
                <Input disabled={isReadOnly} type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('expiryDate' as any) || "Expiry Date"}</Label>
                <Input disabled={isReadOnly} type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
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
                <Input disabled={isReadOnly} value={formData.member_full_name} onChange={e => setFormData({...formData, member_full_name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{t('gender' as any) || "Gender"}</Label>
                <Select disabled={isReadOnly} value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('dateOfBirth' as any) || "Date of Birth"}</Label>
                <Input disabled={isReadOnly} type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('nationality' as any) || "Nationality"}</Label>
                <Input disabled={isReadOnly} value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('nationalId' as any) || "National ID"}</Label>
                <Input disabled={isReadOnly} value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('memberInsCode' as any) || "Member Ins Code"}</Label>
                <Input disabled={isReadOnly} value={formData.member_code} onChange={e => setFormData({...formData, member_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('staffCode' as any) || "Staff Code"}</Label>
                <Input disabled={isReadOnly} value={formData.staff_code} onChange={e => setFormData({...formData, staff_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('memberTpaCode' as any) || "Member TPA Code"}</Label>
                <Input disabled={isReadOnly} value={formData.member_tpa_code} onChange={e => setFormData({...formData, member_tpa_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('headFamilyCode' as any) || "Head of Family Code"}</Label>
                <Input disabled={isReadOnly} value={formData.head_family_code} onChange={e => setFormData({...formData, head_family_code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('relation' as any) || "Relation"}</Label>
                <Select disabled={isReadOnly} value={formData.relation} onValueChange={(v) => setFormData({...formData, relation: v})}>
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
                <Input disabled={isReadOnly} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. VIP, A, B" />
              </div>
              <div className="space-y-2">
                <Label>{t('mobileNumber' as any) || "Mobile Number"}</Label>
                <Input disabled={isReadOnly} value={formData.mobile_number} onChange={e => setFormData({...formData, mobile_number: e.target.value})} />
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
                <Select disabled={isReadOnly} value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectDepartment' as any) || "Select Department"} /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('jobTitle' as any) || "Job Title"}</Label>
                <Input disabled={isReadOnly} value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('branch' as any) || "Branch"}</Label>
                <Input disabled={isReadOnly} value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('areaLocation' as any) || "Area / Location"}</Label>
                <Select disabled={isReadOnly} value={formData.area} onValueChange={(v) => setFormData({...formData, area: v})}>
                  <SelectTrigger><SelectValue placeholder={t('selectLocation' as any) || "Select Location"} /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l: any) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('salary' as any) || "Salary"}</Label>
                <Input disabled={isReadOnly} type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{t('monthlyPremium' as any) || "Monthly Premium"}</Label>
                <Input disabled={isReadOnly} type="number" value={formData.premium} onChange={e => setFormData({...formData, premium: Number(e.target.value)})} />
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
                <Input disabled={isReadOnly} type="date" value={formData.addition_date} onChange={e => setFormData({...formData, addition_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t('deletionDate' as any) || "Deletion Date"}</Label>
                <Input disabled={isReadOnly} type="date" value={formData.deletion_date} onChange={e => setFormData({...formData, deletion_date: e.target.value})} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t('notes' as any) || "Notes"}</Label>
                <Textarea disabled={isReadOnly} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            {isReadOnly ? (
              <Button type="button" onClick={() => setDialogOpen(false)}>{t('close' as any) || "Close"}</Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel' as any) || "Cancel"}</Button>
                <Button type="submit" className="bg-primary hover:bg-indigo-700 shadow-md">
                  {selectedMember ? (t('updateRecord' as any) || "Update Record") : (t('createRecord' as any) || "Create Record")}
                </Button>
              </>
            )}
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

      {viewMember && (
        <Dialog open={!!viewMember} onOpenChange={() => setViewMember(null)}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" /> Member Details
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Full Name English</p><p className="text-sm font-bold text-slate-900">{viewMember.member_full_name || viewMember.member_name}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Full Name Arabic</p><p className="text-sm font-bold text-slate-900">{viewMember.full_name_arabic || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Relation</p><p className="text-sm font-bold text-slate-900">{viewMember.relation}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Staff ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.staff_code || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Insured ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.member_code || viewMember.member_id_insurance || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Individual ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.member_tpa_code || viewMember.member_id_tpa || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Principle ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.principle_id || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">National ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.national_id || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Date of Birth</p><p className="text-sm font-bold text-slate-900">{viewMember.date_of_birth || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Gender</p><p className="text-sm font-bold text-slate-900">{viewMember.gender || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">PLAN</p><p className="text-sm font-bold text-slate-900">{viewMember.plan_category || viewMember.category || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Mobile Number</p><p className="text-sm font-bold text-slate-900">{viewMember.mobile_number || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Marital Status</p><p className="text-sm font-bold text-slate-900">{viewMember.marital_status || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Nationality</p><p className="text-sm font-bold text-slate-900">{viewMember.nationality || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Location</p><p className="text-sm font-bold text-slate-900">{viewMember.location || viewMember.branch || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Department</p><p className="text-sm font-bold text-slate-900">{viewMember.department || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Job Title</p><p className="text-sm font-bold text-slate-900">{viewMember.job_title || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Bank Name</p><p className="text-sm font-bold text-slate-900">{viewMember.bank_name || "-"}</p></div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  Bank Account
                  {viewMember.bank_account && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const nextReveal = !revealBankDetails;
                        setRevealBankDetails(nextReveal);
                        if (nextReveal) {
                          logPIIReveal(viewMember.member_full_name || viewMember.member_name || viewMember.name, viewMember.id);
                        }
                      }} 
                      className="text-slate-400 hover:text-slate-600 focus:outline-none ml-1"
                    >
                      {revealBankDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}
                </p>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {viewMember.bank_account ? (revealBankDetails ? viewMember.bank_account : `•••• •••• ${viewMember.bank_account.slice(-4)}`) : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase">IBAN</p>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {viewMember.iban ? (revealBankDetails ? viewMember.iban : `${viewMember.iban.slice(0, 4)} •••• •••• ${viewMember.iban.slice(-4)}`) : "-"}
                </p>
              </div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Addition Date</p><p className="text-sm font-bold text-slate-900">{viewMember.addition_date || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Deletion Date</p><p className="text-sm font-bold text-slate-900">{viewMember.deletion_date || "-"}</p></div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewMember(null)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
