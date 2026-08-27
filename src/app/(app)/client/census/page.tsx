'use client';

import React, { useState, useRef, useMemo, useEffect } from "react";
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
  Mail,
  Phone,
  Globe,
  TrendingUp,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  Stethoscope,
  ShieldAlert,
  Calculator,
  BrainCircuit,
  Layers,
  Zap,
  Target,
  DollarSign,
  Sliders,
  X,
  ChevronLeft,
  Activity,
  LayoutDashboard,
  HeartPulse
} from "lucide-react";
import { format } from "date-fns";
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
import { cn, getCleanStorageUrl, formatCompactNumber } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";
import { validateMemberAddition, calculateAge, validateNationalID } from "@/lib/endorsement-validation";
import { downloadCensusTemplateFile, parseExcelRowToPayload } from "@/lib/census-excel-helper";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line, LabelList
} from "recharts";
import {
  calculatePhase1BasicAnalysis,
  calculatePhase2AdvancedAnalysis,
  calculatePhase3ForecastingAnalysis,
  runScenarioSimulator,
  DEFAULT_ICD_CHAPTERS
} from "@/lib/medical-analytics/advanced-analytics-service";
import { generateMedicalUtilizationInsights } from "@/ai/flows/medical-utilization-insights";

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
    members: "Beneficiaries",
    requests: "Requests",
    searchPlaceholder: "Search by name, ID...",
    downloadCensus: "Download Census",
    downloadAdditions: "Download Additions",
    downloadDeletions: "Download Deletions",
    activeInsuredMembers: "Active Insured Beneficiaries",
    activeInsuredDesc: "View and filter all currently active insured beneficiaries under this contract.",
    pendingRequests: "Pending Requests",
    pendingRequestsDesc: "Track your pending beneficiary addition and deletion requests.",
    noActiveMembers: "No active census beneficiaries match your filter query.",
    noPendingRequests: "No pending addition or deletion requests registered.",
    name: "Name",
    relation: "Relation",
    planCategory: "Plan Category",
    department: "Department",
    requestCancellation: "Request Cancellation",
    memberName: "Beneficiary Name",
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
    requestMemberAdditions: "Request Beneficiary Additions",
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
    linkedMain: "Linked Main Beneficiary (Employee) *",
    nationality: "Nationality",
    location: "Location",
    jobTitle: "Job Title",
    staffCode: "Staff ID",
    submitRequest: "Submit Request",
    uploadExcel: "Upload Excel Spreadsheet",
    excelDesc: "Drag and drop your membership spreadsheet file here, or click to browse. Supports Excel formats (.xlsx, .xls).",
    downloadTemplate: "Download Template",
    chooseFile: "Choose File",
    reversalConfirm: "Warning: The deletion will be applied after 48 hours. You can reverse the deletion within this time, but after 48 hours, the deletion cannot be reversed.",
    reversalTitle: "Request Beneficiary Cancellation",
    reversingMultiple: "You are requesting cancellation for {count} beneficiaries:",
    age: "Age",
    yrs: "yrs",
    employee: "Employee",
    spouse: "Spouse",
    child: "Child",
    male: "Male",
    female: "Female",
    addMember: "Add Beneficiary",
    dashboard: "Dashboard",
    dashboardSubtitle: "Corporate health insurance account overview",
    activeBeneficiaries: "Active Beneficiaries",
    inProgressRequests: "Requests In Progress",
    remainingDays: "Remaining Days",
    annualUtilization: "Annual Utilization Summary",
    totalPaidClaims: "Total Paid Claims Amount",
    spend: "Spend",
    limit: "Limit",
    startDate: "Policy Start Date",
    endDate: "Policy End Date",
    recentActivities: "Recent Activities",
    by: "By",
    beneficiaries: "Beneficiaries",
    beneficiariesSubtitle: "Manage and query active corporate policy beneficiaries",
    selectPolicy: "Select Policy",
    newRequest: "New Request",
    addSingle: "Add Single Beneficiary",
    bulkExcel: "Bulk Excel Upload",
    searchBeneficiary: "Search beneficiaries...",
    dobLabel: "Date of Birth",
    nationalityLabel: "Nationality",
    locationLabel: "Location",
    jobTitleLabel: "Job Title",
    staffCodeLabel: "Staff Code",
    mobileLabel: "Mobile Number",
    linkedMainLabel: "Linked Main Member Code",
    arabicNameLabel: "Full Name Arabic",
    maritalStatusLabel: "Marital Status",
    bankNameLabel: "Bank Name",
    bankAccountLabel: "Bank Account Number",
    ibanLabel: "IBAN",
    notesLabel: "Notes / Comments",
    submit: "Submit Request",
    active: "Active",
    terminated: "Terminated",
    pendingCancellation: "Pending Cancellation",
    noBeneficiaries: "No beneficiaries found matching search.",
    utilization: "Claims Utilization",
    utilizationSubtitle: "Actuarial consumption analysis and renewal simulator for your contract",
    basicAnalysis: "Basic Analysis",
    lossRatioFinancials: "Loss Ratio & Financials",
    paretoLargeClaims: "Pareto & Large Claims",
    clinicalICD: "Clinical & ICD Chapters",
    demographicsAge: "Demographics & Age",
    qualityAudit: "Quality & Audit Flags",
    renewalForecasting: "Renewal & Forecasting",
    aiInsightsTab: "AI Strategic Insights",
    totalNetClaims: "Total Net Claims Cost",
    totalClaimsCount: "Total Claims Count",
    avgCostClaim: "Avg Cost / Claim",
    pmpy: "PMPY (Per Enrolled Life)",
    utilizationRate: "Utilization Rate",
    claimsByCaseType: "Claims Cost by Case Type",
    top10Diagnoses: "Top 10 Diagnoses by Frequency",
    icd: "ICD",
    diagnosis: "Diagnosis",
    count: "Count",
    totalNet: "Total Net (EGP)",
    lossRatioPlan: "Loss Ratio by Census Plan Category",
    overallLossRatio: "Overall Contract Loss Ratio",
    overallLossRatioSubtitle: "Actuarial Loss Ratio Across Enrolled Lives",
    contractPremium: "Contract Premium",
    riskConcentrationTiers: "Member Cost Concentration Tiers",
    costConcentrationSubtitle: "Distribution of claims cost across member spending brackets",
    chronicBurden: "Chronic Burden & Clinical Risk",
    chronicHeadcount: "Chronic Lives",
    chronicPrevalence: "Chronic Prevalence",
    nonChronicSpend: "Non-Chronic Spend",
    largeClaimsReport: "Large Claims & High-Cost Claimant Report",
    largeClaimsSubtitle: "Identifies catastrophic expenditures exceeding the threshold limit",
    highCostClaimants: "High-Cost Claimants",
    highCostNetSpend: "High-Cost Net Spend",
    shareTotalSpend: "Share of Total Spend",
    avgHighCostSpend: "Avg High-Cost Spend / Member",
    annualCost: "Annual Cost (EGP)",
    percentTotal: "% of Total",
    auditAction: "Audit Action",
    itemizedHistory: "Itemized History",
    icdClusteringTitle: "ICD-10 Chapter Clustering (Cost Ranked)",
    icdClusteringSubtitle: "Primary clinical disease categories ranked by total net claims spend",
    diseaseChapters: "Disease Chapters",
    headcountPyramid: "Population Demographics Age & Gender Pyramid",
    headcountSubtitle: "Enrolled headcount distribution across age bands and gender",
    maleHeadcount: "Male Headcount",
    femaleHeadcount: "Female Headcount",
    principalDependentSplit: "Principal vs Dependent Split",
    familyRatioSubtitle: "Family ratio and dependency profile",
    dependentRatio: "Dependent Ratio",
    dependentsPerPrincipal: "Dependents per Principal Employee",
    principalEmployees: "Principal Employees",
    spouses: "Spouses",
    children: "Children",
    ageRiskProfile: "Claims Spend & Risk Intensity by Age Band",
    ageRiskSubtitle: "Average claims spend per member (EGP) across age brackets",
    providerOutliers: "Provider Outliers (>1.5x Peer Average)",
    duplicateClaims: "Duplicate Claim Flags (Within 7-Day Window)",
    renewalGuidance: "Renewal Guidance",
    renewalScenarioTitle: "Interactive Renewal Scenario Simulator",
    copayIncrease: "Lever A: Co-payment Increase (%)",
    copaySavings: "Estimated Co-pay Savings",
    restrictOon: "Lever B: Restrict Out-of-Network Claims",
    oonSavingsDesc: "Applies 35% leakage restriction savings to non-network claims",
    scenarioSavings: "Total Estimated Savings",
    newLossRatio: "New Projected Loss Ratio",
    executiveSummary: "Executive Summary",
    findingsInsights: "Key Findings & Clinical Insights",
    recommendations: "Actionable Recommendations",
    noIngestedClaims: "No Ingested Claims Data",
    noIngestedClaimsDesc: "There is no medical consumption data associated with your policy yet. Your account manager will upload claims sheets to enable the 3-Phase Advanced Actuarial Engine.",
    days: "Days"
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
    employee: "عضو رئيسي",
    spouse: "تابع - زوج/زوجة",
    child: "تابع - ابن/ابنة",
    male: "ذكر",
    female: "أنثى",
    addMember: "إضافة مستفيد جديد",
    dashboard: "لوحة التحكم",
    dashboardSubtitle: "نظرة عامة على حساب التأمين الطبي للشركة",
    activeBeneficiaries: "المستفيدين النشطين",
    inProgressRequests: "طلب قيد التنفيذ",
    remainingDays: "الأيام المتبقية",
    annualUtilization: "ملخص الاستهلاك السنوي للمطالبات",
    totalPaidClaims: "إجمالي مطالبات التأمين المدفوعة",
    spend: "المستهلك",
    limit: "الحد الأقصى للتغطية",
    startDate: "تاريخ بدء الوثيقة",
    endDate: "تاريخ انتهاء الوثيقة",
    recentActivities: "أحدث العمليات",
    by: "بواسطة",
    beneficiaries: "المستفيدين",
    beneficiariesSubtitle: "إدارة والاستعلام عن المستفيدين النشطين بالشركة",
    selectPolicy: "اختر وثيقة التأمين",
    newRequest: "طلب جديد",
    addSingle: "إضافة مستفيد فردي",
    bulkExcel: "رفع جماعي عبر إكسيل",
    searchBeneficiary: "بحث عن مستفيد...",
    dobLabel: "تاريخ الميلاد",
    nationalityLabel: "الجنسية",
    locationLabel: "الموقع / الفرع",
    jobTitleLabel: "المسمى الوظيفي",
    staffCodeLabel: "كود الموظف",
    mobileLabel: "رقم الهاتف المحمول",
    linkedMainLabel: "كود الموظف الرئيسي المرتبط",
    arabicNameLabel: "الاسم الكامل باللغة العربية",
    maritalStatusLabel: "الحالة الاجتماعية",
    bankNameLabel: "اسم البنك",
    bankAccountLabel: "رقم حساب البنك",
    ibanLabel: "رقم الآيبان (IBAN)",
    notesLabel: "ملاحظات / تعليقات",
    submit: "إرسال الطلب",
    active: "نشط",
    terminated: "ملغي",
    pendingCancellation: "قيد الحذف",
    noBeneficiaries: "لا يوجد مستفيدين مطابقين للبحث.",
    utilization: "معدلات الاستهلاك",
    utilizationSubtitle: "تحليل الاستهلاك الاكتواري ومحاكي تجديد العقد للوثيقة",
    basicAnalysis: "التحليل الأساسي",
    lossRatioFinancials: "نسب الخسارة والتحليل المالي",
    paretoLargeClaims: "تحليل باريتو والمطالبات الكبرى",
    clinicalICD: "التصنيف الطبي للأمراض",
    demographicsAge: "البيانات الديموغرافية والأعمار",
    qualityAudit: "مؤشرات الجودة ومراجعة المطالبات",
    renewalForecasting: "التجديد والتحليل التنبئي",
    aiInsightsTab: "الرؤى الاستراتيجية للذكاء الاصطناعي",
    totalNetClaims: "إجمالي تكلفة المطالبات الصافية",
    totalClaimsCount: "عدد المطالبات الإجمالي",
    avgCostClaim: "متوسط تكلفة المطالبة",
    pmpy: "متوسط الاستهلاك السنوي للفرد (PMPY)",
    utilizationRate: "نسبة الاستهلاك الإجمالية",
    claimsByCaseType: "تكلفة المطالبات حسب نوع التغطية",
    top10Diagnoses: "أهم 10 تشخيصات طبية تكراراً",
    icd: "رمز التشخيص (ICD)",
    diagnosis: "التشخيص الطبي",
    count: "عدد الحالات",
    totalNet: "صافي التكلفة (جم)",
    lossRatioPlan: "نسبة الخسارة حسب فئة التغطية",
    overallLossRatio: "نسبة الخسارة الإجمالية للوثيقة",
    overallLossRatioSubtitle: "نسبة الخسارة الاكتوارية الفعلية للأعضاء المؤمن عليهم",
    contractPremium: "إجمالي قسط التأمين السنوي",
    riskConcentrationTiers: "شرائح تركز تكلفة الأعضاء",
    costConcentrationSubtitle: "توزيع تكلفة المطالبات حسب فئات إنفاق الأعضاء",
    chronicBurden: "عبء الأمراض المزمنة والمخاطر الطبية",
    chronicHeadcount: "الأعضاء المصابين بأمراض مزمنة",
    chronicPrevalence: "معدل انتشار الأمراض المزمنة",
    nonChronicSpend: "إنفاق الحالات غير المزمنة",
    largeClaimsReport: "تقرير المطالبات الكبرى والأعضاء الأكثر استهلاكاً",
    largeClaimsSubtitle: "تحديد النفقات الاستثنائية التي تتجاوز الحد المحدد للمطالبة",
    highCostClaimants: "الأعضاء الأكثر استهلاكاً",
    highCostNetSpend: "إجمالي مطالبات الاستهلاك المرتفع",
    shareTotalSpend: "حصة الإنفاق الإجمالي",
    avgHighCostSpend: "متوسط الإنفاق للعضو المرتفع التكلفة",
    annualCost: "التكلفة السنوية (جم)",
    percentTotal: "النسبة من الإجمالي",
    auditAction: "إجراء التدقيق",
    itemizedHistory: "سجل المطالبات التفصيلي",
    icdClusteringTitle: "تجميع الأمراض حسب فصول ICD-10 (مرتبة حسب التكلفة)",
    icdClusteringSubtitle: "الفئات الطبية الرئيسية للأمراض مرتبة حسب إجمالي الإنفاق الصافي",
    diseaseChapters: "الفصول الطبية للأمراض",
    headcountPyramid: "الهرم الديموغرافي لتوزيع الأعضاء حسب العمر والجنس",
    headcountSubtitle: "توزيع تعداد الأعضاء المؤمن عليهم عبر الفئات العمرية والجنس",
    maleHeadcount: "تعداد الذكور",
    femaleHeadcount: "تعداد الإناث",
    principalDependentSplit: "توزيع الأعضاء الرئيسيين والتابعين",
    familyRatioSubtitle: "نسبة التابعين ونظام هيكل الأسر المؤمن عليها",
    dependentRatio: "معدل التبعية الفعلي",
    dependentsPerPrincipal: "عدد التابعين لكل موظف رئيسي",
    principalEmployees: "الموظفين الرئيسيين",
    spouses: "الأزواج / الزوجات",
    children: "الأبناء",
    ageRiskProfile: "كثافة المخاطر وقيمة المطالبات حسب الفئة العمرية",
    ageRiskSubtitle: "متوسط الإنفاق السنوي للعضو (جم) عبر الفئات العمرية المختلفة",
    providerOutliers: "مقدمو الخدمة الأكثر تكلفة (>1.5 ضعف متوسط الأقران)",
    duplicateClaims: "مطالبات مكررة محتملة (خلال نافذة 7 أيام)",
    renewalGuidance: "توصية التجديد الاكتوارية",
    renewalScenarioTitle: "محاكي سيناريوهات التجديد التفاعلي",
    copayIncrease: "أداة أ: زيادة نسبة التحمل للعضو (%)",
    copaySavings: "الوفورات المتوقعة لنسبة التحمل",
    restrictOon: "أداة ب: تقييد مطالبات مقدمي الخدمة خارج الشبكة",
    oonSavingsDesc: "تطبيق وفورات تسرب بنسبة 35% على مقدمي الخدمة غير المعتمدين بالشبكة",
    scenarioSavings: "إجمالي الوفورات المتوقعة بالسيناريو",
    newLossRatio: "نسبة الخسارة المتوقعة الجديدة للوثيقة",
    executiveSummary: "الملخص التنفيذي",
    findingsInsights: "النتائج الرئيسية والرؤى الطبية",
    recommendations: "التوصيات الإجرائية الفعالة",
    noIngestedClaims: "لا تتوفر بيانات مطالبات مرفوعة بعد",
    noIngestedClaimsDesc: "لا توجد بيانات استهلاك طبي مرتبط بوثيقتك حاليًا. سيقوم مدير حسابك برفع ملفات الاستهلاك لتفعيل محرك التحليل الاكتواري ثلاثي المراحل.",
    days: "يوم"
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
  const tabsScrollRef = useRef<HTMLDivElement>(null);

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

  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [isConsumptionLoading, setIsConsumptionLoading] = useState<boolean>(false);
  const [largeClaimThreshold, setLargeClaimThreshold] = useState<number>(50000);
  const [copayIncreasePercent, setCopayIncreasePercent] = useState<number>(5);
  const [oonRestrictionFlag, setOonRestrictionFlag] = useState<boolean>(true);
  const [selectedMemberModal, setSelectedMemberModal] = useState<any | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

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
  const [trackingStatusFilter, setTrackingStatusFilter] = useState<string>("all");
  const [trackingTypeFilter, setTrackingTypeFilter] = useState<string>("all");

  // Dependent linking and multi-child support states
  const [parentSearchQuery, setParentSearchQuery] = useState<string>("");
  const [parentSearchResult, setParentSearchResult] = useState<any>(null);
  const [parentSearchError, setParentSearchError] = useState<string>("");
  const [additionalChildren, setAdditionalChildren] = useState<any[]>([]);

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

  const [additionEffectiveDate, setAdditionEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cancellationEffectiveDate, setCancellationEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);



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
        const pendingCancellations = pendingRequests.filter((r: any) => 
          r.action_type === 'delete' &&
          ['Draft', 'Pending Approval', 'Pending'].includes(r.parent_endorsement?.status)
        );

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

    if (!cancellationEffectiveDate) {
      toast({
        variant: 'destructive',
        title: "Missing Effective Date",
        description: "Effective Date is required."
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (cancellationEffectiveDate < todayStr) {
      toast({
        variant: 'destructive',
        title: "Invalid Effective Date",
        description: "Effective Date cannot be in the past."
      });
      return;
    }

    setIsCancelSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'deletion', cancellationEffectiveDate);
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
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
    }
  };

  // Submit valid Excel cancellations
  const handleExcelCancellationSubmit = async () => {
    if (cancelValidRecords.length === 0 || !selectedPolicyId) return;

    if (!cancellationEffectiveDate) {
      toast({
        variant: 'destructive',
        title: "Missing Effective Date",
        description: "Effective Date is required."
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (cancellationEffectiveDate < todayStr) {
      toast({
        variant: 'destructive',
        title: "Invalid Effective Date",
        description: "Effective Date cannot be in the past."
      });
      return;
    }

    setIsCancelSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'deletion', cancellationEffectiveDate);

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
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
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
    if (!addDialogOpen) {
      setParentSearchQuery("");
      setParentSearchResult(null);
      setParentSearchError("");
      setAdditionalChildren([]);
    }
  }, [addDialogOpen]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!addDialogOpen && !deleteConfirmOpen && !cancelDialogOpen && !viewMember && !selectedRequest) {
        if (typeof document !== 'undefined') {
          document.body.style.pointerEvents = 'auto';
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [addDialogOpen, deleteConfirmOpen, cancelDialogOpen, viewMember, selectedRequest, isSubmitting, isCancelSubmitting]);



  const getRemainingHours = (createdAtStr: string) => {
    if (!createdAtStr) return 0;
    const created = new Date(createdAtStr);
    if (isNaN(created.getTime())) return 0;
    const now = new Date();
    const diffMs = created.getTime() + 48 * 60 * 60 * 1000 - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return diffHours > 0 ? diffHours : 0;
  };


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

  // Realtime subscription to keep client portal synced with database updates without manual refresh
  React.useEffect(() => {
    if (!selectedPolicyId) return;

    const channel = supabase
      .channel('client-portal-sync-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'policy_members', filter: `policy_id=eq.${selectedPolicyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['policyMembers', selectedPolicyId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'endorsements', filter: `policy_id=eq.${selectedPolicyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'endorsement_items' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['policyEndorsements', selectedPolicyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPolicyId, queryClient]);

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

  const COLORS = useMemo(() => ['#131A80', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F43F5E'], []);
  const MONOCHROME_BLUES = useMemo(() => ['#0F172A', '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'], []);
  const WARM_COLORS = useMemo(() => ['#DC2626', '#EA580C', '#D97706', '#EAB308', '#B45309', '#F43F5E', '#C05621', '#DD6B20', '#E53E3E', '#D69E2E'], []);

  const policyValueConfig = useMemo(() => ({
    annual_premium: activePolicy?.premium_total || 600000
  }), [activePolicy]);

  const phase1 = useMemo(() => {
    if (!activePolicy || consumptionData.length === 0) return null;
    return calculatePhase1BasicAnalysis(consumptionData, activeMembers, policyValueConfig);
  }, [consumptionData, activeMembers, activePolicy, policyValueConfig]);

  const phase2 = useMemo(() => {
    if (!activePolicy || consumptionData.length === 0) return null;
    return calculatePhase2AdvancedAnalysis(consumptionData, activeMembers, policyValueConfig, largeClaimThreshold);
  }, [consumptionData, activeMembers, activePolicy, policyValueConfig, largeClaimThreshold]);

  const phase3 = useMemo(() => {
    if (!activePolicy || consumptionData.length === 0) return null;
    return calculatePhase3ForecastingAnalysis(consumptionData, activeMembers, policyValueConfig);
  }, [consumptionData, activeMembers, activePolicy, policyValueConfig]);

  const simulatorResults = useMemo(() => {
    if (!activePolicy || consumptionData.length === 0) return null;
    return runScenarioSimulator(
      consumptionData,
      activeMembers,
      policyValueConfig,
      copayIncreasePercent,
      { 'Outpatient': 1000 },
      oonRestrictionFlag
    );
  }, [consumptionData, activeMembers, activePolicy, policyValueConfig, copayIncreasePercent, oonRestrictionFlag]);

  // Helper functions for medical utilization analytics Excel ingestion
  const normalizeHeader = (k: string) => k.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

  const getRowVal = (row: any, patterns: string[]) => {
    if (!row) return undefined;
    const keys = Object.keys(row);
    for (const p of patterns) {
      const normP = normalizeHeader(p);
      const match = keys.find(k => {
        const normK = normalizeHeader(k);
        return normK === normP || normK.startsWith(normP) || normK.includes(normP);
      });
      if (match !== undefined) return row[match];
    }
    return undefined;
  };

  const parseClaimDate = (d: any): Date => {
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    if (typeof d === 'number') {
      const date = new Date(Math.round((d - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date;
    }
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date();
  };

  const calculateAgeFromDob = (dob: any): number | null => {
    if (!dob) return null;
    let dateObj: Date | null = null;

    if (dob instanceof Date && !isNaN(dob.getTime())) {
      dateObj = dob;
    } else if (typeof dob === 'number') {
      dateObj = new Date(Math.round((dob - 25569) * 86400 * 1000));
    } else if (typeof dob === 'string') {
      const trimmed = dob.trim();
      if (!trimmed) return null;

      if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 3) {
          const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
          if (year > 1900 && year < 2100) {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const month = parts[2].length === 4 ? (p0 > 12 ? p1 - 1 : p0 - 1) : parseInt(parts[1], 10) - 1;
            const day = parts[2].length === 4 ? (p0 > 12 ? p0 : p1) : parseInt(parts[2], 10);
            dateObj = new Date(year, month, day);
          }
        }
      }
      if (!dateObj || isNaN(dateObj.getTime())) {
        dateObj = new Date(trimmed);
      }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
      const ageDiffMs = Date.now() - dateObj.getTime();
      const ageDate = new Date(ageDiffMs);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      return (calculatedAge >= 0 && calculatedAge <= 120) ? calculatedAge : null;
    }
    return null;
  };

  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Run AI analysis
  const runAiAnalysis = async (data: any[], p1: any, p2: any, p3: any) => {
    if (data.length === 0 || !p1) return;
    setIsAnalyzing(true);
    try {
      const result = await generateMedicalUtilizationInsights({
        companyName: activePolicy?.client_company_name || 'Valued Client',
        kpis: {
          totalClaims: p1.kpis.totalClaimsCount,
          totalNetCost: p1.kpis.totalNetCost,
          averageCostPerMember: p1.kpis.avgCostPerMemberPMPY,
          lossRatio: p2?.financialPerformance.overallLossRatio || 75,
          pmpm: p1.kpis.avgCostPerMemberPMPY / 12
        },
        forecasting: {
          projectedTotal: p3?.projection.annualizedProjectedTotal || 0,
          nextYearForecast: p3?.projection.nextYearForecastTotal || 0,
          forecastedLossRatio: p3?.projection.projectedLossRatio || 0
        },
        clinicalInsights: {
          chronicCost: p2?.riskConcentration.chronicBurden.chronicCost || 0,
          maternityCost: 0,
          erCost: 0
        },
        topProviders: p1.topProviders.byCost.slice(0, 5),
        costByCaseType: {},
        costByProviderType: {}
      });
      setAiInsights(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Automatically fetch and parse latest consumption file from documents
  useEffect(() => {
    if (activeTab === 'utilization' && activePolicy) {
      const loadConsumption = async () => {
        setIsConsumptionLoading(true);
        try {
          // 1. Fetch from policy_utilization_reports database table
          const { data: dbReports, error: dbError } = await supabase
            .from('policy_utilization_reports')
            .select('file_url, file_name, created_at')
            .eq('policy_id', activePolicy.id);

          let latestDoc: { url: string; uploaded_at: string; name: string } | null = null;

          if (!dbError && dbReports && dbReports.length > 0) {
            // Sort by created_at desc to find latest
            const sortedDb = dbReports.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            latestDoc = {
              url: sortedDb[0].file_url,
              uploaded_at: sortedDb[0].created_at,
              name: sortedDb[0].file_name
            };
          }

          // 2. Fetch from policies.related_documents array
          const docs = activePolicy.related_documents || [];
          const consumptionDocs = docs.filter((doc: any) => doc.type === 'consumption');
          if (consumptionDocs.length > 0) {
            const sortedRel = consumptionDocs.sort((a: any, b: any) =>
              new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
            );

            // Compare and take the newest between DB and related_documents
            if (!latestDoc || new Date(sortedRel[0].uploaded_at) > new Date(latestDoc.uploaded_at)) {
              latestDoc = {
                url: sortedRel[0].url,
                uploaded_at: sortedRel[0].uploaded_at,
                name: sortedRel[0].name
              };
            }
          }

          if (!latestDoc) {
            setConsumptionData([]);
            setIsConsumptionLoading(false);
            return;
          }

          // Fetch file from URL
          const fileUrl = getCleanStorageUrl(latestDoc.url);
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error("Network response was not ok");
          const arrayBuffer = await response.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawClaims = XLSX.utils.sheet_to_json(firstSheet);

          if (!rawClaims || rawClaims.length === 0) {
            setConsumptionData([]);
            setIsConsumptionLoading(false);
            return;
          }

          // Build census member lookup maps
          const censusMap = new Map<string, any>();
          const censusNameMap = new Map<string, any>();
          if (activeMembers && activeMembers.length > 0) {
            activeMembers.forEach((m: any) => {
              const codes = [
                m.member_id_tpa,
                m.staff_code,
                m.member_id_insurance,
                m.member_tpa_code,
                m.tpa_code,
                m.code,
                m.member_code,
                m.id
              ];
              codes.forEach(c => {
                if (c) {
                  const cleanC = String(c).trim().toLowerCase();
                  if (cleanC) censusMap.set(cleanC, m);
                }
              });

              const name = m.member_name || m.name;
              if (name) {
                const cleanN = String(name).trim().toLowerCase();
                if (cleanN) censusNameMap.set(cleanN, m);
              }
            });
          }

          // Process and enrich claims
          const processedClaims: any[] = [];
          for (const row of rawClaims) {
            const status = String(getRowVal(row, ['approvalstatus', 'status']) || '').toLowerCase();
            const isRejected = status.includes('reject') || status.includes('decline') || status.includes('deny');
            if (isRejected) continue; // Skip rejected claims

            const rawMemberCode = String(getRowVal(row, [
              'membercode', 'membertpacode', 'tpacode', 'code', 'cardno', 'cardnumber',
              'memberid', 'beneficiarycode', 'patientcode', 'staffcode', 'employeeid', 'كودالعضو', 'رقمالكارت'
            ]) || '').trim();

            const rawMemberName = String(getRowVal(row, [
              'membername', 'patientname', 'beneficiaryname', 'name', 'employeename', 'اسمالعضو', 'اسمالمريض'
            ]) || '').trim();

            let censusMatch: any = rawMemberCode ? censusMap.get(rawMemberCode.toLowerCase()) : null;
            if (!censusMatch && rawMemberName) {
              censusMatch = censusNameMap.get(rawMemberName.toLowerCase());
            }

            const memberCode = censusMatch?.member_id_tpa || censusMatch?.staff_code || censusMatch?.member_tpa_code || censusMatch?.tpa_code || censusMatch?.code || rawMemberCode || `MEMBER-${processedClaims.length + 1}`;
            const memberName = censusMatch?.member_name || censusMatch?.name || rawMemberName || 'Unknown Member';

            const gender = censusMatch?.gender || getRowVal(row, ['gender', 'sex', 'النوع', 'الجنس']) || 'M';

            let age: number | null = null;
            if (censusMatch?.date_of_birth || censusMatch?.dob) {
              age = calculateAgeFromDob(censusMatch.date_of_birth || censusMatch.dob);
            }
            if (age === null) {
              const claimDob = getRowVal(row, ['dob', 'dateofbirth', 'birthdate', 'تاريخالميلاد']);
              if (claimDob) age = calculateAgeFromDob(claimDob);
            }
            if (age === null) {
              const claimAgeVal = getRowVal(row, ['age', 'العمر']);
              if (claimAgeVal !== undefined) {
                const parsed = parseNum(claimAgeVal);
                if (parsed > 0 && parsed <= 120) age = parsed;
              }
            }
            const finalAge = age !== null ? age : 32;

            const serviceDate = parseClaimDate(getRowVal(row, [
              'servicedate', 'claimdate', 'treatmentdate', 'admissiondate', 'date', 'تاريخالخدمة'
            ]));

            const providerName = String(getRowVal(row, [
              'providername', 'facilityname', 'hospitalname', 'provider', 'facility', 'اسممقدمالخدمة'
            ]) || activePolicy?.tpa_name || 'Standard Provider');

            const providerType = String(getRowVal(row, [
              'providertype', 'facilitytype', 'category', 'type', 'نوعمقدمالخدمة'
            ]) || 'Clinic/Hospital');

            const caseType = String(getRowVal(row, [
              'casetype', 'servicetype', 'claimtype', 'inpatientoutpatient', 'category', 'نوعالحالة'
            ]) || 'Outpatient');

            const icdCode = String(getRowVal(row, [
              'icdcode', 'icd', 'icd10', 'diagnosiscode', 'كودالتشخيص'
            ]) || 'R69');

            const icdDescription = String(getRowVal(row, [
              'diagnosisdescription', 'diagnosis', 'icddescription', 'chiefcomplaint', 'التشخيص'
            ]) || 'General Symptoms / Evaluation');

            const grossAmount = parseNum(getRowVal(row, [
              'approvalamount', 'grossamount', 'totalamount', 'claimamount', 'المبلغالإجمالي'
            ]));

            const copayment = parseNum(getRowVal(row, [
              'copayment', 'copay', 'deductible', 'نسبةالتحمل', 'مبلغالتحمل'
            ]));

            let netAmount = parseNum(getRowVal(row, [
              'netamount', 'paidamount', 'claimpaid', 'approvedamount', 'المبلغالصافي', 'المبلغالمدفوع'
            ]));

            if (netAmount === 0 && grossAmount > 0) {
              netAmount = Math.max(0, grossAmount - copayment);
            }

            const serviceNameEn = String(getRowVal(row, [
              'servicename', 'drugname', 'itemname', 'actiontype', 'servicenameen', 'اسمالدواء'
            ]) || icdDescription);

            const speciality = String(getRowVal(row, [
              'speciality', 'specialty', 'department', 'dept', 'التخصص'
            ]) || 'General Practice');

            const actionType = String(getRowVal(row, [
              'actiontype', 'transactiontype', 'itemtype', 'claimaction'
            ]) || caseType);

            processedClaims.push({
              'Member Code': memberCode,
              memberCode,
              memberName,
              age: finalAge,
              gender,
              serviceDate,
              providerName,
              providerType,
              caseType,
              icdCode,
              icdDescription,
              speciality,
              serviceNameEn,
              actionType,
              grossAmount,
              copayment,
              netAmount,
              highCostFlag: netAmount > 50000,
              riskScore: netAmount > 50000 ? 'High' : 'Normal',
              episodeId: `EP-${memberCode}-${icdCode}`
            });
          }

          setConsumptionData(processedClaims);

          // Calculate phases to pass to AI Analysis
          const policyValueConfig = { annual_premium: activePolicy?.premium_total || 600000 };
          const p1 = calculatePhase1BasicAnalysis(processedClaims, activeMembers, policyValueConfig);
          const p2 = calculatePhase2AdvancedAnalysis(processedClaims, activeMembers, policyValueConfig, largeClaimThreshold);
          const p3 = calculatePhase3ForecastingAnalysis(processedClaims, activeMembers, policyValueConfig);

          runAiAnalysis(processedClaims, p1, p2, p3);

        } catch (err) {
          console.error("Failed to parse consumption data:", err);
        } finally {
          setIsConsumptionLoading(false);
        }
      };
      loadConsumption();
    }
  }, [activeTab, activePolicy?.id, activeMembers?.length, largeClaimThreshold]);

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

  const pendingAdditionNIDs = useMemo(() => {
    return new Set(
      pendingRequests
        .filter((item: any) => 
          item.action_type === 'add' && 
          ['Draft', 'Pending Approval', 'Pending'].includes(item.parent_endorsement?.status)
        )
        .map((item: any) => item.national_id)
        .filter(Boolean)
    );
  }, [pendingRequests]);

  const pendingCancellationNIDs = useMemo(() => {
    return new Set(
      pendingRequests
        .filter((item: any) => 
          item.action_type === 'delete' && 
          ['Draft', 'Pending Approval', 'Pending'].includes(item.parent_endorsement?.status)
        )
        .map((item: any) => item.national_id)
        .filter(Boolean)
    );
  }, [pendingRequests]);

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
  const getOrCreateEndorsementId = async (policyId: string, type: 'addition' | 'deletion', effectiveDate?: string) => {
    // Fetch target endorsement type
    const { data: typeRec } = await supabase
      .from('endorsement_types')
      .select('id')
      .eq('name', type === 'addition' ? 'Addition Endorsement (new member/s)' : 'Deletion Endorsement (member/s termination)')
      .maybeSingle();

    const typeId = typeRec?.id || null;

    // Create a new endorsement
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
        effective_date: effectiveDate || new Date().toISOString().split('T')[0],
        source: 'Client Portal'
      })
      .select('id')
      .single();

    if (error) throw error;
    return newEnd.id;
  };

  const handleClientParentSearch = (query: string) => {
    setParentSearchQuery(query);
    setParentSearchError("");
    setParentSearchResult(null);
    handleInputChange("linked_main_member_id", "");
    handleInputChange("principle_id", "");
    
    if (!query.trim()) return;
    const lowerQuery = query.trim().toLowerCase();
    
    const found = activeMembers.find((m: any) => 
      (m.staff_code || "").toLowerCase() === lowerQuery ||
      (m.national_id || "") === lowerQuery ||
      (m.member_name || "").toLowerCase().includes(lowerQuery)
    );
    
    if (found) {
      setParentSearchResult(found);
      handleInputChange("linked_main_member_id", found.id);
      handleInputChange("principle_id", found.staff_code || "");
    } else {
      setParentSearchError("No active employee found with this name, National ID, or Staff ID.");
    }
  };

  const handleAddChildToList = () => {
    const errors: Record<string, string> = {};
    if (!formData.member_name.trim()) errors.member_name = "Name is required";
    if (!formData.national_id.trim() || !/^\d{14}$/.test(formData.national_id.trim())) {
      errors.national_id = "National ID must be exactly 14 digits";
    }
    if (!formData.plan_category) errors.plan_category = "Plan category is required";
    if (!formData.linked_main_member_id) errors.linked_main_member_id = "Parent employee is required";
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ variant: "destructive", title: "Form Invalid", description: "Please complete child details." });
      return;
    }
    
    setAdditionalChildren(prev => [...prev, { ...formData, id: Date.now() }]);
    
    setFormData(prev => ({
      ...prev,
      member_name: "",
      national_id: "",
      date_of_birth: "",
      gender: "Male",
      mobile_number: "",
      notes: "",
      full_name_arabic: ""
    }));
    setFormErrors({});
  };

  // Submit manual addition request
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) return;

    if (!additionEffectiveDate) {
      toast({
        variant: 'destructive',
        title: "Missing Effective Date",
        description: "Effective Date is required."
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (additionEffectiveDate < todayStr) {
      toast({
        variant: 'destructive',
        title: "Invalid Effective Date",
        description: "Effective Date cannot be in the past."
      });
      return;
    }

    const itemsToInsert: any[] = [];
    
    if (formData.member_name.trim()) {
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
      
      itemsToInsert.push({ ...formData });
    }

    additionalChildren.forEach(child => {
      itemsToInsert.push({ ...child });
    });

    if (itemsToInsert.length === 0) {
      toast({
        variant: 'destructive',
        title: "No Beneficiary Data",
        description: "Please fill out the form (and click Add Child to List if adding multiple children)."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'addition', additionEffectiveDate);

      const payloads = itemsToInsert.map(m => ({
        endorsement_id: endorsementId,
        name: m.member_name,
        national_id: m.national_id,
        action_type: 'add',
        premium: 0,
        details: {
          member_id_insurance: m.member_id_insurance,
          member_id_tpa: m.member_id_tpa,
          staff_code: m.staff_code,
          date_of_birth: m.date_of_birth || null,
          gender: m.gender,
          relation: m.relation,
          nationality: m.nationality,
          plan_category: m.plan_category,
          location: m.location,
          department: m.department,
          job_title: m.job_title,
          mobile_number: m.mobile_number,
          linked_main_member_id: m.linked_main_member_id || null,
          full_name_arabic: m.full_name_arabic || null,
          marital_status: m.marital_status || null,
          bank_name: m.bank_name || null,
          bank_account: m.bank_account || null,
          iban: m.iban || null,
          principle_id: m.principle_id || null,
          notes: m.notes || "Addition requested by client"
        }
      }));

      const { error } = await supabase
        .from('endorsement_items')
        .insert(sanitizeUUIDs(payloads));

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: `Successfully submitted request for ${payloads.length} beneficiary(ies).`
      });

      setFormData(emptyForm);
      setAdditionalChildren([]);
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
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
    }
  };

  // Request member deletion (Single or Bulk)
  const handleDeleteConfirm = async () => {
    if (!selectedPolicyId) return;

    if (!cancellationEffectiveDate) {
      toast({
        variant: 'destructive',
        title: "Missing Effective Date",
        description: "Effective Date is required."
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (cancellationEffectiveDate < todayStr) {
      toast({
        variant: 'destructive',
        title: "Invalid Effective Date",
        description: "Effective Date cannot be in the past."
      });
      return;
    }

    const membersToDelete = selectedMember
      ? [selectedMember]
      : activeMembers.filter((m: any) => selectedMemberIds.includes(m.id));

    if (membersToDelete.length === 0) return;
    setIsSubmitting(true);

    try {
      const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'deletion', cancellationEffectiveDate);

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
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
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
    const dataToExport = activeOnly.map((m: any, index: number) => ({
      "Serial": index + 1,
      "Beneficiary Name": m.member_name || '',
      "National ID": m.national_id || '',
      "Staff ID": m.staff_code || '',
      "Insurer ID": m.member_id_insurance || '',
      "Principal ID": m.principle_id || '',
      "Individual ID": m.member_id_tpa || '',
      "Date of Birth": m.date_of_birth || '',
      "Gender": m.gender || '',
      "Relationship": m.relation || '',
      "Nationality": m.nationality || '',
      "Plan Category": m.plan_category || '',
      "Mobile Number": m.mobile_number || '',
      "Location": m.location || '',
      "Department": m.department || '',
      "Job Title": m.job_title || '',
      "Marital Status": m.marital_status || '',
      "Bank Name": m.bank_name || '',
      "Bank Account Number": m.bank_account || '',
      "IBAN": m.iban || '',
      "Notes": m.notes || '',
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

    if (!additionEffectiveDate) {
      toast({
        variant: 'destructive',
        title: "Missing Effective Date",
        description: "Effective Date is required before uploading."
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (additionEffectiveDate < todayStr) {
      toast({
        variant: 'destructive',
        title: "Invalid Effective Date",
        description: "Effective Date cannot be in the past."
      });
      return;
    }

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
        const endorsementId = await getOrCreateEndorsementId(selectedPolicyId, 'addition', additionEffectiveDate);

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

          const isPendingAdd = memberObj.national_id && pendingAdditionNIDs.has(memberObj.national_id);
          const valResult = validateMemberAddition(memberObj, validationConfig);
          
          let errors = { ...valResult.errors };
          let isValid = valResult.isValid;

          if (isPendingAdd) {
            errors.national_id = "A pending addition request already exists for this member.";
            isValid = false;
          }

          if (!isValid) {
            collectedErrors.push({
              row: index + 2,
              name: memberObj.member_name || 'Unnamed',
              errors: Object.values(errors)
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
        if (typeof document !== 'undefined') {
          document.body.style.pointerEvents = 'auto';
        }
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

    const policyLogo = activePolicy?.related_documents?.find((doc: any) => doc.type === 'logo')?.url;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">

        {/* ── Hero Company Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 shadow-xl">
          <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {policyLogo ? (
                <img
                  src={getCleanStorageUrl(policyLogo)}
                  alt={activePolicy?.client_company_name || "Logo"}
                  className="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 shadow-lg border border-white/20 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg backdrop-blur-sm shrink-0">
                  {activePolicy?.client_company_name
                    ? activePolicy.client_company_name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                    : '?'}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-0.5">{tr('activeContract')}</p>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                  {activePolicy?.client_company_name || tr('dashboard')}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {tr('insurer')}: <span className="text-indigo-300 font-semibold">{activePolicy?.insurer_name || '-'}</span>
                  &nbsp;·&nbsp;
                  {tr('validity')}: <span className="text-indigo-300 font-semibold font-mono">{activePolicy?.start_date} → {activePolicy?.end_date}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activePolicy?.policy_status || tr('active')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 border border-white/10">
                {tr('remainingDays')}: <span className="font-black text-white ml-1">{remainingDays}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Metric Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 – Active Beneficiaries */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 transition-shadow">
            <div className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">{tr('activeBeneficiaries')}</p>
                <p className="text-4xl font-black text-white mt-2 font-mono">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 2 – Pending Requests */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 transition-shadow">
            <div className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-amber-100 uppercase tracking-wider">{tr('pendingRequests')}</p>
                <p className="text-4xl font-black text-white mt-2 font-mono">{pendingCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Card 3 – In-Progress */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 p-5 shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50 transition-shadow">
            <div className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-violet-200 uppercase tracking-wider">{tr('inProgressRequests')}</p>
                <p className="text-4xl font-black text-white mt-2 font-mono">{inProgressCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 4 – Total Net Claims (clickable → utilization tab) */}
          <button
            type="button"
            onClick={() => router.push('?tab=utilization')}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-5 shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 transition-all hover:scale-[1.02] text-left cursor-pointer"
          >
            <div className="pointer-events-none absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">{tr('totalPaidClaims')}</p>
                <p className="text-2xl font-black text-white mt-2 font-mono leading-tight">
                  {phase1?.kpis?.totalNetCost
                    ? `EGP ${phase1.kpis.totalNetCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                    : consumptionData.length === 0 ? '—' : 'EGP 0'}
                </p>
                <p className="text-[10px] text-emerald-200 font-semibold mt-1 flex items-center gap-1">
                  <span>{tr('totalNetClaims')}</span>
                  <span>↗</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>

        {/* ── Policy Dates & Utilization ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-slate-200/80 shadow-sm lg:col-span-2 bg-card">
            <CardHeader className="p-5 border-b flex flex-row items-center justify-between bg-slate-50/20">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">{tr('annualUtilization')}</CardTitle>
                <CardDescription className="text-xs">Annual claims spend vs gross premium</CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">{tr('active')}</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 text-sm font-semibold">{tr('totalPaidClaims')}:</span>
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {phase1?.kpis?.totalNetCost
                    ? `EGP ${phase1.kpis.totalNetCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                    : 'EGP —'}
                </span>
              </div>
              <div className="space-y-2">
                {(() => {
                  const premium = policyValueConfig?.annual_premium || 0;
                  const netCost = phase1?.kpis?.totalNetCost || 0;
                  const pct = premium > 0 ? Math.min(100, Math.round((netCost / premium) * 100)) : 0;
                  return (
                    <>
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                        <span>{tr('spend')} ({pct}%)</span>
                        <span>{tr('limit')} {premium > 0 ? `(EGP ${premium.toLocaleString('en-US', { maximumFractionDigits: 0 })})` : ''}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${pct < 60 ? 'bg-emerald-500' : pct < 85 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-dashed">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{tr('startDate')}</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{activePolicy?.start_date || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{tr('endDate')}</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{activePolicy?.end_date || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{tr('status')}</p>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-0.5">{activePolicy?.policy_status ? tr(activePolicy.policy_status.toLowerCase()) : tr('active')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="border border-slate-200/80 shadow-sm bg-card">
            <CardHeader className="p-5 border-b bg-slate-50/20">
              <CardTitle className="text-base font-bold text-slate-900">{tr('recentActivities')}</CardTitle>
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
                      <span>{tr('by')} {act.user}</span>
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
    
    // Filter unique grouped requests
    const uniqueRequests = Array.from(uniqueRequestsMap.values()).filter((req: any) => {
      const items = req.endorsement_items || [];
      const actionType = items[0]?.action_type || 'add';
      const matchType = trackingTypeFilter === 'all' || actionType === trackingTypeFilter;
      const matchStatus = trackingStatusFilter === 'all' || req.status === trackingStatusFilter;
      return matchType && matchStatus;
    });

    // Filter individual items if search query or filters are active
    const filteredTrackingItems = pendingRequests.filter((item: any) => {
      const matchSearch = !trackingSearchQuery || 
        (item.member_name || '').toLowerCase().includes(trackingSearchQuery.toLowerCase()) ||
        (item.national_id || '').includes(trackingSearchQuery) ||
        (item.details?.full_name_arabic || '').includes(trackingSearchQuery);
      
      const siblingStatus = item.parent_endorsement?.status || "Draft";
      const matchStatus = trackingStatusFilter === 'all' || siblingStatus === trackingStatusFilter;
      const matchType = trackingTypeFilter === 'all' || item.action_type === trackingTypeFilter;
      
      return matchSearch && matchStatus && matchType;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Request Status Tracking</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Track the real-time status and lifecycle stages of coverage requests</p>
        </div>

        {/* Global Search and Advanced Filter box */}
        <Card className="border border-slate-200/80 shadow-sm p-4 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by Beneficiary Name, National ID, or Arabic Name..."
                value={trackingSearchQuery}
                onChange={e => setTrackingSearchQuery(e.target.value)}
                className="h-10 text-xs bg-background pl-9"
              />
            </div>
            
            <Select value={trackingTypeFilter} onValueChange={setTrackingTypeFilter}>
              <SelectTrigger className="h-10 bg-background text-xs">
                <SelectValue placeholder="Request Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Request Types</SelectItem>
                <SelectItem value="add">Addition</SelectItem>
                <SelectItem value="delete">Cancellation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={trackingStatusFilter} onValueChange={setTrackingStatusFilter}>
              <SelectTrigger className="h-10 bg-background text-xs">
                <SelectValue placeholder="Request Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval / Pending Issuance</SelectItem>
                <SelectItem value="Approved">Approved / Issued</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {trackingSearchQuery || trackingTypeFilter !== 'all' || trackingStatusFilter !== 'all' ? (
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
    const scrollTabs = (direction: 'left' | 'right') => {
      if (tabsScrollRef.current) {
        tabsScrollRef.current.scrollBy({ left: direction === 'left' ? -250 : 250, behavior: 'smooth' });
      }
    };

    if (isConsumptionLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-semibold">
            Loading policy claims consumption data & running advanced actuarial engines...
          </p>
        </div>
      );
    }

    if (consumptionData.length === 0) {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Claims Utilization</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Summary of claims activities and policy limit consumption</p>
          </div>
          <Card className="border-dashed border-4 bg-background/50 py-32 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Ingested Claims Data</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                There is no medical consumption data associated with your policy yet. Your account manager will upload claims sheets to enable the 3-Phase Advanced Actuarial Engine.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className={cn("space-y-6 pb-12", isRtl && "font-arabic")}>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Claims Utilization</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Actuarial consumption analysis and renewal simulator for your contract</p>
        </div>

        {/* ── Contract Information & Census Summary ───────────────────── */}
        {activePolicy && (
          <Card className="rounded-2xl border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-background to-purple-50/40 shadow-sm p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Contract / Client</p>
                <p className="font-bold text-slate-900 truncate">{activePolicy.client_company_name}</p>
                <p className="text-[11px] text-indigo-600 font-semibold">{activePolicy.policy_number}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Insurer &amp; TPA</p>
                <p className="font-bold text-slate-900 truncate">{activePolicy.insurance_company_name || 'Standard Insurer'}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">{activePolicy.tpa_name || 'Direct'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Policy Period</p>
                <p className="font-bold text-slate-900">{activePolicy.start_date ? format(new Date(activePolicy.start_date), 'MMM d, yyyy') : '—'}</p>
                <p className="text-[11px] text-muted-foreground">to {activePolicy.end_date ? format(new Date(activePolicy.end_date), 'MMM d, yyyy') : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Contract Premium</p>
                <p className="font-black text-emerald-700 text-sm">{formatCompactNumber(activePolicy.premium_total || 0)} EGP</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Medical Network</p>
                <p className="font-bold text-slate-900 truncate">{activePolicy.medical_network || 'In-Network'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Enrolled Census Lives</p>
                <p className="font-black text-indigo-900 text-sm flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  {activeMembers.length} Lives
                </p>
                <p className="text-[10px] text-muted-foreground italic">Matched via Member TPA Code</p>
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="executive" className="space-y-6">
          <div className="glass-effect sticky top-0 z-10 -mx-4 px-4 py-2 border-b flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full border-slate-200 shadow-sm hover:bg-slate-100 hidden sm:flex"
              onClick={() => scrollTabs('left')}
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </Button>

            <div
              ref={tabsScrollRef}
              className="overflow-x-auto flex-1 pb-1 pt-0.5"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#94A3B8 #F1F5F9'
              }}
            >
              <TabsList className="bg-slate-100/80 p-1.5 rounded-xl flex min-w-max gap-1.5 border border-slate-200/60 shadow-sm">
                <TabsTrigger value="executive" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Basic Analysis
                </TabsTrigger>
                <TabsTrigger value="financial" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
                  <DollarSign className="w-3.5 h-3.5" /> Loss Ratio &amp; Financials
                </TabsTrigger>
                <TabsTrigger value="risk" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center text-indigo-900">
                  <Target className="w-3.5 h-3.5" /> Pareto &amp; Large Claims
                </TabsTrigger>
                <TabsTrigger value="clinical" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
                  <Stethoscope className="w-3.5 h-3.5" /> Clinical &amp; ICD Chapters
                </TabsTrigger>
                <TabsTrigger value="population" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
                  <Users className="w-3.5 h-3.5" /> Demographics &amp; Age
                </TabsTrigger>
                <TabsTrigger value="quality" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center text-red-600">
                  <ShieldAlert className="w-3.5 h-3.5" /> Quality &amp; Audit Flags
                </TabsTrigger>
                <TabsTrigger value="forecasting" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center text-indigo-700">
                  <TrendingUp className="w-3.5 h-3.5" /> Renewal &amp; Forecasting
                </TabsTrigger>
                <TabsTrigger value="deep-insights" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center text-purple-600">
                  <BrainCircuit className="w-3.5 h-3.5" /> AI Strategic Insights
                </TabsTrigger>
              </TabsList>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full border-slate-200 shadow-sm hover:bg-slate-100 hidden sm:flex"
              onClick={() => scrollTabs('right')}
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </Button>
          </div>

          {/* TAB 1: PHASE 1 BASIC ANALYSIS */}
          <TabsContent value="executive" className="space-y-6">
            {phase1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-4 bg-card border rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0"><TrendingUp className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Net Claims Cost</p>
                      <h4 className="text-lg font-black text-slate-900 font-mono mt-0.5">{formatCompactNumber(phase1.kpis.totalNetCost)} EGP</h4>
                    </div>
                  </div>
                  <div className="p-4 bg-card border rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0"><FileText className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Claims Count</p>
                      <h4 className="text-lg font-black text-slate-900 font-mono mt-0.5">{phase1.kpis.totalClaimsCount}</h4>
                    </div>
                  </div>
                  <div className="p-4 bg-card border rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0"><Stethoscope className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Avg Cost / Claim</p>
                      <h4 className="text-lg font-black text-slate-900 font-mono mt-0.5">{formatCompactNumber(phase1.kpis.avgCostPerClaim)} EGP</h4>
                    </div>
                  </div>
                  <div className="p-4 bg-card border rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0"><Users className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">PMPY (Per Enrolled Life)</p>
                      <h4 className="text-lg font-black text-slate-900 font-mono mt-0.5">{formatCompactNumber(phase1.kpis.avgCostPerMemberPMPY)} EGP</h4>
                    </div>
                  </div>
                  <div className="p-4 bg-card border rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0"><PieChartIcon className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Utilization Rate</p>
                      <h4 className="text-lg font-black text-slate-900 font-mono mt-0.5">{phase1.kpis.utilizationRate.toFixed(1)}%</h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 bg-card border">
                    <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" /> Claims Cost by Case Type
                    </CardTitle>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={phase1.dimensionBreakdowns.caseType} layout="vertical" margin={{ top: 5, right: 70, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                          <XAxis type="number" fontSize={11} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => formatCompactNumber(v)} />
                          <YAxis dataKey="name" type="category" fontSize={12} width={130} tick={{ fill: '#0F172A', fontSize: 12, fontWeight: 700 }} />
                          <Tooltip
                            formatter={(v: any) => `${formatCompactNumber(v)} EGP`}
                            contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                            {phase1.dimensionBreakdowns.caseType.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={MONOCHROME_BLUES[index % MONOCHROME_BLUES.length]} />
                            ))}
                            <LabelList dataKey="cost" position="right" formatter={(v: number) => `${formatCompactNumber(v)} EGP`} style={{ fill: '#1E3A8A', fontSize: 11, fontWeight: 800 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-6 bg-card border">
                    <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950">Top 10 Diagnoses by Frequency</CardTitle>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/40 text-left font-bold">
                            <th className="p-2">ICD</th>
                            <th className="p-2">Diagnosis</th>
                            <th className="p-2 text-right">Count</th>
                            <th className="p-2 text-right">Total Net (EGP)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {phase1.topDiagnoses.byCount.map((d, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="p-2 font-mono font-bold text-indigo-600">{d.code}</td>
                              <td className="p-2 font-medium truncate max-w-[160px]">{d.desc}</td>
                              <td className="p-2 text-right font-bold">{d.count}</td>
                              <td className="p-2 text-right font-black">{formatCompactNumber(d.cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: FINANCIAL PERFORMANCE & LOSS RATIO */}
          <TabsContent value="financial" className="space-y-6">
            {phase2 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 bg-card border">
                  <div className="flex justify-between items-center mb-4">
                    <CardTitle className="text-sm font-bold uppercase text-indigo-955 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" /> Loss Ratio by Census Plan Category
                    </CardTitle>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> &lt;70% Low</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 70-90% Moderate</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> &gt;90% High</span>
                    </div>
                  </div>

                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={phase2.financialPerformance.lossRatioByPlan} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="plan" fontSize={12} tick={{ fill: '#0F172A', fontWeight: 700 }} />
                        <YAxis fontSize={11} tickFormatter={v => `${v}%`} tick={{ fill: '#475569' }} domain={[0, (max: number) => Math.max(100, Math.ceil(max + 10))]} />
                        <Tooltip
                          formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Loss Ratio']}
                          contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="lossRatio" radius={[6, 6, 0, 0]}>
                          {phase2.financialPerformance.lossRatioByPlan.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.band === 'green' ? '#10B981' : (entry.band === 'amber' ? '#F59E0B' : '#EF4444')}
                            />
                          ))}
                          <LabelList
                            dataKey="lossRatio"
                            position="top"
                            formatter={(v: number) => `${v.toFixed(1)}%`}
                            style={{ fill: '#0F172A', fontSize: 12, fontWeight: 800 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t">
                    {phase2.financialPerformance.lossRatioByPlan.map((p, i) => (
                      <div key={i} className="p-3 rounded-xl border bg-muted/30 text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{p.plan}</span>
                          <Badge className={cn(
                            "text-[10px] py-0 px-1.5",
                            p.band === 'green' && "bg-emerald-100 text-emerald-800 border-emerald-300",
                            p.band === 'amber' && "bg-amber-100 text-amber-800 border-amber-300",
                            p.band === 'red' && "bg-red-100 text-red-800 border-red-300"
                          )}>
                            {p.lossRatio.toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Net Cost: <span className="font-bold text-slate-900">{formatCompactNumber(p.cost)} EGP</span></p>
                        <p className="text-[11px] text-muted-foreground">Premium Target: <span className="font-bold text-slate-900">{formatCompactNumber(p.premium)} EGP</span></p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Overall Contract Loss Ratio - Massive Centered Number */}
                <Card className="p-6 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white flex flex-col justify-between shadow-xl min-h-[380px]">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-200">Overall Contract Loss Ratio</CardTitle>
                    <p className="text-[11px] text-indigo-300 mt-1">Actuarial Loss Ratio Across Enrolled Lives</p>
                  </div>

                  <div className="my-auto text-center py-6">
                    <p className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight drop-shadow-md">
                      {phase2.financialPerformance.overallLossRatio.toFixed(1)}%
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20">
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full animate-pulse",
                        phase2.financialPerformance.overallLossRatio < 70 && "bg-emerald-400",
                        phase2.financialPerformance.overallLossRatio >= 70 && phase2.financialPerformance.overallLossRatio <= 90 && "bg-amber-400",
                        phase2.financialPerformance.overallLossRatio > 90 && "bg-red-500"
                      )}></span>
                      <span className="text-xs font-bold uppercase text-white">
                        {phase2.financialPerformance.overallLossRatio < 70 ? 'Low Risk' : (phase2.financialPerformance.overallLossRatio <= 90 ? 'Moderate Risk' : 'High Risk')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-indigo-800/80 flex justify-between items-center text-xs">
                    <span className="text-indigo-200 font-medium">Contract Premium:</span>
                    <span className="font-black text-emerald-400 text-sm">{formatCompactNumber(phase2.financialPerformance.annualPremium)} EGP</span>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: PARETO & LARGE CLAIMS */}
          <TabsContent value="risk" className="space-y-6">
            {phase2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Member Cost Concentration Tier Analysis */}
                  <Card className="lg:col-span-2 p-6 bg-card border">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                      <div>
                        <CardTitle className="text-sm font-bold uppercase text-indigo-950 flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-600" /> Member Cost Concentration Tiers
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Distribution of claims cost across member spending brackets</p>
                      </div>
                      <Badge className="bg-indigo-900 text-white font-bold text-xs py-1 px-3">
                        {phase2.riskConcentration.headlineStat}
                      </Badge>
                    </div>

                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={phase2.riskConcentration.concentrationTiers} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                          <XAxis type="number" fontSize={11} tickFormatter={v => `${v}%`} tick={{ fill: '#475569' }} domain={[0, 100]} />
                          <YAxis dataKey="tier" type="category" fontSize={11} width={170} tick={{ fill: '#0F172A', fontWeight: 700 }} />
                          <Tooltip
                            formatter={(v: any, name: any, item: any) => [`${v}% (${formatCompactNumber(item.payload.cost)} EGP)`, 'Cost Share']}
                            contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="percent" radius={[0, 6, 6, 0]}>
                            {phase2.riskConcentration.concentrationTiers.map((entry, index) => (
                              <Cell key={`tier-${index}`} fill={entry.color} />
                            ))}
                            <LabelList dataKey="percent" position="right" formatter={(v: number) => `${v}%`} style={{ fill: '#0F172A', fontSize: 12, fontWeight: 800 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Tier Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t">
                      {phase2.riskConcentration.concentrationTiers.map((t, i) => (
                        <div key={i} className={cn("p-3 rounded-xl border text-xs space-y-1.5", i === 1 && "bg-indigo-50/80 border-indigo-200")}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{t.tier}</span>
                            <Badge className="bg-indigo-900 text-white font-bold text-[10px]">{t.percent}% Cost</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Headcount: <span className="font-bold text-slate-900">{t.membersCount} Lives</span></p>
                          <p className="text-[11px] text-muted-foreground">Total Spend: <span className="font-bold text-slate-900">{formatCompactNumber(t.cost)} EGP</span></p>
                          <p className="text-[11px] text-muted-foreground">Avg Spend/Life: <span className="font-bold text-indigo-700">{formatCompactNumber(t.avgSpend)} EGP</span></p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 flex flex-col justify-between border-2 border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-background to-orange-50/30">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <CardTitle className="text-sm font-bold uppercase text-indigo-955 flex items-center gap-2">
                          <HeartPulse className="w-4 h-4 text-amber-600" /> Chronic Burden &amp; Clinical Risk
                        </CardTitle>
                        <Badge className="bg-amber-600 text-white font-bold text-[10px] py-0.5">
                          {phase2.riskConcentration.chronicBurden.chronicHeadcount} Chronic Lives
                        </Badge>
                      </div>

                      <div className="p-4 bg-card border-2 border-amber-200 rounded-2xl shadow-sm space-y-3">
                        <div className="flex justify-between items-baseline">
                          <div>
                            <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Chronic Spend Share</p>
                            <p className="text-4xl font-black text-amber-900 leading-none mt-1">
                              {phase2.riskConcentration.chronicBurden.chronicCostPercent.toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Chronic Spend</p>
                            <p className="text-lg font-black text-slate-900 mt-0.5">
                              {formatCompactNumber(phase2.riskConcentration.chronicBurden.chronicCost)} EGP
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                            <div
                              className="bg-amber-500 h-full transition-all"
                              style={{ width: `${Math.min(100, phase2.riskConcentration.chronicBurden.chronicCostPercent)}%` }}
                              title="Chronic Spend"
                            />
                            <div
                              className="bg-slate-400 h-full transition-all"
                              style={{ width: `${Math.max(0, 100 - phase2.riskConcentration.chronicBurden.chronicCostPercent)}%` }}
                              title="Non-Chronic Spend"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-amber-800">Chronic ({phase2.riskConcentration.chronicBurden.chronicCostPercent.toFixed(0)}%)</span>
                            <span className="text-slate-600">Non-Chronic ({(100 - phase2.riskConcentration.chronicBurden.chronicCostPercent).toFixed(0)}%)</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 mt-3 text-xs">
                        <div className="p-3 bg-card border rounded-xl space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Chronic Prevalence</p>
                          <p className="text-base font-black text-amber-900">
                            {phase2.riskConcentration.chronicBurden.chronicHeadcountPercent.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">{phase2.riskConcentration.chronicBurden.chronicHeadcount} of Enrolled Lives</p>
                        </div>

                        <div className="p-3 bg-card border rounded-xl space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Non-Chronic Spend</p>
                          <p className="text-base font-black text-slate-900">
                            {formatCompactNumber(phase2.riskConcentration.chronicBurden.nonChronicCost)} EGP
                          </p>
                          <p className="text-[10px] text-muted-foreground">{(100 - phase2.riskConcentration.chronicBurden.chronicCostPercent).toFixed(1)}% of total cost</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Revised Large Claims & High-Cost Claimant Report */}
                <Card className="p-6 bg-card border">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                      <CardTitle className="text-base font-black text-indigo-955 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-indigo-600" /> Large Claims &amp; High-Cost Claimant Report
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Identifies catastrophic expenditures exceeding the threshold limit</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Presets:</span>
                      <div className="flex gap-1">
                        {[25000, 50000, 100000, 150000].map(val => (
                          <Button
                            key={val}
                            size="sm"
                            variant={largeClaimThreshold === val ? "default" : "outline"}
                            onClick={() => setLargeClaimThreshold(val)}
                            className="h-7 text-[11px] font-bold px-2.5"
                          >
                            {formatCompactNumber(val)}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 ml-2 text-xs">
                        <span className="text-muted-foreground">Custom:</span>
                        <Input
                          type="number"
                          value={largeClaimThreshold}
                          onChange={(e) => setLargeClaimThreshold(Number(e.target.value))}
                          className="w-28 h-7 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* High-Cost KPI Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-xl shadow-md">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-indigo-200">High-Cost Claimants</p>
                      <p className="text-2xl font-black">{phase2.riskConcentration.largeClaimsList.length} Members</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-indigo-200">High-Cost Net Spend</p>
                      <p className="text-2xl font-black text-emerald-400">{formatCompactNumber(phase2.riskConcentration.largeClaimsTotalCost)} EGP</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-indigo-200">Share of Total Spend</p>
                      <p className="text-2xl font-black text-amber-300">{phase2.riskConcentration.largeClaimsPercentOfTotal.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-indigo-200">Avg High-Cost Spend / Member</p>
                      <p className="text-2xl font-black text-white">
                        {formatCompactNumber(phase2.riskConcentration.largeClaimsList.length > 0 ? phase2.riskConcentration.largeClaimsTotalCost / phase2.riskConcentration.largeClaimsList.length : 0)} EGP
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/60 text-left font-bold text-slate-900">
                          <th className="p-3">Member Name &amp; Code</th>
                          <th className="p-3">Plan &amp; Dept</th>
                          <th className="p-3">Primary Diagnosis</th>
                          <th className="p-3 text-right">Claims</th>
                          <th className="p-3 text-right">Annual Cost (EGP)</th>
                          <th className="p-3 text-right">% of Total</th>
                          <th className="p-3 text-center">Audit Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {phase2.riskConcentration.largeClaimsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground font-medium">
                              No member claims exceeded the selected threshold of {formatCompactNumber(largeClaimThreshold)} EGP.
                            </td>
                          </tr>
                        ) : (
                          phase2.riskConcentration.largeClaimsList.map((m, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-bold text-indigo-955">
                                <div>{m.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{m.code}</div>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-800">{m.plan}</span>
                                <div className="text-[10px] text-muted-foreground">{m.dept}</div>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-800 truncate max-w-[180px] block">{m.topDiag}</span>
                                {m.chronic && <Badge className="text-[9px] py-0 px-1 bg-amber-100 text-amber-800 border-amber-300">Chronic</Badge>}
                              </td>
                              <td className="p-3 text-right font-bold">{m.count}</td>
                              <td className="p-3 text-right font-black text-emerald-700 text-sm">{formatCompactNumber(m.cost)}</td>
                              <td className="p-3 text-right font-bold text-slate-900">{m.percentOfTotalCost.toFixed(1)}%</td>
                              <td className="p-3 text-center">
                                <Button size="sm" variant="outline" onClick={() => setSelectedMemberModal(m)} className="h-7 text-[11px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100">
                                  Itemized History
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: CLINICAL PATTERNS & ICD */}
          <TabsContent value="clinical" className="space-y-6">
            {phase2 && (
              <Card className="p-6 bg-card border">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                  <div>
                    <CardTitle className="text-base font-black text-indigo-950 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-amber-600" /> ICD-10 Chapter Clustering (Cost Ranked)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Primary clinical disease categories ranked by total net claims spend</p>
                  </div>
                  <Badge className="bg-amber-600 text-white font-bold text-xs py-1 px-3">
                    {phase2.clinicalPatterns.icdChapterClustering.length} Disease Chapters
                  </Badge>
                </div>

                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={phase2.clinicalPatterns.icdChapterClustering}
                      layout="vertical"
                      margin={{ top: 10, right: 85, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" fontSize={11} tickFormatter={v => formatCompactNumber(v)} tick={{ fill: '#475569' }} />
                      <YAxis dataKey="chapter" type="category" fontSize={11} width={220} tick={{ fill: '#0F172A', fontWeight: 700 }} />
                      <Tooltip
                        formatter={(v: any, name: any, item: any) => [`${formatCompactNumber(v)} EGP (${item.payload.count} Claims)`, 'Net Spend']}
                        contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                        {phase2.clinicalPatterns.icdChapterClustering.map((entry: any, index: number) => (
                          <Cell key={`icd-cell-${index}`} fill={WARM_COLORS[index % WARM_COLORS.length]} />
                        ))}
                        <LabelList
                          dataKey="cost"
                          position="right"
                          formatter={(v: number) => `${formatCompactNumber(v)} EGP`}
                          style={{ fill: '#0F172A', fontSize: 11, fontWeight: 800 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Chapters Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t">
                  {phase2.clinicalPatterns.icdChapterClustering.slice(0, 4).map((c: any, i: number) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border-2 bg-gradient-to-br from-amber-50/50 via-background to-orange-50/30 space-y-1"
                      style={{ borderColor: `${WARM_COLORS[i % WARM_COLORS.length]}40` }}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 truncate max-w-[140px]">{c.chapter}</span>
                        <Badge className="text-[9px] py-0 px-1.5 font-black text-white" style={{ backgroundColor: WARM_COLORS[i % WARM_COLORS.length] }}>
                          Rank #{i + 1}
                        </Badge>
                      </div>
                      <p className="text-xl font-black text-slate-900">{formatCompactNumber(c.cost)} <span className="text-xs font-normal text-muted-foreground">EGP</span></p>
                      <p className="text-[11px] text-muted-foreground">{c.count} Claims Logged</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 5: DEMOGRAPHICS & POPULATION RISK */}
          <TabsContent value="population" className="space-y-6">
            {phase1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Redesigned Age & Gender Pyramid */}
                  <Card className="lg:col-span-2 p-6 bg-card border">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                      <div>
                        <CardTitle className="text-base font-black text-indigo-955 flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-600" /> Population Demographics Age &amp; Gender Pyramid
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Enrolled headcount distribution across age bands and gender</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-900"></span> Male: {phase1.populationSummary.ageGenderBands.reduce((s: number, b: any) => s + b.male, 0)}
                        </span>
                        <span className="flex items-center gap-1.5 text-rose-900 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Female: {phase1.populationSummary.ageGenderBands.reduce((s: number, b: any) => s + b.female, 0)}
                        </span>
                      </div>
                    </div>

                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={phase1.populationSummary.ageGenderBands} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" fontSize={12} tick={{ fill: '#0F172A', fontWeight: 700 }} />
                          <YAxis fontSize={11} tick={{ fill: '#475569' }} />
                          <Tooltip
                            formatter={(v: any, name: any) => [`${v} Members`, name]}
                            contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }} />
                          <Bar dataKey="male" name="Male Headcount" fill="#1E3A8A" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="male" position="top" style={{ fill: '#1E3A8A', fontSize: 11, fontWeight: 800 }} />
                          </Bar>
                          <Bar dataKey="female" name="Female Headcount" fill="#EC4899" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="female" position="top" style={{ fill: '#EC4899', fontSize: 11, fontWeight: 800 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Principal vs Dependent Breakdown */}
                  <Card className="p-6 flex flex-col justify-between bg-card border">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase mb-2 text-indigo-950 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" /> Principal vs Dependent Split
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mb-4">Family ratio and dependency profile</p>

                      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl mb-4 text-center space-y-1">
                        <p className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">Dependent Ratio</p>
                        <p className="text-4xl font-black text-emerald-955">{phase1.populationSummary.dependentRatio.toFixed(2)}</p>
                        <p className="text-xs text-emerald-800 font-medium">Dependents per Principal Employee</p>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                          <span className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Principal Employees
                          </span>
                          <span className="font-black text-slate-900">{phase1.populationSummary.relationStats.PRINCIPAL || phase1.populationSummary.relationStats.EMPLOYEE || 0} Lives</span>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                          <span className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Spouses
                          </span>
                          <span className="font-black text-slate-900">{phase1.populationSummary.relationStats.SPOUSE || 0} Lives</span>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                          <span className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Children
                          </span>
                          <span className="font-black text-slate-900">{phase1.populationSummary.relationStats.CHILD || 0} Lives</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Claims Spend & Risk Intensity by Age Band */}
                <Card className="p-6 bg-card border">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                    <div>
                      <CardTitle className="text-base font-black text-indigo-950 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" /> Claims Spend &amp; Risk Intensity by Age Band
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Average claims spend per member (EGP) across age brackets</p>
                    </div>
                    <Badge className="bg-indigo-950 text-white font-bold text-xs py-1 px-3">
                      Age Risk Profile
                    </Badge>
                  </div>

                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={phase1.populationSummary.ageGenderBands} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" fontSize={12} tick={{ fill: '#0F172A', fontWeight: 700 }} />
                        <YAxis fontSize={11} tickFormatter={v => formatCompactNumber(v)} tick={{ fill: '#475569' }} />
                        <Tooltip
                          formatter={(v: any) => [`${formatCompactNumber(v)} EGP`, 'Avg Spend / Member']}
                          contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="avgCost" name="Avg Spend / Member (EGP)" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                          <LabelList
                            dataKey="avgCost"
                            position="top"
                            formatter={(v: number) => `${formatCompactNumber(v)} EGP`}
                            style={{ fill: '#0F172A', fontSize: 11, fontWeight: 800 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Age Band Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-4 border-t">
                    {phase1.populationSummary.ageGenderBands.map((b: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border bg-muted/30 text-xs space-y-1">
                        <p className="font-bold text-indigo-955">{b.name} Band</p>
                        <p className="text-base font-black text-slate-900">{formatCompactNumber(b.avgCost)} <span className="text-[10px] text-muted-foreground">EGP</span></p>
                        <p className="text-[10px] text-muted-foreground">{b.male + b.female} Members Enrolled</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 6: QUALITY & AUDIT FLAGS */}
          <TabsContent value="quality" className="space-y-6">
            {phase2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-card border">
                  <CardTitle className="text-sm font-bold uppercase mb-4 text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> Provider Outliers (&gt;1.5x Peer Average)
                  </CardTitle>
                  <div className="space-y-3">
                    {phase2.qualityFlags.providerOutliers.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-4 text-center">No providers detected with claims costs significantly higher than peer average.</p>
                    ) : (
                      phase2.qualityFlags.providerOutliers.map((p, i) => (
                        <div key={i} className="p-3 border border-red-200 bg-red-50/50 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-red-955">{p.name}</p>
                            <p className="text-muted-foreground">{p.type} · {p.count} Claims</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-red-700">{formatCompactNumber(p.avgCost)} EGP/claim</p>
                            <p className="text-[10px] text-red-500 font-bold">{p.ratio.toFixed(1)}x Peer Avg</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="p-6 bg-card border">
                  <CardTitle className="text-sm font-bold uppercase mb-4 text-amber-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" /> Duplicate Claim Flags (Within 7-Day Window)
                  </CardTitle>
                  <div className="space-y-3">
                    {phase2.qualityFlags.duplicateFlags.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-4 text-center">No duplicate claim flags detected within the standard audit window.</p>
                    ) : (
                      phase2.qualityFlags.duplicateFlags.map((d, i) => (
                        <div key={i} className="p-3 border border-amber-200 bg-amber-50/50 rounded-xl text-xs flex justify-between items-center">
                          <div>
                            <p className="font-bold text-amber-955">{d.memberName} ({d.memberCode})</p>
                            <p className="text-muted-foreground">{d.providerName} · ICD: {d.icdCode}</p>
                          </div>
                          <Badge className="bg-amber-600 text-white font-bold">{formatCompactNumber(d.amount)} EGP</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 7: RENEWAL & FORECASTING SIMULATOR */}
          <TabsContent value="forecasting" className="space-y-6">
            {phase3 && simulatorResults && (
              <div className="space-y-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 uppercase tracking-wider text-[10px]">
                    Template Renewal Recommendation
                  </Badge>
                  <h3 className="text-xl font-black italic mt-3 mb-4 text-white">Renewal Guidance</h3>
                  <p className="text-sm leading-relaxed text-indigo-100/90 font-medium p-4 bg-white/10 rounded-xl border border-white/10">
                    "{phase3.recommendation.recommendationText}"
                  </p>
                </Card>

                <Card className="p-6 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-background to-purple-50/40">
                  <CardHeader className="p-0 mb-6">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-black text-indigo-955 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-indigo-600" /> Interactive Renewal Scenario Simulator
                      </CardTitle>
                      <Badge className="bg-indigo-900 text-white font-bold text-xs py-1 px-3">Live Recalculated</Badge>
                    </div>
                  </CardHeader>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6 text-xs">
                      <div className="p-4 bg-card border rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-indigo-900">Lever A: Co-payment Increase (%)</span>
                          <span className="font-black text-indigo-600 text-sm">+{copayIncreasePercent}%</span>
                        </div>
                        <Slider value={[copayIncreasePercent]} min={0} max={20} step={1} onValueChange={(val) => setCopayIncreasePercent(val[0])} />
                        <p className="text-[11px] text-muted-foreground">Estimated Co-pay Savings: {formatCompactNumber(simulatorResults.copaySavings)} EGP</p>
                      </div>

                      <div className="p-4 bg-card border rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-indigo-900">Lever B: Restrict Out-of-Network Claims</p>
                          <p className="text-[11px] text-muted-foreground">Applies 35% leakage restriction savings to non-network claims</p>
                        </div>
                        <Switch checked={oonRestrictionFlag} onCheckedChange={setOonRestrictionFlag} />
                      </div>
                    </div>

                    <Card className="p-6 bg-indigo-900 text-white flex flex-col justify-between">
                      <div>
                        <p className="text-xs uppercase font-bold text-indigo-200">Combined Scenario Results</p>
                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-[10px] text-indigo-300 uppercase">Total Estimated Savings</p>
                            <p className="text-3xl font-black text-emerald-400">+{formatCompactNumber(simulatorResults.totalSavings)} EGP</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-300 uppercase font-bold">New Projected Loss Ratio</p>
                            <p className="text-2xl font-black text-emerald-300">{simulatorResults.newLossRatio.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 8: DEEP AI INSIGHTS */}
          <TabsContent value="deep-insights" className="space-y-6">
            {isAnalyzing ? (
              <Card className="p-12 text-center border-2 border-purple-200 bg-purple-50/10">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-bold text-purple-955">GenAI Strategic Medical Insights</h3>
                <p className="text-xs text-purple-800 mt-2">Running advanced clinical models and generating strategic recommendations...</p>
              </Card>
            ) : aiInsights ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Risk Level Banner */}
                {aiInsights.riskLevel && (
                  <Card className={cn(
                    "p-5 border-2 flex items-center justify-between shadow-sm",
                    aiInsights.riskLevel === 'Low' && "border-emerald-200 bg-emerald-50 text-emerald-950",
                    aiInsights.riskLevel === 'Medium' && "border-amber-200 bg-amber-55 text-amber-955",
                    aiInsights.riskLevel === 'High' && "border-orange-200 bg-orange-55 text-orange-955",
                    aiInsights.riskLevel === 'Critical' && "border-red-200 bg-red-55 text-red-955"
                  )}>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">Portfolio Actuarial Risk Rating</h4>
                      <p className="text-2xl font-black mt-1">{aiInsights.riskLevel} Risk Profile</p>
                    </div>
                    <Badge className={cn(
                      "text-xs py-1 px-3.5 font-bold border-none",
                      aiInsights.riskLevel === 'Low' && "bg-emerald-600 text-white",
                      aiInsights.riskLevel === 'Medium' && "bg-amber-600 text-white",
                      aiInsights.riskLevel === 'High' && "bg-orange-600 text-white",
                      aiInsights.riskLevel === 'Critical' && "bg-red-600 text-white"
                    )}>
                      {aiInsights.riskLevel}
                    </Badge>
                  </Card>
                )}

                {/* Summary Card */}
                <Card className="p-6 border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-purple-950">
                    <BrainCircuit className="w-5 h-5 text-purple-600" />
                    <h3 className="text-base font-black uppercase tracking-wide">Executive Summary</h3>
                  </div>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-700 font-medium">
                    {aiInsights.summary}
                  </p>
                </Card>

                {/* Insights and Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Key Findings / Insights */}
                  <Card className="p-6 border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" /> Key Findings &amp; Clinical Insights
                    </h4>
                    <ul className="space-y-3">
                      {aiInsights.insights?.map((insight: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-700 flex gap-2 leading-relaxed align-top">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-[10px]">{idx + 1}</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Strategic Recommendations */}
                  <Card className="p-6 border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> Actionable Recommendations
                    </h4>
                    <ul className="space-y-3">
                      {aiInsights.recommendations?.map((rec: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-700 flex gap-2 leading-relaxed align-top">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold text-[10px]">{idx + 1}</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="p-12 text-center border-2 border-purple-200 bg-purple-50/50">
                <BrainCircuit className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-bounce" />
                <h3 className="text-2xl font-black text-purple-950">GenAI Strategic Medical Insights</h3>
                <p className="text-sm text-purple-800 max-w-lg mx-auto mt-2">
                  Actuarial GenAI strategic medical insights will generate shortly.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Member Drill-Down Modal */}
        <Dialog open={!!selectedMemberModal} onOpenChange={() => setSelectedMemberModal(null)}>
          <DialogContent className="max-w-2xl bg-card border border-border shadow-lg">
            <DialogHeader>
              <DialogTitle>Member Claims Drill-Down: {selectedMemberModal?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg font-bold">
                <div>Plan: {selectedMemberModal?.plan}</div>
                <div>Dept: {selectedMemberModal?.dept}</div>
                <div>Total Cost: {formatCompactNumber(selectedMemberModal?.cost || 0)} EGP</div>
              </div>
              <p className="font-bold text-indigo-900">Claim History Breakdown</p>
              <div className="p-4 bg-slate-50 border rounded-lg max-h-[300px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b font-bold text-slate-700">
                      <th className="pb-2">Service Date</th>
                      <th className="pb-2">Provider</th>
                      <th className="pb-2">Diagnosis</th>
                      <th className="pb-2 text-right">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {consumptionData
                      .filter((c: any) => c.memberCode === selectedMemberModal?.code)
                      .map((claim: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100/50">
                          <td className="py-2 text-slate-600">{format(new Date(claim.serviceDate), 'yyyy-MM-dd')}</td>
                          <td className="py-2 text-slate-800 font-medium">{claim.providerName}</td>
                          <td className="py-2 text-slate-600 truncate max-w-[180px]" title={claim.icdDescription}>{claim.icdDescription}</td>
                          <td className="py-2 text-right font-black text-emerald-700">{formatCompactNumber(claim.netAmount)} EGP</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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

  const renderSupport = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Support</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Need assistance? Reach out to our support team.</p>
        </div>

        <Card className="border border-slate-200/80 shadow-sm p-6 bg-card max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Email</p>
                <a href="mailto:Info@iwib-eg.com" className="text-sm font-bold text-[#0369A1] hover:underline">
                  Info@iwib-eg.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Hotline</p>
                <a href="tel:01013330409" className="text-sm font-bold text-slate-900 hover:underline font-mono">
                  01013330409
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Website</p>
                <a href="http://www.iwib-eg.com" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-600 hover:underline">
                  www.iwib-eg.com
                </a>
              </div>
            </div>
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
          case 'support':
            return renderSupport();
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

          {/* Effective Date Selection */}
          <div className="p-4 bg-slate-50 border rounded-xl space-y-2 mt-4">
            <Label htmlFor="cancellation_effective_date" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-rose-500" />
              Effective Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cancellation_effective_date"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={cancellationEffectiveDate}
              onChange={e => setCancellationEffectiveDate(e.target.value)}
              className="h-10 bg-background font-semibold"
            />
            <p className="text-[10px] text-muted-foreground">Specify when this cancellation request should take effect. Past dates are disabled.</p>
          </div>

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
                    const isPendingCancellation = m.national_id && pendingCancellationNIDs.has(m.national_id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (isPendingCancellation) {
                            toast({
                              variant: 'destructive',
                              title: "Unavailable Member",
                              description: `${m.member_name} already has an active pending cancellation request.`
                            });
                            return;
                          }
                          setCancelSelectionIds(prev =>
                            isChecked ? prev.filter(id => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50/50 transition-colors cursor-pointer",
                          isPendingCancellation ? "border-amber-200 bg-amber-50/10 opacity-60 cursor-not-allowed" :
                          isChecked ? "border-rose-200 bg-rose-50/20" : "border-border"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isPendingCancellation}
                          readOnly
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {m.member_name}
                            {isPendingCancellation && (
                              <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[9px] h-4">
                                Pending Cancellation
                              </Badge>
                            )}
                          </div>
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

          {/* Effective Date Selection */}
          <div className="p-4 bg-slate-50 border rounded-xl space-y-2 mt-4">
            <Label htmlFor="addition_effective_date" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Effective Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="addition_effective_date"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={additionEffectiveDate}
              onChange={e => setAdditionEffectiveDate(e.target.value)}
              className="h-10 bg-background font-semibold"
            />
            <p className="text-[10px] text-muted-foreground">Specify when this addition request should become active. Past dates are disabled.</p>
          </div>

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

                     {/* Searchable Parent Employee Selection (conditional for dependents) */}
                    {formData.relation !== "Employee" && (
                      <div className="space-y-2 animate-in fade-in duration-200 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <Label htmlFor="parent_search" className={cn("text-xs font-semibold", formErrors.linked_main_member_id && "text-destructive")}>
                          Search Parent Employee (Name, National ID, or Staff ID) *
                        </Label>
                        <Input
                          id="parent_search"
                          value={parentSearchQuery}
                          onChange={e => handleClientParentSearch(e.target.value)}
                          placeholder="Search by name, National ID, or Staff ID..."
                          className="h-10 bg-background text-xs"
                        />
                        {parentSearchResult && (
                          <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-700 font-semibold mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Linked to: {parentSearchResult.member_name} (Staff ID: {parentSearchResult.staff_code || "N/A"})
                          </div>
                        )}
                        {parentSearchError && (
                          <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {parentSearchError}
                          </p>
                        )}
                        {formErrors.linked_main_member_id && (
                          <p className="text-destructive text-[11px] font-semibold mt-0.5">
                            {formErrors.linked_main_member_id}
                          </p>
                        )}
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

                {formData.relation === "Child" && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddChildToList}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200"
                    >
                      + Add Child to Request
                    </Button>
                  </div>
                )}

                {additionalChildren.length > 0 && (
                  <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/20 space-y-2 mt-2">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Children to add in this request ({additionalChildren.length}):
                    </p>
                    <div className="space-y-1.5">
                      {additionalChildren.map((c) => (
                        <div key={c.id} className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-xl text-xs">
                          <span className="font-semibold text-slate-800">{c.member_name} ({c.gender}, DOB: {c.date_of_birth})</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
                            onClick={() => setAdditionalChildren(prev => prev.filter(x => x.id !== c.id))}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-4 border-t border-border/60 mt-4">
                  <Button type="button" variant="outline" onClick={() => { setFormErrors({}); setAddDialogOpen(false); }}>{tr('cancel')}</Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || (
                      (!formData.member_name || !formData.national_id || !formData.date_of_birth || !formData.mobile_number || !formData.plan_category) &&
                      additionalChildren.length === 0
                    )}
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

          {/* Effective Date Selection for direct deletion */}
          <div className="p-4 bg-slate-50 border rounded-xl space-y-2 mt-4">
            <Label htmlFor="direct_cancellation_effective_date" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-rose-500" />
              Effective Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="direct_cancellation_effective_date"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={cancellationEffectiveDate}
              onChange={e => setCancellationEffectiveDate(e.target.value)}
              className="h-10 bg-background font-semibold"
            />
            <p className="text-[10px] text-muted-foreground">Specify when this cancellation request should take effect. Past dates are disabled.</p>
          </div>

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
                  {/* Family Links & Details Table */}
                  {(() => {
                    let familyMembers: any[] = [];
                    const isPrincipal = viewMember.relation?.toLowerCase() === 'principal' || viewMember.relation?.toLowerCase() === 'employee';
                    
                    if (isPrincipal) {
                      familyMembers = activeMembers.filter((m: any) =>
                        m.id !== viewMember.id &&
                        (m.linked_main_member_id === viewMember.id || (m.staff_code && viewMember.staff_code && m.staff_code === viewMember.staff_code))
                      );
                    } else {
                      const head = activeMembers.find((m: any) =>
                        (m.relation?.toLowerCase() === 'principal' || m.relation?.toLowerCase() === 'employee') &&
                        (m.id === viewMember.linked_main_member_id || (m.staff_code && viewMember.staff_code && m.staff_code === viewMember.staff_code))
                      );
                      if (head) {
                        familyMembers.push(head);
                        const siblings = activeMembers.filter((m: any) =>
                          m.id !== viewMember.id && m.id !== head.id &&
                          (m.linked_main_member_id === head.id || (m.staff_code && head.staff_code && m.staff_code === head.staff_code))
                        );
                        familyMembers.push(...siblings);
                      }
                    }

                    if (familyMembers.length === 0) return null;

                    return (
                      <div className="col-span-2 mt-2 pt-2 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase mb-2 font-bold">Related Family</p>
                        <div className="overflow-x-auto max-w-full rounded-xl border border-slate-100 bg-white">
                          <table className="w-full text-left text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400">
                                <th className="p-2 font-semibold">Name</th>
                                <th className="p-2 font-semibold">Relation</th>
                                <th className="p-2 font-semibold">National ID</th>
                                <th className="p-2 font-semibold">Staff ID</th>
                                <th className="p-2 font-semibold">Insurer ID</th>
                                <th className="p-2 font-semibold">Principal ID</th>
                                <th className="p-2 font-semibold">Individual ID</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {familyMembers.map((fm: any) => (
                                <tr key={fm.id} className="hover:bg-slate-50/50">
                                  <td className="p-2 font-bold text-slate-800">{fm.member_name || fm.member_full_name}</td>
                                  <td className="p-2 text-slate-500 capitalize">{translateRelation(fm.relation)}</td>
                                  <td className="p-2 font-mono text-slate-500">{fm.national_id || '-'}</td>
                                  <td className="p-2 font-mono text-slate-500">{fm.staff_code || '-'}</td>
                                  <td className="p-2 font-mono text-slate-500">{fm.member_id_insurance || fm.member_code || '-'}</td>
                                  <td className="p-2 font-mono text-slate-500">{fm.principle_id || '-'}</td>
                                  <td className="p-2 font-mono text-slate-500">{fm.member_id_tpa || fm.member_tpa_code || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
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
                    <DialogTitle className="text-2xl font-black text-slate-900 leading-tight flex items-center gap-3">
                      <span>{selectedRequest.endorsement_number}</span>
                      {selectedRequest.approval_ref && (
                        <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md font-mono">
                          Ref: {selectedRequest.approval_ref}
                        </span>
                      )}
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
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/10 border-b border-border">
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider ps-6">Beneficiary Name</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">National ID</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Staff ID</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Insurer ID</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Principal ID</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider">Individual ID</th>
                            <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-right pe-6">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {items.map((sibling: any) => {
                            const staffId = sibling.details?.staff_code || sibling.staff_code || "-";
                            const insurerId = sibling.details?.member_id_insurance || sibling.member_id_insurance || "-";
                            const principalId = sibling.details?.principle_id || sibling.principle_id || "-";
                            const individualId = sibling.details?.member_id_tpa || sibling.member_id_tpa || sibling.details?.member_id_individual || "-";
                            
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
                                <td className="p-3 font-mono text-muted-foreground">{staffId}</td>
                                <td className="p-3 font-mono text-muted-foreground">{insurerId}</td>
                                <td className="p-3 font-mono text-muted-foreground">{principalId}</td>
                                <td className="p-3 font-mono text-muted-foreground">{individualId}</td>
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
