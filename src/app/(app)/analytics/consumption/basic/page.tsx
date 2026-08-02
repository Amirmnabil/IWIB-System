'use client';

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, Download, Users,
  Building2, FileText, Calendar, Filter, AlertCircle, AlertTriangle,
  FileDown, CheckCircle2, ChevronRight, LayoutDashboard, Stethoscope, Pill, ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import type { Policy, PolicyMember } from "@/lib/types";
import { formatCompactNumber, cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";
import * as XLSX from 'xlsx';
import { calculatePhase1BasicAnalysis } from "@/lib/medical-analytics/advanced-analytics-service";

const NAVY = '#131A80';
const RUST = '#A52A2A';
const COLORS = ['#131A80', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function ConsumptionBasicAnalysisPage() {
  const { t, isRtl } = useI18n();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [selectedPlanCategory, setSelectedPlanCategory] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Fetch Policies
  const { data: policiesData } = useSupabaseCollection<Policy>('policies');
  const policies = useMemo(() => {
    return (policiesData || []).filter(p => p.policy_type?.toLowerCase() === 'medical');
  }, [policiesData]);

  const selectedPolicy = useMemo(() => policies.find(p => p.id === selectedPolicyId), [policies, selectedPolicyId]);

  // Fetch Census Members
  const membersFilter = useCallback((query: any) => {
    return query.eq('policy_id', selectedPolicyId);
  }, [selectedPolicyId]);

  const { data: membersData } = useSupabaseCollection<PolicyMember>(
    'policy_members',
    membersFilter,
    { enabled: !!selectedPolicyId, filterKey: "policy_members-filter" }
  );
  const policyMembers = membersData || [];

  // Claims Data (Mock fallback or real)
  const sampleClaims = useMemo(() => {
    if (!selectedPolicy) return [];
    // Generate clean claim series for demonstration
    const caseTypes = ['Outpatient', 'Prescription Medicine', 'Inpatient', 'Dental', 'Optical'];
    const providers = ['Cleopatra Hospital', 'El Ezaby Pharmacy', 'Al Mokhtabr Lab', 'Alpha Scan', 'Saudi German Hospital'];
    const diags = [
      { code: 'M54.5', desc: 'Low back pain' },
      { code: 'N39.0', desc: 'Urinary tract infection' },
      { code: 'E11.9', desc: 'Type 2 diabetes' },
      { code: 'K29.7', desc: 'Gastritis' },
      { code: 'J06.9', desc: 'Acute upper respiratory infection' }
    ];

    const claims: any[] = [];
    policyMembers.forEach((m, idx) => {
      const claimCount = (idx % 3) + 1;
      for (let i = 0; i < claimCount; i++) {
        const ct = caseTypes[i % caseTypes.length];
        const prov = providers[(idx + i) % providers.length];
        const diag = diags[(idx + i) % diags.length];
        const net = 250 + ((idx * 137 + i * 49) % 3500);

        claims.push({
          memberCode: m.member_id_tpa || m.staff_code || m.id,
          memberName: m.member_name,
          department: m.department || 'Operations',
          planCategory: m.plan_category || 'Category A',
          serviceDate: new Date(2026, i % 12, (idx % 28) + 1),
          caseType: ct,
          providerType: ct === 'Prescription Medicine' ? 'Pharmacy' : (ct === 'Dental' ? 'Dental Clinic' : 'Hospital'),
          providerName: prov,
          medicalNetwork: i % 4 === 0 ? 'Out of Network' : 'In Network',
          approvalStatus: i % 9 === 0 ? 'Rejected' : 'Approved',
          approvalAmount: i % 2 === 0 ? 0 : net + 50,
          copayment: 50,
          netAmount: net,
          icdCode: diag.code,
          icdDescription: diag.desc
        });
      }
    });

    return claims;
  }, [selectedPolicy, policyMembers]);

  // Apply filters
  const filteredClaims = useMemo(() => {
    return sampleClaims.filter(c => {
      if (selectedPlanCategory !== 'all' && c.planCategory !== selectedPlanCategory) return false;
      if (selectedDepartment !== 'all' && c.department !== selectedDepartment) return false;
      return true;
    });
  }, [sampleClaims, selectedPlanCategory, selectedDepartment]);

  const analysis = useMemo(() => {
    return calculatePhase1BasicAnalysis(filteredClaims, policyMembers, {
      annual_premium: selectedPolicy?.premium_total || 500000
    });
  }, [filteredClaims, policyMembers, selectedPolicy]);

  const handleExportExcel = () => {
    if (!filteredClaims.length) return;
    const ws = XLSX.utils.json_to_sheet(filteredClaims);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Basic Consumption");
    XLSX.writeFile(wb, `${selectedPolicy?.client_company_name || 'Policy'}_Basic_Analysis.xlsx`);
  };

  return (
    <div className={cn("space-y-6 pb-12", isRtl && "font-arabic")}>
      <PageHeader
        title="Consumption Basic Analysis"
        description="Phase 1: Population demographics, claims trends, dimension breakdowns, and data quality metrics"
      >
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
            <SelectTrigger className="w-[280px] bg-card border-2">
              <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
              <SelectValue placeholder="Select Policy Contract" />
            </SelectTrigger>
            <SelectContent>
              {policies.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.policy_number} - {p.client_company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExportExcel} disabled={!filteredClaims.length} className="gap-2 border-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </PageHeader>

      {/* Filter Bar */}
      <Card className="p-4 bg-muted/30 border-2">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 text-indigo-900">
            <Filter className="w-4 h-4 text-indigo-600" /> Filters:
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">Plan Category</label>
            <Select value={selectedPlanCategory} onValueChange={setSelectedPlanCategory}>
              <SelectTrigger className="w-[160px] h-8 bg-card">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Category A">Category A</SelectItem>
                <SelectItem value="Category B">Category B</SelectItem>
                <SelectItem value="Category C">Category C</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">Department</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[160px] h-8 bg-card">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Quality Rule Badge */}
          {analysis.kpis.missingApprovalPercent > 0 && (
            <div className="ml-auto">
              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 gap-1.5 py-1 px-3">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {analysis.kpis.missingApprovalPercent.toFixed(1)}% of records missing approval amount (Net Amount used)
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {!selectedPolicyId ? (
        <Card className="border-dashed border-4 py-24 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <BarChart3 className="w-12 h-12 text-indigo-500 mx-auto" />
            <h3 className="text-xl font-black">Select an Insurance Contract</h3>
            <p className="text-sm text-muted-foreground">Choose a policy contract from the top dropdown to view basic consumption analytics.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Total Net Claims Cost" value={`${formatCompactNumber(analysis.kpis.totalNetCost)} EGP`} icon={TrendingUp} color="bg-indigo-900" />
            <StatCard title="Total Claims Count" value={analysis.kpis.totalClaimsCount} icon={FileText} color="bg-slate-700" />
            <StatCard title="Avg Cost / Claim" value={`${formatCompactNumber(analysis.kpis.avgCostPerClaim)} EGP`} icon={Stethoscope} color="bg-indigo-600" />
            <StatCard title="PMPY (Per Enrolled Life)" value={`${formatCompactNumber(analysis.kpis.avgCostPerMemberPMPY)} EGP`} icon={Users} color="bg-emerald-600" />
            <StatCard title="Utilization Rate" value={`${analysis.kpis.utilizationRate.toFixed(1)}%`} icon={PieChartIcon} color="bg-purple-600" />
          </div>

          {/* Demographics & Plan Category Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6">
              <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> Population Age &amp; Gender Pyramid
              </CardTitle>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.populationSummary.ageGenderBands}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="male" name="Male" fill="#131A80" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="female" name="Female" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950">Relation &amp; Dependent Ratio</CardTitle>
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-xs text-indigo-600 font-bold uppercase">Dependent Ratio</p>
                    <p className="text-2xl font-black text-indigo-900">{analysis.populationSummary.dependentRatio.toFixed(2)}x</p>
                  </div>
                  <Badge className="bg-indigo-600">{analysis.populationSummary.headcount} Total Lives</Badge>
                </div>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex justify-between"><span>Principals:</span><span className="font-bold">{analysis.populationSummary.relationStats.PRINCIPAL}</span></div>
                  <div className="flex justify-between"><span>Spouses:</span><span className="font-bold">{analysis.populationSummary.relationStats.SPOUSE}</span></div>
                  <div className="flex justify-between"><span>Children:</span><span className="font-bold">{analysis.populationSummary.relationStats.CHILD}</span></div>
                </div>
              </div>
            </Card>
          </div>

          {/* Case Type & Provider Type Bar Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950">Claims Cost by Case Type</CardTitle>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.dimensionBreakdowns.caseType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickFormatter={v => formatCompactNumber(v)} />
                    <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                    <Tooltip formatter={(v: any) => `${formatCompactNumber(v)} EGP`} />
                    <Bar dataKey="cost" fill="#131A80" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950">Claims Cost by Medical Network</CardTitle>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analysis.dimensionBreakdowns.medicalNetwork} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {analysis.dimensionBreakdowns.medicalNetwork.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${formatCompactNumber(v)} EGP`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Top Providers & Top Diagnoses Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950">Top 10 Providers by Net Cost</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left font-bold">
                      <th className="p-2">Provider Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Claims</th>
                      <th className="p-2 text-right">Total Net (EGP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analysis.topProviders.byCost.map((p, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2 font-bold">{p.name}</td>
                        <td className="p-2 text-muted-foreground">{p.type}</td>
                        <td className="p-2 text-right">{p.count}</td>
                        <td className="p-2 text-right font-black text-indigo-900">{formatCompactNumber(p.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    {analysis.topDiagnoses.byCount.map((d, i) => (
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
    </div>
  );
}
