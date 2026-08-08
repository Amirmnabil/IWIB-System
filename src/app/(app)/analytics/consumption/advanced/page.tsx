'use client';

import React, { useState, useMemo, useCallback } from "react";
import {
  TrendingUp, BarChart3, PieChart as PieChartIcon, ShieldAlert, AlertTriangle,
  Download, Users, Building2, FileText, CheckCircle2, Search, Sliders,
  DollarSign, Activity, Stethoscope, Clock, Layers, ArrowUpRight, Zap, RefreshCw, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import type { Policy, PolicyMember } from "@/lib/types";
import { formatCompactNumber, cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";
import * as XLSX from 'xlsx';
import { calculatePhase2AdvancedAnalysis, DEFAULT_ICD_CHAPTERS } from "@/lib/medical-analytics/advanced-analytics-service";

const COLORS = ['#131A80', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function ConsumptionAdvancedAnalysisPage() {
  const { t, isRtl } = useI18n();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [largeClaimThreshold, setLargeClaimThreshold] = useState<number>(50000);
  const [selectedMemberModal, setSelectedMemberModal] = useState<any | null>(null);
  const [isAdminIcdModalOpen, setIsAdminIcdModalOpen] = useState<boolean>(false);

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

  // Generate dataset
  const sampleClaims = useMemo(() => {
    if (!selectedPolicy) return [];
    const caseTypes = ['Outpatient', 'Prescription Medicine', 'Inpatient', 'Dental', 'Optical'];
    const providers = ['Cleopatra Hospital', 'El Ezaby Pharmacy', 'Al Mokhtabr Lab', 'Alpha Scan', 'Saudi German Hospital', 'HighCost Clinic'];
    const diags = [
      { code: 'M54.5', desc: 'Low back pain' },
      { code: 'N39.0', desc: 'Urinary tract infection' },
      { code: 'E11.9', desc: 'Type 2 diabetes' },
      { code: 'I10', desc: 'Essential Hypertension' },
      { code: 'K29.7', desc: 'Gastritis' }
    ];

    const claims: any[] = [];
    policyMembers.forEach((m, idx) => {
      const isLargeClaimant = idx % 7 === 0;
      const claimCount = isLargeClaimant ? 6 : (idx % 3) + 1;

      for (let i = 0; i < claimCount; i++) {
        const ct = caseTypes[i % caseTypes.length];
        const prov = providers[(idx + i) % providers.length];
        const diag = diags[(idx + i) % diags.length];
        const net = isLargeClaimant ? 15000 + (i * 12000) : 300 + ((idx * 83 + i * 37) % 2500);

        claims.push({
          memberCode: m.member_id_tpa || m.staff_code || m.id,
          memberName: m.member_name,
          department: m.department || 'Operations',
          planCategory: m.plan_category || 'Category A',
          serviceDate: new Date(2026, i % 12, (idx % 25) + 1),
          caseType: ct,
          providerType: ct === 'Prescription Medicine' ? 'Pharmacy' : (ct === 'Dental' ? 'Dental Clinic' : 'Hospital'),
          providerName: prov,
          medicalNetwork: i % 5 === 0 ? 'Out of Network' : 'In Network',
          approvalStatus: 'Approved',
          approvalAmount: net + 100,
          copayment: 100,
          netAmount: net,
          icdCode: diag.code,
          icdDescription: diag.desc,
          chronicCondition: diag.code === 'I10' || diag.code === 'E11.9' ? 'YES' : 'NO',
          lengthOfStay: ct === 'Inpatient' ? (i % 5) + 2 : 0,
          admissionType: ct === 'Inpatient' ? (i % 2 === 0 ? 'Emergency' : 'Elective') : 'Outpatient'
        });
      }
    });

    return claims;
  }, [selectedPolicy, policyMembers]);

  const analysis = useMemo(() => {
    return calculatePhase2AdvancedAnalysis(
      sampleClaims,
      policyMembers,
      { annual_premium: selectedPolicy?.premium_total || 600000 },
      largeClaimThreshold
    );
  }, [sampleClaims, policyMembers, selectedPolicy, largeClaimThreshold]);

  const handleExportExcel = () => {
    if (!sampleClaims.length) return;
    const ws = XLSX.utils.json_to_sheet(sampleClaims);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Advanced Analysis");
    XLSX.writeFile(wb, `${selectedPolicy?.client_company_name || 'Policy'}_Advanced_Analysis.xlsx`);
  };

  return (
    <div className={cn("space-y-6 pb-12", isRtl && "font-arabic")}>
      <PageHeader
        title="Consumption Advanced Analysis"
        description="Phase 2: Loss ratio risk bands, Pareto concentration, large claims drill-down, chronic burden, and quality flags"
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

          <Button variant="outline" onClick={() => setIsAdminIcdModalOpen(true)} className="gap-2 border-2">
            <Sliders className="w-4 h-4 text-indigo-600" /> Manage ICD Chapters
          </Button>

          <Button variant="outline" onClick={handleExportExcel} disabled={!sampleClaims.length} className="gap-2 border-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </PageHeader>

      {!selectedPolicyId ? (
        <Card className="border-dashed border-4 py-24 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <Activity className="w-12 h-12 text-indigo-500 mx-auto" />
            <h3 className="text-xl font-black">Select an Insurance Contract</h3>
            <p className="text-sm text-muted-foreground">Select a policy from the top dropdown to launch advanced actuarial analytics.</p>
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl flex overflow-x-auto gap-1 border">
            <TabsTrigger value="financial" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
              <DollarSign className="w-3.5 h-3.5" /> Financial Performance
            </TabsTrigger>
            <TabsTrigger value="risk" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
              <ShieldAlert className="w-3.5 h-3.5" /> Risk Concentration
            </TabsTrigger>
            <TabsTrigger value="clinical" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
              <Stethoscope className="w-3.5 h-3.5" /> Clinical Patterns
            </TabsTrigger>
            <TabsTrigger value="demographics" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center">
              <Users className="w-3.5 h-3.5" /> Demographics
            </TabsTrigger>
            <TabsTrigger value="quality" className="rounded-lg px-4 py-2 text-xs font-bold gap-2 flex items-center text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" /> Quality Flags
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FINANCIAL PERFORMANCE */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 p-6">
                <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" /> Loss Ratio by Plan Category (Census Resolved)
                </CardTitle>
                <div className="space-y-4">
                  {analysis.financialPerformance.lossRatioByPlan.map((p, i) => (
                    <div key={i} className="p-4 border rounded-xl bg-card space-y-2">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span>{p.plan}</span>
                        <Badge className={cn(
                          p.band === 'green' && "bg-emerald-100 text-emerald-800 border-emerald-300",
                          p.band === 'amber' && "bg-amber-100 text-amber-800 border-amber-300",
                          p.band === 'red' && "bg-red-100 text-red-800 border-red-300"
                        )}>
                          Loss Ratio: {p.lossRatio.toFixed(1)}% ({p.band.toUpperCase()})
                        </Badge>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            p.band === 'green' && "bg-emerald-500",
                            p.band === 'amber' && "bg-amber-500",
                            p.band === 'red' && "bg-red-600"
                          )}
                          style={{ width: `${Math.min(100, p.lossRatio)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Claims Net Cost: {formatCompactNumber(p.cost)} EGP</span>
                        <span>Category Premium: {formatCompactNumber(p.premium)} EGP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
                <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-200">Overall Loss Ratio Gauge</CardTitle>
                <div className="text-center py-6">
                  <p className="text-5xl font-black text-white">{analysis.financialPerformance.overallLossRatio.toFixed(1)}%</p>
                  <p className="text-xs text-indigo-200 mt-2">Overall Contract Loss Ratio</p>
                  <Badge className="mt-4 bg-indigo-500/30 text-white border-indigo-400">
                    Annual Premium: {formatCompactNumber(analysis.financialPerformance.annualPremium)} EGP
                  </Badge>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: RISK CONCENTRATION */}
          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <div className="flex justify-between items-center mb-4">
                  <CardTitle className="text-sm font-bold uppercase text-indigo-950">Pareto Lorenz Concentration Curve</CardTitle>
                  <Badge className="bg-indigo-900 text-white font-bold">{analysis.riskConcentration.headlineStat}</Badge>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysis.riskConcentration.paretoPoints}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="memberPercent" name="% Members" fontSize={11} label={{ value: '% of Members (Ranked)', position: 'insideBottom', offset: -5 }} />
                      <YAxis fontSize={11} label={{ value: '% Cumulative Cost', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(v: any) => `${v}%`} />
                      <Line type="monotone" dataKey="costPercent" stroke="#131A80" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950">Chronic Burden Summary</CardTitle>
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-amber-800 uppercase">Chronic Cost Concentration</p>
                    <p className="text-3xl font-black text-amber-900">{analysis.riskConcentration.chronicBurden.chronicCostPercent.toFixed(1)}%</p>
                    <p className="text-xs text-amber-700">of total cost generated by {analysis.riskConcentration.chronicBurden.chronicHeadcountPercent.toFixed(1)}% of members</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Large Claims Table with Drill-down */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-sm font-bold uppercase text-indigo-950">Large Claims Threshold Analysis</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <span>Threshold (EGP):</span>
                  <Input
                    type="number"
                    value={largeClaimThreshold}
                    onChange={(e) => setLargeClaimThreshold(Number(e.target.value))}
                    className="w-32 h-8 font-bold"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left font-bold">
                      <th className="p-2">Member Name</th>
                      <th className="p-2">Plan</th>
                      <th className="p-2">Department</th>
                      <th className="p-2 text-right">Claim Count</th>
                      <th className="p-2 text-right">Annual Cost (EGP)</th>
                      <th className="p-2 text-right">% of Total</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analysis.riskConcentration.largeClaimsList.map((m: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2 font-bold text-indigo-900">{m.name}</td>
                        <td className="p-2 text-muted-foreground">{m.plan}</td>
                        <td className="p-2 text-muted-foreground">{m.dept}</td>
                        <td className="p-2 text-right font-bold">{m.count}</td>
                        <td className="p-2 text-right font-black text-emerald-700">{formatCompactNumber(m.cost)}</td>
                        <td className="p-2 text-right font-bold">{m.percentOfTotalCost.toFixed(1)}%</td>
                        <td className="p-2 text-center">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedMemberModal(m)} className="h-7 text-[11px] font-bold text-indigo-600">
                            Drill-Down
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: CLINICAL PATTERNS */}
          <TabsContent value="clinical" className="space-y-6">
            <Card className="p-6">
              <CardTitle className="text-sm font-bold uppercase mb-4 text-indigo-950">ICD-10 Chapter Clustering (Cost Ranked)</CardTitle>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.clinicalPatterns.icdChapterClustering}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="chapter" fontSize={10} angle={-15} textAnchor="end" />
                    <YAxis fontSize={10} tickFormatter={v => formatCompactNumber(v)} />
                    <Tooltip formatter={(v: any) => `${formatCompactNumber(v)} EGP`} />
                    <Bar dataKey="cost" fill="#131A80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 5: QUALITY FLAGS */}
          <TabsContent value="quality" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <CardTitle className="text-sm font-bold uppercase mb-4 text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> Provider Outliers (&gt;1.5x Peer Average)
                </CardTitle>
                <div className="space-y-3">
                  {analysis.qualityFlags.providerOutliers.map((p, i) => (
                    <div key={i} className="p-3 border border-red-200 bg-red-50/50 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-red-950">{p.name}</p>
                        <p className="text-muted-foreground">{p.type} · {p.count} Claims</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-red-700">{formatCompactNumber(p.avgCost)} EGP/claim</p>
                        <p className="text-[10px] text-red-500 font-bold">{p.ratio.toFixed(1)}x Peer Avg ({formatCompactNumber(p.peerAvg)} EGP)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <CardTitle className="text-sm font-bold uppercase mb-4 text-amber-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" /> Potential Duplicate Claims (Within 7-Day Window)
                </CardTitle>
                <div className="space-y-3">
                  {analysis.qualityFlags.duplicateFlags.map((d, i) => (
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
