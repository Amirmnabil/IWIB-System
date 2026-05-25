const fs = require('fs');
const path = require('path');

const pagePath = 'd:\\IWIB\\IWIB System\\SYSTEM\\src\\app\\(app)\\policies\\page.tsx';
const content = fs.readFileSync(pagePath, 'utf8');

// The file has ~760 lines.
// PolicyTable
const tableCode = `import React from "react";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CheckCircle2, Download } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Policy } from "@/lib/types";
import { format } from "date-fns";

export interface PolicyTableProps {
  policies: Policy[];
  sorting: any;
  setSorting: any;
  globalFilter: string;
  setGlobalFilter: any;
  onEdit: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
  t: any;
}

export function PolicyTable({ policies, sorting, setSorting, globalFilter, setGlobalFilter, onEdit, onDelete, t }: PolicyTableProps) {
  const columns = [
    { accessorKey: "policy_number", header: "Policy Number" },
    { accessorKey: "client_company_name", header: "Client" },
    { accessorKey: "insurer_name", header: "Insurer" },
    { accessorKey: "policy_type", header: "Type" },
    { accessorKey: "start_date", header: "Start Date" },
    { accessorKey: "end_date", header: "End Date" },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const policy = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(policy)}><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(policy)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
          </div>
        );
      }
    }
  ];

  return (
    <DataTable 
      columns={columns} 
      data={policies} 
      state={{ sorting, globalFilter }}
      onSortingChange={setSorting}
      onGlobalFilterChange={setGlobalFilter}
    />
  );
}
`;

fs.writeFileSync('d:\\IWIB\\IWIB System\\SYSTEM\\src\\components\\policies\\PolicyTable.tsx', tableCode);

// I will do the same for PolicyForm and rewrite page.tsx to use them.
// Actually, this is extremely destructive if I mess up. It's safer to just do the component splitting manually with ast or standard regex in my next turn, OR I can just rewrite the whole file via write_to_file if I construct it properly.

console.log("Script executed.");
