'use client';

import React, { useState, useRef, useMemo } from "react";
import { 
  Users, 
  FileText, 
  User, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Landmark,
  Shield,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/lib/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth-provider";
import { logAuditEvent } from "@/lib/audit-logger";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { cn, getCleanStorageUrl } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";
import { validateMemberAddition, calculateAge, validateNationalID } from "@/lib/endorsement-validation";
import { downloadCensusTemplateFile, parseExcelRowToPayload } from "@/lib/census-excel-helper";

// Empty form object matching client portal schema
const emptyForm = {
  member_name: "",
  member_id_insurance: "",
  staff_code: "",
  member_id_tpa: "",
  date_of_birth: "",
  gender: "Male",
  relation: "Employee",
  nationality: "Egyptian",
  national_id: "",
  plan_category: "",
  location: "",
  department: "",
  job_title: "",
  mobile_number: "",
  notes: "",
  linked_main_member_id: "",
  full_name_arabic: "",
  marital_status: "Single",
  bank_name: "",
  bank_account: "",
  iban: "",
  principle_id: ""
};

const LOCAL_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    censusPortal: "Census Portal",
    activeContract: "Active Contract",
    insurer: "Insurer",
    validity: "Contract Validity",
    startInsurance: "Start of Insurance",
    additions: "Additions",
    deletions: "Deletions",
    currentActive: "Current Active",
    members: "Members",
    requests: "Requests",
    searchPlaceholder: "Search by name, ID...",
    downloadCensus: "Download Census",
    downloadAdditions: "Download Additions",
    downloadDeletions: "Download Deletions",
    activeInsuredMembers: "Active Insured Members",
    activeInsuredDesc: "View and filter all currently active insured members under this contract.",
    pendingRequests: "Pending Requests",
    pendingRequestsDesc: "Track your pending member addition and deletion requests.",
    noActiveMembers: "No active census members match your filter query.",
    noPendingRequests: "No pending addition or deletion requests registered.",
    name: "Name",
    relation: "Relation",
    planCategory: "Plan Category",
    department: "Department",
    requestCancellation: "Request Cancellation",
    memberName: "Member Name",
    requestType: "Request Type",
    endorsementRef: "Endorsement Ref",
    dateSubmitted: "Date Submitted",
    status: "Status",
    additionRequest: "Addition",
    cancellationRequest: "Cancellation",
    pendingReview: "Pending Review",
    undoDeletion: "Undo Deletion",
    unassociatedAccount: "Unassociated Account",
    unassociatedDesc: "Your account is not linked to any active policy contract. Please contact our support team to activate your Client Portal.",
    loading: "Loading portal data...",
    cancel: "Cancel",
    confirmRequest: "Confirm Request",
    requestMemberAdditions: "Request Membership Additions",
    additionsDesc: "",
    singleAddition: "Single Addition",
    bulkExcelUpload: "Bulk Excel Upload",
    fullName: "Full Name English *",
    nationalId: "National ID / Passport *",
    dob: "Date Of Birth *",
    gender: "Gender *",
    relationLabel: "Relation *",
    planLabel: "Plan / Class *",
    mobileNumber: "Mobile Number *",
    linkedMain: "Linked Main Member (Employee) *",
    nationality: "Nationality",
    location: "Location",
    jobTitle: "Job Title",
    staffCode: "Staff Code",
    submitRequest: "Submit Request",
    uploadExcel: "Upload Excel Spreadsheet",
    excelDesc: "Drag and drop your membership spreadsheet file here, or click to browse. Supports Excel formats (.xlsx, .xls).",
    downloadTemplate: "Download Template",
    chooseFile: "Choose File",
    reversalConfirm: "Warning: The deletion will be applied after 48 hours. You can reverse the deletion within this time, but after 48 hours, the deletion cannot be reversed.",
    reversalTitle: "Request Membership Cancellation",
    reversingMultiple: "You are requesting cancellation for {count} members:",
    age: "Age",
    yrs: "yrs",
    employee: "Employee",
    spouse: "Spouse",
    child: "Child",
    male: "Male",
    female: "Female",
    addMember: "Add Member"
  },
  ar: {
    censusPortal: "بوابة جدول الأعضاء",
    activeContract: "وثيقة التأمين السارية",
    insurer: "شركة التأمين",
    validity: "سريان الوثيقة",
    startInsurance: "عدد الأعضاء عند بدء التغطية",
    additions: "حركات الإضافة",
    deletions: "حركات الحذف",
    currentActive: "إجمالي المؤمن عليهم الحاليين",
    members: "مؤمن عليه",
    requests: "حركات",
    searchPlaceholder: "البحث بالاسم أو كود المؤمن عليه...",
    downloadCensus: "تحميل قائمة المؤمن عليهم",
    downloadAdditions: "تحميل حركات الإضافة",
    downloadDeletions: "تحميل حركات الإلغاء",
    activeInsuredMembers: "جدول الأعضاء المؤمن عليهم الحاليين",
    activeInsuredDesc: "عرض وتصفية جميع الأعضاء المؤمن عليهم الحاليين تحت هذه الوثيقة.",
    pendingRequests: "الطلبات المعلقة",
    pendingRequestsDesc: "متابعة طلبات الإضافة والحذف المعلقة الخاصة بكم.",
    noActiveMembers: "لا توجد سجلات مطابقة في جدول الأعضاء.",
    noPendingRequests: "لا توجد طلبات معلقة قيد المعالجة.",
    name: "الاسم الكامل",
    relation: "درجة القرابة",
    planCategory: "الفئة التأمينية",
    department: "الإدارة / القسم",
    requestCancellation: "طلب إلغاء تغطية",
    memberName: "اسم المؤمن عليه",
    requestType: "نوع الحركة",
    endorsementRef: "رقم الملحق",
    dateSubmitted: "تاريخ تقديم الطلب",
    status: "حالة المعاملة",
    additionRequest: "إضافة",
    cancellationRequest: "إلغاء",
    pendingReview: "قيد الدراسة / المعالجة",
    undoDeletion: "التراجع عن حركة الحذف",
    unassociatedAccount: "حساب مستخدم غير مرتبط بوثيقة تأمين",
    unassociatedDesc: "حسابكم غير مرتبط بأي وثيقة تأمين سارية حالياً. يرجى التواصل مع إدارة العمليات لتفعيل بوابتكم.",
    loading: "جاري تحميل البيانات...",
    cancel: "إلغاء",
    confirmRequest: "تأكيد الطلب وإرساله",
    requestMemberAdditions: "طلب إضافة أعضاء لجدول التأمين",
    additionsDesc: "",
    singleAddition: "إضافة عضو واحد",
    bulkExcelUpload: "تحميل جماعي عبر ملف إكسل",
    fullName: "الاسم رباعي باللغة الإنجليزية *",
    nationalId: "الرقم القومي / رقم جواز السفر *",
    dob: "تاريخ الميلاد *",
    gender: "النوع *",
    relationLabel: "صلة القرابة *",
    planLabel: "الفئة التأمينية المطلوبة *",
    mobileNumber: "رقم الهاتف المحمول *",
    linkedMain: "كود الموظف الرئيسي المرتبط (للتابعين) *",
    nationality: "الجنسية",
    location: "الفرع / الموقع",
    jobTitle: "المسمى الوظيفي",
    staffCode: "كود الموظف",
    submitRequest: "تقديم الطلب",
    uploadExcel: "رفع القائمة عبر ملف إكسل",
    excelDesc: "اسحب وأسقط ملف إكسل هنا، أو انقر للتصفح. يدعم صيغ (.xlsx, .xls).",
    downloadTemplate: "تحميل نموذج الإكسل المعتمد",
    chooseFile: "اختيار ملف إكسل",
    reversalConfirm: "تحذير: سيتم إلغاء التغطية التأمينية للعضو بعد 48 ساعة من تقديم الطلب. يمكنكم التراجع عن الطلب خلال هذه الفترة. بعد فوات 48 ساعة، سيتم إصدار ملحق الإلغاء النهائي ولا يمكن التراجع.",
    reversalTitle: "طلب إلغاء تغطية تأمينية",
    reversingMultiple: "أنت تقوم بطلب إلغاء التغطية لـ {count} أعضاء:",
    age: "السن",
    yrs: "سنة",
    employee: "موظف",
    spouse: "زوج / زوجة",
    child: "ابن / ابنة",
    male: "ذكر",
    female: "أنثى",
    addMember: "إضافة عضو جديد"
  }
};

