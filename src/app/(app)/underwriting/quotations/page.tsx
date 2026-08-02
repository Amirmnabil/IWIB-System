'use client';
import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search, Loader2, FileSignature, Clock, CheckCircle2,
  AlertCircle, ChevronRight, Building2, Users, Calendar,
  Filter
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { useRouter } from "next/navigation";

type UWStatus = "all" | "pending" | "in_progress" | "done";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", icon: AlertCircle },
  done: { label: "Done", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
};

function UWStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["pending"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

const TAB_LIST: { id: UWStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

export default function QuotationsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<UWStatus>("all");

  const { data: prospectsRaw, isLoading } = useSupabaseCollection<any>("prospects", undefined, {
    select: "*, prospect_details(*)",
    filterKey: "underwriting-quotations-all",
  });

  const prospects = prospectsRaw || [];

  // Derive uw status from prospect_details
  const enriched = useMemo(
    () =>
      prospects.map((p: any) => {
        const details = Array.isArray(p.prospect_details)
          ? p.prospect_details[0]
          : p.prospect_details || {};
        const uwStatus: string = details?.underwriting_status || "pending";
        const offerCount = (details?.underwriting_versions || []).reduce(
          (acc: number, v: any) => acc + (v.offers?.length || 0),
          0
        );
        return { ...p, _details: details, _uwStatus: uwStatus, _offerCount: offerCount };
      }),
    [prospects]
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (activeTab !== "all") {
      list = list.filter((p) => p._uwStatus === activeTab);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.company_name?.toLowerCase().includes(q) ||
          p.current_insurer?.toLowerCase().includes(q) ||
          p._details?.insurance_company?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, activeTab, searchTerm]);

  const counts = useMemo(
    () => ({
      all: enriched.length,
      pending: enriched.filter((p) => p._uwStatus === "pending").length,
      in_progress: enriched.filter((p) => p._uwStatus === "in_progress").length,
      done: enriched.filter((p) => p._uwStatus === "done").length,
    }),
    [enriched]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-headline font-black text-foreground tracking-tight">
            Quotations
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Manage the full underwriting cycle — upload offers, track progress, sync with Prospects
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search companies or insurers..."
            className="pl-9 h-10 bg-card border-border rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Total Quotations"
          value={counts.all}
          gradient="from-indigo-600 to-indigo-800"
          icon={FileSignature}
          loading={isLoading}
        />
        <KPICard
          label="Pending"
          value={counts.pending}
          gradient="from-amber-500 to-orange-600"
          icon={Clock}
          loading={isLoading}
        />
        <KPICard
          label="In Progress"
          value={counts.in_progress}
          gradient="from-blue-500 to-blue-700"
          icon={AlertCircle}
          loading={isLoading}
        />
        <KPICard
          label="Done"
          value={counts.done}
          gradient="from-emerald-500 to-emerald-700"
          icon={CheckCircle2}
          loading={isLoading}
        />
      </div>

      {/* ── Status Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {TAB_LIST.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "bg-muted-foreground/20 text-muted-foreground"
              }`}
            >
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="font-bold text-slate-400">Loading quotations…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <FileSignature className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-muted-foreground mb-1">No quotations found</h3>
              <p className="text-sm text-slate-400">
                {searchTerm ? "Try a different search term." : "No entries match the selected filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background/60 border-b border-border">
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Products Requested
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Current Insurer
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Employees
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Offers
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      UW Status
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-wider text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((q: any) => (
                    <tr
                      key={q.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/underwriting/quotations/${q.id}`)}
                    >
                      {/* Company */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-black text-sm shadow-sm border border-indigo-100 shrink-0">
                            {(q.company_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                              {q.company_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                              {q.pipeline_stage?.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Products */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(q.requested_products || []).length > 0 ? (
                            q.requested_products.map((prod: string) => (
                              <Badge
                                key={prod}
                                variant="outline"
                                className="text-[10px] font-bold bg-indigo-50 border-indigo-200 text-indigo-700 px-1.5 py-0"
                              >
                                {prod}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Current insurer */}
                      <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                        {q._details?.insurance_company || q.current_insurer || "—"}
                      </td>

                      {/* Employees */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground font-semibold">
                          {q._details?.employee_count || "—"}
                        </span>
                      </td>

                      {/* Offer count */}
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-black ${
                            q._offerCount > 0 ? "text-indigo-700" : "text-slate-400"
                          }`}
                        >
                          {q._offerCount > 0 ? `${q._offerCount} offer${q._offerCount > 1 ? "s" : ""}` : "No offers yet"}
                        </span>
                      </td>

                      {/* UW Status */}
                      <td className="px-6 py-4">
                        <UWStatusBadge status={q._uwStatus} />
                      </td>

                      {/* Requested date */}
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(q.created_at), "MMM d, yyyy")}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/underwriting/quotations/${q.id}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-lg transition-colors"
                        >
                          Open <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  label,
  value,
  gradient,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  gradient: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card className={`rounded-2xl border-none shadow-sm bg-gradient-to-br ${gradient} text-white overflow-hidden`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest opacity-75">{label}</p>
            <p className="text-4xl font-black mt-2">
              {loading ? (
                <span className="inline-block w-8 h-8 rounded-lg bg-white/20 animate-pulse" />
              ) : (
                value
              )}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
