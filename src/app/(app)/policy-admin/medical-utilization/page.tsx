'use client';
import React, { useState, useMemo, useRef } from "react";
import { 
  Activity, BarChart3, PieChart as PieChartIcon, TrendingUp, 
  Upload, FileText, Download, Calculator, Users, Building2,
  Stethoscope, Pill, ShieldAlert, HeartPulse, ChevronRight,
  Loader2, CheckCircle2, AlertTriangle, FileDown, BrainCircuit,
  Globe, UserCheck, TrendingDown, Layers, MapPin, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
  ComposedChart, Line
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import type { Policy, Company, PolicyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from "date-fns";
import { generateMedicalUtilizationInsights } from "@/ai/flows/medical-utilization-insights";
import { cn } from "@/lib/utils";

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
  "Approval Status (Approved / Rejected / Pending)"
];

const BenefitItem = ({ icon: Icon, label, value, colorClass }: { icon: any, label: string, value: string, colorClass: string }) => {
  if (!value || value === 'Not covered' || value === 'None') return null;
  return (
    <div className="flex items-start gap-2 text-[11px] py-1 border-b border-slate-50 last:border-0">
      <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1">
        <span className="text-slate-400 font-medium mr-1">{label}:</span>
        <span className="text-slate-700 font-bold">{value}</span>
      </div>
    </div>
  );
};

export default function MedicalUtilizationAnalytics() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Firestore Data
  const policiesRef = useMemoFirebase(() => collection(firestore!, 'policies'), [firestore]);
  const { data: policiesData } = useCollection<Policy>(policiesRef);
  const policies = policiesData || [];
  
  const selectedPolicy = useMemo(() => policies.find(p => p.id === selectedPolicyId), [policies, selectedPolicyId]);
  
  // Fetch members for enrichment
  const membersRef = useMemoFirebase(() => {
    if (!selectedPolicyId) return null;
    return collection(firestore!, `policies/${selectedPolicyId}/members`);
  }, [firestore, selectedPolicyId]);
  const { data: membersData } = useCollection<PolicyMember>(membersRef);
  const policyMembers = membersData || [];

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consumption Template");
    XLSX.writeFile(wb, "medical_consumption_template.xlsx");
    toast({ title: "Template Downloaded", description: "Use this file structure for your consumption data." });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPolicyId) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        // Enrich Data
        const enriched = rawJson.map(record => {
          const memberCode = String(record['Member Code']);
          const member = policyMembers.find(m => String(m.member_code) === memberCode);
          return {
            ...record,
            memberName: member?.member_name || 'Unlinked Member',
            gender: member?.gender || 'Unknown',
            age: member?.date_of_birth ? calculateAge(new Date(member.date_of_birth)) : null,
            department: member?.department || 'Unknown',
            location: member?.location || 'Unknown',
            patientType: member?.relation || 'Unknown',
            netAmount: Number(record['Net Amount']) || 0,
            approvalAmount: Number(record['Approval Amount']) || 0,
            copayment: Number(record['Co-payment']) || 0,
            serviceDate: record['Service Date'] instanceof Date ? record['Service Date'] : new Date(record['Service Date']),
            isChronic: String(record['Chronic Condition']).toLowerCase() === 'yes',
            isPreExisting: String(record['Pre-existing Condition']).toLowerCase() === 'yes',
            networkStatus: record['Medical Network'] || 'Unknown'
          };
        });

        setConsumptionData(enriched);
        toast({ title: "Data enriched successfully", description: `${enriched.length} records processed.` });
        runAiAnalysis(enriched);
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: "Upload Failed", description: "Verify Excel format and headers." });
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

  const calculateKPIs = useMemo(() => {
    if (!consumptionData.length) return null;
    const totalCost = consumptionData.reduce((sum, r) => sum + r.netAmount, 0);
    const totalClaims = consumptionData.length;
    const censusSize = policyMembers.length;
    const avgCost = censusSize > 0 ? totalCost / censusSize : 0;
    const totalCopay = consumptionData.reduce((sum, r) => sum + r.copayment, 0);
    const totalApproval = consumptionData.reduce((sum, r) => sum + r.approvalAmount, 0);
    const lossRatio = selectedPolicy?.premium_total ? (totalCost / selectedPolicy.premium_total) * 100 : 0;
    const approvalRate = totalApproval > 0 ? (totalCost / totalApproval) * 100 : 0;
    const inNetworkCount = consumptionData.filter(r => String(r.networkStatus).toLowerCase().includes('in-network')).length;
    const networkUtilization = totalClaims > 0 ? (inNetworkCount / totalClaims) * 100 : 0;

    return { totalCost, totalClaims, avgCost, totalCopay, totalApproval, lossRatio, approvalRate, networkUtilization };
  }, [consumptionData, policyMembers, selectedPolicy]);

  const trendData = useMemo(() => {
    if (!consumptionData.length) return [];
    const months: Record<string, { month: string, cost: number, claims: number }> = {};
    
    consumptionData.forEach(r => {
      const monthKey = format(r.serviceDate, 'MMM yyyy');
      if (!months[monthKey]) months[monthKey] = { month: monthKey, cost: 0, claims: 0 };
      months[monthKey].cost += r.netAmount;
      months[monthKey].claims += 1;
    });

    return Object.values(months).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  }, [consumptionData]);

  const demographicData = useMemo(() => {
    if (!consumptionData.length) return [];
    const ageGroups = [
      { name: '0-18', min: 0, max: 18, cost: 0 },
      { name: '19-30', min: 19, max: 30, cost: 0 },
      { name: '31-45', min: 31, max: 45, cost: 0 },
      { name: '46-60', min: 46, max: 60, cost: 0 },
      { name: '60+', min: 61, max: 120, cost: 0 },
    ];

    consumptionData.forEach(r => {
      if (r.age !== null) {
        const group = ageGroups.find(g => r.age >= g.min && r.age <= g.max);
        if (group) group.cost += r.netAmount;
      }
    });

    return ageGroups;
  }, [consumptionData]);

  const departmentData = useMemo(() => {
    if (!consumptionData.length) return [];
    const departments: Record<string, number> = {};
    consumptionData.forEach(r => {
      const dept = r.department || 'Other';
      departments[dept] = (departments[dept] || 0) + r.netAmount;
    });
    return Object.entries(departments)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [consumptionData]);

  const providerTypeData = useMemo(() => {
    if (!consumptionData.length) return [];
    const types: Record<string, number> = {};
    consumptionData.forEach(r => {
      const type = r['Provider Type (Hospital / Clinic / Pharmacy / Lab / Radiology)'] || 'Other';
      types[type] = (types[type] || 0) + r.netAmount;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [consumptionData]);

  const topMembers = useMemo(() => {
    if (!consumptionData.length) return [];
    const members: Record<string, { name: string, code: string, dept: string, cost: number, count: number }> = {};
    consumptionData.forEach(r => {
      const code = String(r['Member Code']);
      if (!members[code]) members[code] = { name: r.memberName, code, dept: r.department, cost: 0, count: 0 };
      members[code].cost += r.netAmount;
      members[code].count += 1;
    });
    return Object.values(members).sort((a, b) => b.cost - a.cost).slice(0, 10);
  }, [consumptionData]);

  const getTopProviders = (data: any[]) => {
    const providers: Record<string, { cost: number, count: number }> = {};
    data.forEach(r => {
      const name = r['Provider Name'];
      if (!providers[name]) providers[name] = { cost: 0, count: 0 };
      providers[name].cost += r.netAmount;
      providers[name].count += 1;
    });
    return Object.entries(providers)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.cost - a.cost);
  };

  const getDistribution = (data: any[], key: string) => {
    const dist: Record<string, number> = {};
    data.forEach(r => {
      const val = r[key] || 'Other';
      dist[val] = (dist[val] || 0) + r.netAmount;
    });
    return dist;
  };

  const runAiAnalysis = async (data: any[]) => {
    if (data.length === 0) return;
    setIsAnalyzing(true);
    try {
      const kpis = calculateKPIs;
      if (!kpis) return;

      const topProviders = getTopProviders(data).slice(0, 5);
      const costByCaseType = getDistribution(data, 'Case Type (Inpatient / Outpatient / Emergency / Maternity / Dental / Optical)');
      const costByProviderType = getDistribution(data, 'Provider Type (Hospital / Clinic / Pharmacy / Lab / Radiology)');

      const result = await generateMedicalUtilizationInsights({
        companyName: selectedPolicy?.client_company_name || 'Valued Client',
        kpis: {
          totalClaims: kpis.totalClaims,
          totalNetCost: kpis.totalCost,
          averageCostPerMember: kpis.avgCost,
          lossRatio: kpis.lossRatio
        },
        topProviders,
        costByCaseType,
        costByProviderType
      });
      setAiInsights(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Medical Utilization Analytics"
        description="Deep insights into health plan performance, demographic risks, and cost drivers."
      >
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
            <SelectTrigger className="w-[250px] bg-white border-2">
              <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
              <SelectValue placeholder="Select Contract" />
            </SelectTrigger>
            <SelectContent>
              {policies.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.policy_number} - {p.client_company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            onClick={handleDownloadTemplate}
            className="gap-2 h-10 font-bold border-2"
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            Download Template
          </Button>
          <Button 
            variant="outline" 
            disabled={!selectedPolicyId || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 h-10 font-bold bg-indigo-50 border-2 border-indigo-200 text-indigo-700"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Consumption
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </PageHeader>

      {!consumptionData.length ? (
        <Card className="border-dashed border-4 bg-slate-50/50 py-32">
          <CardContent className="text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-indigo-50">
              <Activity className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-black text-slate-900">Advanced AI Diagnostics Ready</h3>
              <p className="text-slate-500 mt-2 text-lg">Select an active contract and upload the TPA utilization file to unlock the full analytical dashboard.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-700">
          
          {/* KPI Executive Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Current Loss Ratio"
              value={`${calculateKPIs?.lossRatio.toFixed(1)}%`}
              icon={TrendingUp}
              color={calculateKPIs?.lossRatio! > 70 ? "bg-red-500" : "bg-emerald-500"}
              description={selectedPolicy?.premium_total ? `Net Premium: EGP ${(selectedPolicy.premium_total / 1000).toFixed(0)}K` : "Premium not recorded"}
            />
            <StatCard
              title="Total Utilization Cost"
              value={`EGP ${(calculateKPIs?.totalCost! / 1000).toFixed(0)}K`}
              icon={Calculator}
              color="bg-indigo-600"
              description={`${calculateKPIs?.totalClaims} claims processed`}
            />
            <StatCard
              title="Average Cost / Member"
              value={`EGP ${calculateKPIs?.avgCost.toFixed(0)}`}
              icon={Users}
              color="bg-violet-600"
              description={`Census base: ${policyMembers.length} lives`}
            />
            <StatCard
              title="Network Integrity"
              value={`${calculateKPIs?.networkUtilization.toFixed(1)}%`}
              icon={Globe}
              color="bg-emerald-600"
              description="In-Network utilization rate"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Trend Analysis */}
            <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-black text-indigo-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Monthly Utilization Trend
                    </CardTitle>
                    <CardDescription>Visualizing seasonal spend vs. claim volume efficiency.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white px-3 py-1 text-xs font-bold border-indigo-100">Chronological</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#64748b'}} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `EGP ${v / 1000}k`} tick={{fill: '#64748b'}} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#64748b'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: number, name: string) => [name === 'cost' ? `EGP ${v.toLocaleString()}` : v, name === 'cost' ? 'Net Cost' : 'Claims Count']}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="cost" fill="#4F46E5" fillOpacity={0.1} stroke="#4F46E5" strokeWidth={3} />
                      <Line yAxisId="right" type="monotone" dataKey="claims" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AI Smart Insights Panel */}
            <Card className="border-none shadow-xl bg-indigo-900 text-white rounded-2xl flex flex-col">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-indigo-300" />
                  Predictive Analysis
                </CardTitle>
                <CardDescription className="text-indigo-300 font-medium">AI-driven strategic health plan audit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 flex-1 overflow-y-auto max-h-[400px]">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-400 border-t-white rounded-full animate-spin"></div>
                      <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm text-indigo-200 font-bold uppercase tracking-widest animate-pulse">Running Diagnostic AI...</p>
                  </div>
                ) : aiInsights ? (
                  <div className="space-y-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4 border-b border-indigo-800 pb-1 flex items-center justify-between">
                        Strategic Findings <Search className="w-3 h-3" />
                      </p>
                      <ul className="space-y-4">
                        {aiInsights.insights.map((insight: string, i: number) => (
                          <li key={i} className="text-sm flex gap-3 group">
                            <div className="w-6 h-6 rounded-lg bg-indigo-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-700 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="leading-relaxed font-medium text-indigo-50">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-4 border-b border-indigo-800 pb-1 flex items-center justify-between">
                        Recommendations <Calculator className="w-3 h-3" />
                      </p>
                      <ul className="space-y-4">
                        {aiInsights.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-sm flex gap-3 group">
                            <div className="w-6 h-6 rounded-lg bg-amber-900/30 flex items-center justify-center shrink-0 group-hover:bg-amber-800/50 transition-colors border border-amber-500/30">
                              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <span className="leading-relaxed font-medium text-amber-50/90 italic">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 opacity-50">
                    <BrainCircuit className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold">Waiting for enriched dataset...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Demographic Risk Profile */}
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Demographic Risk Profile
                </CardTitle>
                <CardDescription>Cost distribution by age segments. Critical for actuary analysis.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demographicData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `EGP ${v / 1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="cost" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Departmental Cost Exposure */}
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Departmental Cost Exposure
                </CardTitle>
                <CardDescription>Comparing utilization across different business units.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} fontSize={10} tickFormatter={(v) => `EGP ${v / 1000}k`} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={100} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="value" fill="#10B981" radius={[0, 6, 6, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Service Mix Analysis */}
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900">Service Mix Analysis</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={providerTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {providerTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* High-Impact Member Analysis */}
            <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-black text-indigo-900">High-Impact Member Analysis</CardTitle>
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-bold">Top 10 Drivers</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/30">
                      <TableHead className="font-bold text-[11px] pl-6">Member Details</TableHead>
                      <TableHead className="font-bold text-[11px]">Department</TableHead>
                      <TableHead className="font-bold text-[11px] text-center">Visit Count</TableHead>
                      <TableHead className="font-bold text-[11px] text-right pr-6">Total Net Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMembers.map((member, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {i + 1}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm leading-tight">{member.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{member.code}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">{member.dept}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-bold">{member.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-red-600">EGP {member.cost.toLocaleString()}</span>
                            <div className="w-20 mt-1">
                              <Progress value={(member.cost / (calculateKPIs?.totalCost || 1)) * 100 * 5} className="h-1 bg-red-100" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Cost Concentration */}
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900">Provider Cost Concentration</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/30">
                      <TableHead className="font-bold text-[11px] pl-6">Provider Name</TableHead>
                      <TableHead className="font-bold text-[11px] text-center">Service Volume</TableHead>
                      <TableHead className="font-bold text-[11px] text-right pr-6">Contribution to Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTopProviders(consumptionData).slice(0, 8).map((provider, i) => (
                      <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                        <TableCell className="pl-6 font-bold text-slate-700 text-sm">{provider.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] font-bold">{provider.count} visits</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-black text-slate-900">EGP {provider.cost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Complexity Matrix (Case Types) */}
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-lg font-black text-indigo-900">Complexity Matrix (Case Types)</CardTitle>
                <CardDescription>Inpatient vs. Outpatient vs. Specialized Care</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(getDistribution(consumptionData, 'Case Type (Inpatient / Outpatient / Emergency / Maternity / Dental / Optical)')).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} angle={-15} textAnchor="end" height={60} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `EGP ${v / 1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={35}>
                        {Object.entries(getDistribution(consumptionData, 'Case Type (Inpatient / Outpatient / Emergency / Maternity / Dental / Optical)')).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
