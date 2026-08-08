'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { useDashboardMetrics } from '@/lib/hooks/use-dashboard-metrics';
import { MetricCard } from '@/components/dashboard/metric-card';
import { DollarSign, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/components/i18n-context';
import { cn } from '@/lib/utils';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef
} from "@tanstack/react-table";
import { format } from "date-fns";

export default function FinanceDashboard() {
  const { t, isRtl, lang } = useI18n();
  const { metrics, isLoading } = useDashboardMetrics();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    async function fetchRecentInvoices() {
      setInvoicesLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          amount_due,
          amount_paid,
          status,
          created_at,
          policy:policies(client_company_id, companies:companies(name))
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setInvoices(data);
      }
      setInvoicesLoading(false);
    }
    fetchRecentInvoices();
  }, []);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "company_name",
      header: t('client' as any) || "Client",
      cell: ({ row }) => {
         const companyName = row.original.policy?.companies?.name || (t('unknownClient' as any) || 'Unknown Client');
         return <span className="font-medium text-foreground">{companyName}</span>;
      }
    },
    {
      accessorKey: "amount_due",
      header: t('amountDue' as any) || "Amount Due",
      cell: ({ row }) => `$${Number(row.original.amount_due).toLocaleString()}`
    },
    {
      accessorKey: "status",
      header: t('status') || "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          row.original.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
          row.original.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {row.original.status?.toUpperCase()}
        </span>
      )
    },
    {
      accessorKey: "created_at",
      header: t('date' as any) || "Date",
      cell: ({ row }) => format(new Date(row.original.created_at), lang === 'ar' ? 'dd-MM-yyyy' : "MMM d, yyyy")
    }
  ];

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  if (isLoading || !metrics) {
     return <div className="p-8 text-center text-muted-foreground animate-pulse">{t('loadingFinanceData' as any) || "Loading Finance Data..."}</div>;
  }

  const { outstanding_receivables, collections_mtd } = metrics.modules.finance;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader title={t('financeAccounting' as any) || "Finance & Accounting"} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title={t('collectionsMtd' as any) || "Collections (MTD)"} value={formatCompactNumber(collections_mtd)} icon={TrendingUp} colorVariant="success" />
        <MetricCard title={t('outstandingBalances' as any) || "Outstanding Balances"} value={formatCompactNumber(outstanding_receivables)} icon={AlertTriangle} colorVariant="warning" />
      </div>

      <div className="mt-8">
         <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">{t('recentInvoices' as any) || "Recent Invoices"}</h3>
         <div className="h-[400px]">
           <DataTable
             table={table}
             columns={columns}
             isLoading={invoicesLoading}
             globalFilter={globalFilter}
             setGlobalFilter={setGlobalFilter}
             searchPlaceholder={t('searchInvoices' as any) || "Search invoices..."}
             emptyState={{
               title: t('noRecentInvoices' as any) || "No recent invoices",
               description: t('noRecentInvoicesDesc' as any) || "When invoices are generated, they will appear here."
             }}
           />
         </div>
      </div>
    </div>
  );
}
