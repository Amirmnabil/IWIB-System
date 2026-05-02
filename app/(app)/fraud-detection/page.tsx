'use client';
import React, { useState } from "react";
import { Shield, AlertTriangle, Building2, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Progress } from "@/components/ui/progress";
import { sampleClaims } from "@/lib/data";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

export default function FraudDetection() {
  const claims = sampleClaims.filter(c => c.fraud_flag);
  const isLoading = false;
  const allClaims = sampleClaims;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Stats
  const flaggedCount = claims.length;
  const totalClaims = allClaims.length;
  const fraudRate = totalClaims > 0 ? (flaggedCount / totalClaims) * 100 : 0;
  const totalFlaggedAmount = claims.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
  const avgFraudScore = claims.length > 0 ? claims.reduce((sum, c) => sum + (c.fraud_score || 0), 0) / claims.length : 0;

  const columns = [
    {
      header: "Claim",
      accessorKey: "claim_number",
      cell: ({row}: any) => {
        const claim = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{claim.claim_number}</p>
              <p className="text-sm text-slate-500">{claim.claim_type} - {claim.service_type}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Member",
      accessorKey: "member_name",
      cell: ({row}: any) => {
        const claim = row.original;
        return (
          <div>
            <p className="font-medium">{claim.member_name}</p>
            <p className="text-sm text-slate-500">{claim.company_name}</p>
          </div>
        )
      }
    },
    {
      header: "Amount",
      accessorKey: "claim_amount",
      cell: ({row}: any) => (
        <span className="font-medium text-red-600">EGP {(row.original.claim_amount || 0).toLocaleString()}</span>
      )
    },
    {
      header: "Fraud Score",
      accessorKey: "fraud_score",
      cell: ({row}: any) => (
        <div className="w-20">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-red-600">{row.original.fraud_score || 0}</span>
          </div>
          <Progress 
            value={row.original.fraud_score || 0} 
            className="h-2 [&>div]:bg-red-500"
          />
        </div>
      )
    },
    {
      header: "Reason",
      accessorKey: "fraud_reason",
      cell: ({row}: any) => (
        <p className="text-sm text-slate-600 max-w-xs truncate">{row.original.fraud_reason || 'Under investigation'}</p>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: "Provider",
      accessorKey: "provider_name",
      cell: ({row}: any) => row.original.provider_name || '-'
    }
  ];

  const table = useReactTable({
      data: claims,
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
        title="Fraud Detection"
        description="Monitor and investigate suspicious claims"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Flagged Claims"
          value={flaggedCount}
          icon={AlertTriangle}
          color="bg-red-500"
          loading={isLoading}
        />
        <StatCard
          title="Fraud Rate"
          value={`${fraudRate.toFixed(1)}%`}
          icon={Shield}
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          title="Total Flagged Amount"
          value={`EGP ${(totalFlaggedAmount / 1000).toFixed(0)}K`}
          icon={DollarSign}
          color="bg-indigo-500"
          loading={isLoading}
        />
        <StatCard
          title="Avg. Fraud Score"
          value={avgFraudScore.toFixed(0)}
          icon={Shield}
          color="bg-violet-500"
          loading={isLoading}
        />
      </div>

      {flaggedCount > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  {flaggedCount} claim{flaggedCount !== 1 ? 's' : ''} flagged for potential fraud
                </p>
                <p className="text-sm text-red-600">
                  Review these claims carefully before processing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          {claims.length === 0 && !isLoading ? (
            <EmptyState
              icon={Shield}
              title="No fraud alerts"
              description="Claims flagged for potential fraud will appear here."
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search flagged claims..."
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
