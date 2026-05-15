'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { sampleCompanies } from "@/lib/data";
import type { RiskScore } from "@/lib/types";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

export default function RiskScoring() {
  const riskScores: RiskScore[] = [];
  const isLoading = false;
  const companies = sampleCompanies;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Stats
  const lowRisk = riskScores.filter(r => r.risk_level === 'low').length;
  const mediumRisk = riskScores.filter(r => r.risk_level === 'medium').length;
  const highRisk = riskScores.filter(r => r.risk_level === 'high').length;
  const criticalRisk = riskScores.filter(r => r.risk_level === 'critical').length;
  const avgScore = riskScores.length > 0 ? riskScores.reduce((sum, r) => sum + (r.score_value || 0), 0) / riskScores.length : 0;

  const columns = [
    {
      header: "Company",
      accessorKey: "company_name",
      cell: ({row}: any) => {
        const riskScore = row.original as RiskScore;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              riskScore.risk_level === 'low' ? 'bg-emerald-100' :
              riskScore.risk_level === 'medium' ? 'bg-amber-100' :
              riskScore.risk_level === 'high' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              {riskScore.risk_level === 'low' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : riskScore.risk_level === 'critical' ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <Activity className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-slate-900">{riskScore.company_name}</p>
              <p className="text-sm text-slate-500">{riskScore.policy_number}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Risk Score",
      accessorKey: "score_value",
      cell: ({row}: any) => {
        const riskScore = row.original as RiskScore;
        return (
          <div className="w-24">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{riskScore.score_value || 0}</span>
              <span className="text-slate-400">/100</span>
            </div>
            <Progress 
              value={riskScore.score_value || 0} 
              className={`h-2 ${
                riskScore.score_value > 70 ? '[&>div]:bg-red-500' :
                riskScore.score_value > 50 ? '[&>div]:bg-amber-500' : ''
              }`}
            />
          </div>
        )
      }
    },
    {
      header: "Risk Level",
      accessorKey: "risk_level",
      cell: ({row}: any) => <StatusBadge status={row.original.risk_level} />
    },
    {
      header: "Components",
      accessorKey: "components",
      cell: ({row}: any) => {
        const riskScore = row.original as RiskScore;
        const components = riskScore.components || {};
        return (
          <div className="text-xs space-y-1">
            {components.age_score !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500">Age:</span>
                <span>{components.age_score}</span>
              </div>
            )}
            {components.claims_history_score !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500">Claims:</span>
                <span>{components.claims_history_score}</span>
              </div>
            )}
            {components.industry_score !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500">Industry:</span>
                <span>{components.industry_score}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Calculated",
      accessorKey: "calculated_at",
      cell: ({row}: any) => row.original.calculated_at ? format(new Date(row.original.calculated_at), 'MMM d, yyyy') : '-'
    },
    {
      header: "Notes",
      accessorKey: "notes",
      cell: ({row}: any) => (
        <p className="text-sm text-slate-500 max-w-xs truncate">{row.original.notes || '-'}</p>
      )
    }
  ];

  const table = useReactTable({
      data: riskScores,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      onGlobalFilterChange: setGlobalFilter,
      getFilteredRowModel: getFilteredRowModel(),
      state: {
          sorting,
          globalFilter,
      },
      initialState: {
          pagination: {
              pageSize: 10,
          },
      },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Scoring"
        
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Low Risk"
          value={lowRisk}
          icon={CheckCircle}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Medium Risk"
          value={mediumRisk}
          icon={Activity}
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          title="High Risk"
          value={highRisk}
          icon={AlertTriangle}
          color="bg-orange-500"
          loading={isLoading}
        />
        <StatCard
          title="Critical"
          value={criticalRisk}
          icon={AlertTriangle}
          color="bg-red-500"
          loading={isLoading}
        />
        <StatCard
          title="Avg. Score"
          value={avgScore.toFixed(0)}
          icon={Activity}
          color="bg-indigo-500"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {riskScores.length === 0 && !isLoading ? (
            <EmptyState
              icon={Activity}
              title="No risk scores yet"
              
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search risk scores..."
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
