"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Claim } from "@/lib/types"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

type GetColumnsProps = {
  onEdit: (claim: Claim) => void;
  onDelete: (claim: Claim) => void;
}

export const getColumns = ({ onEdit, onDelete }: GetColumnsProps): ColumnDef<Claim>[] => [
  {
    accessorKey: "claim_number",
    header: "Claim #",
  },
  {
    accessorKey: "member_name",
    header: "Member / Company",
     cell: ({row}) => {
        const claim = row.original;
        return (
            <div>
                <div className="font-medium">{claim.member_name}</div>
                <div className="text-muted-foreground text-sm">{claim.company_name}</div>
            </div>
        )
    }
  },
  {
    accessorKey: "policy_number",
    header: "Policy #",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({row}) => <StatusBadge status={row.original.status} />,
  },
   {
    accessorKey: "claim_type",
    header: "Type",
    cell: ({row}) => <div className="capitalize">{row.original.claim_type}</div>
  },
  {
    accessorKey: "claim_amount",
    header: "Amount",
    cell: ({row}) => {
        const amount = parseFloat(String(row.original.claim_amount))
        const formatted = new Intl.NumberFormat("en-EG", {
            style: "currency",
            currency: "EGP",
        }).format(amount)
 
        return <div className="text-right font-medium">{formatted}</div>
    }
  },
   {
    accessorKey: "submission_date",
    header: "Submission Date",
     cell: ({row}) => {
        const date = row.original.submission_date;
        return <div>{date ? format(new Date(date), 'PPP') : 'N/A'}</div>
    }
  },
  {
    id: "actions",
    cell: ({row}) => {
      const claim = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(claim); }}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Claim
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(claim); }}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Claim
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