export default function ClientCensusPage() {
  const { lang, t, isRtl } = useI18n();
  const tr = (key: keyof typeof LOCAL_TRANSLATIONS['en']) => {
    const val = LOCAL_TRANSLATIONS[lang === 'ar' ? 'ar' : 'en'][key];
    return val !== undefined ? val : key;
  };

  const translateRelation = (rel: string) => {
    const r = (rel || '').toLowerCase();
    if (r === 'employee' || r === 'principal') return tr('employee');
    if (r === 'spouse') return tr('spouse');
    if (r === 'child') return tr('child');
    return rel;
  };

  const translateGender = (gender: string) => {
    const g = (gender || '').toLowerCase();
    if (g === 'male') return tr('male');
    if (g === 'female') return tr('female');
    return gender;
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    activeCensus: true,
    pendingRequests: true
  });

  const [formData, setFormData] = useState(emptyForm);
  const [viewMember, setViewMember] = useState<any>(null);
  const [bulkErrors, setBulkErrors] = useState<any[]>([]);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(false);

  const logPIIReveal = async (memberName: string, memberId: string) => {
    try {
      await logAuditEvent(null, {
        uid: authUser?.id,
        email: authUser?.email,
        displayName: authUser?.user_metadata?.full_name || authUser?.email || ""
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
    setShowBankDetails(false);
  }, [viewMember, selectedMember]);

  const getRemainingHours = (createdAtStr: string) => {
    if (!createdAtStr) return 0;
    const created = new Date(createdAtStr);
    if (isNaN(created.getTime())) return 0;
    const now = new Date();
    const diffMs = created.getTime() + 48 * 60 * 60 * 1000 - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return diffHours > 0 ? diffHours : 0;
  };
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 1. Fetch Client Profile (to get linked policy_id and company_id)
  const { data: clientProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['clientProfile', authUser?.email],
    queryFn: async () => {
      if (!authUser?.email) return null;
      const { data, error } = await supabase
        .from('users')
        .select('policy_id, company_id')
        .ilike('email', authUser.email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!authUser?.email
  });

  const policyId = clientProfile?.policy_id;

  // 2. Fetch Policies (single policy or list associated with the user account or company)
  const { data: policies = [], isLoading: isPoliciesLoading } = useQuery({
    queryKey: ['clientPolicies', clientProfile?.policy_id, clientProfile?.company_id],
    queryFn: async () => {
      const pId = clientProfile?.policy_id;
      const cId = clientProfile?.company_id;
      if (!pId && !cId) return [];

      let query = supabase
        .from('policies')
        .select('*, insurer:insurance_companies(logo_url, companyName), benefit_schedule:benefit_schedules(*)');
      
      if (pId) {
        query = query.eq('id', pId);
      } else if (cId) {
        query = query.eq('client_company_id', cId).order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const list = data || [];
      
      // Auto-select the policy
      if (list.length > 0 && !selectedPolicyId) {
        setSelectedPolicyId(list[0].id);
      }
      return list;
    },
    enabled: !!clientProfile
  });

  const activePolicy = useMemo(() => {
    return policies.find((p: any) => p.id === selectedPolicyId);
  }, [policies, selectedPolicyId]);

  // 3. Fetch Policy Members (Active Census)
  const { data: activeMembers = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['policyMembers', selectedPolicyId],
    queryFn: async () => {
      if (!selectedPolicyId) return [];
      const { data, error } = await supabase
        .from('policy_members')
        .select('*')
        .eq('policy_id', selectedPolicyId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPolicyId
  });

  // 1a. Fetch plans from Master Data (sme_plans)
  const { data: dbPlans = [] } = useQuery({
    queryKey: ['smePlans', activePolicy?.insurer_id],
    queryFn: async () => {
      let query = supabase.from('sme_plans').select('*');
      if (activePolicy?.insurer_id) {
        query = query.eq('insurer_id', activePolicy.insurer_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPolicyId
  });

  // 1b. Fetch relations master data
  const { data: dbRelations = [] } = useQuery({
    queryKey: ['relations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('relations').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // 1c. Fetch dependent rules for policy
  const { data: dependentRules } = useQuery({
    queryKey: ['dependentRules', selectedPolicyId],
    queryFn: async () => {
      if (!selectedPolicyId) return null;
      const { data, error } = await supabase
        .from('dependent_rules')
        .select('*')
        .eq('policy_id', selectedPolicyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPolicyId
  });

  // 4. Fetch Pending Endorsement Requests
  const { data: pendingRequests = [], isLoading: isEndorsementsLoading } = useQuery({
    queryKey: ['policyEndorsements', selectedPolicyId],
    queryFn: async () => {
      if (!selectedPolicyId) return [];
      // Fetch endorsements and their items
      const { data, error } = await supabase
        .from('endorsements')
        .select(`
          id,
          endorsement_number,
          status,
          created_at,
          type:endorsement_types(name),
          endorsement_items(*)
        `)
        .eq('policy_id', selectedPolicyId)
        .in('status', ['Draft', 'Pending Approval']);
      
      if (error) throw error;

      // Extract and return all pending items
      const items: any[] = [];
      data?.forEach((endorsement: any) => {
        const endorsementItems = (endorsement.endorsement_items || []) as any[];
        endorsementItems.forEach(item => {
          items.push({
            ...item,
            member_name: item.name || item.member_name,
            endorsement_number: endorsement.endorsement_number,
            endorsement_type: endorsement.type?.name || 'Endorsement'
          });
        });
      });

      return items;
    },
    enabled: !!selectedPolicyId
  });

  // Active employees list for linking dependents
  const activeEmployees = useMemo(() => {
    return activeMembers.filter((m: any) => 
      m.relation?.toLowerCase() === 'employee' || 
      m.relation?.toLowerCase() === 'principal'
    ).map((m: any) => ({
      id: m.id,
      member_name: m.member_name
    }));
  }, [activeMembers]);

  // Compute dynamic census metrics
  const censusMetrics = useMemo(() => {
    const pendingDeletionsCount = pendingRequests.filter((r: any) => r.action_type === 'delete').length;
    const pendingAdditionsCount = pendingRequests.filter((r: any) => r.action_type === 'add').length;

    const startCount = activeMembers.filter((m: any) => {
      if (!m.addition_date) return true;
      if (!activePolicy?.start_date) return true;
      return new Date(m.addition_date) <= new Date(activePolicy.start_date);
    }).length;
    const additionsCount = activeMembers.filter((m: any) => {
      if (!m.addition_date) return false;
      if (!activePolicy?.start_date) return false;
      return new Date(m.addition_date) > new Date(activePolicy.start_date);
    }).length;
    const deletionsCount = activeMembers.filter((m: any) => m.deletion_date).length;
    const currentActive = startCount + additionsCount - deletionsCount;

    return {
      currentActive,
      deletionsCount,
      additionsCount,
      startCount
    };
  }, [activeMembers, activePolicy, pendingRequests]);

  // Extract policy logo if present in related documents
  const policyLogo = useMemo(() => {
    return activePolicy?.related_documents?.find((doc: any) => doc.type === 'logo')?.url;
  }, [activePolicy]);

  // Handle input change and perform real-time validation
  const handleInputChange = (field: string, value: any) => {
    const updatedForm = { ...formData, [field]: value };
    setFormData(updatedForm);

    const selectedPlanObj = dbPlans.find((p: any) => p["Plan Name"] === updatedForm.plan_category || p.name === updatedForm.plan_category || p.id === updatedForm.plan_category);
    const existingNationalIds = activeMembers.map((m: any) => m.national_id);

    const validationConfig = {
      plan: selectedPlanObj ? { min_age: selectedPlanObj.min_age, max_age: selectedPlanObj.max_age } : undefined,
      policy: activePolicy ? { max_allowed_age: activePolicy.max_allowed_age } : undefined,
      dependentRules: dependentRules ? { child_max_age: dependentRules.child_max_age } : undefined,
      existingNationalIds,
      activeEmployees
    };

    const valResult = validateMemberAddition(updatedForm as any, validationConfig);
    
    // Additional real-time formatting if user enters valid National ID: auto-set gender & DOB
    if (field === "national_id" && value.length === 14) {
      const nidVal = validateNationalID(value, "", "");
      if (nidVal.isValid && nidVal.dob && nidVal.gender) {
        updatedForm.date_of_birth = nidVal.dob;
        updatedForm.gender = nidVal.gender;
        setFormData({ ...updatedForm });
      }
    }

    // Re-run validation with potentially updated values
    const finalValResult = validateMemberAddition(updatedForm as any, validationConfig);
    setFormErrors(finalValResult.errors);
  };

  // Original pendingRequests query has been moved up for declaration order.

  const isLoading = isProfileLoading || isPoliciesLoading || isMembersLoading || isEndorsementsLoading;

  // Filtered members list (excl. deleted members)
  const filteredMembers = useMemo(() => {
    const activeOnly = activeMembers.filter((m: any) => !m.deletion_date);
    if (!searchQuery) return activeOnly;
    const query = searchQuery.toLowerCase();
    return activeOnly.filter((m: any) => 
      (m.member_name || '').toLowerCase().includes(query) ||
      (m.member_id_insurance || '').toLowerCase().includes(query) ||
      (m.national_id || '').toLowerCase().includes(query) ||
      (m.department || '').toLowerCase().includes(query)
    );
  }, [activeMembers, searchQuery]);

  const filteredAddedMembers = useMemo(() => {
    if (!activePolicy?.start_date) return [];
    const addedOnly = activeMembers.filter((m: any) => m.addition_date && new Date(m.addition_date) > new Date(activePolicy.start_date));
    if (!searchQuery) return addedOnly;
    const query = searchQuery.toLowerCase();
    return addedOnly.filter((m: any) => 
      (m.member_name || '').toLowerCase().includes(query) ||
      (m.member_id_insurance || '').toLowerCase().includes(query) ||
      (m.national_id || '').toLowerCase().includes(query)
    );
  }, [activeMembers, activePolicy, searchQuery]);

  const filteredDeletedMembers = useMemo(() => {
    const deletedOnly = activeMembers.filter((m: any) => m.deletion_date);
    if (!searchQuery) return deletedOnly;
    const query = searchQuery.toLowerCase();
    return deletedOnly.filter((m: any) => 
      (m.member_name || '').toLowerCase().includes(query) ||
      (m.member_id_insurance || '').toLowerCase().includes(query) ||
      (m.national_id || '').toLowerCase().includes(query)
    );
  }, [activeMembers, searchQuery]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSelectRowToggle = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  const handleSelectAllToggle = () => {
    const activeOnly = filteredMembers;
    const activeIds = activeOnly.map((m: any) => m.id);
    const allSelected = activeIds.every((id: any) => selectedMemberIds.includes(id));

    if (allSelected) {
      setSelectedMemberIds(prev => prev.filter((id: any) => !activeIds.includes(id)));
    } else {
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...activeIds])));
    }
  };

  // Safe helper to find or create pending endorsement
  const getOrCreateEndorsementId = async (policyId: string, type: 'addition' | 'deletion') => {
    // Fetch target endorsement type
    const { data: typeRec } = await supabase
      .from('endorsement_types')
      .select('id')
      .eq('name', type === 'addition' ? 'Addition Endorsement (new member/s)' : 'Deletion Endorsement (member/s termination)')
      .maybeSingle();

    const typeId = typeRec?.id || null;

    // 1. Check if a pending endorsement of this type already exists
    const { data: existingEnd } = await supabase
      .from('endorsements')
      .select('id')
      .eq('policy_id', policyId)
      .eq('endorsement_type_id', typeId)
      .eq('status', 'Pending Approval')
      .limit(1)
      .maybeSingle();

    if (existingEnd) {
      return existingEnd.id;
    }

    // 2. Otherwise create a new one
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const endNumber = `END-CLI-${type === 'addition' ? 'ADD' : 'DEL'}-${Date.now().toString().slice(-6)}${randomSuffix}`;
    
    const { data: newEnd, error } = await supabase
      .from('endorsements')
      .insert({
        policy_id: policyId,
        line_of_business: 'Medical',
        endorsement_type_id: typeId,
        endorsement_number: endNumber,
        category: 'Corporate',
        status: 'Pending Approval',
        effective_date: new Date().toISOString().split('T')[0],
        source: 'Client Portal'
      })
      .select('id')
      .single();

    if (error) throw error;
    return newEnd.id;
  };

  // Submit manual addition request
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) return;

    // Run strict validations
    const selectedPlanObj = dbPlans.find((p: any) => p["Plan Name"] === formData.plan_category || p.name === formData.plan_category || p.id === formData.plan_category);
    const existingNationalIds = activeMembers.map((m: any) => m.national_id);

    const validationConfig = {
      plan: selectedPlanObj ? { min_age: selectedPlanObj.min_age, max_age: selectedPlanObj.max_age } : undefined,
      policy: activePolicy ? { max_allowed_age: activePolicy.max_allowed_age } : undefined,
      dependentRules: dependentRules ? { child_max_age: dependentRules.child_max_age } : undefined,
      existingNationalIds,
      activeEmployees
    };

    const valResult = validateMemberAddition(formData as any, validationConfig);
    if (!valResult.isValid) {
      setFormErrors(valResult.errors);
      toast({
        variant: 'destructive',
        title: "Validation Error",
        description: "Please fix all highlighted errors in the form before submitting."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'addition');

      const payload = {
        endorsement_id: endorsementId,
        name: formData.member_name,
        national_id: formData.national_id,
        action_type: 'add',
        premium: 0,
        details: {
          member_id_insurance: formData.member_id_insurance,
          member_id_tpa: formData.member_id_tpa,
          staff_code: formData.staff_code,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender,
          relation: formData.relation,
          nationality: formData.nationality,
          plan_category: formData.plan_category,
          location: formData.location,
          department: formData.department,
          job_title: formData.job_title,
          mobile_number: formData.mobile_number,
          linked_main_member_id: formData.linked_main_member_id || null,
          full_name_arabic: formData.full_name_arabic || null,
          marital_status: formData.marital_status || null,
          bank_name: formData.bank_name || null,
          bank_account: formData.bank_account || null,
          iban: formData.iban || null,
          principle_id: formData.principle_id || null,
          notes: formData.notes || "Addition requested by client"
        }
      };

      const { error } = await supabase
        .from('endorsement_items')
        .insert(sanitizeUUIDs(payload));

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: `${formData.member_name} has been added to pending additions.`
      });

      // Reset
      setFormData(emptyForm);
      setFormErrors({});
      setAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Failed to submit request",
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request member deletion (Single or Bulk)
  const handleDeleteConfirm = async () => {
    if (!selectedPolicyId) return;

    const membersToDelete = selectedMember 
      ? [selectedMember] 
      : activeMembers.filter((m: any) => selectedMemberIds.includes(m.id));

    if (membersToDelete.length === 0) return;
    setIsSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'deletion');

      const payloads = membersToDelete.map((member: any) => ({
        endorsement_id: endorsementId,
        name: member.member_name,
        national_id: member.national_id,
        action_type: 'delete',
        premium: 0,
        details: {
          member_id_insurance: member.member_id_insurance,
          member_id_tpa: member.member_id_tpa,
          staff_code: member.staff_code,
          date_of_birth: member.date_of_birth,
          gender: member.gender,
          relation: member.relation,
          nationality: member.nationality,
          plan_category: member.plan_category,
          location: member.location,
          department: member.department,
          job_title: member.job_title,
          mobile_number: member.mobile_number,
          notes: `Cancellation request requested by client`
        }
      }));

      const { error } = await supabase
        .from('endorsement_items')
        .insert(sanitizeUUIDs(payloads));

      if (error) throw error;

      toast({
        title: "Cancellation Requested",
        description: `${membersToDelete.length} cancellation request(s) submitted for broker review.`
      });

      setDeleteConfirmOpen(false);
      setSelectedMember(null);
      setSelectedMemberIds([]); // Clear checkboxes
      queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Failed to submit cancellation",
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo pending deletion request
  const handleUndoDeletion = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('endorsement_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Deletion Reversed",
        description: "The cancellation request has been successfully canceled and the member remains active."
      });

      queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Failed to reverse deletion",
        description: err.message
      });
    }
  };

  // Export census as Excel
  const handleDownloadCensus = () => {
    const activeOnly = activeMembers.filter((m: any) => !m.deletion_date);
    if (activeOnly.length === 0) {
      toast({ variant: 'destructive', title: "No Data", description: "Census list is empty." });
      return;
    }
    const dataToExport = activeOnly.map((m: any) => ({
      "Name": m.member_name,
      "Relation": m.relation,
      "Plan Category": m.plan_category,
      "Department": m.department,
      "National ID": m.national_id,
      "Staff Code": m.staff_code,
      "TPA ID": m.member_id_tpa,
      "Insurance ID": m.member_id_insurance,
      "Gender": m.gender,
      "DOB": m.date_of_birth,
      "Nationality": m.nationality,
      "Location": m.location,
      "Job Title": m.job_title,
      "Mobile": m.mobile_number,
      "Status": "Active"
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Active Census");
    XLSX.writeFile(wb, `${activePolicy?.client_company_name || 'Client'}_Active_Census.xlsx`);
    toast({ title: "Census Downloaded", description: "Active census spreadsheet has been exported." });
  };

  // Export pending additions as Excel
  const handleDownloadAdditions = () => {
    const additions = pendingRequests.filter((r: any) => r.action_type === 'add');
    if (additions.length === 0) {
      toast({ variant: 'destructive', title: "No Data", description: "No pending additions requests." });
      return;
    }
    const dataToExport = additions.map((m: any) => ({
      "Member Name": m.member_name,
      "Relation": m.details?.relation || m.relation,
      "Plan Category": m.details?.plan_category || m.plan_category,
      "Department": m.details?.department || m.department,
      "National ID": m.national_id,
      "Staff Code": m.details?.staff_code || m.staff_code,
      "Gender": m.details?.gender || m.gender,
      "DOB": m.details?.date_of_birth || m.date_of_birth,
      "Nationality": m.details?.nationality || m.nationality,
      "Location": m.details?.location || m.location,
      "Job Title": m.details?.job_title || m.job_title,
      "Mobile": m.details?.mobile_number || m.mobile_number,
      "Endorsement Ref": m.endorsement_number,
      "Status": "Pending Addition"
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Additions");
    XLSX.writeFile(wb, `${activePolicy?.client_company_name || 'Client'}_Pending_Additions.xlsx`);
    toast({ title: "Additions Downloaded", description: "Pending additions list has been exported." });
  };

  // Export pending deletions as Excel
  const handleDownloadDeletions = () => {
    const deletions = pendingRequests.filter((r: any) => r.action_type === 'delete');
    if (deletions.length === 0) {
      toast({ variant: 'destructive', title: "No Data", description: "No pending deletions requests." });
      return;
    }
    const dataToExport = deletions.map((m: any) => ({
      "Member Name": m.member_name,
      "Relation": m.details?.relation || m.relation,
      "Plan Category": m.details?.plan_category || m.plan_category,
      "Department": m.details?.department || m.department,
      "National ID": m.national_id,
      "Staff Code": m.details?.staff_code || m.staff_code,
      "Gender": m.details?.gender || m.gender,
      "DOB": m.details?.date_of_birth || m.date_of_birth,
      "Nationality": m.details?.nationality || m.nationality,
      "Location": m.details?.location || m.location,
      "Job Title": m.details?.job_title || m.job_title,
      "Mobile": m.details?.mobile_number || m.mobile_number,
      "Endorsement Ref": m.endorsement_number,
      "Status": "Pending Deletion"
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deletions");
    XLSX.writeFile(wb, `${activePolicy?.client_company_name || 'Client'}_Pending_Deletions.xlsx`);
    toast({ title: "Deletions Downloaded", description: "Pending deletions list has been exported." });
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    downloadCensusTemplateFile("Add_Members_Template.xlsx", activePolicy);
    toast({ title: "Template Downloaded", description: "Fill out the spreadsheet and upload it." });
  };

  // Excel bulk upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPolicyId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          toast({ variant: 'destructive', title: "Upload Failed", description: "Excel sheet is empty." });
          return;
        }

        setIsSubmitting(true);
        const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'addition');

        const safeDate = (val: any) => {
          if (!val) return null;
          if (val instanceof Date) return val.toISOString().split('T')[0];
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          return null;
        };

        const collectedErrors: any[] = [];
        const uploadedEmployeeCodes = json
          .map((row: any) => String(row["Staff ID"] || row["Staff Code"] || "").trim())
          .filter(Boolean);

        const payload = json.map((row: any, index: number) => {
          const memberObj = parseExcelRowToPayload(row);
          const selectedPlanObj = dbPlans.find((p: any) => p["Plan Name"] === memberObj.plan_category || p.name === memberObj.plan_category || p.id === memberObj.plan_category);
          const existingNationalIds = activeMembers.map((m: any) => m.national_id);

          const validationConfig = {
            plan: selectedPlanObj ? { min_age: selectedPlanObj.min_age, max_age: selectedPlanObj.max_age } : undefined,
            policy: activePolicy ? { max_allowed_age: activePolicy.max_allowed_age } : undefined,
            dependentRules: dependentRules ? { child_max_age: dependentRules.child_max_age } : undefined,
            existingNationalIds,
            activeEmployees,
            uploadedEmployees: uploadedEmployeeCodes,
            medicalBrackets: activePolicy?.medical_brackets || []
          };

          const valResult = validateMemberAddition(memberObj, validationConfig);
          if (!valResult.isValid) {
            collectedErrors.push({
              row: index + 2,
              name: memberObj.member_name || 'Unnamed',
              errors: Object.values(valResult.errors)
            });
          }

          return {
            endorsement_id: endorsementId,
            name: memberObj.member_name,
            national_id: memberObj.national_id,
            action_type: 'add',
            premium: 0,
            details: {
              ...memberObj,
              notes: "Uploaded via client excel portal"
            }
          };
        });

        if (collectedErrors.length > 0) {
          setBulkErrors(collectedErrors);
          toast({ variant: 'destructive', title: "Validation errors found", description: `There are ${collectedErrors.length} errors in the spreadsheet.` });
          setIsSubmitting(false);
          return;
        }
        setBulkErrors([]);

        const { error } = await supabase
          .from('endorsement_items')
          .insert(sanitizeUUIDs(payload));

        if (error) throw error;

        toast({
          title: "Bulk Requests Submitted",
          description: `${json.length} additions processed and queued for review.`
        });

        setAddDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
      } catch (err: any) {
        console.error(err);
        toast({ variant: 'destructive', title: "Parse Failed", description: err.message });
      } finally {
        setIsSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">{tr('loading')}</span>
      </div>
    );
  }

  if (!policyId) {
    return (
      <div className="p-8 text-center bg-card border rounded-2xl shadow-sm max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-foreground mb-2">{tr('unassociatedAccount')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {tr('unassociatedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 pb-16">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-background dark:from-indigo-950/20 dark:via-purple-950/10 p-6 md:p-8 shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-primary" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {policyLogo ? (
              <div className="h-16 w-16 p-2 rounded-2xl bg-white border border-border/80 flex items-center justify-center shrink-0 shadow-sm">
                <img src={getCleanStorageUrl(policyLogo)} alt="Policy Logo" className="h-full w-full object-contain" />
              </div>
            ) : activePolicy?.insurer?.logo_url ? (
              <div className="h-16 w-16 p-2 rounded-2xl bg-white border border-border/80 flex items-center justify-center shrink-0 shadow-sm">
                <img src={activePolicy.insurer.logo_url} alt={activePolicy.insurer_name} className="h-full w-full object-contain" />
              </div>
            ) : null}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {activePolicy?.client_company_name || "Corporate Client"}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                {tr('censusPortal')}
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {policies.length > 1 && (
              <div className="w-full sm:w-64">
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger className="h-11 bg-background border-border shadow-sm">
                    <SelectValue placeholder="Select Policy Contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.policy_name || p.policy_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              onClick={() => { setFormData(emptyForm); setAddDialogOpen(true); }}
              className="h-11 bg-primary text-primary-foreground hover:bg-primary/95 font-bold shadow-md shadow-primary/10 gap-2"
            >
              <Plus className="w-4 h-4" />
              {tr('addMember')}
            </Button>
          </div>
        </div>

        {activePolicy && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/80 text-xs md:text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">{tr('activeContract')}:</span>
              <span className="font-bold text-foreground">{activePolicy.policy_name || activePolicy.policy_number}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">{tr('insurer')}:</span>
              <span className="font-semibold text-foreground">{activePolicy.insurer_name}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">TPA:</span>
              <span className="font-semibold text-foreground">{activePolicy.tpa_name || '-'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground block font-medium">{tr('validity')}:</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {activePolicy.start_date} to {activePolicy.end_date}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Census Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Start Headcount */}
        <Card className="border border-border/70 shadow-sm bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 dark:from-indigo-950/10 dark:to-indigo-900/5">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{tr('startInsurance')}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-foreground">{censusMetrics.startCount}</span>
              <span className="text-xs text-muted-foreground">{tr('members')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Additions */}
        <Card className="border border-border/70 shadow-sm bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 dark:from-emerald-950/10 dark:to-emerald-900/5">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{tr('additions')}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">+{censusMetrics.additionsCount}</span>
              <span className="text-xs text-muted-foreground">{tr('members')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deletions */}
        <Card className="border border-border/70 shadow-sm bg-gradient-to-br from-rose-500/5 to-rose-500/10 dark:from-rose-950/10 dark:to-rose-900/5">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{tr('deletions')}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-rose-600 dark:text-rose-400">-{censusMetrics.deletionsCount}</span>
              <span className="text-xs text-muted-foreground">{tr('members')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Active */}
        <Card className="border border-border/70 shadow-sm bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-indigo-500/20 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-background">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{tr('currentActive')}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-primary">{censusMetrics.currentActive}</span>
              <span className="text-xs text-muted-foreground">{tr('members')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activeCensus" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 bg-slate-100/60 p-1 border rounded-xl h-auto sm:h-11 max-w-4xl">
          <TabsTrigger value="activeCensus" className="text-xs md:text-sm font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            {tr('activeInsuredMembers')}
          </TabsTrigger>
          <TabsTrigger value="addedCensus" className="text-xs md:text-sm font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            {tr('additions')}
          </TabsTrigger>
          <TabsTrigger value="deletedCensus" className="text-xs md:text-sm font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            {tr('deletions')}
          </TabsTrigger>
          <TabsTrigger value="pendingRequests" className="text-xs md:text-sm font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            {tr('pendingRequests')}
          </TabsTrigger>
          <TabsTrigger value="benefits" className="text-xs md:text-sm font-bold py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Policy Benefits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activeCensus" className="space-y-4">
          <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  {tr('activeInsuredMembers')}
                  <Badge variant="outline" className="bg-indigo-50/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 font-bold ml-2">
                    {censusMetrics.currentActive} {tr('members')}
                  </Badge>
                </CardTitle>
                {tr('activeInsuredDesc') && (
                  <CardDescription className="text-xs mt-0.5">
                    {tr('activeInsuredDesc')}
                  </CardDescription>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative w-full max-w-xs hidden sm:block">
                  <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                  <Input 
                    placeholder={tr('searchPlaceholder')} 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className={cn("h-9 text-xs bg-background ps-9", isRtl ? "pr-9 text-right" : "pl-9 text-left")}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-9 text-xs font-bold gap-1.5 bg-background shadow-sm border-border hover:bg-slate-50 transition-colors">
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      {tr('downloadCensus')}
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200/80 shadow-lg rounded-xl p-1 z-50">
                    <DropdownMenuItem onClick={handleDownloadCensus} className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50/60 p-2 rounded-lg flex items-center gap-2 transition-colors">
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      {tr('downloadCensus')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadAdditions} className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50/60 p-2 rounded-lg flex items-center gap-2 transition-colors">
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      {tr('downloadAdditions')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadDeletions} className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50/60 p-2 rounded-lg flex items-center gap-2 transition-colors">
                      <Download className="w-3.5 h-3.5 text-rose-500" />
                      {tr('downloadDeletions')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="border-t border-border/40">
              {selectedMemberIds.length > 0 && (
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-border p-3 px-6 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {selectedMemberIds.length} {tr('members')} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold h-8"
                      onClick={() => setSelectedMemberIds([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold gap-1.5 shadow-sm h-8"
                      onClick={() => { setSelectedMember(null); setDeleteConfirmOpen(true); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {tr('requestCancellation')}
                    </Button>
                  </div>
                </div>
              )}

              {filteredMembers.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  {tr('noActiveMembers')}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                        <th className="p-3 w-12 ps-6">
                          <input
                            type="checkbox"
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            checked={filteredMembers.length > 0 && filteredMembers.every((m: any) => selectedMemberIds.includes(m.id))}
                            onChange={handleSelectAllToggle}
                          />
                        </th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('name')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('relation')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('planCategory')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('department')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">{tr('requestCancellation')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredMembers.map((member: any) => (
                        <tr key={member.id} onClick={() => setViewMember(member)} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150 cursor-pointer">
                          <td className="p-3 w-12 ps-6">
                            <input
                              type="checkbox"
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              checked={selectedMemberIds.includes(member.id)}
                              onChange={() => handleSelectRowToggle(member.id)}
                              onClick={e => e.stopPropagation()}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{member.member_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{member.member_id_insurance || member.national_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-background text-[10px] font-medium">{translateRelation(member.relation)}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{member.plan_category || '-'}</td>
                          <td className="p-3 text-muted-foreground">{member.department || '-'}</td>
                          <td className="p-3 text-right pe-6">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setDeleteConfirmOpen(true); }}
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="addedCensus" className="space-y-4">
          <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  {tr('additions')}
                  <Badge variant="outline" className="bg-emerald-50/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 font-bold ml-2">
                    {censusMetrics.additionsCount} {tr('members')}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Members added to the policy census after the start date.
                </CardDescription>
              </div>
            </div>

            <div className="border-t border-border/40">
              {filteredAddedMembers.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No additions found.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">{tr('name')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('relation')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('planCategory')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Addition Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredAddedMembers.map((member: any) => (
                        <tr key={member.id} onClick={() => setViewMember(member)} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150 cursor-pointer">
                          <td className="p-3 ps-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{member.member_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{member.member_id_insurance || member.national_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-background text-[10px] font-medium">{translateRelation(member.relation)}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{member.plan_category || '-'}</td>
                          <td className="p-3 text-muted-foreground font-mono">
                            {member.addition_date ? new Date(member.addition_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="deletedCensus" className="space-y-4">
          <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  {tr('deletions')}
                  <Badge variant="outline" className="bg-rose-50/30 text-rose-700 dark:text-rose-300 border-rose-100 font-bold ml-2">
                    {censusMetrics.deletionsCount} {tr('members')}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Members whose coverage has been cancelled/terminated.
                </CardDescription>
              </div>
            </div>

            <div className="border-t border-border/40">
              {filteredDeletedMembers.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No cancellations found.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">{tr('name')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('relation')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('planCategory')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-rose-600">Cancellation Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredDeletedMembers.map((member: any) => (
                        <tr key={member.id} onClick={() => setViewMember(member)} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150 cursor-pointer">
                          <td className="p-3 ps-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-rose-50 text-rose-700 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-rose-600" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{member.member_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{member.member_id_insurance || member.national_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-background text-[10px] font-medium">{translateRelation(member.relation)}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{member.plan_category || '-'}</td>
                          <td className="p-3 text-rose-600 font-mono">
                            {member.deletion_date ? new Date(member.deletion_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pendingRequests" className="space-y-4">
          <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  {tr('pendingRequests')}
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-bold ml-2">
                    {pendingRequests.length} {tr('requests')}
                  </Badge>
                </CardTitle>
                {tr('pendingRequestsDesc') && (
                  <CardDescription className="text-xs mt-0.5">
                    {tr('pendingRequestsDesc')}
                  </CardDescription>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadAdditions} className="h-9 text-xs font-bold gap-1.5 bg-emerald-50/50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50">
                  <Download className="w-3.5 h-3.5" /> {tr('downloadAdditions')}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadDeletions} className="h-9 text-xs font-bold gap-1.5 bg-rose-50/50 text-rose-700 border-rose-100 hover:bg-rose-100/50">
                  <Download className="w-3.5 h-3.5" /> {tr('downloadDeletions')}
                </Button>
              </div>
            </div>

            <div className="border-t border-border/40">
              {pendingRequests.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  {tr('noPendingRequests')}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">{tr('memberName')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('requestType')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('endorsementRef')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">{tr('dateSubmitted')}</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">{tr('status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {pendingRequests.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150">
                          <td className="p-3 ps-6">
                            <div>
                              <p className="font-bold text-foreground">{item.member_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.member_id_insurance || item.national_id}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[10px] font-semibold border-none px-2 py-0.5",
                                item.action_type === 'add' 
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" 
                                  : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              )}
                            >
                              {item.action_type === 'add' ? tr('additionRequest') : tr('cancellationRequest')}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{item.endorsement_number}</td>
                          <td className="p-3 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                          <td className="p-3 text-right pe-6">
                            <div className="flex items-center justify-end gap-2">
                              {item.action_type === 'delete' && getRemainingHours(item.created_at) > 0 && (
                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold gap-1 px-2.5 py-0.5 animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  {getRemainingHours(item.created_at)}h Left to Undo
                                </Badge>
                              )}
                              {item.action_type === 'delete' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 border-indigo-200 hover:bg-indigo-50/50 px-2.5 rounded-lg"
                                  onClick={() => handleUndoDeletion(item.id)}
                                >
                                  {tr('undoDeletion')}
                                </Button>
                              )}
                              <Badge variant="outline" className="bg-amber-50/50 text-amber-700 dark:text-amber-400 border-amber-200/50 text-[10px] font-bold gap-1 px-2.5 py-0.5">
                                <Clock className="w-3 h-3 animate-pulse" />
                                {tr('pendingReview')}
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="space-y-6">
          {activePolicy?.benefit_schedule ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Core Limits & Categories */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Annual Limit */}
                <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
                  <div className="p-5 border-b border-border bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-base text-foreground">Annual Policy Limit</h4>
                      <p className="text-xs text-muted-foreground">Single source of truth for policy-wide coverage</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">Plan Active</Badge>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-muted-foreground text-sm font-medium">Policy Limit Value:</span>
                      <span className="text-3xl font-black text-foreground font-mono">
                        EGP {Math.round(activePolicy.benefit_schedule.annual_limit || 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories Accordion/Blocks */}
                <div className="space-y-4">
                  {[
                    { key: 'INPATIENT', title: 'Inpatient Treatment', titleAr: 'علاج داخلي', desc: 'Hospital stay, operations, intensive care, and room charges.' },
                    { key: 'OUTPATIENT', title: 'Outpatient Care', titleAr: 'علاج خارجي', desc: 'Clinics, investigations, pharmacy, and diagnostic services.' },
                    { key: 'MATERNITY', title: 'Maternity Benefits', titleAr: 'حمل وولادة', desc: 'Pre-natal care, normal or Caesarean deliveries, and new-born care.' },
                    { key: 'DENTAL', title: 'Dental & Gum Treatment', titleAr: 'علاج أسنان', desc: 'Routine checkups, extractions, fillings, and emergency dental care.' },
                    { key: 'OPTICAL', title: 'Optical & Eye Care', titleAr: 'نظارات وعين', desc: 'Eye tests, lenses, frames, and optical clinic consultations.' },
                    { key: 'EMERGENCY', title: 'Emergency Care', titleAr: 'علاج طوارئ', desc: 'Urgent medical assistance, life-threatening scenarios, and ambulance.' }
                  ].map((cat) => {
                    const cfg = activePolicy.benefit_schedule.details?.categories?.[cat.key] || { is_covered: false };
                    return (
                      <Card key={cat.key} className="border border-border/85 shadow-sm bg-card overflow-hidden">
                        <div className="p-4 border-b border-border bg-slate-50/20 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                              {cat.title} <span className="text-xs text-muted-foreground font-medium">({cat.titleAr})</span>
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{cat.desc}</p>
                          </div>
                          <Badge variant={cfg.is_covered ? "default" : "secondary"} className={cfg.is_covered ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-slate-100 text-slate-400"}>
                            {cfg.is_covered ? "Covered" : "Not Covered"}
                          </Badge>
                        </div>
                        {cfg.is_covered && (
                          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-muted-foreground font-medium">Coverage Type</p>
                              <p className="font-bold mt-0.5 text-slate-800">{cfg.coverage_type || 'FULL'}</p>
                            </div>
                            {cfg.coverage_type !== 'FULL' && (
                              <div>
                                <p className="text-muted-foreground font-medium">Limit Value</p>
                                <p className="font-bold mt-0.5 text-slate-800 font-mono">EGP {Math.round(cfg.limit_value || 0).toLocaleString()}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-muted-foreground font-medium">Co-Payment</p>
                              <p className="font-bold mt-0.5 text-slate-800 font-mono">{cfg.copay_percentage || 0}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-medium">Deductible</p>
                              <p className="font-bold mt-0.5 text-slate-800 font-mono">EGP {cfg.deductible || 0}</p>
                            </div>
                            {cfg.waiting_period_days > 0 && (
                              <div>
                                <p className="text-muted-foreground font-medium text-amber-600">Waiting Period</p>
                                <p className="font-bold mt-0.5 text-amber-700 font-mono">{cfg.waiting_period_days} Days</p>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Special Programs & Rules */}
              <div className="space-y-6">
                
                {/* 4. Chronic & Pre-existing Conditions */}
                <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
                  <div className="p-4 border-b border-border bg-slate-50/50">
                    <h4 className="font-bold text-sm text-foreground">Pre-existing & Chronic Care</h4>
                  </div>
                  <CardContent className="p-4 space-y-4 text-xs">
                    {/* Pre-existing */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Pre-existing Conditions</span>
                        <Badge variant={activePolicy.benefit_schedule.details?.pre_existing?.is_covered ? "default" : "secondary"}>
                          {activePolicy.benefit_schedule.details?.pre_existing?.is_covered ? "Covered" : "No"}
                        </Badge>
                      </div>
                      {activePolicy.benefit_schedule.details?.pre_existing?.is_covered && (
                        <div className="p-2.5 rounded bg-slate-50 grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Sub-Limit</p>
                            <p className="font-bold font-mono">EGP {Math.round(activePolicy.benefit_schedule.details?.pre_existing?.sub_limit || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Waiting Period</p>
                            <p className="font-bold font-mono">{activePolicy.benefit_schedule.details?.pre_existing?.waiting_period_days || 0} days</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Chronic */}
                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Chronic Conditions</span>
                        <Badge variant={activePolicy.benefit_schedule.details?.chronic?.is_covered ? "default" : "secondary"}>
                          {activePolicy.benefit_schedule.details?.chronic?.is_covered ? "Covered" : "No"}
                        </Badge>
                      </div>
                      {activePolicy.benefit_schedule.details?.chronic?.is_covered && (
                        <div className="p-2.5 rounded bg-slate-50 grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Sub-Limit</p>
                            <p className="font-bold font-mono">EGP {Math.round(activePolicy.benefit_schedule.details?.chronic?.sub_limit || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 8. Special Programs: Doctor On-site */}
                {activePolicy.benefit_schedule.details?.doctor_on_site?.enabled && (
                  <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
                    <div className="p-4 border-b border-border bg-slate-50/50">
                      <h4 className="font-bold text-sm text-foreground">Special Programs (Doctor On-site)</h4>
                    </div>
                    <CardContent className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Visits Frequency:</span>
                        <span className="font-bold text-slate-800">{activePolicy.benefit_schedule.details.doctor_on_site.visits_per_week} times/week</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Max Patients/Day:</span>
                        <span className="font-bold text-slate-800">{activePolicy.benefit_schedule.details.doctor_on_site.max_visits_per_day} patients</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Coverage Level:</span>
                        <span className="font-bold text-slate-800">{activePolicy.benefit_schedule.details.doctor_on_site.coverage_type}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Eligibility:</span>
                        <span className="font-bold text-slate-800">
                          {activePolicy.benefit_schedule.details.doctor_on_site.eligibility_type} ({activePolicy.benefit_schedule.details.doctor_on_site.eligibility_value})
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 7. Additional Services */}
                <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
                  <div className="p-4 border-b border-border bg-slate-50/50">
                    <h4 className="font-bold text-sm text-foreground">Additional Services</h4>
                  </div>
                  <CardContent className="p-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                            <th className="p-2">Service</th>
                            <th className="p-2">Coverage</th>
                            <th className="p-2 text-right">Approval</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activePolicy.benefit_schedule.details?.additional_services || []).map((svc: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2 font-medium">
                                <p className="text-slate-800">{svc.name_en}</p>
                                <p className="text-[9px] text-muted-foreground">{svc.name_ar}</p>
                              </td>
                              <td className="p-2">
                                {svc.coverage_type === 'FULL' ? (
                                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none font-medium scale-90">Full</Badge>
                                ) : (
                                  <span className="font-bold font-mono">EGP {svc.limit_value}</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {svc.requires_approval ? (
                                  <Badge variant="outline" className="text-amber-700 bg-amber-50/50 border-amber-200 scale-90">Required</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 9. Conditions & Custom Rules */}
                <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
                  <div className="p-4 border-b border-border bg-slate-50/50">
                    <h4 className="font-bold text-sm text-foreground">Conditions & Custom Rules</h4>
                  </div>
                  <CardContent className="p-4 space-y-3 text-xs">
                    {(activePolicy.benefit_schedule.details?.rules || []).map((rule: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border bg-slate-50/50 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{rule.benefit_item}</span>
                          <Badge variant="outline" className="text-[9px] uppercase">{rule.rule_type}</Badge>
                        </div>
                        {rule.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{rule.notes}</p>}
                      </div>
                    ))}
                    {(activePolicy.benefit_schedule.details?.rules || []).length === 0 && (
                      <p className="text-center text-muted-foreground text-xs p-4">No custom rules configured.</p>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground border rounded-xl bg-slate-50/50">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">No Benefit Schedule Linked</p>
              <p className="text-xs text-slate-400 mt-1">There is no medical benefit plan linked to your policy contract yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* A. Request Member Additions Dialog (Manual Form + Excel Upload) */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {tr('requestMemberAdditions')}
            </DialogTitle>
            {tr('additionsDesc') && (
              <DialogDescription className="text-xs">
                {tr('additionsDesc')}
              </DialogDescription>
            )}
          </DialogHeader>

          <Tabs defaultValue="manual" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 border rounded-lg h-10">
              <TabsTrigger value="manual" className="text-xs font-semibold py-1.5">{tr('singleAddition')}</TabsTrigger>
              <TabsTrigger value="excel" className="text-xs font-semibold py-1.5">{tr('bulkExcelUpload')}</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleManualAddSubmit} className="space-y-4">
                <div className="max-h-[50vh] overflow-y-auto pr-2 pb-2 space-y-4">
                  {/* Section 1: Identity & Plan Details */}
                  <div className="p-4 border rounded-xl bg-slate-50/50 space-y-4">
                    <h4 className="text-xs font-bold text-[#0369A1] uppercase tracking-wider">1. Identity & Plan Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Full Name English */}
                      <div className="space-y-1.5">
                        <Label htmlFor="member_name" className={cn("text-xs font-semibold", formErrors.member_name && "text-destructive")}>{tr('fullName')}</Label>
                        <Input 
                          id="member_name" 
                          required 
                          value={formData.member_name} 
                          onChange={e => handleInputChange("member_name", e.target.value)}
                          placeholder="e.g. John Doe"
                          className={cn("h-10 bg-background", formErrors.member_name && "border-destructive focus-visible:ring-destructive")}
                        />
                        {formErrors.member_name && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.member_name}</p>}
                      </div>

                      {/* 2. Full Name Arabic */}
                      <div className="space-y-1.5">
                        <Label htmlFor="full_name_arabic" className="text-xs font-semibold">Full Name Arabic</Label>
                        <Input 
                          id="full_name_arabic" 
                          value={formData.full_name_arabic} 
                          onChange={e => handleInputChange("full_name_arabic", e.target.value)}
                          placeholder="e.g. جون سميث"
                          className="h-10 bg-background"
                        />
                      </div>

                      {/* 14. National ID */}
                      <div className="space-y-1.5">
                        <Label htmlFor="national_id" className={cn("text-xs font-semibold", formErrors.national_id && "text-destructive")}>{tr('nationalId')}</Label>
                        <Input 
                          id="national_id" 
                          required 
                          value={formData.national_id} 
                          onChange={e => handleInputChange("national_id", e.target.value)}
                          placeholder="e.g. 29505200101234"
                          maxLength={14}
                          className={cn("h-10 bg-background font-mono", formErrors.national_id && "border-destructive focus-visible:ring-destructive")}
                        />
                        {formErrors.national_id && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.national_id}</p>}
                      </div>

                      {/* 7. Date of Birth */}
                      <div className="space-y-1.5">
                        <Label htmlFor="date_of_birth" className={cn("text-xs font-semibold", formErrors.date_of_birth && "text-destructive")}>
                          {tr('dob')} {formData.date_of_birth && <Badge variant="secondary" className="ml-2 bg-indigo-50 text-indigo-700 text-[10px] font-bold">{tr('age')}: {calculateAge(formData.date_of_birth)} {tr('yrs')}</Badge>}
                        </Label>
                        <Input 
                          id="date_of_birth" 
                          type="date"
                          required 
                          value={formData.date_of_birth} 
                          onChange={e => handleInputChange("date_of_birth", e.target.value)}
                          className={cn("h-10 bg-background", formErrors.date_of_birth && "border-destructive focus-visible:ring-destructive")}
                        />
                        {formErrors.date_of_birth && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.date_of_birth}</p>}
                      </div>

                      {/* 8. Gender */}
                      <div className="space-y-1.5">
                        <Label htmlFor="gender" className={cn("text-xs font-semibold", formErrors.gender && "text-destructive")}>{tr('gender')}</Label>
                        <Select value={formData.gender} onValueChange={val => handleInputChange("gender", val)}>
                          <SelectTrigger className={cn("h-10 bg-background", formErrors.gender && "border-destructive focus-visible:ring-destructive")}>
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">{tr('male')}</SelectItem>
                            <SelectItem value="Female">{tr('female')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {formErrors.gender && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.gender}</p>}
                      </div>

                      {/* 9. Relation */}
                      <div className="space-y-1.5">
                        <Label htmlFor="relation" className={cn("text-xs font-semibold", formErrors.relation && "text-destructive")}>{tr('relationLabel')}</Label>
                        <Select value={formData.relation} onValueChange={val => handleInputChange("relation", val)}>
                          <SelectTrigger className={cn("h-10 bg-background", formErrors.relation && "border-destructive focus-visible:ring-destructive")}>
                            <SelectValue placeholder="Select Relation" />
                          </SelectTrigger>
                          <SelectContent>
                            {dbRelations.length > 0 ? (
                              dbRelations.map((r: any) => (
                                <SelectItem key={r.id} value={r.relation_type}>{translateRelation(r.relation_type)}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Employee">{tr('employee')}</SelectItem>
                                <SelectItem value="Spouse">{tr('spouse')}</SelectItem>
                                <SelectItem value="Child">{tr('child')}</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {formErrors.relation && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.relation}</p>}
                      </div>

                      {/* 10. PLAN */}
                      <div className="space-y-1.5">
                        <Label htmlFor="plan_category" className={cn("text-xs font-semibold", formErrors.plan_category && "text-destructive")}>{tr('planLabel')}</Label>
                        <Select value={formData.plan_category} onValueChange={val => handleInputChange("plan_category", val)}>
                          <SelectTrigger className={cn("h-10 bg-background", formErrors.plan_category && "border-destructive focus-visible:ring-destructive")}>
                            <SelectValue placeholder="Select Plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {dbPlans.length > 0 ? (
                              dbPlans.map((p: any) => (
                                <SelectItem key={p.id} value={p["Plan Name"] || p.name}>{p["Plan Name"] || p.name}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Platinum">Platinum</SelectItem>
                                <SelectItem value="Titanium">Titanium</SelectItem>
                                <SelectItem value="Golden">Golden</SelectItem>
                                <SelectItem value="Silver">Silver</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {formErrors.plan_category && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.plan_category}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact & Employment Info */}
                  <div className="p-4 border rounded-xl bg-slate-50/50 space-y-4">
                    <h4 className="text-xs font-bold text-[#0369A1] uppercase tracking-wider">2. Employment & Contact Details</h4>
                    
                    {/* Linked Main Member Selection (conditional for dependents) */}
                    {formData.relation !== "Employee" && (
                      <div className="space-y-1.5 animate-in fade-in duration-200 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <Label htmlFor="linked_main_member_id" className={cn("text-xs font-semibold", formErrors.linked_main_member_id && "text-destructive")}>{tr('linkedMain')}</Label>
                        <Select value={formData.linked_main_member_id} onValueChange={val => handleInputChange("linked_main_member_id", val)}>
                          <SelectTrigger className={cn("h-10 bg-background", formErrors.linked_main_member_id && "border-destructive focus-visible:ring-destructive")}>
                            <SelectValue placeholder="Select Main Member" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeEmployees.map((emp: any) => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.member_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.linked_main_member_id && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.linked_main_member_id}</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 3. Staff ID */}
                      <div className="space-y-1.5">
                        <Label htmlFor="staff_code" className="text-xs font-semibold">{tr('staffCode')}</Label>
                        <Input 
                          id="staff_code" 
                          value={formData.staff_code} 
                          onChange={e => handleInputChange("staff_code", e.target.value)}
                          placeholder="e.g. EMP-90"
                          className="h-10 bg-background"
                        />
                      </div>

                      {/* 11. Mobile Number */}
                      <div className="space-y-1.5">
                        <Label htmlFor="mobile_number" className={cn("text-xs font-semibold", formErrors.mobile_number && "text-destructive")}>{tr('mobileNumber')}</Label>
                        <Input 
                          id="mobile_number" 
                          required 
                          value={formData.mobile_number} 
                          onChange={e => handleInputChange("mobile_number", e.target.value)}
                          placeholder="e.g. 01012345678"
                          className={cn("h-10 bg-background", formErrors.mobile_number && "border-destructive focus-visible:ring-destructive")}
                        />
                        {formErrors.mobile_number && <p className="text-destructive text-[11px] font-semibold mt-0.5">{formErrors.mobile_number}</p>}
                      </div>

                      {/* 12. Marital Status */}
                      <div className="space-y-1.5">
                        <Label htmlFor="marital_status" className="text-xs font-semibold">Marital Status</Label>
                        <Select value={formData.marital_status} onValueChange={v => handleInputChange("marital_status", v)}>
                          <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Married">Married</SelectItem>
                            <SelectItem value="Divorced">Divorced</SelectItem>
                            <SelectItem value="Widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 13. Nationality */}
                      <div className="space-y-1.5">
                        <Label htmlFor="nationality" className="text-xs font-semibold">{tr('nationality')}</Label>
                        <Input 
                          id="nationality" 
                          value={formData.nationality} 
                          onChange={e => handleInputChange("nationality", e.target.value)}
                          placeholder="e.g. Egyptian"
                          className="h-10 bg-background"
                        />
                      </div>

                      {/* 15. Location */}
                      <div className="space-y-1.5">
                        <Label htmlFor="location" className="text-xs font-semibold">{tr('location')}</Label>
                        <Input 
                          id="location" 
                          value={formData.location} 
                          onChange={e => handleInputChange("location", e.target.value)}
                          placeholder="e.g. Cairo"
                          className="h-10 bg-background"
                        />
                      </div>

                      {/* 16. Department */}
                      <div className="space-y-1.5">
                        <Label htmlFor="department" className="text-xs font-semibold">{tr('department')}</Label>
                        <Input 
                          id="department" 
                          value={formData.department} 
                          onChange={e => handleInputChange("department", e.target.value)}
                          placeholder="e.g. Sales"
                          className="h-10 bg-background"
                        />
                      </div>

                      {/* 17. Job Title */}
                      <div className="space-y-1.5">
                        <Label htmlFor="job_title" className="text-xs font-semibold">{tr('jobTitle')}</Label>
                        <Input 
                          id="job_title" 
                          value={formData.job_title} 
                          onChange={e => handleInputChange("job_title", e.target.value)}
                          placeholder="e.g. Software Engineer"
                          className="h-10 bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Bank Details (Collapsible) */}
                  <div className="p-4 border rounded-xl bg-slate-50/50 space-y-4">
                    <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setShowBankDetails(!showBankDetails)}>
                      <h4 className="text-xs font-bold text-[#0369A1] uppercase tracking-wider">3. Bank & Payroll details (Optional)</h4>
                      <span className="text-xs text-blue-600 hover:underline">{showBankDetails ? "Hide" : "Show"} Details</span>
                    </div>
                    {showBankDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-slate-200 animate-in fade-in duration-200">
                        {/* 18. Bank Name */}
                        <div className="space-y-1.5">
                          <Label htmlFor="bank_name" className="text-xs font-semibold">Bank Name</Label>
                          <Input 
                            id="bank_name" 
                            value={formData.bank_name} 
                            onChange={e => handleInputChange("bank_name", e.target.value)}
                            placeholder="e.g. CIB"
                            className="h-10 bg-background"
                          />
                        </div>

                        {/* 19. Bank Account */}
                        <div className="space-y-1.5">
                          <Label htmlFor="bank_account" className="text-xs font-semibold">Bank Account</Label>
                          <Input 
                            id="bank_account" 
                            value={formData.bank_account} 
                            onChange={e => handleInputChange("bank_account", e.target.value)}
                            placeholder="Account number"
                            className="h-10 bg-background"
                          />
                        </div>

                        {/* 20. IBAN */}
                        <div className="space-y-1.5">
                          <Label htmlFor="iban" className="text-xs font-semibold">IBAN</Label>
                          <Input 
                            id="iban" 
                            value={formData.iban} 
                            onChange={e => handleInputChange("iban", e.target.value)}
                            placeholder="EG..."
                            className="h-10 bg-background"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border/60">
                  <Button type="button" variant="outline" onClick={() => { setFormErrors({}); setAddDialogOpen(false); }}>{tr('cancel')}</Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || Object.keys(formErrors).length > 0 || !formData.member_name || !formData.national_id || !formData.date_of_birth || !formData.mobile_number || !formData.plan_category} 
                    className="bg-primary text-primary-foreground font-bold"
                  >
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : null}
                    {tr('submitRequest')}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="excel" className="mt-4 space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl p-8 hover:border-primary/50 transition-colors duration-200 bg-slate-50/30 dark:bg-slate-900/10">
                <Upload className="w-10 h-10 text-muted-foreground mb-4 animate-pulse" />
                <h4 className="font-bold text-sm text-foreground mb-1">{tr('uploadExcel')}</h4>
                <p className="text-xs text-muted-foreground text-center mb-6 max-w-sm">
                  {tr('excelDesc')}
                </p>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleExcelUpload} 
                  className="hidden" 
                  accept=".xlsx, .xls" 
                />
                
                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDownloadTemplate} 
                    className="gap-2 h-10 text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {tr('downloadTemplate')}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isSubmitting}
                    className="bg-primary text-primary-foreground font-bold h-10 text-xs gap-2"
                  >
                    {isSubmitting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {tr('chooseFile')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bulk Errors Display */}
          {bulkErrors.length > 0 && (
            <div className="mt-4 p-4 border-2 border-red-200 bg-red-50 rounded-2xl space-y-2 animate-in fade-in max-w-full">
              <h3 className="font-bold text-red-800 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Excel Sheet Validation Failures
              </h3>
              <div className="overflow-y-auto max-h-40 pr-2">
                <div className="space-y-1.5 text-xs text-red-700">
                  {bulkErrors.map((err, idx) => (
                    <div key={idx} className="border-b border-red-100 pb-1 last:border-0">
                      <span className="font-bold">Row {err.row} ({err.name}):</span> {err.errors.join(", ")}
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 h-8" onClick={() => setBulkErrors([])}>Dismiss Errors</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* B. Confirm Deletion Request Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {tr('reversalTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs text-destructive font-semibold border border-red-100 bg-red-50/50 p-3 rounded-xl mt-2 leading-relaxed">
              {tr('reversalConfirm')}
            </DialogDescription>
          </DialogHeader>

          {selectedMember ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs bg-slate-50 p-4 border rounded-xl font-semibold text-slate-700 max-h-[40vh] overflow-y-auto">
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Full Name English</p><p className="text-sm font-bold text-slate-900">{selectedMember.member_name || selectedMember.member_full_name}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Full Name Arabic</p><p className="text-sm font-bold text-slate-900">{selectedMember.full_name_arabic || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Relation</p><p className="text-sm font-bold text-slate-900">{selectedMember.relation}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Staff ID</p><p className="text-sm font-bold font-mono text-slate-900">{selectedMember.staff_code || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">National ID</p><p className="text-sm font-bold font-mono text-slate-900">{selectedMember.national_id || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Date of Birth</p><p className="text-sm font-bold text-slate-900">{selectedMember.date_of_birth || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Gender</p><p className="text-sm font-bold text-slate-900">{selectedMember.gender || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">PLAN</p><p className="text-sm font-bold text-slate-900">{selectedMember.plan_category || selectedMember.category || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Mobile Number</p><p className="text-sm font-bold text-slate-900">{selectedMember.mobile_number || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Marital Status</p><p className="text-sm font-bold text-slate-900">{selectedMember.marital_status || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Nationality</p><p className="text-sm font-bold text-slate-900">{selectedMember.nationality || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Location</p><p className="text-sm font-bold text-slate-900">{selectedMember.location || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Department</p><p className="text-sm font-bold text-slate-900">{selectedMember.department || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Job Title</p><p className="text-sm font-bold text-slate-900">{selectedMember.job_title || "-"}</p></div>
              <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Bank Name</p><p className="text-sm font-bold text-slate-900">{selectedMember.bank_name || "-"}</p></div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  Bank Account
                  {selectedMember.bank_account && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const nextReveal = !showBankDetails;
                        setShowBankDetails(nextReveal);
                        if (nextReveal) {
                          logPIIReveal(selectedMember.member_name || selectedMember.name || "Selected Member", selectedMember.id);
                        }
                      }} 
                      className="text-slate-400 hover:text-slate-600 focus:outline-none ml-1"
                    >
                      {showBankDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}
                </p>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {selectedMember.bank_account ? (showBankDetails ? selectedMember.bank_account : `•••• •••• ${selectedMember.bank_account.slice(-4)}`) : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase">IBAN</p>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {selectedMember.iban ? (showBankDetails ? selectedMember.iban : `${selectedMember.iban.slice(0, 4)} •••• •••• ${selectedMember.iban.slice(-4)}`) : "-"}
                </p>
              </div>
            </div>
          ) : selectedMemberIds.length > 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 border rounded-xl mt-4 text-xs md:text-sm">
              <p className="font-bold mb-2">{tr('reversingMultiple').replace('{count}', selectedMemberIds.length.toString())}</p>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2">
                {activeMembers.filter((m: any) => selectedMemberIds.includes(m.id)).map((m: any) => (
                  <div key={m.id} className="flex justify-between border-b border-border/40 pb-1">
                    <span className="font-semibold text-foreground">{m.member_name}</span>
                    <span className="text-muted-foreground text-[10px]">{translateRelation(m.relation)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>{tr('cancel')}</Button>
            <Button 
              type="button" 
              onClick={handleDeleteConfirm} 
              disabled={isSubmitting} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : null}
              {tr('confirmRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMember && (
        <Sheet open={!!viewMember} onOpenChange={() => setViewMember(null)}>
          <SheetContent className="sm:max-w-xl overflow-y-auto bg-white border-l p-6">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" /> Member Details
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Full coverage plan, profile credentials and banking data.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 pt-2">
              {/* Identity Details Card */}
              <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-[#0369A1] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> 1. Personal Profile
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">English Name</p><p className="text-sm font-bold text-slate-900">{viewMember.member_name || viewMember.member_full_name}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Arabic Name</p><p className="text-sm font-bold text-slate-900">{viewMember.full_name_arabic || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">National ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.national_id || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Date of Birth</p><p className="text-sm font-bold text-slate-900">{viewMember.date_of_birth || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Gender</p><p className="text-sm font-bold text-slate-900">{translateGender(viewMember.gender) || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Marital Status</p><p className="text-sm font-bold text-slate-900">{viewMember.marital_status || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Nationality</p><p className="text-sm font-bold text-slate-900">{viewMember.nationality || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Mobile</p><p className="text-sm font-bold text-slate-900">{viewMember.mobile_number || "-"}</p></div>
                </div>
              </div>

              {/* Policy & Coverage Details Card */}
              <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-[#0369A1] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> 2. Coverage & Plan
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Relation</p><p className="text-sm font-bold text-slate-900">{translateRelation(viewMember.relation)}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">PLAN Category</p><p className="text-sm font-bold text-slate-900">{viewMember.plan_category || viewMember.category || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Staff Code</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.staff_code || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Insurer Member ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.member_code || viewMember.member_id_insurance || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">TPA ID Code</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.member_tpa_code || viewMember.member_id_tpa || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Principle Employee ID</p><p className="text-sm font-bold font-mono text-slate-900">{viewMember.principle_id || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Location</p><p className="text-sm font-bold text-slate-900">{viewMember.location || viewMember.branch || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Department</p><p className="text-sm font-bold text-slate-900">{viewMember.department || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Job Title</p><p className="text-sm font-bold text-slate-900">{viewMember.job_title || "-"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Addition Date</p><p className="text-sm font-bold text-slate-900">{viewMember.addition_date ? new Date(viewMember.addition_date).toLocaleDateString() : "-"}</p></div>
                </div>
              </div>

              {/* Bank Account Details Card */}
              <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-[#0369A1] uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" /> 3. Banking & Payroll
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                  <div className="space-y-1"><p className="text-[10px] text-slate-400 uppercase">Bank Name</p><p className="text-sm font-bold text-slate-900">{viewMember.bank_name || "-"}</p></div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                      Account Number
                      {viewMember.bank_account && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const nextReveal = !showBankDetails;
                            setShowBankDetails(nextReveal);
                            if (nextReveal) {
                              logPIIReveal(viewMember.member_name || viewMember.name, viewMember.id);
                            }
                          }} 
                          className="text-slate-400 hover:text-slate-600 focus:outline-none ml-1"
                        >
                          {showBankDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </p>
                    <p className="text-sm font-bold font-mono text-slate-900">
                      {viewMember.bank_account ? (showBankDetails ? viewMember.bank_account : `•••• •••• ${viewMember.bank_account.slice(-4)}`) : "-"}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase">IBAN</p>
                    <p className="text-sm font-bold font-mono text-slate-900">
                      {viewMember.iban ? (showBankDetails ? viewMember.iban : `${viewMember.iban.slice(0, 4)} •••• •••• ${viewMember.iban.slice(-4)}`) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setViewMember(null)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6">Close</Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
