'use client';

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, FileText, CheckCircle, Clock, AlertTriangle, RefreshCw, Calendar, Search } from "lucide-react";
import { useI18n } from "@/components/i18n-context";
import { cn } from "@/lib/utils";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { Badge } from "@/components/ui/badge";

export default function EndorsementsDashboard() {
  const router = useRouter();
  const { t, isRtl } = useI18n();

  // 1. State for Filters
  const [lobFilter, setLobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 2. Fetch endorsements from unified table
  const { data: endorsements = [], isLoading } = useSupabaseCollection<any>('endorsements', undefined, {
    select: '*, policy:policies(policy_number), client:companies(name), endorsement_type:endorsement_types(name)',
    realtime: true
  });

  // 3. Compute KPI Summary Cards
  const kpis = useMemo(() => {
    let drafts = 0;
    let pendingApproval = 0;
    let approvedMonth = 0;
    let netPremiumImpact = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    (endorsements || []).forEach((end: any) => {
      const premium = Number(end.premium_impact || 0);
      netPremiumImpact += premium;

      if (end.status === 'Draft') {
        drafts++;
      } else if (end.status === 'Pending Approval') {
        pendingApproval++;
      }

      // Check if approved in current month
      if (end.status === 'Approved' || end.status === 'Invoiced') {
        const approvedDate = new Date(end.effective_date);
        if (approvedDate.getMonth() === currentMonth && approvedDate.getFullYear() === currentYear) {
          approvedMonth++;
        }
      }
    });

    return {
      drafts,
      pendingApproval,
      approvedMonth,
      netPremiumImpact
    };
  }, [endorsements]);

  // 4. Apply Filters
  const filteredEndorsements = useMemo(() => {
    return (endorsements || []).filter((end: any) => {
      const matchLob = lobFilter === 'all' || end.line_of_business?.toLowerCase() === lobFilter.toLowerCase();
      const matchStatus = statusFilter === 'all' || end.status?.toLowerCase() === statusFilter.toLowerCase();
      
      const clientName = end.client?.name || '';
      const policyNumber = end.policy?.policy_number || '';
      const endNumber = end.endorsement_number || '';
      
      const matchSearch = searchQuery === '' || 
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endNumber.toLowerCase().includes(searchQuery.toLowerCase());

      return matchLob && matchStatus && matchSearch;
    });
  }, [endorsements, lobFilter, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Approval":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">{t('status_pending') || "Pending Approval"}</Badge>;
      case "Approved":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">{t('status_approved') || "Approved"}</Badge>;
      case "Rejected":
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200">{t('status_rejected') || "Rejected"}</Badge>;
      case "Invoiced":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Invoiced</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-200">{t('status_draft') || "Draft"}</Badge>;
    }
  };

  const getImpactTextClass = (impact: number) => {
    if (impact > 0) return "text-rose-600 font-bold";
    if (impact < 0) return "text-emerald-600 font-bold";
    return "text-slate-500 font-medium";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('endorsementsHub' as any) || "Endorsements Hub"}</h1>
          <p className="text-slate-500 mt-1 font-medium">{t('endorsementsHubDesc' as any) || "Manage all policy modifications and financial adjustments."}</p>
        </div>
        <Button onClick={() => router.push('/endorsements/create')} className="bg-[#2A75F3] hover:bg-blue-700 h-12 px-6 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">
          <Plus className={cn("w-5 h-5", isRtl ? "ml-2" : "mr-2")} />
          {t('createEndorsement' as any) || "Create Endorsement"}
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600"><FileText className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('totalDrafts' as any) || "Total Drafts"}</p>
              <h3 className="text-3xl font-black text-slate-800">{isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : kpis.drafts}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Approval</p>
              <h3 className="text-3xl font-black text-slate-800">{isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : kpis.pendingApproval}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('approvedMtd' as any) || "Approved (MTD)"}</p>
              <h3 className="text-3xl font-black text-slate-800">{isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : kpis.approvedMonth}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertTriangle className="w-7 h-7" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('netFinImpact' as any) || "Net Fin. Impact"}</p>
              <h3 className={cn("text-xl font-black", kpis.netPremiumImpact >= 0 ? "text-rose-600" : "text-emerald-600")}>
                {isLoading ? <RefreshCw className="animate-spin w-6 h-6 text-slate-400" /> : formatCurrency(kpis.netPremiumImpact)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="rounded-3xl border-border shadow-sm overflow-hidden bg-white">
        <div className="p-6 border-b border-border bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800">{t('filter' as any) || "Filter Endorsements"}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search Client/Policy/ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 bg-white border-slate-200 text-sm rounded-xl w-full sm:w-60"
              />
            </div>

            {/* LoB Select */}
            <Select value={lobFilter} onValueChange={setLobFilter}>
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-sm w-full">
                <SelectValue placeholder="Line of Business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All LOBs</SelectItem>
                <SelectItem value="Medical">Medical</SelectItem>
                <SelectItem value="Life">Life</SelectItem>
                <SelectItem value="Motor">Motor</SelectItem>
                <SelectItem value="Property">Property</SelectItem>
                <SelectItem value="Liability">Liability</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Select */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-sm w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Invoiced">Invoiced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Endorsements Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-3">
              <RefreshCw className="animate-spin w-5 h-5 text-indigo-600" />
              <span>Loading endorsements list...</span>
            </div>
          ) : filteredEndorsements.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No endorsements match the selected criteria.
            </div>
          ) : (
            <table className={cn("w-full border-collapse", isRtl ? "text-right" : "text-left")}>
              <thead className="bg-slate-50 border-b border-border text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className={cn("p-4", isRtl ? "pr-6" : "pl-6")}>{t('idRef' as any) || "ID / Ref"}</th>
                  <th className="p-4">{t('clientPolicy' as any) || "Client / Policy"}</th>
                  <th className="p-4">{t('type') || "Type"}</th>
                  <th className="p-4">LoB</th>
                  <th className="p-4">Effective Date</th>
                  <th className="p-4">{t('financialImpact' as any) || "Financial Impact"}</th>
                  <th className="p-4">{t('status') || "Status"}</th>
                  <th className={cn("p-4", isRtl ? "pl-6 text-left" : "pr-6 text-right")}>{t('action' as any) || "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEndorsements.map((end: any) => (
                  <tr key={end.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => router.push(`/endorsements/${end.id}`)}>
                    <td className={cn("p-4 font-bold text-[#2A75F3] font-mono text-sm", isRtl ? "pr-6" : "pl-6")}>
                      {end.endorsement_number || end.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 text-sm">{end.client?.name || "N/A"}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{end.policy?.policy_number || "N/A"}</p>
                    </td>
                    <td className="p-4 font-medium text-slate-700 text-sm">{end.endorsement_type?.name || "Manual"}</td>
                    <td className="p-4 text-slate-600 text-sm">{end.line_of_business}</td>
                    <td className="p-4 text-slate-600 text-sm">{new Date(end.effective_date).toLocaleDateString()}</td>
                    <td className={cn("p-4 text-sm", getImpactTextClass(Number(end.premium_impact || 0)))}>
                      {Number(end.premium_impact || 0) >= 0 ? '+' : ''}{formatCurrency(Number(end.premium_impact || 0))}
                    </td>
                    <td className="p-4">{getStatusBadge(end.status)}</td>
                    <td className={cn("p-4", isRtl ? "pl-6 text-left" : "pr-6 text-right")}>
                      <Button variant="ghost" size="sm" className="text-slate-400 group-hover:text-blue-600 text-xs">
                        {t('viewDetails' as any) || "View Details"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
