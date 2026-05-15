'use client';
import React from "react";
import {
  flexRender,
  type ColumnDef,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { LucideIcon } from "lucide-react";
import { useI18n } from "@/components/i18n-context";

type EmptyStateProps = {
    title: string;
    description: string;
    icon?: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
}

export function DataTable<TData, TValue>({
  table,
  columns,
  isLoading,
  searchPlaceholder,
  onRowClick,
  emptyState,
  globalFilter,
  setGlobalFilter,
  hideSearch = false,
}: {
  table: Table<TData>,
  columns: ColumnDef<TData, TValue>[],
  isLoading?: boolean,
  searchPlaceholder?: string,
  onRowClick?: (row: TData) => void,
  emptyState?: EmptyStateProps,
  globalFilter: string,
  setGlobalFilter: (value: string) => void,
  hideSearch?: boolean;
}) {
  const { t, isRtl } = useI18n();
  const rowModel = table.getRowModel();
  const rows = rowModel?.rows || [];

  return (
    <div className="space-y-4">
      {/* Search */}
      {!hideSearch && (
        <div className="relative max-w-sm">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
          <Input
            placeholder={searchPlaceholder || t('search')}
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className={cn(isRtl ? "pr-10" : "pl-10")}
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden bg-white flex flex-col h-full">
        <div className="overflow-auto flex-1 relative">
          <ShadcnTable>
            <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-slate-50 hover:bg-slate-50 border-b">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "transition-all duration-300 bg-white relative z-0",
                    onRowClick && "cursor-pointer hover:bg-slate-50 hover:-translate-y-[2px] hover:shadow-md hover:z-10"
                  )}
                  onClick={(e) => {
                    // Prevent row click if clicking on a button or menu trigger
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[data-state]')) {
                      return;
                    }
                    onRowClick && onRowClick(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                   {emptyState && <EmptyState {...emptyState} onAction={emptyState.onAction} />}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ShadcnTable>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel()?.rows?.length ?? 0} {t('of')}{" "}
          {table.getFilteredRowModel()?.rows?.length ?? 0} {t('rowsSelected')}.
        </div>
        <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">
              {t('page')} {table.getState().pagination.pageIndex + 1} {t('of')} {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
      </div>
    </div>
  );
}
