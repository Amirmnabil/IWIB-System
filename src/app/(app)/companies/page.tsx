'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import type { Company } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, doc, deleteDoc, collection } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getColumns } from "./columns";
import { useI18n } from '@/components/i18n-context';
import { 
  Plus, Search, Filter
} from 'lucide-react';
import { differenceInDays, startOfDay, isValid } from 'date-fns';

const LOB_OPTIONS = [
  "Medical", "Life", "Motor", "Property", "Liability", 
  "Marine", "Engineering", "Financial Lines", "Cyber", 
  "Travel", "Personal Accident"
];

const STATUS_PRIORITY: Record<string, number> = {
  'waiting_for_data': 1,
  'call_back': 2,
  'send_profile': 3,
  'no_answer': 4,
  'renewed': 5,
  'wrong_number': 6,
  'not_interested': 7
};

export default function CompaniesPage() {
    const { t } = useI18n();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const companiesRef = useMemoFirebase(() => collection(firestore!, 'companies'), [firestore]);
    const { data: companiesData, isLoading } = useCollection<Company>(companiesRef);
    const companies = companiesData || [];

    const [globalFilter, setGlobalFilter] = useState('');
    const [businessLineFilter, setBusinessLineFilter] = useState('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const sortedAndFilteredCompanies = useMemo(() => {
        const filtered = companies.filter(c => {
            if (businessLineFilter === 'all') return true;
            return c.insurance_type === businessLineFilter;
        });

        const today = startOfDay(new Date());

        return filtered.sort((a, b) => {
            const getScore = (dateStr?: string) => {
                if (!dateStr) return Infinity;
                const d = new Date(dateStr);
                if (!isValid(d)) return Infinity;
                return Math.abs(differenceInDays(startOfDay(d), today));
            };

            const actualA = getScore(a.actual_offer_date);
            const actualB = getScore(b.actual_offer_date);
            if (actualA !== actualB) return actualA - actualB;

            const expectedA = getScore(a.expected_offer_date);
            const expectedB = getScore(b.expected_offer_date);
            if (expectedA !== expectedB) return expectedA - expectedB;

            const priorityA = STATUS_PRIORITY[a.status] || 99;
            const priorityB = STATUS_PRIORITY[b.status] || 99;
            return priorityA - priorityB;
        });
    }, [companies, businessLineFilter]);

    const columns = getColumns({
        onEdit: (c) => router.push(`/companies/${c.id}/edit`),
        onDelete: (c) => { setSelectedCompany(c); setDeleteDialogOpen(true); },
        onCall: (c) => router.push(`/companies/${c.id}/edit`),
    });

    const table = useReactTable({
        data: sortedAndFilteredCompanies,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getFilteredRowModel: getFilteredRowModel(),
        state: { globalFilter },
    });

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Companies Hub" 
                onAction={() => router.push('/companies/new')}
                actionLabel="Add Company"
                ActionIcon={Plus}
            />

            <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search name, code, or status..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                <Select value={businessLineFilter} onValueChange={setBusinessLineFilter}>
                    <SelectTrigger className="w-[200px] h-10 bg-white">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Line of Business" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Lines</SelectItem>
                        {LOB_OPTIONS.map(lob => (
                          <SelectItem key={lob} value={lob}>{lob}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <DataTable 
                table={table}
                columns={columns} 
                isLoading={isLoading}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                hideSearch={true}
                onRowClick={(row) => router.push(`/companies/${row.id}`)}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Company</AlertDialogTitle>
                  <AlertDialogDescription>This will remove all associated logs and records for this company. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { 
                    if (selectedCompany && firestore) {
                      await deleteDoc(doc(firestore, "companies", selectedCompany.id));
                      toast({ title: "Company deleted" });
                    }
                    setDeleteDialogOpen(false); 
                  }} className="bg-red-600">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
