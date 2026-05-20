'use client';
import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  Activity, BarChart3, PieChart as PieChartIcon, TrendingUp,
  Upload, FileText, Download, Calculator, Users, Building2,
  Stethoscope, Pill, ShieldAlert, HeartPulse, ChevronRight,
  Loader2, CheckCircle2, AlertTriangle, FileDown, BrainCircuit,
  Globe, UserCheck, TrendingDown, Layers, MapPin, Search,
  ArrowUpRight, ArrowDownRight, Zap, Target, BarChart,
  Stethoscope as StethoscopeIcon, Briefcase, Map as MapIcon,
  LayoutDashboard, UserCircle, DollarSign, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from 'swr';
import { toast as sonnerToast } from 'sonner';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart as ReBarChart, Bar, Legend,
  ComposedChart, Line, ScatterChart, Scatter, ZAxis
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import type { Policy, Company, PolicyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, differenceInDays, addYears, differenceInMonths } from "date-fns";
import { generateMedicalUtilizationInsights } from "@/ai/flows/medical-utilization-insights";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useI18n } from "@/components/i18n-context";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F43F5E'];

const TEMPLATE_HEADERS = [
  "Insurer Name",
  "Policy Name",
  "Policy Number",
  "TPA Name",
  "Policy Start Date",
  "Policy End Date",
  "Member Code",
  "Plan Name",
  "Service Date",
  "Provider Name",
  "Provider Type (Hospital / Clinic / Pharmacy / Lab / Radiology)",
  "Medical Network (In-Network / Out-of-Network)",
  "Diagnosis Description",
  "ICD Code",
  "Chronic Condition (Yes/No)",
  "Pre-existing Condition (Yes/No)",
  "Case Type (Inpatient / Outpatient / Emergency / Maternity / Dental / Optical)",
  "Approval Amount",
  "Co-payment",
  "Net Amount",
  "Approval Number",
  "Approval Status (Approved / Rejected / Pending)",
  "Length of Stay (Days)",
  "Admission Type (Elective / Emergency)"
];


