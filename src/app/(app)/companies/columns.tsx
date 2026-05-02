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

type GetColumnsProps = {
    onEdit: (company: Company) => void;
    onDelete: (company: Company) => void;
    onCall: (company: Company) => void;
}

export const getColumns = ({ onEdit, onDelete, onCall }: GetColumnsProps): ColumnDef<Company>[] => [
  {
    accessorKey: "name",
    header: "Company (EN)",
    cell: ({row}) => <div className="font-bold text-slate-800">{row.original.name}</div>
  },
  {
    accessorKey: "employee_count",
    header: "Headcount",
    cell: ({row}) => <div className="text-slate-600">{row.original.employee_count || "-"}</div>
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "actual_renewal_date",
    header: "Actual Renewal",
    cell: ({row}) => <div className="text-xs font-mono text-slate-600">{row.original.actual_renewal_date || '-'}</div>
  },
  {
    accessorKey: "actual_renewal_date",
    header: "Actual Renewal",
    id: "actual_renewal_2",
    cell: ({row}) => <div className="text-xs font-mono text-slate-600">{row.original.actual_renewal_date || '-'}</div>
  },
  {
    id: "actions",
    header: "Actions",
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
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(company); }}><Edit className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(company) }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  }
]

