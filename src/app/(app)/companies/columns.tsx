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
    accessorKey: "priority",
    header: "Pri",
    cell: ({row}) => {
      const p = row.original.priority;
      return (
        <div className={cn(
          "w-2 h-8 rounded-full shadow-sm",
          p === 'critical' ? 'bg-red-600' : p === 'high' ? 'bg-orange-500' : p === 'medium' ? 'bg-amber-400' : 'bg-slate-200'
        )} />
      )
    }
  },
  {
    accessorKey: "name",
    header: "Company Name",
    cell: ({row}) => {
        const company = row.original;
        return (
            <div className={cn(
              "pl-2 border-l-4",
              company.status === 'waiting_for_data' ? 'border-blue-500' :
              company.status === 'renewed' ? 'border-emerald-500' :
              company.status === 'call_back' ? 'border-amber-400' :
              company.status === 'no_answer' ? 'border-orange-500' :
              company.status === 'send_profile' ? 'border-indigo-500' :
              'border-transparent'
            )}>
              <div className="font-black text-slate-900 leading-none">{company.name}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">{company.name_ar || company.code}</div>
            </div>
        )
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "follow_up_date",
    header: "Follow Up",
    cell: ({row}) => <div className="text-xs font-bold text-indigo-600">{row.original.follow_up_date || '-'}</div>
  },
  {
    accessorKey: "checklist_completion",
    header: "Data",
    cell: ({row}) => <Badge variant="outline" className="text-[10px] uppercase">{row.original.checklist_completion || 'Pending'}</Badge>
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
