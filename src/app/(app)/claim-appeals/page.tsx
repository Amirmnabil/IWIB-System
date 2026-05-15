'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Building2, DollarSign, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

export default function ClaimAppeals() {
  const appeals: any[] = [];
  const isLoading = false;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Stats
  const submittedCount = appeals.filter(a => a.status === 'submitted').length;
  const underReviewCount = appeals.filter(a => a.status === 'under_review').length;
  const approvedCount = appeals.filter(a => a.status === 'approved').length;
  const rejectedCount = appeals.filter(a => a.status === 'rejected').length;
  const totalAppealed = appeals.reduce((sum, a) => sum + (a.rejected_amount || 0), 0);

  const columns = [
    {
      header: "Appeal",
      accessorKey: "appeal_number",
      cell: ({row}: any) => {
        const appeal = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              appeal.status === 'approved' ? 'bg-emerald-100' :
              appeal.status === 'rejected' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                appeal.status === 'approved' ? 'text-emerald-600' :
                appeal.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
              }`} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{appeal.appeal_number || 'N/A'}</p>
              <p className="text-sm text-slate-500">Claim: {appeal.claim_number}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Member",
      accessorKey: "member_name",
    },
    {
      header: "Company",
      accessorKey: "company_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>{row.original.company_name || '-'}</span>
        </div>
      )
    },
    {
      header: "Rejected Amount",
      accessorKey: "rejected_amount",
      cell: ({row}: any) => (
        <span className="font-medium text-red-600">EGP {(row.original.rejected_amount || 0).toLocaleString()}</span>
      )
    },
    {
      header: "Approved Amount",
      accessorKey: "approved_amount",
      cell: ({row}: any) => row.original.approved_amount ? (
        <span className="font-medium text-emerald-600">EGP {row.original.approved_amount.toLocaleString()}</span>
      ) : '-'
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({row}: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: "Submitted By",
      accessorKey: "submitted_by_name",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <span>{row.original.submitted_by_name || '-'}</span>
        </div>
      )
    },
    {
      header: "Decision Date",
      accessorKey: "decision_date",
      cell: ({row}: any) => row.original.decision_date ? format(new Date(row.original.decision_date), 'MMM d, yyyy') : '-'
    }
  ];

  const table = useReactTable({
      data: appeals,
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
        title="Claim Appeals"
        
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Submitted"
          value={submittedCount}
          icon={AlertTriangle}
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Under Review"
          value={underReviewCount}
          icon={AlertTriangle}
          color="bg-amber-500"
          loading={isLoading}
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          icon={AlertTriangle}
          color="bg-emerald-500"
          loading={isLoading}
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          icon={AlertTriangle}
          color="bg-red-500"
          loading={isLoading}
        />
        <StatCard
          title="Total Appealed"
          value={`EGP ${(totalAppealed / 1000).toFixed(0)}K`}
          icon={DollarSign}
          color="bg-indigo-500"
          loading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {appeals.length === 0 && !isLoading ? (
            <EmptyState
              icon={AlertTriangle}
              title="No claim appeals yet"
              
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search appeals..."
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