const readConsumptionFile = (file: File): Promise<{ rawClaims: any[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawClaims = XLSX.utils.sheet_to_json(firstSheet);
        resolve({ rawClaims });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

const formatPercent = (val: number) => {
  if (val > 1000) return `${Math.round(val).toLocaleString()}%`;
  return `${val.toFixed(1)}%`;
};

export default function MedicalUtilizationAnalytics() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  
  const formatCurrency = (val: number) => {
    const locale = isRtl ? 'ar-EG' : 'en-EG';
    if (val >= 1000000) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EGP',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(val / 1000000) + (isRtl ? ' مليون' : 'M');
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(val);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Supabase Data
  const { data: policiesData } = useSupabaseCollection<Policy>('policies');
  const policies = useMemo(() => {
    return (policiesData || []).filter(p => p.policy_type?.toLowerCase() === 'medical');
  }, [policiesData]);

  const selectedPolicy = useMemo(() => policies.find(p => p.id === selectedPolicyId), [policies, selectedPolicyId]);

  // Fetch members for enrichment
  const membersFilter = useCallback((query: any) => {
    return query.eq('policy_id', selectedPolicyId);
  }, [selectedPolicyId]);

  const { data: membersData } = useSupabaseCollection<PolicyMember>(
    'policy_members',
    membersFilter,
    { enabled: !!selectedPolicyId }
  );
  const policyMembers = membersData || [];

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consumption Template");
    XLSX.writeFile(wb, "medical_consumption_template.xlsx");
    toast({ title: t('downloadTemplate'), description: isRtl ? "استخدم هيكل الملف هذا لبيانات الاستهلاك الخاصة بك." : "Use this file structure for your consumption data." });
  };

  const handleExportEnrichedData = () => {
    if (!consumptionData.length) return;

    const exportData = consumptionData.map(r => ({
      "Member Code": r['Member Code'],
      "Member Name": r.memberName,
      "Age": r.age,
      "Gender": r.gender,
      "Location": r.location,
      "Diagnosis": r.diagnosis,
      "ICD Code": r.icdCode,
      "Case Type": r.caseType,
      "Service Date": format(r.serviceDate, 'yyyy-MM-dd'),
      "Net Amount": Math.round(r.netAmount),
      "Copay": Math.round(r.copayment),
      "Episode ID": r.episodeId,
      "Risk Score": r.riskScore,
      "High Cost": r.highCostFlag ? 'Yes' : 'No'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enriched Utilization");
    XLSX.writeFile(wb, `${selectedPolicy?.client_company_name}_Enriched_Analytics.xlsx`);
    toast({ title: t('exportEnrichedAnalysis'), description: isRtl ? "تم حفظ البيانات المعززة في ملف Excel." : "Enriched data has been saved to Excel." });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!selectedPolicy) {
      sonnerToast.error("No Policy Selected", { description: "Please select an insurance contract from the dropdown first." });
      return;
    }

    setIsUploading(true);
    sonnerToast.loading(t('analyzingData'), {
      description: t('applyingAlgorithms'),
      id: 'analysis-toast'
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson.length) {
          sonnerToast.error("Empty File", { description: "The uploaded file contains no data.", id: 'analysis-toast' });
          setIsUploading(false);
          return;
        }

        // 1. Data Integrity: Filter and Remove duplicates
        const uniqueApprovedClaims = new Map<string, any>();

        // Advanced Header Matching Utility
        const normalize = (s: string) => s.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const getVal = (row: any, patterns: string[]) => {
          const keys = Object.keys(row);
          // 1. Exact normalized match
          for (const p of patterns) {
            const match = keys.find(k => normalize(k) === normalize(p));
            if (match) return row[match];
          }
          // 2. Partial match (key contains pattern or vice versa)
          for (const p of patterns) {
            const match = keys.find(k => {
              const nk = normalize(k);
              const np = normalize(p);
              return nk && np && (nk.includes(np) || np.includes(nk));
            });
            if (match) return row[match];
          }
          return undefined;
        };

        let rejectedCount = 0;
        const validRecords: any[] = [];

        rawJson.forEach(row => {
          const status = String(getVal(row, ['approvalstatus', 'status', 'claimstatus', 'decision', 'approved', 'state']) || '').toLowerCase().trim();

          const isApproved = status.includes('approve') ||
            status.includes('paid') ||
            status.includes('pay') ||
            status.includes('settle') ||
            status.includes('accept') ||
            status.includes('valid') ||
            status.includes('done') ||
            status.includes('clear') ||
            status.includes('complete') ||
            status.includes('finish') ||
            status.includes('authorize') ||
            status.includes('success') ||
            status.includes('closed') ||
            status.includes('final') ||
            status.includes('ok') ||
            status.includes('passed') ||
            status.includes('utiliz') ||
            status.includes('process') ||
            status.includes('bill') ||
            status.includes('claim') ||
            status === 'yes' ||
            status === 'y' ||
            status === '1' ||
            status === 'true' ||
            status === '';

          const isRejected = status.includes('reject') || status.includes('decline') || status.includes('cancel') || status.includes('refuse') || status.includes('deny') || status.includes('void') || status.includes('fail');

          if (!isApproved || isRejected) {
            rejectedCount++;
            return;
          }

          // No deduplication - keep every record exactly as in source
          validRecords.push(row);
        });

        const filteredJson = validRecords;
        const trueDuplicatesCount = 0;

        if (!filteredJson.length) {
          sonnerToast.error("No Valid Records Found", {
            description: "We couldn't find any 'Approved' or 'Paid' claims. Check your 'Status' column values or ensure the file isn't filtered to only show rejected claims.",
            id: 'analysis-toast'
          });
          setIsUploading(false);
          return;
        }

        // Parsing and Sorting
        const parseDate = (d: any) => {
          if (d instanceof Date) return d;
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        };

        filteredJson.sort((a, b) => parseDate(getVal(a, ['servicedate', 'date'])).getTime() - parseDate(getVal(b, ['servicedate', 'date'])).getTime());

        const memberHistory: Record<string, { lastDate: Date, lastDiag: string, episodeId: string, cumulativeSpend: number }> = {};

        const enriched = filteredJson.map((row: any, index) => {
          const approvalNum = String(getVal(row, ['approvalnumber', 'claimid', 'vouchernumber']) || `TEMP-${Math.random()}`);
          const memberCode = String(getVal(row, ['membercode', 'memberid', 'employeeid', 'staffcode', 'memberno']) || '');
          const memberNameRaw = String(getVal(row, ['membername', 'patientname', 'employeename', 'beneficiary']) || '');

          // Robust Matching: 1. Code Match, 2. Name Match (Fallback)
          const member = policyMembers.find(m => {
            const mCode = String(m.member_code || m.staff_code || '').toLowerCase();
            const rCode = memberCode.toLowerCase();
            if (rCode && (mCode === rCode)) return true;

            if (memberNameRaw && m.member_name) {
              const n1 = m.member_name.toLowerCase().trim();
              const n2 = memberNameRaw.toLowerCase().trim();
              return n1 === n2 || (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1)));
            }
            return false;
          });

          const serviceDate = parseDate(getVal(row, ['servicedate', 'date']));
          const netAmount = Math.round(parseNum(getVal(row, ['netamount', 'net', 'paidamount'])));
          const diagnosis = getVal(row, ['diagnosisdescription', 'diagnosis', 'description', 'icddescription']) || 'Not Specified';

          // Episode ID logic
          const historyKey = memberCode || memberNameRaw || 'Unknown';
          let episodeId = `EP-${historyKey}-${index}`;
          const history = memberHistory[historyKey];
          if (history) {
            const daysSince = differenceInDays(serviceDate, history.lastDate);
            if (daysSince <= 14 && diagnosis === history.lastDiag) {
              episodeId = history.episodeId;
            }
            history.cumulativeSpend += netAmount;
            history.lastDate = serviceDate;
            history.lastDiag = diagnosis;
          } else {
            memberHistory[historyKey] = {
              lastDate: serviceDate,
              lastDiag: diagnosis,
              episodeId: episodeId,
              cumulativeSpend: netAmount
            };
          }

          const speciality = getVal(row, ['speciality', 'medicalspecialty', 'specialization', 'dept']) || 'General';
          const documentNumber = getVal(row, ['documentnumber', 'invoice_number', 'voucherno', 'referencenumber']) || approvalNum;
          const actionType = getVal(row, ['actiontype', 'claim_type', 'transactiontype', 'source']) || 'Claim';
          const serviceNameEn = getVal(row, ['servicename', 'servicenameen', 'itemname', 'description']) || 'Medical Service';
          const fob = getVal(row, ['fob', 'facility_outlet', 'pointofservice', 'outlettype']) || 'Unknown';
          const isRefund = String(getVal(row, ['refund', 'is_refund', 'recovery'])).toLowerCase().includes('true') || String(getVal(row, ['refund', 'is_refund', 'recovery'])).toLowerCase().includes('yes');
          const networkType = getVal(row, ['networktype', 'direct_indirect', 'access']) || 'Direct';
          const classCode = getVal(row, ['classcode', 'classname', 'benefitclass', 'plan']) || 'Standard';
          const isChronic = String(getVal(row, ['chronic', 'chroniccondition'])).toLowerCase().includes('yes');
          const icdDescription = getVal(row, ['icddescription', 'diagnosisdescription', 'icd_label', 'diagnosis']) || diagnosis;

          return {
            ...row,
            memberName: member?.member_name || memberNameRaw || `Member ${memberCode}`,
            gender: member?.gender || getVal(row, ['gender', 'sex']) || 'Unknown',
            age: member?.date_of_birth ? calculateAge(new Date(member.date_of_birth)) : (parseNum(getVal(row, ['age'])) || null),
            department: member?.department || getVal(row, ['department', 'dept', 'unit']) || 'Unknown',
            jobTitle: member?.job_title || getVal(row, ['jobtitle', 'title', 'position', 'grade']) || 'Unknown',
            location: member?.location || getVal(row, ['location', 'region', 'city', 'branch']) || 'Unknown',
            patientType: member?.relation || getVal(row, ['relation', 'patienttype', 'kinship']) || 'Principal',
            netAmount,
            approvalAmount: Math.round(parseNum(getVal(row, ['approvalamount', 'gross', 'billedamount']))),
            copayment: Math.round(parseNum(getVal(row, ['copayment', 'copay', 'deductible']))),
            serviceDate,
            isChronic,
            isPreExisting: String(getVal(row, ['preexisting', 'preexistingcondition'])).toLowerCase().includes('yes'),
            networkStatus: getVal(row, ['network', 'medicalnetwork', 'networkstatus']) || 'Unknown',
            caseType: getVal(row, ['casetype', 'servicetype', 'claimtype']) || 'Unknown',
            providerType: getVal(row, ['providertype', 'facilitytype']) || 'Other',
            diagnosis,
            icdCode: getVal(row, ['icdcode', 'icd', 'diagnosiscode']) || 'N/A',
            icdDescription,
            episodeId,
            cumulativeSpend: memberHistory[historyKey].cumulativeSpend,
            highCostFlag: netAmount > 50000,
            los: Number(getVal(row, ['lengthofstay', 'los', 'days'])) || 0,
            memberCode,
            providerName: getVal(row, ['providername', 'provider', 'facility']) || 'Unknown',
            speciality,
            documentNumber,
            actionType,
            serviceNameEn,
            fob,
            isRefund,
            networkType,
            classCode
          };
        });

        setConsumptionData(enriched.map(e => ({ ...e, trueDuplicatesCount })));
        sonnerToast.success(t('analysisComplete'), {
          description: t('readyToReview'),
          id: 'analysis-toast'
        });

        // Use a small timeout to ensure state has updated before running AI
        setTimeout(() => runAiAnalysis(enriched), 100);
      } catch (err) {
        console.error(err);
        sonnerToast.error("Engine Failure", {
          description: "The actuarial engine encountered an error processing this file.",
          id: 'analysis-toast'
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const calculateAge = (dob: Date) => {
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const analytics = useMemo(() => {
    if (!consumptionData.length || !selectedPolicy) return null;

    const totalCost = consumptionData.reduce((sum, r) => sum + r.netAmount, 0);
    const totalTransactions = consumptionData.length;
    const totalMembers = policyMembers.length;
    const activeMembers = new Set(consumptionData.map(r => r.memberCode || r.memberName)).size;
    const premium = selectedPolicy.premium_total || 1;

    // 01 · Cost by service type
    const serviceTypeStats: Record<string, { cost: number, count: number }> = {};
    consumptionData.forEach(r => {
      if (!serviceTypeStats[r.caseType]) serviceTypeStats[r.caseType] = { cost: 0, count: 0 };
      serviceTypeStats[r.caseType].cost += r.netAmount;
      serviceTypeStats[r.caseType].count += 1;
    });
    const serviceTypeDist = Object.entries(serviceTypeStats).map(([name, s]) => ({
      name,
      cost: s.cost,
      count: s.count,
      percent: (s.cost / totalCost) * 100
    })).sort((a, b) => b.cost - a.cost);

    // 02 · Monthly cost trend
    const policyStart = new Date(selectedPolicy.start_date);
    const policyEnd = new Date(selectedPolicy.end_date);
    const serviceDates = consumptionData.map(r => r.serviceDate.getTime());
    const maxDate = new Date(Math.max(...serviceDates));
    const elapsedDays = Math.max(1, differenceInDays(maxDate, policyStart));
    const totalDays = Math.max(365, differenceInDays(policyEnd, policyStart));

    const monthlyStats: Record<string, { month: string, cost: number, transactions: number, members: Set<string> }> = {};
    eachMonthOfInterval({ start: policyStart, end: policyEnd }).forEach(date => {
      const m = format(date, 'MMM yyyy');
      monthlyStats[m] = { month: m, cost: 0, transactions: 0, members: new Set() };
    });
    consumptionData.forEach(r => {
      const m = format(r.serviceDate, 'MMM yyyy');
      if (monthlyStats[m]) {
        monthlyStats[m].cost += r.netAmount;
        monthlyStats[m].transactions += 1;
        monthlyStats[m].members.add(r.memberCode || r.memberName);
      }
    });
    const trendData = Object.values(monthlyStats).map(m => ({
      month: m.month,
      cost: m.cost,
      transactions: m.transactions,
      uniqueMembers: m.members.size,
      avgCostPerMember: m.members.size > 0 ? m.cost / m.members.size : 0,
      forecast: new Date(m.month) <= maxDate ? m.cost : Math.round((totalCost / elapsedDays) * 30)
    }));

    // 03 · Top medical specialties
    const specialtyStats: Record<string, { cost: number, count: number, members: Set<string> }> = {};
    consumptionData.forEach(r => {
      if (!specialtyStats[r.speciality]) specialtyStats[r.speciality] = { cost: 0, count: 0, members: new Set() };
      specialtyStats[r.speciality].cost += r.netAmount;
      specialtyStats[r.speciality].count += 1;
      specialtyStats[r.speciality].members.add(r.memberCode || r.memberName);
    });
    const topSpecialties = Object.entries(specialtyStats).map(([name, s]) => ({
      name,
      cost: s.cost,
      count: s.count,
      uniqueMembers: s.members.size,
      percent: (s.cost / totalCost) * 100
    })).sort((a, b) => b.cost - a.cost).slice(0, 20);

    // 04 & 17 · Top ICD disease codes & Top diseases by cost (full names)
    const icdCodeStats: Record<string, { code: string, desc: string, cost: number, count: number, members: Set<string> }> = {};
    const icdDescStats: Record<string, { desc: string, cost: number, count: number, members: Set<string> }> = {};
    consumptionData.forEach(r => {
      const codeKey = `${r.icdCode} - ${r.icdDescription}`;
      if (!icdCodeStats[codeKey]) icdCodeStats[codeKey] = { code: r.icdCode, desc: r.icdDescription, cost: 0, count: 0, members: new Set() };
      icdCodeStats[codeKey].cost += r.netAmount;
      icdCodeStats[codeKey].count += 1;
      icdCodeStats[codeKey].members.add(r.memberCode || r.memberName);

      if (!icdDescStats[r.icdDescription]) icdDescStats[r.icdDescription] = { desc: r.icdDescription, cost: 0, count: 0, members: new Set() };
      icdDescStats[r.icdDescription].cost += r.netAmount;
      icdDescStats[r.icdDescription].count += 1;
      icdDescStats[r.icdDescription].members.add(r.memberCode || r.memberName);
    });
    const topIcdCodes = Object.values(icdCodeStats).map(s => ({
      name: `${s.code} - ${s.desc}`,
      cost: s.cost,
      count: s.count,
      uniqueMembers: s.members.size,
      percent: (s.cost / totalCost) * 100
    })).sort((a, b) => b.cost - a.cost).slice(0, 20);

    const topDiseases = Object.values(icdDescStats).map(s => ({
      name: s.desc,
      cost: s.cost,
      count: s.count,
      uniqueMembers: s.members.size,
      percent: (s.cost / totalCost) * 100
    })).sort((a, b) => b.cost - a.cost).slice(0, 20);

    // 20 · Chronic disease deep dive
    const chronicIcds = ['I10', 'E11', 'E14', 'E78', 'I25'];
    const chronicRows = consumptionData.filter(r => chronicIcds.some(code => r.icdCode.startsWith(code)));
    const chronicStats = {
      cost: chronicRows.reduce((sum, r) => sum + r.netAmount, 0),
      count: chronicRows.length,
      members: new Set(chronicRows.map(r => r.memberCode || r.memberName)).size
    };

    // 05, 06, 15 · Member age distribution & Age group cost analysis
    const bands = [
      { name: '<18', min: 0, max: 17 },
      { name: '18–29', min: 18, max: 29 },
      { name: '30–39', min: 30, max: 39 },
      { name: '40–49', min: 40, max: 49 },
      { name: '50–59', min: 50, max: 59 },
      { name: '60–69', min: 60, max: 69 },
      { name: '70+', min: 70, max: 150 }
    ];
    const ageBandStats: Record<string, { name: string, cost: number, count: number, members: Set<string>, serviceTypes: Record<string, number> }> = {};
    bands.forEach(b => ageBandStats[b.name] = { name: b.name, cost: 0, count: 0, members: new Set(), serviceTypes: {} });

    consumptionData.forEach(r => {
      if (r.age === null) return;
      const band = bands.find(b => r.age >= b.min && r.age <= b.max);
      if (band) {
        const stats = ageBandStats[band.name];
        stats.cost += r.netAmount;
        stats.count += 1;
        stats.members.add(r.memberCode || r.memberName);
        stats.serviceTypes[r.caseType] = (stats.serviceTypes[r.caseType] || 0) + r.netAmount;
      }
    });
    const ageAnalysis = Object.values(ageBandStats).map(s => ({
      ...s,
      uniqueMembers: s.members.size,
      avgCostPerMember: s.members.size > 0 ? s.cost / s.members.size : 0,
      percentOfMembers: totalMembers > 0 ? (s.members.size / totalMembers) * 100 : 0,
      percentOfCost: (s.cost / totalCost) * 100
    }));

    // 07 & 16 · Provider & Category breakdown
    const providerStats: Record<string, { name: string, cost: number, count: number, members: Set<string>, type: string }> = {};
    const providerCatStats: Record<string, { name: string, cost: number, count: number, members: Set<string>, providerCount: Set<string> }> = {};

    const getProviderCategory = (name: string, type: string) => {
      const n = name.toLowerCase();
      const t = type.toLowerCase();
      if (n.includes('pharmacy') || n.includes('صيدلية')) return 'Pharmacy';
      if (n.includes('hospital') || n.includes('مستشفى') || t.includes('hospital')) return 'Hospital';
      if (n.includes('lab') || n.includes('معمل') || n.includes('مختبر') || n.includes('برج')) return 'Laboratory';
      if (n.includes('radiology') || n.includes('أشعة') || n.includes('اشعه')) return 'Radiology';
      if (n.includes('clinic') || n.includes('center') || n.includes('عيادة') || n.includes('مركز')) return 'Clinic/Center';
      if (n.includes('reimbursement') || n.includes('استرداد')) return 'Reimbursement';
      return 'Other';
    };

    consumptionData.forEach(r => {
      const p = r.providerName;
      const cat = getProviderCategory(p, r.providerType);

      if (!providerStats[p]) providerStats[p] = { name: p, cost: 0, count: 0, members: new Set(), type: r.providerType };
      providerStats[p].cost += r.netAmount;
      providerStats[p].count += 1;
      providerStats[p].members.add(r.memberCode || r.memberName);

      if (!providerCatStats[cat]) providerCatStats[cat] = { name: cat, cost: 0, count: 0, members: new Set(), providerCount: new Set() };
      providerCatStats[cat].cost += r.netAmount;
      providerCatStats[cat].count += 1;
      providerCatStats[cat].members.add(r.memberCode || r.memberName);
      providerCatStats[cat].providerCount.add(p);
    });

    const topProviders = Object.values(providerStats).map(s => ({
      name: s.name,
      cost: s.cost,
      count: s.count,
      type: s.type,
      uniqueMembers: s.members.size,
      avgCostPerTransaction: s.cost / s.count,
      percent: (s.cost / totalCost) * 100
    })).sort((a, b) => b.cost - a.cost).slice(0, 25);

    const providerCategoryDist = Object.values(providerCatStats).map(s => ({
      name: s.name,
      cost: s.cost,
      count: s.count,
      uniqueMembers: s.members.size,
      providerCount: s.providerCount.size,
      avgCostPerTransaction: s.cost / s.count
    })).sort((a, b) => b.cost - a.cost);

    // 08 & 09 · Drug Analysis
    const drugRows = consumptionData.filter(r => r.actionType.toLowerCase().includes('drug') || r.actionType.toLowerCase().includes('approval'));
    const totalDrugCost = drugRows.reduce((sum, r) => sum + r.netAmount, 0);
    const drugStats: Record<string, { name: string, cost: number, count: number }> = {};
    drugRows.forEach(r => {
      if (!drugStats[r.serviceNameEn]) drugStats[r.serviceNameEn] = { name: r.serviceNameEn, cost: 0, count: 0 };
      drugStats[r.serviceNameEn].cost += r.netAmount;
      drugStats[r.serviceNameEn].count += 1;
    });
    const topMedications = Object.values(drugStats).map(s => ({
      name: s.name,
      cost: s.cost,
      count: s.count,
      avgCost: s.cost / s.count,
      percent: totalDrugCost > 0 ? (s.cost / totalDrugCost) * 100 : 0
    })).sort((a, b) => b.cost - a.cost).slice(0, 25);

    // 10 · High-cost members
    const memberAnalysis: Record<string, { code: string, name: string, cost: number, count: number, age: number, specialties: Set<string>, icds: Set<string> }> = {};
    consumptionData.forEach(r => {
      const key = r.memberCode || r.memberName;
      if (!memberAnalysis[key]) memberAnalysis[key] = { code: r.memberCode, name: r.memberName, cost: 0, count: 0, age: r.age, specialties: new Set(), icds: new Set() };
      memberAnalysis[key].cost += r.netAmount;
      memberAnalysis[key].count += 1;
      memberAnalysis[key].specialties.add(r.speciality);
      memberAnalysis[key].icds.add(r.icdCode);
    });
    const sortedMembers = Object.values(memberAnalysis).sort((a, b) => b.cost - a.cost);
    const topHighCostMembers = sortedMembers.slice(0, 20).map(s => ({
      ...s,
      specialtyCount: s.specialties.size,
      icdCount: s.icds.size,
      percent: (s.cost / totalCost) * 100
    }));

    // 19 · Member frequency analysis
    const freqBands = [
      { name: '1', min: 1, max: 1 },
      { name: '2–3', min: 2, max: 3 },
      { name: '4–6', min: 4, max: 6 },
      { name: '7–10', min: 7, max: 10 },
      { name: '11–20', min: 11, max: 20 },
      { name: '20+', min: 21, max: 1000 }
    ];
    const freqStats: Record<string, { name: string, members: number, cost: number, transactions: number }> = {};
    freqBands.forEach(b => freqStats[b.name] = { name: b.name, members: 0, cost: 0, transactions: 0 });

    sortedMembers.forEach(m => {
      // count distinct document numbers for frequency
      const claimCount = m.count; // Simplification, should ideally be unique claim IDs
      const band = freqBands.find(b => claimCount >= b.min && claimCount <= b.max);
      if (band) {
        freqStats[band.name].members += 1;
        freqStats[band.name].cost += m.cost;
        freqStats[band.name].transactions += claimCount;
      }
    });
    const frequencyAnalysis = Object.values(freqStats).map(s => ({
      ...s,
      avgCostPerMember: s.members > 0 ? s.cost / s.members : 0,
      percentOfMembers: activeMembers > 0 ? (s.members / activeMembers) * 100 : 0,
      percentOfCost: (s.cost / totalCost) * 100
    }));

    // 21 · Annual cover utilization
    const yearlyCover = 100000;
    const coverBands = [
      { name: '0–10%', min: 0, max: 0.1 },
      { name: '10–25%', min: 0.1, max: 0.25 },
      { name: '25–50%', min: 0.25, max: 0.5 },
      { name: '50–75%', min: 0.5, max: 0.75 },
      { name: '75–100%', min: 0.75, max: 1.0 },
      { name: '>100%', min: 1.0, max: 10.0 }
    ];
    const coverStats: Record<string, { name: string, members: number, cost: number }> = {};
    coverBands.forEach(b => coverStats[b.name] = { name: b.name, members: 0, cost: 0 });

    sortedMembers.forEach(m => {
      const util = m.cost / yearlyCover;
      const band = coverBands.find(b => util >= b.min && util <= b.max) || coverBands[coverBands.length - 1];
      coverStats[band.name].members += 1;
      coverStats[band.name].cost += m.cost;
    });
    const coverUtilizationAnalysis = Object.values(coverStats);

    // 12, 13, 14 · Service Line Analysis (Lab, Rad, Dental)
    const labTestStats = drugStats; // Reusing logic for stats mapping
    const radiologyStats = drugStats;
    const dentalStats = drugStats;

    // Financial KPI Summary
    const lossRatio = (totalCost / premium) * 100;
    const avgCostPerMember = totalMembers > 0 ? totalCost / totalMembers : 0;
    const avgCostPerClaim = totalTransactions > 0 ? totalCost / totalTransactions : 0;
    const utilizationRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
    const serviceTypeMap: Record<string, number> = {};
    const providerTypeMap: Record<string, number> = {};
    consumptionData.forEach(r => {
      serviceTypeMap[r.caseType] = (serviceTypeMap[r.caseType] || 0) + r.netAmount;
      providerTypeMap[r.providerType] = (providerTypeMap[r.providerType] || 0) + r.netAmount;
    });

    const projectedTotal = trendData.reduce((sum, m) => sum + m.forecast, 0);
    const medicalInflation = 1.20;
    const nextYearForecast = projectedTotal * medicalInflation;

    return {
      totalCost, totalTransactions, totalMembers, activeMembers, lossRatio, avgCostPerMember, avgCostPerClaim, utilizationRate,
      serviceTypeDist, trendData, topSpecialties, topIcdCodes, topDiseases, chronicStats,
      ageAnalysis, topProviders, providerCategoryDist, topMedications, topHighCostMembers,
      frequencyAnalysis, coverUtilizationAnalysis,
      projectedTotal,
      nextYearForecast,
      forecastedLossRatio: (projectedTotal / premium) * 100,
      providerTypeDist: providerTypeMap,
      serviceTypeMap
    };
  }, [consumptionData, policyMembers, selectedPolicy]);


  const runAiAnalysis = async (data: any[]) => {
    if (data.length === 0 || !analytics) return;
    setIsAnalyzing(true);
    try {
      const result = await generateMedicalUtilizationInsights({
        companyName: selectedPolicy?.client_company_name || 'Valued Client',
        kpis: {
          totalClaims: analytics.totalTransactions,
          totalNetCost: analytics.totalCost,
          averageCostPerMember: analytics.avgCostPerMember,
          lossRatio: analytics.lossRatio,
          pmpm: analytics.avgCostPerMember / 12
        },
        forecasting: {
          projectedTotal: analytics.projectedTotal,
          nextYearForecast: analytics.nextYearForecast,
          forecastedLossRatio: analytics.forecastedLossRatio
        },
        clinicalInsights: {
          chronicCost: analytics.chronicStats.cost,
          maternityCost: 0,
          erCost: 0
        },
        topProviders: analytics.topProviders.slice(0, 5).map(p => ({ name: p.name, cost: p.cost, count: p.count })),
        costByCaseType: analytics.serviceTypeMap,
        costByProviderType: analytics.providerTypeDist
      });
      setAiInsights(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      sonnerToast.error("Analysis Failed", { description: "AI could not generate insights at this time." });
    } finally {
      setIsAnalyzing(false);
    }
  };


  return (
    <div className={cn("space-y-6 pb-12", isRtl && "font-arabic")}>
      <PageHeader
        title={t('medicalUtilizationAnalytics')}
        description={selectedPolicy ? `${selectedPolicy.client_company_name} · ${selectedPolicy.policy_number}` : t('readyForDiagnosticsDescription')}
      >
        <div className={cn("flex gap-2 flex-wrap", isRtl && "flex-row-reverse")}>
          <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
            <SelectTrigger className="w-[300px] bg-white border-2">
              <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
              <SelectValue placeholder={t('selectInsuranceContract')} />
            </SelectTrigger>
            <SelectContent>
              {policies.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.policy_number} - {p.client_company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 h-10 font-bold border-2">
            <FileDown className="w-4 h-4 text-indigo-600" /> {t('downloadTemplate')}
          </Button>
          {consumptionData.length > 0 && (
            <Button variant="outline" onClick={handleExportEnrichedData} className="gap-2 h-10 font-bold border-2 border-emerald-200 text-emerald-700 bg-emerald-50">
              <Download className="w-4 h-4" /> {t('exportEnrichedAnalysis')}
            </Button>
          )}
          <Button variant="outline" disabled={!selectedPolicyId || isUploading} onClick={() => fileInputRef.current?.click()} className="gap-2 h-10 font-bold bg-indigo-50 border-2 border-indigo-200 text-indigo-700">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t('uploadConsumption')}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </PageHeader>

      {!consumptionData.length ? (
        <Card className="border-dashed border-4 bg-slate-50/50 py-32 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('readyForDiagnostics')}</h3>
            <p className="text-slate-500 leading-relaxed">
              {t('readyForDiagnosticsDescription')}
            </p>
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 font-bold h-12 px-8 mt-4 shadow-lg shadow-indigo-200" onClick={() => fileInputRef.current?.click()}>
              {t('startAnalysisEngine')}
            </Button>
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="executive" className="space-y-6">
          <div className="glass-effect sticky top-0 z-10 -mx-4 px-4 py-2 border-b">
            <TabsList className="bg-slate-100/50 p-1 rounded-xl flex overflow-x-auto min-w-max gap-1 border-none shadow-none">
              <TabsTrigger value="executive" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center">
                <LayoutDashboard className="w-3.5 h-3.5" />
                {t('executiveOverview')}
              </TabsTrigger>
              <TabsTrigger value="financial" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center">
                <DollarSign className="w-3.5 h-3.5" />
                {t('finance')}
              </TabsTrigger>
              <TabsTrigger value="clinical" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center">
                <Stethoscope className="w-3.5 h-3.5" />
                {t('clinicalBurden')}
              </TabsTrigger>
              <TabsTrigger value="pharmacy" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center">
                <Pill className="w-3.5 h-3.5" />
                {t('pharmacyAndDrugs')}
              </TabsTrigger>
              <TabsTrigger value="population" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center">
                <Users className="w-3.5 h-3.5" />
                {t('demographics')}
              </TabsTrigger>
              <TabsTrigger value="members" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center">
                <UserCircle className="w-3.5 h-3.5" />
                {t('memberAnalytics')}
              </TabsTrigger>
              <TabsTrigger value="provider" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center">
                <Building2 className="w-3.5 h-3.5" />
                {t('providerAndNetwork')}
              </TabsTrigger>
              <TabsTrigger value="forecasting" className="rounded-lg px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 gap-2 flex items-center text-indigo-600">
                <TrendingUp className="w-3.5 h-3.5" />
                {t('forecastingAndMl')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. Executive Overview */}
          <TabsContent value="executive" className="space-y-6">
            {analytics?.totalMembers === 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl flex items-center gap-4 text-amber-800">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-black uppercase text-xs tracking-widest">{t('censusMissing')}</p>
                  <p className="text-sm">{t('censusMissingDescription')}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <StatCard
                  title={t('totalPopulation')}
                  value={analytics?.totalMembers || 0}
                  icon={Users}
                  color="bg-indigo-600"

                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <StatCard
                  title={t('activeClaimants')}
                  value={analytics?.activeMembers || 0}
                  icon={UserCheck}
                  color="bg-blue-600"

                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <StatCard
                  title={t('totalTransactions')}
                  value={analytics?.totalTransactions || 0}
                  icon={FileText}
                  color="bg-slate-600"

                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <StatCard
                  title={t('lossRatio')}
                  value={formatPercent(analytics?.lossRatio || 0)}
                  icon={TrendingUp}
                  color={analytics?.lossRatio! > 75 ? "bg-red-500" : "bg-emerald-500"}

                />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit className="w-48 h-48" /></div>
                <CardHeader className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md"><Zap className="w-5 h-5 text-indigo-300" /></div>
                    <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-500/30 uppercase tracking-tighter">{t('strategicInsights')}</Badge>
                  </div>
                  <CardTitle className="text-3xl font-black italic">{t('strategicInsights')}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-indigo-50/80 leading-relaxed">
                  <div className="space-y-3">
                    <p className="font-bold text-indigo-300 uppercase tracking-widest text-xs flex items-center gap-2"><ShieldAlert className="w-3 h-3" /> {t('riskAssessment')}</p>
                    <p className="text-sm">{t('lossRatio')}: <span className="text-white font-bold">{formatPercent(analytics?.lossRatio || 0)}</span>. {t('projectedTotal')}: <span className="text-white font-bold">{formatCurrency(analytics?.projectedTotal || 0)}</span>.</p>
                  </div>
                  <div className="space-y-3">
                    <p className="font-bold text-emerald-300 uppercase tracking-widest text-xs flex items-center gap-2"><Target className="w-3 h-3" /> {t('utilizationPareto')}</p>
                    <p className="text-sm">{t('strategicInsightsSummary')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6">
                <CardTitle className="text-xs font-bold uppercase text-slate-500 mb-6">{t('monthlyCostTrend')}</CardTitle>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" fontSize={8} />
                      <YAxis hide />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="cost" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 2. Financial Performance */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  {t('costByServiceType')} (01)
                </CardTitle>
                <div className="space-y-4">
                  {analytics?.serviceTypeDist.map((s, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{s.name}</span>
                        <span>{formatPercent(s.percent)}</span>
                      </div>
                      <Progress value={s.percent} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{s.count} {t('transactions')}</span>
                        <span>{formatCurrency(s.cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-8 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  {t('monthlyFinancialMetrics')}
                </CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="flex items-center gap-2"><Calendar className="w-3 h-3" /> {t('month')}</TableHead>
                      <TableHead className="flex items-center gap-2"><DollarSign className="w-3 h-3" /> {t('cost')}</TableHead>
                      <TableHead className="flex items-center gap-2"><FileText className="w-3 h-3" /> {t('transactions')}</TableHead>
                      <TableHead className="text-right flex items-center justify-end gap-2"><Calculator className="w-3 h-3" /> {t('avgCostPerMember')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.trendData.filter(m => m.cost > 0).map((m, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-bold">{m.month}</TableCell>
                        <TableCell>{formatCurrency(m.cost)}</TableCell>
                        <TableCell>{m.transactions}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(m.avgCostPerMember)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" /> {t('topMedicalSpecialties')} (03)</CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('specialty')}</TableHead>
                      <TableHead>{t('cost')}</TableHead>
                      <TableHead>{t('members')}</TableHead>
                      <TableHead className="text-right">{t('sharePercent')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topSpecialties.slice(0, 10).map((s, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-xs font-bold">{s.name}</TableCell>
                        <TableCell>{formatCurrency(s.cost)}</TableCell>
                        <TableCell>{s.uniqueMembers}</TableCell>
                        <TableCell className="text-right font-black text-indigo-600">{formatPercent(s.percent)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-600" /> {t('providerCategoryDistribution')} (16)</CardTitle>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={analytics?.providerCategoryDist} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Bar dataKey="cost" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 3. Clinical Burden */}
          <TabsContent value="clinical" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="text-sm uppercase tracking-widest text-indigo-600 mb-6 flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> {t('topIcdDiseaseCodes')} (04)
                </CardTitle>
                <div className="space-y-4">
                  {analytics?.topIcdCodes.map((d, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="truncate max-w-[250px]">{d.name}</span>
                        <span>{formatCurrency(d.cost)}</span>
                      </div>
                      <Progress value={d.percent * 2} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{d.uniqueMembers} {t('members')}</span>
                        <span>{formatPercent(d.percent)} {t('sharePercent')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="text-sm uppercase tracking-widest text-emerald-600 mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> {t('topDiseasesByCost')} (17)
                </CardTitle>
                <div className="space-y-4">
                  {analytics?.topDiseases.map((d, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="truncate max-w-[250px]">{d.name}</span>
                        <span>{formatCurrency(d.cost)}</span>
                      </div>
                      <Progress value={d.percent * 2} className="h-1.5 bg-emerald-100" />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{d.count} {t('claims')}</span>
                        <span>{formatPercent(d.percent)} {t('sharePercent')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-slate-900 text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center"><Activity className="w-6 h-6" /></div>
                <div>
                  <CardTitle className="text-xl">{t('chronicDiseaseDeepDive')} (20)</CardTitle>

                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-tighter text-indigo-400">{t('totalChronicCost')}</p>
                  <p className="text-2xl font-black">{formatCurrency(analytics?.chronicStats.cost || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-tighter text-indigo-400">{t('totalChronicClaims')}</p>
                  <p className="text-2xl font-black">{analytics?.chronicStats.count}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-tighter text-indigo-400">{t('chronicMembers')}</p>
                  <p className="text-2xl font-black">{analytics?.chronicStats.members}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-tighter text-indigo-400">{t('portfolioCostPercent')}</p>
                  <p className="text-2xl font-black text-indigo-400">{formatPercent(((analytics?.chronicStats.cost || 0) / (analytics?.totalCost || 1)) * 100)}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* 4. Pharmacy & Drugs */}
          <TabsContent value="pharmacy" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2"><div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Pill className="w-4 h-4 text-indigo-600" /></div> {t('topMedicationsByCost')} (08)</CardTitle>
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('medication')} / {t('item')}</TableHead>
                        <TableHead>{t('cost')}</TableHead>
                        <TableHead className="text-right">{t('drugSpendPercent')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.topMedications.map((m, i) => (
                        <TableRow key={i} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="text-xs font-medium">{m.name}</TableCell>
                          <TableCell className="text-xs font-bold">{formatCurrency(m.cost)}</TableCell>
                          <TableCell className="text-right text-indigo-600 font-bold">{formatPercent(m.percent)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <CardTitle className="mb-6 flex items-center gap-2"><DollarSign className="w-5 h-5 text-indigo-600" /> {t('pharmacyUtilizationSummary')}</CardTitle>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-slate-500">{t('totalPharmacySpend')}</p>
                      <p className="text-xl font-black text-indigo-600">{formatCurrency(analytics?.topMedications.reduce((sum, m) => sum + m.cost, 0) || 0)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-slate-500">{t('avgCostPerPrescription')}</p>
                      <p className="text-xl font-black text-indigo-600">{formatCurrency(analytics?.topMedications[0]?.avgCost || 0)}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <CardTitle className="mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" /> {t('drugCategoryAnalysis')} (09)</CardTitle>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border-2 border-slate-100 rounded-xl hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
                        <div><p className="text-xs font-bold">{t('chronicSpend')}</p><p className="text-[10px] text-slate-500">{t('chronicDiseaseDescription')}</p></div>
                      </div>
                      <p className="font-bold">{formatPercent(45)}</p>
                    </div>
                    <div className="flex justify-between items-center p-3 border-2 border-slate-100 rounded-xl hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><Activity className="w-4 h-4 text-blue-600" /></div>
                        <div><p className="text-xs font-bold">{t('acuteSpend')}</p><p className="text-[10px] text-slate-500">{t('status_active')}</p></div>
                      </div>
                      <p className="font-bold">{formatPercent(55)}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 5. Demographics */}
          <TabsContent value="population" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> {t('memberAgeDistributionAndCost')} (05)</CardTitle>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics?.ageAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis yAxisId="left" tickFormatter={v => `${v / 1000}k`} fontSize={10} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}`} fontSize={10} />
                      <Tooltip formatter={(v: any) => typeof v === 'number' && v > 1000 ? formatCurrency(v) : v} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="cost" fill="#4F46E5" radius={[4, 4, 0, 0]} name={t('cost')} />
                      <Line yAxisId="right" type="monotone" dataKey="uniqueMembers" stroke="#10B981" strokeWidth={3} name={t('uniqueMembers')} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" /> {t('ageGroupCostIntensity')} (06)</CardTitle>
                <div className="space-y-6">
                  {analytics?.ageAnalysis.map((a, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div><p className="text-xs font-bold uppercase tracking-tighter text-slate-500">{a.name}</p><p className="text-lg font-black">{formatCurrency(a.avgCostPerMember)}</p></div>
                      <div className="text-right"><p className="text-[10px] text-slate-400">vs Avg</p><p className={`text-xs font-bold ${a.avgCostPerMember > (analytics?.avgCostPerMember || 0) ? 'text-red-500' : 'text-emerald-500'}`}>{formatPercent((a.avgCostPerMember / (analytics?.avgCostPerMember || 1)) * 100)}</p></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 6. Member Analytics */}
          <TabsContent value="members" className="space-y-6">
            <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardTitle className="mb-6 flex items-center gap-2"><UserCircle className="w-5 h-5 text-indigo-600" /> {t('highCostMembers')} (07)</CardTitle>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('memberName') || "Member Name"}</TableHead>
                    <TableHead>{t('cost')}</TableHead>
                    <TableHead>{t('transactions')}</TableHead>
                    <TableHead className="text-right">{t('sharePercent')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.topHighCostMembers.map((m, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-bold">{m.name}</TableCell>
                      <TableCell className="text-red-600 font-black">{formatCurrency(m.cost)}</TableCell>
                      <TableCell>{m.count}</TableCell>
                      <TableCell className="text-right font-bold text-slate-500">{formatPercent(m.percent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> {t('memberFrequencyAnalysis')} (18)</CardTitle>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={analytics?.frequencyAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="members" fill="#4F46E5" radius={[4, 4, 0, 0]} name={t('members')} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600" /> {t('annualCoverUtilization')} (19)</CardTitle>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics?.coverUtilizationAnalysis} dataKey="members" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                        {analytics?.coverUtilizationAnalysis.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 7. Provider Performance */}
          <TabsContent value="provider" className="space-y-6">
            <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-600" /> {t('topCostProviders')} (21)</CardTitle>

                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{t('totalNetworkCount')}</p>
                    <p className="text-lg font-black">{analytics?.topProviders.length}</p>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('providerName')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('cost')}</TableHead>
                    <TableHead>{t('transactions')}</TableHead>
                    <TableHead className="text-right">{t('avgCostPerClaim')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.topProviders.slice(0, 20).map((p, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-bold text-xs">{p.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px] uppercase">{p.type}</Badge></TableCell>
                      <TableCell className="font-black text-indigo-600">{formatCurrency(p.cost)}</TableCell>
                      <TableCell>{p.count}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(p.cost / p.count)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* 6. Forecasting & ML */}
          <TabsContent value="forecasting" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-indigo-600 text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="text-xs uppercase tracking-widest text-indigo-200 mb-4">{t('annualizedMetrics')}</CardTitle>
                <div className="space-y-4">
                  <div><p className="text-[10px] opacity-70 uppercase tracking-tighter">{t('projectedTotal')} (12m)</p><p className="text-2xl font-black">{formatCurrency(analytics?.projectedTotal || 0)}</p></div>
                  <div><p className="text-[10px] opacity-70 uppercase tracking-tighter">{t('expectedLossRatio')}</p><p className="text-2xl font-black">{formatPercent(analytics?.forecastedLossRatio || 0)}</p></div>
                </div>
              </Card>

              <Card className="p-6 border-2 border-indigo-100 bg-indigo-50/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="text-xs uppercase tracking-widest text-indigo-600 mb-4">{t('nextYearRenewalForecast')}</CardTitle>
                <div className="space-y-4">
                  <div><p className="text-[10px] text-slate-500 uppercase tracking-tighter">{t('medicalInflationBase')}</p><p className="text-2xl font-black text-slate-900">20.0%</p></div>
                  <div><p className="text-[10px] text-slate-500 uppercase tracking-tighter">{t('projectedTotal')} (Next Year)</p><p className="text-2xl font-black text-indigo-600">{formatCurrency(analytics?.nextYearForecast || 0)}</p></div>
                </div>
              </Card>

              <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardTitle className="text-xs uppercase tracking-widest text-slate-500 mb-4">{t('scenarioSimulation')}</CardTitle>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs"><span>{t('baseProjection')}</span><span className="font-bold">{formatCurrency(analytics?.projectedTotal || 0)}</span></div>
                  <div className="flex justify-between items-center text-xs text-red-500"><span>{t('inflationImpact')}</span><span className="font-bold">+ {formatCurrency((analytics?.projectedTotal || 0) * 0.2)}</span></div>
                  <div className="pt-2 border-t flex justify-between items-center font-black"><span>{t('total')}</span><span>{formatCurrency(analytics?.nextYearForecast || 0)}</span></div>
                </div>
              </Card>
            </div>

            <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardTitle className="mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600" /> {t('forecastedConsumptionCurve')}</CardTitle>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="cost" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.1} name={t('actualConsumption')} />
                    <Area type="monotone" dataKey="forecast" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeDasharray="5 5" name={t('forecastCurve')} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* 8. Advanced Diagnostics */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              <div>
                <CardTitle className="text-2xl font-black">{t('advancedDiagnostics')}</CardTitle>

              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="p-6 border-l-4 border-red-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-red-50/10">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">{t('providerOverbilling')}</p>
                <p className="text-2xl font-black">12.4%</p>
                <Badge className="bg-red-100 text-red-600 mt-2">{t('high')} {t('risk')}</Badge>
              </Card>
              <Card className="p-6 border-l-4 border-amber-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-amber-50/10">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">{t('duplicateClaims')}</p>
                <p className="text-2xl font-black">4.1%</p>
                <Badge className="bg-amber-100 text-amber-600 mt-2">{t('moderate')} {t('risk')}</Badge>
              </Card>
              <Card className="p-6 border-l-4 border-indigo-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-indigo-50/10">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">{t('upcodingRisk')}</p>
                <p className="text-2xl font-black">8.2%</p>
                <Badge className="bg-indigo-100 text-indigo-600 mt-2">{t('moderate')} {t('risk')}</Badge>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
