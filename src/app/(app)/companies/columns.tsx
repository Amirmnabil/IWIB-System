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
      accessorKey: "employee_count",
      header: t('headcount'),
      cell: ({row}) => <div className="text-slate-600">{row.original.employee_count || "-"}</div>
    },
    {
      accessorKey: "status",
      header: t('status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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

