"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Company } from "@/lib/types"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoreHorizontal, Trash2, Edit, PhoneCall, User, Briefcase, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n-context"
import { getCompanyPriority } from "@/lib/company-utils"

type GetColumnsProps = {
    onEdit: (company: Company) => void;
    onDelete: (company: Company) => void;
    onCall: (company: Company) => void;
}

export const getColumns = ({ onEdit, onDelete, onCall }: GetColumnsProps): ColumnDef<Company>[] => {
  const { t, isRtl } = useI18n();
  
  return [
    {
      id: "select",
      header: ({ table }: any) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          aria-label="Select all"
          className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4"
        />
      ),
      cell: ({ row }: { row: any }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          aria-label="Select row"
          className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: t('companies') || "Companies",
      cell: ({ row }) => {
        const name = isRtl ? row.original.name_ar || row.original.name : row.original.name;
        const contactName = row.original.primary_contact_name || "";
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-bold shadow-sm border border-indigo-200 shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-indigo-900 hover:text-primary transition-colors">
                {name}
              </span>
              {contactName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mt-0.5 animate-fade-in">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {contactName}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      id: "contact_info",
      header: t('contactInfo' as any) || "Contact Info",
      cell: ({ row }) => {
        const email = row.original.primary_contact_email;
        const phone = row.original.primary_contact_phone;
        return (
          <div className="flex flex-col text-xs text-muted-foreground space-y-1">
            {email && <span className="font-medium text-slate-700">{email}</span>}
            {phone && <span className="font-semibold text-primary">{phone}</span>}
            {!email && !phone && <span className="text-slate-400 italic">No contact</span>}
          </div>
        );
      }
    },
    {
      accessorKey: "insurance_type",
      header: t('lineOfBusiness') || "LOB",
      cell: ({ row }) => {
        const insType = row.original.insurance_type || "Medical";
        return (
          <span className="font-bold text-slate-700 flex items-center gap-1 text-xs whitespace-nowrap">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {t(insType as any) || insType}
          </span>
        );
      }
    },
    {
      accessorKey: "employee_count",
      header: t('headcount'),
      cell: ({row}) => <div className="text-slate-700 font-semibold">{row.original.employee_count || "-"}</div>
    },
    {
      accessorKey: "actual_renewal_date",
      header: t('actualRenewal'),
      cell: ({row}) => {
        const dateStr = row.original.actual_renewal_date;
        return (
          <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold">
            {dateStr ? (
              <>
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span className="capitalize">{t(dateStr as any) || dateStr}</span>
              </>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>
        );
      }
    },
    {
      id: "priority",
      header: t('priority') || "Priority",
      cell: ({ row }) => {
        const priority = (row.original as any)._priority || getCompanyPriority(row.original);
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider whitespace-nowrap rounded-lg px-2 py-0.5", priority.badgeColor)}>
            {t(priority.label as any) || priority.label}
          </Badge>
        );
      }
    },
    {
      accessorKey: "status",
      header: t('status') || "Status",
      cell: ({ row }) => {
        const rawStatus = row.original.status || "";
        if (!rawStatus) return <span className="text-slate-400">-</span>;
        const label = t(`status_${rawStatus}` as any) || t(rawStatus as any) || rawStatus.replace(/_/g, " ");

        return (
          <Badge variant="outline" className="font-bold text-xs whitespace-nowrap bg-primary/10 text-indigo-700 border-indigo-200 rounded-lg px-2.5 py-0.5">
            {label}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({row}) => {
        const company = row.original;
        return (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "start" : "end"}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(company); }}><Edit className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} /> {t('editProfile')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(company) }}><Trash2 className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} /> {t('delete')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    }
  ]
}

