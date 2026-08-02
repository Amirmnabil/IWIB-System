'use client';

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  Activity, BarChart3, PieChart as PieChartIcon, TrendingUp,
  Upload, FileText, Download, Calculator, Users, Building2,
  Stethoscope, Pill, ShieldAlert, HeartPulse, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, AlertTriangle, FileDown, BrainCircuit,
  UserCheck, Layers, Search, ArrowUpRight, Zap, Target,
  DollarSign, Calendar, Sliders, RefreshCw, X, Shield, LayoutDashboard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line, LabelList
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import type { Policy, Company, PolicyMember } from "@/lib/types";
import { useToast } from "@/lib/hooks/use-toast";
import * as XLSX from 'xlsx';
import { format, differenceInDays } from "date-fns";
import { generateMedicalUtilizationInsights } from "@/ai/flows/medical-utilization-insights";
import { cn, formatCompactNumber } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/components/i18n-context";
import { useMasterData } from "@/lib/hooks/use-master-data";
import { toast as sonnerToast } from 'sonner';
import {
  calculatePhase1BasicAnalysis,
  calculatePhase2AdvancedAnalysis,
  calculatePhase3ForecastingAnalysis,
  runScenarioSimulator,
  DEFAULT_ICD_CHAPTERS
} from "@/lib/medical-analytics/advanced-analytics-service";

