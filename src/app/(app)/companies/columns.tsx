"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Company } from "@/lib/types"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoreHorizontal, Trash2, Edit, PhoneCall } from "lucide-react"
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
      accessorKey: "name",
      header: t('companyEn'),
      cell: ({row}) => <div className="font-bold text-slate-800">{isRtl ? row.original.name_ar || row.original.name : row.original.name}</div>
    },
    {
      accessorKey: "status",
      header: t('status') || "Status",
      cell: ({ row }) => {
        const rawStatus = row.original.status || "";
        const outcomeLabels: Record<string, string> = {
          request_meeting: 'Request Meeting',
          request_quotation: 'Request Quotation',
          hr_left: 'HR Left',
          waiting_for_data: 'Waiting for Data',
          call_back: 'Call Back',
          send_profile: 'Send Profile',
          renewed: 'Renewed',
          not_interested: 'Not Interested',
          wrong_number: 'Wrong Number',
          no_answer: 'No Answer'
        };
        const label = outcomeLabels[rawStatus] || rawStatus;
        if (!label) return <span className="text-slate-400">-</span>;

        return (
          <Badge variant="outline" className="font-bold text-xs whitespace-nowrap bg-indigo-50 text-indigo-700 border-indigo-200 rounded-lg px-2.5 py-0.5">
            {label}
          </Badge>
        );
      }
    },
    {
      id: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = (row.original as any)._priority || getCompanyPriority(row.original);
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider whitespace-nowrap rounded-lg px-2 py-0.5", priority.badgeColor)}>
            {priority.label}
          </Badge>
        );
      }
    },
    {
      accessorKey: "employee_count",
      header: t('headcount'),
      cell: ({row}) => <div className="text-slate-600">{row.original.employee_count || "-"}</div>
    },
    {
      accessorKey: "actual_renewal_date",
      header: t('actualRenewal'),
      cell: ({row}) => <div className="text-xs font-mono text-slate-600">{row.original.actual_renewal_date || '-'}</div>
    },
    {
      id: "actions",
      header: t('actions'),
      cell: ({row}) => {
        const company = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 bg-indigo-50 text-indigo-600 border-indigo-100" onClick={(e) => { e.stopPropagation(); onEdit(company); }}>
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "start" : "end"}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(company); }}><Edit className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} /> {t('editProfile')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(company) }}><Trash2 className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} /> {t('delete')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    }
  ]
}

