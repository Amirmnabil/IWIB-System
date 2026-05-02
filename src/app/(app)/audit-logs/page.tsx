'use client';
import React, { useState } from "react";
import { format } from "date-fns";
import { ClipboardList, User, Calendar, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  view: "bg-slate-100 text-slate-700",
  export: "bg-violet-100 text-violet-700",
  login: "bg-indigo-100 text-indigo-700",
  logout: "bg-amber-100 text-amber-700"
};

export default function AuditLogs() {
  const logs: any[] = [];
  const isLoading = false;
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = [
    {
      header: "Action",
      accessorKey: "action",
      cell: ({row}: any) => {
        const log = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <Badge className={actionColors[log.action] || actionColors.view}>
                {log.action?.toUpperCase()}
              </Badge>
            </div>
          </div>
        )
      }
    },
    {
      header: "Entity",
      accessorKey: "entity_type",
      cell: ({row}: any) => {
        const log = row.original;
        return (
          <div>
            <p className="font-medium text-slate-900">{log.entity_type}</p>
            {log.entity_name && (
              <p className="text-sm text-slate-500">{log.entity_name}</p>
            )}
          </div>
        )
      }
    },
    {
      header: "User",
      accessorKey: "user_name",
      cell: ({row}: any) => {
        const log = row.original;
        return (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-sm">{log.user_name || log.user_email || 'System'}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: "Date & Time",
      accessorKey: "created_date",
      cell: ({row}: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm">
            {row.original.created_date ? format(new Date(row.original.created_date), 'MMM d, yyyy HH:mm') : '-'}
          </span>
        </div>
      )
    },
    {
      header: "IP Address",
      accessorKey: "ip_address",
      cell: ({row}: any) => (
        <span className="text-sm text-slate-600 font-mono">{row.original.ip_address || '-'}</span>
      )
    },
    {
      header: "Details",
      accessorKey: "notes",
      cell: ({row}: any) => (
        <p className="text-sm text-slate-500 max-w-xs truncate">
          {row.original.notes || '-'}
        </p>
      )
    }
  ];

  const table = useReactTable({
      data: logs,
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
              pageSize: 20,
          },
      },
  });

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track system activity and changes"
      />

      <Card>
        <CardContent className="p-6">
          {logs.length === 0 && !isLoading ? (
            <EmptyState
              icon={ClipboardList}
              title="No audit logs yet"
              description="System activities will be recorded here."
            />
          ) : (
            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder="Search logs..."
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