const COLORS = ['#131A80', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F43F5E'];
const MONOCHROME_BLUES = ['#0F172A', '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];
const WARM_COLORS = ['#DC2626', '#EA580C', '#D97706', '#EAB308', '#B45309', '#F43F5E', '#C05621', '#DD6B20', '#E53E3E', '#D69E2E'];

const TEMPLATE_HEADERS = [
  "Insurer Name", "Policy Name", "Policy Number", "TPA Name",
  "Policy Start Date", "Policy End Date", "Member Code", "Plan Name",
  "Service Date", "Provider Name", "Provider Type (Hospital / Clinic / Pharmacy / Lab / Radiology)",
  "Medical Network (In-Network / Out-of-Network)", "Diagnosis Description", "ICD Code",
  "Chronic Condition (Yes/No)", "Pre-existing Condition (Yes/No)",
  "Case Type (Inpatient / Outpatient / Emergency / Maternity / Dental / Optical)",
  "Approval Amount", "Co-payment", "Net Amount", "Approval Number",
  "Approval Status (Approved / Rejected / Pending)", "Length of Stay (Days)", "Admission Type (Elective / Emergency)"
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

const formatPercent = (val: number) => {
  if (val > 1000) return `${Math.round(val).toLocaleString()}%`;
  return `${val.toFixed(1)}%`;
};

export default function MedicalUtilizationAnalytics() {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Simulator & Advanced Controls
  const [largeClaimThreshold, setLargeClaimThreshold] = useState<number>(50000);
  const [selectedMemberModal, setSelectedMemberModal] = useState<any | null>(null);
  const [copayIncreasePercent, setCopayIncreasePercent] = useState<number>(5);
  const [oonRestrictionFlag, setOonRestrictionFlag] = useState<boolean>(true);
  const [headcountDeltaPercent, setHeadcountDeltaPercent] = useState<number>(10);

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({ left: direction === 'left' ? -250 : 250, behavior: 'smooth' });
    }
  };

  const { data: icdCodesMaster } = useMasterData('icd_codes');
  const chronicIcdsMaster = useMemo(() => {
    if (icdCodesMaster && icdCodesMaster.length > 0) {
      return icdCodesMaster.filter((c: any) => c.is_chronic).map((c: any) => c.code);
    }
    return ['I10', 'E11', 'E14', 'E78', 'I25'];
  }, [icdCodesMaster]);

  // Supabase Data
  const { data: policiesData } = useSupabaseCollection<Policy>('policies');
  const policies = useMemo(() => {
    return (policiesData || []).filter(p => p.policy_type?.toLowerCase() === 'medical');
  }, [policiesData]);

  const selectedPolicy = useMemo(() => policies.find(p => p.id === selectedPolicyId), [policies, selectedPolicyId]);

  // Fetch members for census enrichment
  const membersFilter = useCallback((query: any) => {
    return query.eq('policy_id', selectedPolicyId);
  }, [selectedPolicyId]);

  const { data: membersData } = useSupabaseCollection<PolicyMember>(
    'policy_members',
    membersFilter,
    {
      enabled: !!selectedPolicyId,
      filterKey: "policy_members-filter"
    }
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
      "Diagnosis": r.icdDescription,
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

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [fwaAlerts, setFwaAlerts] = useState<any[]>([]);
  const [memberRisks, setMemberRisks] = useState<any[]>([]);

  const fetchBackendData = async (policyId: string) => {
    try {
      const [dashRes, fwaRes, riskRes] = await Promise.all([
        fetch(`/api/medical-analytics/get-dashboard?policyId=${policyId}`),
        fetch(`/api/medical-analytics/get-fwa-alerts?policyId=${policyId}`),
        fetch(`/api/medical-analytics/get-member-risk?policyId=${policyId}`)
      ]);
      
      const dash = await dashRes.json();
      const fwa = await fwaRes.json();
      const risk = await riskRes.json();
      
      if (dash.success) setDashboardData(dash.data);
      if (fwa.success) setFwaAlerts(fwa.data);
      if (risk.success) setMemberRisks(risk.data);
    } catch (e) {
      console.error("Failed to fetch backend data", e);
    }
  };

  React.useEffect(() => {
    if (selectedPolicyId) {
      fetchBackendData(selectedPolicyId);
    } else {
      setDashboardData(null);
      setFwaAlerts([]);
      setMemberRisks([]);
    }
  }, [selectedPolicyId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!selectedPolicyId) {
      sonnerToast.error("No Policy Selected", { description: "Please select an insurance contract from the dropdown first." });
      return;
    }

    setIsUploading(true);
    sonnerToast.loading(t('analyzingData') || 'Uploading and analyzing...', {
      description: 'Parsing claims & matching with Census data...',
      id: 'analysis-toast'
    });

    try {
      // 1. Read Excel file client-side immediately
      const { rawClaims } = await readConsumptionFile(file);

      if (!rawClaims || rawClaims.length === 0) {
        throw new Error("The uploaded file contains no data rows.");
      }

      // 2. Build Census Member Lookup Map (Member TPA Code & Name -> PolicyMember)
      const censusMap = new Map<string, any>();
      const censusNameMap = new Map<string, any>();

      if (policyMembers && policyMembers.length > 0) {
        policyMembers.forEach((m: any) => {
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

      // 3. Normalize & Enrich Claims
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

        // Calculate exact age from Census date_of_birth or claim DOB/Age
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
        ]) || selectedPolicy?.tpa_name || 'Standard Provider');

        const providerType = String(getRowVal(row, [
          'providertype', 'facilitytype', 'category', 'type', 'نوعمقدمالخدمة'
        ]) || 'Clinic/Hospital');

        const caseType = String(getRowVal(row, [
          'casetype', 'servicetype', 'claimtype', 'inpatientoutpatient', 'category', 'نوعالحالة'
        ]) || 'Outpatient');

        const icdCode = String(getRowVal(row, [
          'icdcode', 'icd10', 'icd', 'diagnosiscode', 'كودالتشخيص'
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

      sonnerToast.success('Analysis Complete', {
        description: `Successfully analyzed ${processedClaims.length} utilization claims for ${selectedPolicy?.client_company_name}.`,
        id: 'analysis-toast'
      });

      // 4. Run AI Insights
      runAiAnalysis(processedClaims);

      // 5. Send to backend pipeline asynchronously
      const formData = new FormData();
      formData.append('file', file);
      formData.append('policyId', selectedPolicyId);
      fetch('/api/upload-consumption', { method: 'POST', body: formData }).catch(err => console.log("Backend sync:", err));

    } catch (err: any) {
      console.error(err);
      sonnerToast.error("Analysis Failed", {
        description: err?.message || "Could not process the uploaded file.",
        id: 'analysis-toast'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Merged 3-Phase Analytics Engines
  const policyValueConfig = useMemo(() => ({
    annual_premium: selectedPolicy?.premium_total || 600000
  }), [selectedPolicy]);

  const phase1 = useMemo(() => {
    if (!selectedPolicy || consumptionData.length === 0) return null;
    return calculatePhase1BasicAnalysis(consumptionData, policyMembers, policyValueConfig);
  }, [consumptionData, policyMembers, selectedPolicy, policyValueConfig]);

  const phase2 = useMemo(() => {
    if (!selectedPolicy || consumptionData.length === 0) return null;
    return calculatePhase2AdvancedAnalysis(consumptionData, policyMembers, policyValueConfig, largeClaimThreshold);
  }, [consumptionData, policyMembers, selectedPolicy, policyValueConfig, largeClaimThreshold]);

  const phase3 = useMemo(() => {
    if (!selectedPolicy || consumptionData.length === 0) return null;
    return calculatePhase3ForecastingAnalysis(consumptionData, policyMembers, policyValueConfig);
  }, [consumptionData, policyMembers, selectedPolicy, policyValueConfig]);

  const simulatorResults = useMemo(() => {
    if (!selectedPolicy || consumptionData.length === 0) return null;
    return runScenarioSimulator(
      consumptionData,
      policyMembers,
      policyValueConfig,
      copayIncreasePercent,
      { 'Outpatient': 1000 },
      oonRestrictionFlag
    );
  }, [consumptionData, policyMembers, selectedPolicy, policyValueConfig, copayIncreasePercent, oonRestrictionFlag]);

  const runAiAnalysis = async (data: any[]) => {
    if (data.length === 0 || !phase1) return;
    setIsAnalyzing(true);
    try {
      const result = await generateMedicalUtilizationInsights({
        companyName: selectedPolicy?.client_company_name || 'Valued Client',
        kpis: {
          totalClaims: phase1.kpis.totalClaimsCount,
          totalNetCost: phase1.kpis.totalNetCost,
          averageCostPerMember: phase1.kpis.avgCostPerMemberPMPY,
          lossRatio: phase2?.financialPerformance.overallLossRatio || 75,
          pmpm: phase1.kpis.avgCostPerMemberPMPY / 12
        },
        forecasting: {
          projectedTotal: phase3?.projection.annualizedProjectedTotal || 0,
          nextYearForecast: phase3?.projection.nextYearForecastTotal || 0,
          forecastedLossRatio: phase3?.projection.projectedLossRatio || 0
        },
        clinicalInsights: {
          chronicCost: phase2?.riskConcentration.chronicBurden.chronicCost || 0,
          maternityCost: 0,
          erCost: 0
        },
        topProviders: phase1.topProviders.byCost.slice(0, 5),
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

  return (
    <div className={cn("space-y-6 pb-12", isRtl && "font-arabic")}>
      <PageHeader
        title={t('medicalUtilizationAnalytics')}
        description={selectedPolicy ? `${selectedPolicy.client_company_name} · ${selectedPolicy.policy_number}` : t('readyForDiagnosticsDescription')}
      >
        <div className={cn("flex gap-2 flex-wrap", isRtl && "flex-row-reverse")}>
          <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
            <SelectTrigger className="w-[300px] bg-card border-2">
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
            <FileDown className="w-4 h-4 text-primary" /> {t('downloadTemplate')}
          </Button>

          {consumptionData.length > 0 && (
            <Button variant="outline" onClick={handleExportEnrichedData} className="gap-2 h-10 font-bold border-2 border-emerald-200 text-emerald-700 bg-success/10">
              <Download className="w-4 h-4" /> {t('exportEnrichedAnalysis')}
            </Button>
          )}

          <Button variant="outline" disabled={!selectedPolicyId || isUploading} onClick={() => fileInputRef.current?.click()} className="gap-2 h-10 font-bold bg-primary/10 border-2 border-indigo-200 text-indigo-700">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t('uploadConsumption')}
          </Button>

          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </PageHeader>

      {/* ── Contract Information & Census Summary ───────────────────── */}
      {selectedPolicy && (
        <Card className="rounded-2xl border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-background to-purple-50/40 shadow-sm p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Contract / Client</p>
              <p className="font-bold text-foreground truncate">{selectedPolicy.client_company_name}</p>
              <p className="text-[11px] text-indigo-600 font-semibold">{selectedPolicy.policy_number}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Insurer &amp; TPA</p>
              <p className="font-bold text-foreground truncate">{selectedPolicy.insurance_company_name || 'Standard Insurer'}</p>
              <p className="text-[11px] text-muted-foreground font-semibold">{selectedPolicy.tpa_name || 'Direct'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Policy Period</p>
              <p className="font-bold text-foreground">{selectedPolicy.start_date ? format(new Date(selectedPolicy.start_date), 'MMM d, yyyy') : '—'}</p>
              <p className="text-[11px] text-muted-foreground">to {selectedPolicy.end_date ? format(new Date(selectedPolicy.end_date), 'MMM d, yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Contract Premium</p>
              <p className="font-black text-emerald-700 text-sm">{formatCompactNumber(selectedPolicy.premium_total || 0)} EGP</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Medical Network</p>
              <p className="font-bold text-foreground truncate">{selectedPolicy.medical_network || 'In-Network'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Enrolled Census Lives</p>
              <p className="font-black text-indigo-900 text-sm flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                {policyMembers.length} Lives
              </p>
              <p className="text-[10px] text-muted-foreground italic">Matched via Member TPA Code</p>
            </div>
          </div>
        </Card>
      )}

      {!consumptionData.length ? (
        <Card className="border-dashed border-4 bg-background/50 py-32 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">Ready for Medical Consumption Analysis</h3>
            <p className="text-muted-foreground leading-relaxed">
              Select a Policy Contract above, then upload your Medical Utilization claims file to launch the 3-Phase Advanced Actuarial Engine.
            </p>
            <Button size="lg" className="bg-primary hover:bg-indigo-700 font-bold h-12 px-8 mt-4 shadow-lg shadow-indigo-200" onClick={() => fileInputRef.current?.click()} disabled={!selectedPolicyId}>
              {t('startAnalysisEngine')}
            </Button>
          </div>
        </Card>
      ) : (
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
                  <StatCard title="Total Net Claims Cost" value={`${formatCompactNumber(phase1.kpis.totalNetCost)} EGP`} icon={TrendingUp} color="bg-blue-600" />
                  <StatCard title="Total Claims Count" value={phase1.kpis.totalClaimsCount} icon={FileText} color="bg-amber-500" />
                  <StatCard title="Avg Cost / Claim" value={`${formatCompactNumber(phase1.kpis.avgCostPerClaim)} EGP`} icon={Stethoscope} color="bg-teal-600" />
                  <StatCard title="PMPY (Per Enrolled Life)" value={`${formatCompactNumber(phase1.kpis.avgCostPerMemberPMPY)} EGP`} icon={Users} color="bg-emerald-600" />
                  <StatCard title="Utilization Rate" value={`${phase1.kpis.utilizationRate.toFixed(1)}%`} icon={PieChartIcon} color="bg-purple-600" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
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

                  <Card className="p-6">
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
                {/* Redesigned Loss Ratio Visual Graph */}
                <Card className="lg:col-span-2 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <CardTitle className="text-sm font-bold uppercase text-indigo-950 flex items-center gap-2">
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

                  {/* Massive Centered Number filling card */}
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
                  <Card className="lg:col-span-2 p-6">
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

                    {/* Segmented Tier Bar Graph */}
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
                        <CardTitle className="text-sm font-bold uppercase text-indigo-950 flex items-center gap-2">
                          <HeartPulse className="w-4 h-4 text-amber-600" /> Chronic Burden &amp; Clinical Risk
                        </CardTitle>
                        <Badge className="bg-amber-600 text-white font-bold text-[10px] py-0.5">
                          {phase2.riskConcentration.chronicBurden.chronicHeadcount} Chronic Lives
                        </Badge>
                      </div>

                      {/* Main Cost Concentration Box */}
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

                        {/* Visual Split Bar */}
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

                      {/* Metrics Comparison */}
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
                <Card className="p-6">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                      <CardTitle className="text-base font-black text-indigo-950 flex items-center gap-2">
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
                              <td className="p-3 font-bold text-indigo-950">
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
              <Card className="p-6">
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
                {/* Upper Grid: Age & Gender Pyramid + Principal vs Dependent Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Redesigned Age & Gender Pyramid */}
                  <Card className="lg:col-span-2 p-6">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                      <div>
                        <CardTitle className="text-base font-black text-indigo-950 flex items-center gap-2">
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

                  {/* Additional Analysis #1: Principal vs Dependent Breakdown */}
                  <Card className="p-6 flex flex-col justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase mb-2 text-indigo-950 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" /> Principal vs Dependent Split
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mb-4">Family ratio and dependency profile</p>

                      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl mb-4 text-center space-y-1">
                        <p className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">Dependent Ratio</p>
                        <p className="text-4xl font-black text-emerald-950">{phase1.populationSummary.dependentRatio.toFixed(2)}</p>
                        <p className="text-xs text-emerald-800 font-medium">Dependents per Principal Employee</p>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                          <span className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Principal Employees
                          </span>
                          <span className="font-black text-slate-900">{phase1.populationSummary.relationStats.PRINCIPAL || 0} Lives</span>
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

                {/* Additional Analysis #2: Claims Spend & Risk Intensity by Age Band */}
                <Card className="p-6">
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
                        <p className="font-bold text-indigo-950">{b.name} Band</p>
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
                <Card className="p-6">
                  <CardTitle className="text-sm font-bold uppercase mb-4 text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> Provider Outliers (&gt;1.5x Peer Average)
                  </CardTitle>
                  <div className="space-y-3">
                    {phase2.qualityFlags.providerOutliers.map((p, i) => (
                      <div key={i} className="p-3 border border-red-200 bg-red-50/50 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-red-950">{p.name}</p>
                          <p className="text-muted-foreground">{p.type} · {p.count} Claims</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-red-700">{formatCompactNumber(p.avgCost)} EGP/claim</p>
                          <p className="text-[10px] text-red-500 font-bold">{p.ratio.toFixed(1)}x Peer Avg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <CardTitle className="text-sm font-bold uppercase mb-4 text-amber-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" /> Duplicate Claim Flags (Within 7-Day Window)
                  </CardTitle>
                  <div className="space-y-3">
                    {phase2.qualityFlags.duplicateFlags.map((d, i) => (
                      <div key={i} className="p-3 border border-amber-200 bg-amber-50/50 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-amber-950">{d.memberName} ({d.memberCode})</p>
                          <p className="text-muted-foreground">{d.providerName} · ICD: {d.icdCode}</p>
                        </div>
                        <Badge className="bg-amber-600">{formatCompactNumber(d.amount)} EGP</Badge>
                      </div>
                    ))}
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
                      <CardTitle className="text-base font-black text-indigo-950 flex items-center gap-2">
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
            <Card className="p-8 text-center border-2 border-purple-200 bg-purple-50/50">
              <BrainCircuit className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-purple-950">GenAI Strategic Medical Insights</h3>
              <p className="text-sm text-purple-800 max-w-lg mx-auto mt-2">
                Synthesized insights based on full actuarial consumption models across claims cost, member risk, and network efficiency.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Member Drill-Down Modal */}
      <Dialog open={!!selectedMemberModal} onOpenChange={() => setSelectedMemberModal(null)}>
        <DialogContent className="max-w-2xl">
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
            <div className="p-4 bg-slate-50 border rounded-lg">
              Showing detailed claim history records for member code: {selectedMemberModal?.code}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
