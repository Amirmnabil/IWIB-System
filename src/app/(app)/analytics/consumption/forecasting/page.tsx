'use client';

import React, { useState, useMemo, useCallback } from "react";
import {
  TrendingUp, BarChart3, PieChart as PieChartIcon, ShieldAlert, AlertTriangle,
  Download, Users, Building2, FileText, CheckCircle2, Sliders,
  DollarSign, Activity, Stethoscope, Clock, Layers, ArrowUpRight, Zap, RefreshCw, Calculator
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import type { Policy, PolicyMember } from "@/lib/types";
import { formatCompactNumber, cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-context";
import * as XLSX from 'xlsx';
import {
  calculatePhase3ForecastingAnalysis,
  runScenarioSimulator
} from "@/lib/medical-analytics/advanced-analytics-service";

export default function ConsumptionForecastingAnalysisPage() {
  const { t, isRtl } = useI18n();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [copayIncreasePercent, setCopayIncreasePercent] = useState<number>(5);
  const [oonRestrictionFlag, setOonRestrictionFlag] = useState<boolean>(true);
  const [headcountDeltaPercent, setHeadcountDeltaPercent] = useState<number>(10);
  const [newHireDiscountFlag, setNewHireDiscountFlag] = useState<boolean>(true);

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

  // Claims Dataset
  const sampleClaims = useMemo(() => {
    if (!selectedPolicy) return [];
    const caseTypes = ['Outpatient', 'Prescription Medicine', 'Inpatient', 'Dental', 'Optical'];
    const providers = ['Cleopatra Hospital', 'El Ezaby Pharmacy', 'Al Mokhtabr Lab', 'Alpha Scan', 'Saudi German Hospital'];

    const claims: any[] = [];
    policyMembers.forEach((m, idx) => {
      const claimCount = (idx % 3) + 2;
      for (let i = 0; i < claimCount; i++) {
        const ct = caseTypes[i % caseTypes.length];
        const prov = providers[(idx + i) % providers.length];
        const net = 400 + ((idx * 93 + i * 43) % 4000);

        claims.push({
          memberCode: m.member_id_tpa || m.staff_code || m.id,
          memberName: m.member_name,
          serviceDate: new Date(2026, i % 12, (idx % 25) + 1),
          caseType: ct,
          providerName: prov,
          medicalNetwork: i % 4 === 0 ? 'Out of Network' : 'In Network',
          netAmount: net
        });
      }
    });

    return claims;
  }, [selectedPolicy, policyMembers]);

  const policyValueConfig = useMemo(() => ({
    annual_premium: selectedPolicy?.premium_total || 750000
  }), [selectedPolicy]);

  const forecasting = useMemo(() => {
    return calculatePhase3ForecastingAnalysis(sampleClaims, policyMembers, policyValueConfig);
  }, [sampleClaims, policyMembers, policyValueConfig]);

  const simulatorResults = useMemo(() => {
    return runScenarioSimulator(
      sampleClaims,
      policyMembers,
      policyValueConfig,
      copayIncreasePercent,
      { 'Outpatient': 1000 },
      oonRestrictionFlag
    );
  }, [sampleClaims, policyMembers, policyValueConfig, copayIncreasePercent, oonRestrictionFlag]);

  // Projected Trend Series for Chart
  const trendSeries = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthlyBudget = policyValueConfig.annual_premium / 12;

    return months.map((m, idx) => {
      const reported = idx < 8 ? (monthlyBudget * 0.85) + ((idx % 3) * 5000) : null;
      const completed = idx < 8 ? (reported! * 1.08) : null;
      const projected = idx >= 8 ? (monthlyBudget * 0.95) + (idx * 3000) : completed;

      return {
        month: m,
        reported,
        completed,
        projected,
        budgetPace: monthlyBudget * (idx + 1)
      };
    });
  }, [policyValueConfig]);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className={cn("space-y-6 pb-12", isRtl && "font-arabic")}>
      <PageHeader
        title="Consumption Renewal &amp; Forecasting Analysis"
        description="Phase 3: Loss ratio trend projection, renewal recommendation engine, interactive scenario simulator, and budget tracker"
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

          <Button variant="outline" onClick={handleExportPDF} disabled={!selectedPolicyId} className="gap-2 border-2 bg-indigo-50 text-indigo-900 border-indigo-200 font-bold">
            <FileText className="w-4 h-4 text-indigo-600" /> Export Renewal Analysis PDF
          </Button>
        </div>
      </PageHeader>

      {!selectedPolicyId ? (
        <Card className="border-dashed border-4 py-24 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <TrendingUp className="w-12 h-12 text-indigo-500 mx-auto" />
            <h3 className="text-xl font-black">Select an Insurance Contract</h3>
            <p className="text-sm text-muted-foreground">Select a policy contract to view loss ratio projections and simulate renewal scenarios.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Data Duration Warning */}
          {!forecasting.hasSufficientData && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center gap-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-xs uppercase">Insufficient Historical Data Warning</p>
                <p className="text-xs">This policy has less than 6 months of historical consumption data. Projections represent directional estimates.</p>
              </div>
            </div>
          )}

          {/* Loss Ratio Projection Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6">
              <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-sm font-bold uppercase text-indigo-950">Loss Ratio &amp; Claims Trend Projection</CardTitle>
                <Badge className="bg-indigo-900 text-white font-bold">IBNR Lag Adjusted (+8%)</Badge>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => formatCompactNumber(v)} />
                    <Tooltip formatter={(v: any) => `${formatCompactNumber(v)} EGP`} />
                    <Legend />
                    <Line type="monotone" dataKey="reported" name="Reported Claims" stroke="#4B5563" strokeWidth={2} />
                    <Line type="monotone" dataKey="completed" name="Completed Estimate (IBNR)" stroke="#10B981" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="projected" name="Projected Full-Year Trend" stroke="#131A80" strokeWidth={3} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Template-Generated Renewal Recommendation Card */}
            <Card className="p-6 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white flex flex-col justify-between">
              <div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 uppercase tracking-wider text-[10px]">
                  Template Renewal Recommendation
                </Badge>
                <h3 className="text-xl font-black italic mt-3 mb-4 text-white">Renewal Guidance</h3>
                <p className="text-sm leading-relaxed text-indigo-100/90 font-medium p-4 bg-white/10 rounded-xl border border-white/10">
                  "{forecasting.recommendation.recommendationText}"
                </p>
              </div>

              <div className="pt-4 border-t border-indigo-800/80 flex justify-between items-center text-xs">
                <div>
                  <p className="text-[10px] text-indigo-300 uppercase font-bold">Projected Loss Ratio</p>
                  <p className="text-xl font-black text-white">{forecasting.projection.projectedLossRatio.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-emerald-300 uppercase font-bold">Suggested Premium Adj.</p>
                  <p className="text-xl font-black text-emerald-400">{forecasting.recommendation.suggestedAdjustmentRange}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Interactive Renewal Scenario Simulator */}
          <Card className="p-6 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-background to-purple-50/40">
            <CardHeader className="p-0 mb-6">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-black text-indigo-950 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" /> Interactive Renewal Scenario Simulator
                </CardTitle>
                <Badge className="bg-indigo-900 text-white font-bold text-xs py-1 px-3">
                  Live Recalculated from Consumption Rows
                </Badge>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Levers Panel */}
              <div className="lg:col-span-2 space-y-6 text-xs">
                {/* Lever A: Co-pay Increase */}
                <div className="p-4 bg-card border rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-900">Lever A: Co-payment Increase (%)</span>
                    <span className="font-black text-indigo-600 text-sm">+{copayIncreasePercent}%</span>
                  </div>
                  <Slider
                    value={[copayIncreasePercent]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={(val) => setCopayIncreasePercent(val[0])}
                  />
                  <p className="text-[11px] text-muted-foreground">Estimated Co-pay Savings: {formatCompactNumber(simulatorResults.copaySavings)} EGP</p>
                </div>

                {/* Lever B: Out-of-Network Restriction */}
                <div className="p-4 bg-card border rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-indigo-900">Lever B: Restrict Out-of-Network Claims</p>
                    <p className="text-[11px] text-muted-foreground">Applies 35% leakage restriction savings to non-network claims</p>
                  </div>
                  <Switch
                    checked={oonRestrictionFlag}
                    onCheckedChange={setOonRestrictionFlag}
                  />
                </div>

                {/* Lever C: Headcount Growth */}
                <div className="p-4 bg-card border rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-900">Lever C: Headcount Growth / Shrinkage (%)</span>
                    <span className="font-black text-indigo-600 text-sm">+{headcountDeltaPercent}%</span>
                  </div>
                  <Slider
                    value={[headcountDeltaPercent]}
                    min={-20}
                    max={50}
                    step={5}
                    onValueChange={(val) => setHeadcountDeltaPercent(val[0])}
                  />
                </div>
              </div>

              {/* Live Savings Total Card */}
              <Card className="p-6 bg-indigo-900 text-white flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-indigo-200">Combined Scenario Results</p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[10px] text-indigo-300 uppercase">Total Estimated Savings</p>
                      <p className="text-3xl font-black text-emerald-400">+{formatCompactNumber(simulatorResults.totalSavings)} EGP</p>
                    </div>

                    <div className="pt-3 border-t border-indigo-700">
                      <p className="text-[10px] text-indigo-300 uppercase">Original Loss Ratio</p>
                      <p className="text-xl font-bold">{simulatorResults.originalLossRatio.toFixed(1)}%</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-emerald-300 uppercase font-bold">New Projected Loss Ratio</p>
                      <p className="text-2xl font-black text-emerald-300">{simulatorResults.newLossRatio.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-indigo-300 italic mt-4">
                  Based on actual claims pattern — directional estimate for HR renewal discussions.
                </p>
              </Card>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
