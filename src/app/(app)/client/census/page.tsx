'use client';

import React, { useState, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Info,
  TrendingUp,
  Loader2
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

const requestStages = [
  { name: "Draft", label: "Draft" },
  { name: "Pending Issuance", label: "Pending Issuance" },
  { name: "Issued", label: "Issued" },
  { name: "Completed", label: "Completed" }
];

const getRequestStepIndex = (status: string) => {
  switch (status) {
    case "Draft":
    case "Pending Approval": return 0;
    case "Pending": return 1;
    case "Approved":
    case "Issued": return 2;
    case "Invoiced":
    case "Completed": return 3;
    default: return 0;
  }
};

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

  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [formData, setFormData] = useState(emptyForm);
  const [viewMember, setViewMember] = useState<any>(null);
  const [bulkErrors, setBulkErrors] = useState<any[]>([]);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Cancellation request workflow states
  const [cancelDialogOpen, setCancelDialogOpen] = useState<boolean>(false);
  const [cancelSelectionIds, setCancelSelectionIds] = useState<string[]>([]);
  const [cancelErrors, setCancelErrors] = useState<any[]>([]);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState<boolean>(false);
  const [cancelSearchQuery, setCancelSearchQuery] = useState<string>("");

  // Request tracking search query state
  const [trackingSearchQuery, setTrackingSearchQuery] = useState<string>("");

  // Realistic sample claims utilization data
  const mockClaims = useMemo(() => [
    { id: "CLM-9021", patient: "Ahmed Hassan", provider: "El-Ahly Hospital", date: "2026-08-10", category: "Inpatient", amount: 15400, paid: 13860, status: "Paid" },
    { id: "CLM-9022", patient: "Mariam Ali", provider: "Giza Clinic", date: "2026-08-11", category: "Outpatient", amount: 850, paid: 680, status: "Paid" },
    { id: "CLM-9023", patient: "Omar Aly", provider: "Alpha Dental", date: "2026-08-12", category: "Dental", amount: 1200, paid: 960, status: "Approved" },
    { id: "CLM-9024", patient: "Hana Ibrahim", provider: "Cairo Scan", date: "2026-08-14", category: "Outpatient", amount: 3200, paid: 3200, status: "Pending Approval" },
    { id: "CLM-9025", patient: "Youssef Ahmed", provider: "El-Ezaby Pharmacy", date: "2026-08-15", category: "Outpatient", amount: 450, paid: 360, status: "Paid" }
  ], []);

  // Realistic sample recent activities
  const recentActivities = useMemo(() => [
    { id: "ACT-001", type: "Addition", desc: "Request submitted for Ahmed Hassan (Plan A)", date: "2026-08-22", user: "egeu@egeu.com" },
    { id: "ACT-002", type: "Cancellation", desc: "Request submitted for Omar Aly (Plan B)", date: "2026-08-21", user: "egeu@egeu.com" },
    { id: "ACT-003", type: "Status", desc: "Request REQ-2026-0012 status changed to Issued", date: "2026-08-20", user: "system" },
    { id: "ACT-004", type: "Policy", desc: "Annual utilization report generated", date: "2026-08-19", user: "system" }
  ], []);

  const [cancelValidRecords, setCancelValidRecords] = useState<any[]>([]);
  const [cancelInvalidRecords, setCancelInvalidRecords] = useState<any[]>([]);

  // Cancellation Excel template download
  const handleDownloadCancelTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "National ID": "29505200101234", "Insured ID": "INS-SAMPLE-01" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cancellations");
    XLSX.writeFile(wb, "Cancellation_Template.xlsx");
    toast({ title: "Template Downloaded", description: "Cancellation template downloaded successfully." });
  };

  // Parse and validate Excel cancellations
  const handleCancelExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const valid: any[] = [];
        const invalid: any[] = [];
        const seenNationalIds = new Set<string>();

        // Get all pending cancellation items in database to check duplicates
        const pendingCancellations = pendingRequests.filter((r: any) => r.action_type === 'delete');

        json.forEach((row: any, idx: number) => {
          const natId = String(row["National ID"] || row["national_id"] || "").trim();
          const insId = String(row["Insured ID"] || row["insured_id"] || "").trim();
          const rowIndex = idx + 2;

          if (!natId && !insId) {
            invalid.push({ row: rowIndex, error: "Row is empty (National ID or Insured ID required)" });
            return;
          }

          // Check duplicate in Excel
          if (natId && seenNationalIds.has(natId)) {
            invalid.push({ row: rowIndex, name: `Row ${rowIndex}`, error: "Duplicate record in uploaded Excel file." });
            return;
          }
          if (natId) seenNationalIds.add(natId);

          // Find match in active database roster
          const matchedMember = activeMembers.find((m: any) => 
            (natId && m.national_id === natId) || (insId && m.member_id_insurance === insId)
          );

          if (!matchedMember) {
            invalid.push({ row: rowIndex, name: natId || insId, error: "Beneficiary was not found in the active census roster." });
            return;
          }

          // Check if already cancelled
          if (matchedMember.deletion_date) {
            invalid.push({ row: rowIndex, name: matchedMember.member_name, error: "Beneficiary is already cancelled under this policy." });
            return;
          }

          // Check if already pending cancellation
          const hasPending = pendingCancellations.some((item: any) => 
            item.national_id === matchedMember.national_id
          );
          if (hasPending) {
            invalid.push({ row: rowIndex, name: matchedMember.member_name, error: "A cancellation request is already pending review for this beneficiary." });
            return;
          }

          // Valid
          valid.push({
            ...matchedMember,
            rowIndex
          });
        });

        setCancelValidRecords(valid);
        setCancelInvalidRecords(invalid);
      } catch (err: any) {
        console.error(err);
        toast({ variant: 'destructive', title: "Parse Error", description: "Failed to read Excel file." });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit manual selections for cancellation
  const handleManualCancellationSubmit = async () => {
    if (cancelSelectionIds.length === 0 || !selectedPolicyId) return;
    setIsCancelSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'deletion');
      const membersToCancel = activeMembers.filter((m: any) => cancelSelectionIds.includes(m.id));

      // Prevent duplicates check
      const { data: existingItems } = await supabase
        .from('endorsement_items')
        .select('id, name, national_id')
        .eq('endorsement_id', endorsementId);

      const duplicateCancels = membersToCancel.filter((m: any) => 
        existingItems?.some((item: any) => 
          (m.national_id && item.national_id === m.national_id) || 
          (m.member_name && item.name?.toLowerCase() === m.member_name.toLowerCase())
        )
      );

      if (duplicateCancels.length > 0) {
        toast({ 
          variant: 'destructive', 
          title: "Duplicate Request", 
          description: `${duplicateCancels.length} member(s) are already selected/submitted for deletion in this request.` 
        });
        setIsCancelSubmitting(false);
        return;
      }

      const payloads = membersToCancel.map((member: any) => ({
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
          notes: "Cancellation requested manually by client"
        }
      }));

      const { error } = await supabase
        .from('endorsement_items')
        .insert(sanitizeUUIDs(payloads));

      if (error) throw error;

      toast({
        title: "Cancellation Requests Submitted",
        description: `Successfully submitted cancellation requests for ${membersToCancel.length} beneficiaries.`
      });

      // Reset
      setCancelDialogOpen(false);
      setCancelSelectionIds([]);
      queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: "Failed to submit requests", description: err.message });
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  // Submit valid Excel cancellations
  const handleExcelCancellationSubmit = async () => {
    if (cancelValidRecords.length === 0 || !selectedPolicyId) return;
    setIsCancelSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'deletion');

      // Prevent duplicates check
      const { data: existingItems } = await supabase
        .from('endorsement_items')
        .select('id, name, national_id')
        .eq('endorsement_id', endorsementId);

      const duplicateExcels = cancelValidRecords.filter((m: any) => 
        existingItems?.some((item: any) => 
          (m.national_id && item.national_id === m.national_id) || 
          (m.member_name && item.name?.toLowerCase() === m.member_name.toLowerCase())
        )
      );

      if (duplicateExcels.length > 0) {
        toast({ 
          variant: 'destructive', 
          title: "Duplicate Request", 
          description: `${duplicateExcels.length} member(s) in this Excel sheet have already been requested for deletion.` 
        });
        setIsCancelSubmitting(false);
        return;
      }

      const payloads = cancelValidRecords.map((member: any) => ({
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
          notes: "Cancellation requested via Excel upload"
        }
      }));

      const { error } = await supabase
        .from('endorsement_items')
        .insert(sanitizeUUIDs(payloads));

      if (error) throw error;

      toast({
        title: "Cancellation Requests Submitted",
        description: `Successfully submitted cancellation requests for ${cancelValidRecords.length} beneficiaries.`
      });

      // Reset
      setCancelDialogOpen(false);
      setCancelValidRecords([]);
      setCancelInvalidRecords([]);
      queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: "Failed to submit requests", description: err.message });
    } finally {
      setIsCancelSubmitting(false);
    }
  };

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

  React.useEffect(() => {
    if (!addDialogOpen && !deleteConfirmOpen && !cancelDialogOpen && !viewMember && !selectedRequest) {
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
    }
  }, [addDialogOpen, deleteConfirmOpen, cancelDialogOpen, viewMember, selectedRequest]);

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
        .select('*, insurer:insurance_companies(logo_url, companyName), benefit_schedule:benefit_schedules!policies_benefit_schedule_id_fkey(*)');
      
      if (pId) {
        query = query.eq('id', pId);
      } else if (cId) {
        query = query.eq('client_company_id', cId).order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!clientProfile
  });

  // Auto-select the policy
  React.useEffect(() => {
    if (policies.length > 0 && !selectedPolicyId) {
      setSelectedPolicyId(policies[0].id);
    }
  }, [policies, selectedPolicyId]);

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
        .in('status', ['Draft', 'Pending', 'Pending Approval', 'Issued', 'Approved', 'Invoiced', 'Completed', 'Rejected']);
      
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
            endorsement_type: endorsement.type?.name || 'Endorsement',
            parent_endorsement: endorsement
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
      activeEmployees,
      medicalBrackets: activePolicy?.medical_brackets || []
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

    // 1. Check if a draft or pending endorsement of this type already exists
    const { data: existingEnd } = await supabase
      .from('endorsements')
      .select('id')
      .eq('policy_id', policyId)
      .eq('endorsement_type_id', typeId)
      .in('status', ['Draft', 'Pending', 'Pending Approval'])
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
        client_id: clientProfile?.company_id || null,
        line_of_business: 'Medical',
        endorsement_type_id: typeId,
        endorsement_number: endNumber,
        category: 'Corporate',
        status: 'Draft',
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
      activeEmployees,
      medicalBrackets: activePolicy?.medical_brackets || []
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

      // Prevent duplicates check
      const { data: existingItems } = await supabase
        .from('endorsement_items')
        .select('id, name, national_id')
        .eq('endorsement_id', endorsementId);

      const isDup = existingItems?.some((item: any) => 
        (formData.national_id && item.national_id === formData.national_id) ||
        (formData.member_name && item.name?.toLowerCase() === formData.member_name.toLowerCase())
      );

      if (isDup) {
        toast({ variant: 'destructive', title: "Duplicate Entry", description: "This member has already been added to this endorsement request." });
        setIsSubmitting(false);
        return;
      }

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

      // Prevent duplicates check
      const { data: existingItems } = await supabase
        .from('endorsement_items')
        .select('id, name, national_id')
        .eq('endorsement_id', endorsementId);

      const duplicateDeletes = membersToDelete.filter((m: any) => 
        existingItems?.some((item: any) => 
          (m.national_id && item.national_id === m.national_id) || 
          (m.member_name && item.name?.toLowerCase() === m.member_name.toLowerCase())
        )
      );

      if (duplicateDeletes.length > 0) {
        toast({ 
          variant: 'destructive', 
          title: "Duplicate Request", 
          description: `${duplicateDeletes.length} member(s) have already been selected/submitted for deletion in this endorsement request.` 
        });
        setIsSubmitting(false);
        return;
      }

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

        // Prevent duplicates check
        const { data: existingItems } = await supabase
          .from('endorsement_items')
          .select('id, name, national_id')
          .eq('endorsement_id', endorsementId);

        const duplicateAdditions = json.filter((row: any) => {
          const rowName = row["Member Name"] || row["Full Name English"] || '';
          const rowNid = String(row["National ID"] || '').trim();
          return existingItems?.some((item: any) => 
            (rowNid && item.national_id === rowNid) || 
            (rowName && item.name?.toLowerCase() === rowName.toLowerCase())
          );
        });

        if (duplicateAdditions.length > 0) {
          toast({ 
            variant: 'destructive', 
            title: "Duplicate Request", 
            description: `${duplicateAdditions.length} member(s) in this Excel sheet have already been added to this endorsement request.` 
          });
          setIsSubmitting(false);
          return;
        }

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

  // ==========================================
  // SCREEN RENDER FUNCTIONS
  // ==========================================

  // 1. Dashboard Screen
  const renderDashboard = () => {
    const activeCount = activeMembers.filter((m: any) => !m.deletion_date).length;
    const pendingCount = pendingRequests.length;
    const inProgressCount = pendingRequests.filter((r: any) => r.status === 'Draft' || r.status === 'Pending' || r.status === 'Pending Approval').length;
    
    const end = activePolicy?.end_date ? new Date(activePolicy.end_date) : null;
    const today = new Date();
    const remainingDays = end ? Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Corporate health insurance account overview</p>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">Real-time Overview</span>
        </div>
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200/80 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Beneficiaries</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{activeCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-slate-200/80 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Requests</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{pendingCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requests In Progress</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{inProgressCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Days</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{remainingDays} Days</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                <Calendar className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Policy Dates & Utilization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-slate-200/80 shadow-sm lg:col-span-2 bg-card">
            <CardHeader className="p-5 border-b flex flex-row items-center justify-between bg-slate-50/20">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Annual Utilization Summary</CardTitle>
                <CardDescription className="text-xs">Annual claims spend vs gross premium</CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">Active Coverage</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 text-sm font-semibold">Total Paid Claims Amount:</span>
                <span className="text-3xl font-black text-slate-900 font-mono">EGP 420,500</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                  <span>Spend (22.5%)</span>
                  <span>Limit (EGP 1,871,480)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '22.5%' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-dashed">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Policy Start Date</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{activePolicy?.start_date || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Policy End Date</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{activePolicy?.end_date || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Policy Status</p>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-0.5">{activePolicy?.policy_status || "Active"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="border border-slate-200/80 shadow-sm bg-card">
            <CardHeader className="p-5 border-b bg-slate-50/20">
              <CardTitle className="text-base font-bold text-slate-900">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs leading-normal">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    act.type === 'Addition' 
                      ? "bg-emerald-50 text-emerald-600" 
                      : act.type === 'Cancellation' 
                      ? "bg-rose-50 text-rose-600" 
                      : "bg-indigo-50 text-indigo-600"
                  )}>
                    {act.type === 'Addition' ? <Plus className="w-4 h-4" /> : act.type === 'Cancellation' ? <Trash2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{act.desc}</p>
                    <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{act.date}</span>
                      <span>•</span>
                      <span>By {act.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // 2. Beneficiaries Screen
  const renderBeneficiaries = () => {
    const activeCount = activeMembers.filter((m: any) => !m.deletion_date).length;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Beneficiaries</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage and query active corporate policy beneficiaries</p>
          </div>
          
          <div className="flex items-center gap-3">
            {policies.length > 1 && (
              <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                <SelectTrigger className="h-10 bg-background border-border shadow-sm w-48">
                  <SelectValue placeholder="Select Policy" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.policy_name || p.policy_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 bg-primary text-primary-foreground hover:bg-primary/95 font-bold shadow-md shadow-primary/10 gap-2 px-5">
                  <Plus className="w-4 h-4" />
                  New Request
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200/80 shadow-lg rounded-xl p-1 z-50">
                <DropdownMenuItem 
                  onClick={() => { setFormData(emptyForm); setAddDialogOpen(true); }}
                  className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50/60 p-2.5 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-emerald-500" />
                  Addition Request
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { setCancelSelectionIds([]); setCancelValidRecords([]); setCancelInvalidRecords([]); setCancelSearchQuery(""); setCancelDialogOpen(true); }}
                  className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50/60 p-2.5 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Cancellation Request
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search, filters, and list table */}
        <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-foreground">Active Insured Members</CardTitle>
              <Badge variant="outline" className="bg-indigo-50/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 font-bold">
                {activeCount} Members
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search beneficiaries..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="h-9 text-xs bg-background pl-9 text-left w-56"
                />
              </div>
              <Button onClick={handleDownloadCensus} size="sm" variant="outline" className="h-9 text-xs font-bold gap-1.5 bg-background shadow-sm hover:bg-slate-50">
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Export CSV/Excel
              </Button>
            </div>
          </div>

          <div className="border-t border-border/40">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                No active beneficiaries found.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[550px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">Beneficiary Name</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Insured Member ID</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">National ID</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Relation</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Membership Status</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Addition Date</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredMembers.map((m: any) => (
                      <tr 
                        key={m.id} 
                        onClick={() => setViewMember(m)}
                        className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="p-3 ps-6 font-bold text-foreground">{m.member_name}</td>
                        <td className="p-3 font-mono text-muted-foreground">{m.member_id_insurance || "-"}</td>
                        <td className="p-3 font-mono text-muted-foreground">{m.national_id}</td>
                        <td className="p-3">{m.plan_category || m.category || "-"}</td>
                        <td className="p-3">{translateRelation(m.relation)}</td>
                        <td className="p-3">
                          <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">Active</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{m.addition_date ? new Date(m.addition_date).toLocaleDateString() : "-"}</td>
                        <td className="p-3 text-right pe-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-bold p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewMember(m);
                            }}
                          >
                            View Details
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
      </div>
    );
  };

  // 3. Request Status Tracking Screen
  const renderTracking = () => {
    // Extract unique requests from items
    const uniqueRequestsMap = new Map();
    pendingRequests.forEach((item: any) => {
      if (item.parent_endorsement && !uniqueRequestsMap.has(item.parent_endorsement.id)) {
        uniqueRequestsMap.set(item.parent_endorsement.id, item.parent_endorsement);
      }
    });
    const uniqueRequests = Array.from(uniqueRequestsMap.values());

    // Filter items if search query is active
    const filteredTrackingItems = trackingSearchQuery 
      ? pendingRequests.filter((item: any) => 
          (item.member_name || '').toLowerCase().includes(trackingSearchQuery.toLowerCase()) ||
          (item.national_id || '').includes(trackingSearchQuery) ||
          (item.details?.full_name_arabic || '').includes(trackingSearchQuery)
        )
      : [];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Request Status Tracking</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Track the real-time status and lifecycle stages of coverage requests</p>
        </div>

        {/* Global Search box */}
        <Card className="border border-slate-200/80 shadow-sm p-4 bg-card">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by Beneficiary Name, National ID, or Arabic Name..." 
              value={trackingSearchQuery} 
              onChange={e => setTrackingSearchQuery(e.target.value)} 
              className="h-10 text-xs bg-background pl-9"
            />
          </div>
        </Card>

        {trackingSearchQuery ? (
          /* Search Results Table */
          <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
            <div className="p-4 border-b bg-slate-50/50">
              <h3 className="text-sm font-bold text-foreground">Search Results</h3>
            </div>
            <div className="border-t border-border/40">
              {filteredTrackingItems.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No matching request found.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[450px] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">Beneficiary</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Request Number</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Request Type</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Request Date</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Current Status</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredTrackingItems.map((item: any) => {
                        const siblingStatus = item.parent_endorsement?.status || "Draft";
                        const displayStatus = 
                          siblingStatus === 'Pending Approval' || siblingStatus === 'Pending'
                            ? 'Pending Issuance' 
                            : siblingStatus === 'Approved' || siblingStatus === 'Issued'
                            ? 'Issued' 
                            : siblingStatus === 'Invoiced' || siblingStatus === 'Completed'
                            ? 'Completed'
                            : siblingStatus;

                        const badgeColor = 
                          siblingStatus === 'Draft' 
                            ? 'bg-slate-50 text-slate-600 border-slate-200' 
                            : siblingStatus === 'Pending Approval' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : siblingStatus === 'Approved'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 ps-6">
                              <div>
                                <p className="font-bold text-foreground">{item.member_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {item.national_id}</p>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-muted-foreground font-bold">{item.endorsement_number}</td>
                            <td className="p-3">
                              <Badge variant="secondary" className={cn("text-[10px] font-semibold border-none", item.action_type === 'add' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                                {item.action_type === 'add' ? 'Addition' : 'Cancellation'}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={cn("text-[10px] font-bold border px-2 py-0.5", badgeColor)}>
                                {displayStatus}
                              </Badge>
                            </td>
                            <td className="p-3 text-right pe-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold p-0"
                                onClick={() => setSelectedRequest(item.parent_endorsement)}
                              >
                                View Stages
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        ) : (
          /* Main Endorsement Requests List */
          <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
            <div className="p-4 border-b bg-slate-50/50">
              <h3 className="text-sm font-bold text-foreground">Submitted Requests</h3>
            </div>
            <div className="border-t border-border/40">
              {uniqueRequests.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No requests submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-border">
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">Request Number</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Request Type</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Request Date</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Beneficiaries</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Current Status</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Last Updated</th>
                        <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {uniqueRequests.map((req: any) => {
                        const items = req.endorsement_items || [];
                        const actionType = items[0]?.action_type === 'delete' ? 'Cancellation' : 'Addition';
                        const displayStatus = 
                          req.status === 'Pending Approval' 
                            ? 'Pending Issuance' 
                            : req.status === 'Approved' 
                            ? 'Issued' 
                            : req.status === 'Invoiced' || req.status === 'Completed'
                            ? 'Completed'
                            : req.status;

                        const badgeColor = 
                          req.status === 'Draft' 
                            ? 'bg-slate-50 text-slate-600 border-slate-200' 
                            : req.status === 'Pending Approval' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : req.status === 'Approved'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                        return (
                          <tr 
                            key={req.id} 
                            onClick={() => setSelectedRequest(req)}
                            className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors duration-150 cursor-pointer"
                          >
                            <td className="p-3 ps-6 font-bold text-foreground font-mono">{req.endorsement_number}</td>
                            <td className="p-3">
                              <Badge variant="secondary" className={cn("text-[10px] font-semibold border-none", actionType === 'Addition' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                                {actionType}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</td>
                            <td className="p-3 font-bold text-slate-800">{items.length} Beneficiaries</td>
                            <td className="p-3">
                              <Badge variant="outline" className={cn("text-[10px] font-bold border px-2 py-0.5", badgeColor)}>
                                {displayStatus}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</td>
                            <td className="p-3 text-right pe-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRequest(req);
                                }}
                              >
                                View Stages
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  };

  // 4. Claims Utilization Screen
  const renderUtilization = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Claims Utilization</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Summary of claims activities and policy limit consumption</p>
        </div>

        {/* Claim summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border bg-card shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Claims Processed</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">245</h3>
          </Card>
          <Card className="p-5 border bg-card shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Claims Paid Amount</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">EGP 420,500</h3>
          </Card>
          <Card className="p-5 border bg-card shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Claim Value</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">EGP 1,716</h3>
          </Card>
        </div>

        {/* Claims list */}
        <Card className="border shadow-sm overflow-hidden bg-card">
          <div className="p-4 border-b bg-slate-50/50">
            <h3 className="text-sm font-bold text-foreground">Recent Claims Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="p-3 font-semibold text-muted-foreground uppercase ps-6">Claim ID</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Patient Name</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Service Provider</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Service Date</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Category</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Claim Amount</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Paid Amount</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase text-right pe-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {mockClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/10">
                    <td className="p-3 ps-6 font-mono font-bold text-slate-900">{claim.id}</td>
                    <td className="p-3 font-bold text-slate-800">{claim.patient}</td>
                    <td className="p-3 text-slate-700">{claim.provider}</td>
                    <td className="p-3 text-muted-foreground font-mono">{claim.date}</td>
                    <td className="p-3">{claim.category}</td>
                    <td className="p-3 font-mono font-semibold text-slate-700">EGP {claim.amount}</td>
                    <td className="p-3 font-mono font-bold text-blue-600">EGP {claim.paid}</td>
                    <td className="p-3 text-right pe-6">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold px-2 py-0.5",
                        claim.status === 'Paid' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : claim.status === 'Approved'
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {claim.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // 5. Policy Contract Screen
  const renderPolicy = () => {
    const brackets = activePolicy?.medical_brackets || [];
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Policy Contract</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Insurance contract settings, insurer, and coverage brackets</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Policy Information Card */}
          <Card className="border bg-card shadow-sm">
            <CardHeader className="p-5 border-b bg-slate-50/20">
              <CardTitle className="text-base font-bold text-slate-900">Contract Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Policy Name / No</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{activePolicy?.policy_name || activePolicy?.policy_number}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Insurer Company</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{activePolicy?.insurer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">TPA Admin</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{activePolicy?.tpa_name || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Policy Type</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{activePolicy?.policy_type || "MEDICAL"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Start Date</p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">{activePolicy?.start_date}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">End Date</p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">{activePolicy?.end_date}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Brackets Card */}
          <Card className="border bg-card shadow-sm">
            <CardHeader className="p-5 border-b bg-slate-50/20">
              <CardTitle className="text-base font-bold text-slate-900">Coverage Medical Brackets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[250px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border sticky top-0">
                      <th className="p-3 ps-5 font-semibold text-muted-foreground uppercase">Plan / Class</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase">Relation</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase">Age Range</th>
                      <th className="p-3 font-semibold text-muted-foreground uppercase text-right pe-5">Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {brackets.map((b: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/10">
                        <td className="p-3 ps-5 font-bold text-slate-800">Plan {b.plan || b.plan_category}</td>
                        <td className="p-3">{b.relation}</td>
                        <td className="p-3 font-mono">{b.age_from} - {b.age_to} yrs</td>
                        <td className="p-3 text-right pe-5 font-mono font-bold text-blue-600">EGP {b.net_premium}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // 6. Benefits Screen
  const renderBenefits = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Policy Benefits Schedule</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Insurance benefits schedule and coverage rules</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border bg-card shadow-sm">
            <CardHeader className="p-5 border-b bg-slate-50/20">
              <CardTitle className="text-base font-bold text-slate-900">Inpatient & General Limitations</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs font-semibold text-slate-700 leading-relaxed">
              <div className="flex justify-between border-b pb-2"><span>Annual Maximum Limit</span><span className="font-bold text-slate-900">EGP 150,000 / Beneficiary</span></div>
              <div className="flex justify-between border-b pb-2"><span>Accommodation Room Class</span><span className="font-bold text-slate-900">Standard Single Room</span></div>
              <div className="flex justify-between border-b pb-2"><span>Intensive Care Unit (ICU)</span><span className="font-bold text-slate-900">Fully Covered</span></div>
              <div className="flex justify-between border-b pb-2"><span>Parental Companion (Child &lt; 12)</span><span className="font-bold text-slate-900">Fully Covered</span></div>
              <div className="flex justify-between pb-2"><span>Emergency Ambulance Service</span><span className="font-bold text-slate-900">Fully Covered (EGP 1,500 sublimit)</span></div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-sm">
            <CardHeader className="p-5 border-b bg-slate-50/20">
              <CardTitle className="text-base font-bold text-slate-900">Outpatient Copayments & Sublimits</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs font-semibold text-slate-700 leading-relaxed">
              <div className="flex justify-between border-b pb-2"><span>Outpatient Consultation Copay</span><span className="font-bold text-slate-900">10% Copayment</span></div>
              <div className="flex justify-between border-b pb-2"><span>Diagnostics (Labs & Scans)</span><span className="font-bold text-slate-900">10% Copayment</span></div>
              <div className="flex justify-between border-b pb-2"><span>Pharmaceutical Drugs Limit</span><span className="font-bold text-slate-900">EGP 10,000 / Beneficiary (15% copay)</span></div>
              <div className="flex justify-between border-b pb-2"><span>Dental Care Limit</span><span className="font-bold text-slate-900">EGP 2,000 / Beneficiary (20% copay)</span></div>
              <div className="flex justify-between pb-2"><span>Optical Cover Limit</span><span className="font-bold text-slate-900">EGP 1,000 / Beneficiary (20% copay)</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // 7. Additions Screen (Active beneficiaries added, not request tickets)
  const renderAdditions = () => {
    const addedMembers = activeMembers.filter((m: any) => !m.deletion_date);
    const filteredAdded = addedMembers.filter((m: any) =>
      (m.member_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.national_id || '').includes(searchQuery)
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Additions History</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Lists all active beneficiaries successfully added to the policy</p>
          </div>
          <Button onClick={handleDownloadCensus} className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2">
            <Download className="w-4 h-4" /> Download List
          </Button>
        </div>

        <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
          <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
            <div className="relative w-72">
              <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search additions..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="h-9 text-xs pl-9"
              />
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-bold border-emerald-100">
              {filteredAdded.length} Beneficiaries
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="p-3 font-semibold text-muted-foreground uppercase ps-6">Beneficiary Name</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Insured Member ID</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">National ID</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Category</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Relation</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Addition Date</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase text-right pe-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAdded.map((m: any) => (
                  <tr 
                    key={m.id} 
                    onClick={() => setViewMember(m)}
                    className="hover:bg-slate-50/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3 ps-6 font-bold text-slate-900">{m.member_name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{m.member_id_insurance || "-"}</td>
                    <td className="p-3 font-mono text-muted-foreground">{m.national_id}</td>
                    <td className="p-3">Plan {m.plan_category || m.category || "-"}</td>
                    <td className="p-3">{translateRelation(m.relation)}</td>
                    <td className="p-3 text-muted-foreground">{m.addition_date ? new Date(m.addition_date).toLocaleDateString() : "-"}</td>
                    <td className="p-3 text-right pe-6">
                      <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">Added</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // 8. Cancellations Screen
  const renderCancellations = () => {
    const cancelledMembers = activeMembers.filter((m: any) => m.deletion_date);
    const filteredCancelled = cancelledMembers.filter((m: any) =>
      (m.member_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.national_id || '').includes(searchQuery)
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cancellations History</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Lists all corporate policy beneficiaries whose coverage has been cancelled</p>
        </div>

        <Card className="border border-border/85 shadow-sm overflow-hidden bg-card">
          <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
            <div className="relative w-72">
              <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search cancellations..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="h-9 text-xs pl-9"
              />
            </div>
            <Badge variant="outline" className="bg-rose-50 text-rose-700 font-bold border-rose-100">
              {filteredCancelled.length} Cancelled
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="p-3 font-semibold text-muted-foreground uppercase ps-6">Beneficiary Name</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Insured Member ID</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">National ID</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Category</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Relation</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase">Cancellation Date</th>
                  <th className="p-3 font-semibold text-muted-foreground uppercase text-right pe-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCancelled.map((m: any) => (
                  <tr 
                    key={m.id} 
                    onClick={() => setViewMember(m)}
                    className="hover:bg-slate-50/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3 ps-6 font-bold text-slate-900">{m.member_name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{m.member_id_insurance || "-"}</td>
                    <td className="p-3 font-mono text-muted-foreground">{m.national_id}</td>
                    <td className="p-3">Plan {m.plan_category || m.category || "-"}</td>
                    <td className="p-3">{translateRelation(m.relation)}</td>
                    <td className="p-3 text-muted-foreground">{m.deletion_date ? new Date(m.deletion_date).toLocaleDateString() : "-"}</td>
                    <td className="p-3 text-right pe-6">
                      <Badge className="bg-rose-50 text-rose-700 border-none font-bold">Cancelled</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
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
      {/* Render active screen based on tab */}
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return renderDashboard();
          case 'beneficiaries':
            return renderBeneficiaries();
          case 'tracking':
            return renderTracking();
          case 'utilization':
            return renderUtilization();
          case 'policy':
            return renderPolicy();
          case 'benefits':
            return renderBenefits();
          case 'additions':
            return renderAdditions();
          case 'cancellations':
            return renderCancellations();
          default:
            return renderDashboard();
        }
      })()}

      {/* B. Request Member Cancellations Dialog (Manual Selection + Excel Upload Match) */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Request Beneficiary Cancellations
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select active members to cancel or upload an Excel cancellation sheet.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 border rounded-lg h-10">
              <TabsTrigger value="manual" className="text-xs font-semibold py-1.5">Manual Selection</TabsTrigger>
              <TabsTrigger value="excel" className="text-xs font-semibold py-1.5">Excel Upload Match</TabsTrigger>
            </TabsList>

            {/* Manual Selection Tab */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="relative w-full">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                <Input 
                  placeholder="Search active members to cancel..." 
                  value={cancelSearchQuery} 
                  onChange={e => setCancelSearchQuery(e.target.value)} 
                  className={cn("h-9 text-xs bg-background ps-9", isRtl ? "pr-9 text-right" : "pl-9 text-left")}
                />
              </div>

              <div className="max-h-[290px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                <p className="text-xs text-slate-500 font-semibold mb-2">
                  Select one or more active members to submit cancellation request:
                </p>
                {activeMembers
                  .filter((m: any) => !m.deletion_date)
                  .filter((m: any) => {
                    if (!cancelSearchQuery) return true;
                    const q = cancelSearchQuery.toLowerCase();
                    return (
                      (m.member_name || "").toLowerCase().includes(q) ||
                      (m.member_id_insurance || "").toLowerCase().includes(q) ||
                      (m.national_id || "").toLowerCase().includes(q)
                    );
                  })
                  .map((m: any) => {
                    const isChecked = cancelSelectionIds.includes(m.id);
                    return (
                      <div 
                        key={m.id} 
                        onClick={() => {
                          setCancelSelectionIds(prev => 
                            isChecked ? prev.filter(id => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50/50 transition-colors cursor-pointer",
                          isChecked ? "border-rose-200 bg-rose-50/20" : "border-border"
                        )}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          readOnly
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <p className="font-bold text-slate-900">{m.member_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold font-mono">
                            ID: {m.member_id_insurance || m.national_id} • Plan: {m.plan_category || m.category} • Relation: {translateRelation(m.relation)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                }
                {activeMembers
                  .filter((m: any) => !m.deletion_date)
                  .filter((m: any) => {
                    if (!cancelSearchQuery) return true;
                    const q = cancelSearchQuery.toLowerCase();
                    return (
                      (m.member_name || "").toLowerCase().includes(q) ||
                      (m.member_id_insurance || "").toLowerCase().includes(q) ||
                      (m.national_id || "").toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No matching active members found.
                    </div>
                  )
                }
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Close</Button>
                <Button 
                  disabled={cancelSelectionIds.length === 0 || isCancelSubmitting}
                  onClick={handleManualCancellationSubmit}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isCancelSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Submit Cancellation ({cancelSelectionIds.length})
                </Button>
              </div>
            </TabsContent>

            {/* Excel Upload Tab */}
            <TabsContent value="excel" className="space-y-4 mt-4">
              <div className="p-5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Upload Cancellation Spreadsheet</p>
                  <p className="text-[10px] text-slate-400 mt-1">Spreadsheet must contain columns: 'National ID' and 'Insured ID'</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleDownloadCancelTemplate} className="h-8 text-[10px] font-bold">
                    Download Template
                  </Button>
                  <label className="h-8 inline-flex items-center justify-center rounded-md text-[10px] font-bold border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                    Browse File
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      onChange={handleCancelExcelUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Validation Results UI */}
              {(cancelValidRecords.length > 0 || cancelInvalidRecords.length > 0) && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-600">Valid Members</span>
                      <h4 className="text-xl font-black text-emerald-800 font-mono mt-0.5">{cancelValidRecords.length}</h4>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <span className="text-[10px] uppercase font-bold text-rose-600">Invalid Records</span>
                      <h4 className="text-xl font-black text-rose-800 font-mono mt-0.5">{cancelInvalidRecords.length}</h4>
                    </div>
                  </div>

                  {cancelInvalidRecords.length > 0 && (
                    <div className="p-3 bg-rose-50/30 border border-rose-100 rounded-xl max-h-[150px] overflow-y-auto custom-scrollbar space-y-2">
                      <p className="text-[10px] font-bold text-rose-700 uppercase">Errors list:</p>
                      {cancelInvalidRecords.map((err, idx) => (
                        <div key={idx} className="text-xs text-rose-800 flex gap-1.5 leading-normal">
                          <span className="font-bold font-mono">Row {err.row}:</span>
                          <span>{err.error} ({err.name})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCancelValidRecords([]);
                        setCancelInvalidRecords([]);
                      }}
                      className="h-10 text-xs font-bold"
                    >
                      Clear File
                    </Button>
                    <Button 
                      disabled={cancelValidRecords.length === 0 || isCancelSubmitting}
                      onClick={handleExcelCancellationSubmit}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 text-xs"
                    >
                      {isCancelSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                      Proceed with Valid Records ({cancelValidRecords.length})
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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
                            {activePolicy?.medical_brackets && activePolicy.medical_brackets.length > 0 ? (
                              Array.from(new Set(activePolicy.medical_brackets.map((b: any) => b.plan)))
                                .filter(Boolean)
                                .map((planName: any) => (
                                  <SelectItem key={planName} value={planName}>{planName}</SelectItem>
                                ))
                            ) : dbPlans.length > 0 ? (
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
                  {/* Family Links */}
                  {(() => {
                    const isPrincipal = viewMember.relation?.toLowerCase() === 'principal' || viewMember.relation?.toLowerCase() === 'employee';
                    if (isPrincipal) {
                      const spouse = activeMembers.find((m: any) => 
                        m.relation?.toLowerCase() === 'spouse' && 
                        (m.linked_main_member_id === viewMember.id || (m.staff_code && m.staff_code === viewMember.staff_code))
                      );
                      const children = activeMembers.filter((m: any) => 
                        m.relation?.toLowerCase() === 'child' && 
                        (m.linked_main_member_id === viewMember.id || (m.staff_code && m.staff_code === viewMember.staff_code))
                      );
                      if (spouse || children.length > 0) {
                        return (
                          <>
                            {spouse && (
                              <div className="space-y-1 col-span-2">
                                <p className="text-[10px] text-slate-400 uppercase">Spouse Name</p>
                                <p className="text-sm font-bold text-slate-900">{spouse.member_name || spouse.member_full_name}</p>
                              </div>
                            )}
                            {children.length > 0 && (
                              <div className="space-y-1 col-span-2">
                                <p className="text-[10px] text-slate-400 uppercase">Children Names</p>
                                <p className="text-sm font-bold text-slate-900">
                                  {children.map((c: any) => c.member_name || c.member_full_name).join(', ')}
                                </p>
                              </div>
                            )}
                          </>
                        );
                      }
                    } else {
                      const head = activeMembers.find((m: any) => 
                        (m.relation?.toLowerCase() === 'principal' || m.relation?.toLowerCase() === 'employee') && 
                        (m.id === viewMember.linked_main_member_id || (viewMember.staff_code && m.staff_code === viewMember.staff_code))
                      );
                      if (head) {
                        return (
                          <div className="space-y-1 col-span-2">
                            <p className="text-[10px] text-slate-400 uppercase">Head of Family</p>
                            <p className="text-sm font-bold text-slate-900">{head.member_name || head.member_full_name}</p>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
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

      {/* C. Request Stages Popup Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}>
        <DialogContent className="max-w-4xl bg-card border border-border shadow-lg p-6">
          {selectedRequest && (() => {
            const stepIndex = getRequestStepIndex(selectedRequest.status);
            const items = selectedRequest.endorsement_items || [];
            const actionType = items[0]?.action_type === 'delete' ? 'Cancellation' : 'Addition';
            const requestTitle = `${actionType} Request • ${items.length} ${items.length === 1 ? 'Beneficiary' : 'Beneficiaries'}`;

            return (
              <>
                <DialogHeader className="flex flex-row justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                      {selectedRequest.endorsement_number}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-semibold text-slate-400 mt-1">
                      {requestTitle}
                    </DialogDescription>
                  </div>
                </DialogHeader>

                {/* Visual Stepper */}
                <div className="relative flex items-center justify-between w-full mt-6 mb-10 px-12">
                  {/* Gray background line */}
                  <div className="absolute left-[12.5%] right-[12.5%] top-4 h-[2px] bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
                  
                  {/* Blue active progress line */}
                  <div 
                    className="absolute left-[12.5%] top-4 h-[2px] bg-blue-600 -translate-y-1/2 z-0 transition-all duration-300"
                    style={{ width: `${(stepIndex / 3) * 75}%` }}
                  />

                  {requestStages.map((stage, idx) => {
                    const isCompleted = idx <= stepIndex;
                    return (
                      <div key={idx} className="relative z-10 flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300 border-2",
                          isCompleted 
                            ? "bg-blue-600 border-blue-600 text-white" 
                            : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500"
                        )}>
                          {idx + 1}
                        </div>
                        <span className={cn(
                          "text-xs font-semibold mt-2",
                          isCompleted 
                            ? "text-blue-600 dark:text-blue-400 font-bold" 
                            : "text-slate-400 dark:text-slate-500"
                        )}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Sibling Items list */}
                <div className="mt-4 space-y-3">
                  <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
                    <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/10 border-b border-border">
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">Beneficiary</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">National ID</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Member ID</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {items.map((sibling: any) => {
                            const memberId = sibling.details?.member_id_insurance || sibling.member_id_insurance || sibling.details?.member_id_tpa || sibling.member_id_tpa || "-";
                            const siblingStatus = selectedRequest.status;
                            const badgeColor = 
                              siblingStatus === 'Draft' 
                                ? 'bg-slate-50 text-slate-600 border-slate-200' 
                                : siblingStatus === 'Pending' || siblingStatus === 'Pending Approval' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400' 
                                : siblingStatus === 'Approved' || siblingStatus === 'Issued'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400';

                            const displayStatus = 
                              siblingStatus === 'Pending' || siblingStatus === 'Pending Approval' 
                                ? 'Pending Issuance' 
                                : siblingStatus === 'Approved' || siblingStatus === 'Issued' 
                                ? 'Issued' 
                                : siblingStatus === 'Invoiced' || siblingStatus === 'Completed'
                                ? 'Completed'
                                : siblingStatus;

                            return (
                              <tr key={sibling.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors">
                                <td className="p-3 font-bold text-foreground ps-6">{sibling.name || sibling.member_name}</td>
                                <td className="p-3 font-mono text-muted-foreground">{sibling.national_id}</td>
                                <td className="p-3 font-mono text-muted-foreground">{memberId}</td>
                                <td className="p-3 text-right pe-6">
                                  <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 border", badgeColor)}>
                                    {displayStatus}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={() => setSelectedRequest(null)} className="h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6">
                    Close
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
