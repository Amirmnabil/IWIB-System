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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
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
  Plus, Search, Filter, Building2, Users, Target, Activity, TrendingUp, Zap
} from 'lucide-react';
import { differenceInDays, startOfDay, isValid } from 'date-fns';
import { cn } from "@/lib/utils";

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
    const { t, isRtl } = useI18n();
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

    const stats = useMemo(() => {
        const total = companies.length;
        const active = companies.filter(c => c.status !== 'not_interested' && c.status !== 'wrong_number').length;
        const totalEmployees = companies.reduce((acc, curr) => acc + (curr.employee_count || 0), 0);
        return { total, active, totalEmployees };
    }, [companies]);

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
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("space-y-6 pb-12", isRtl && "font-arabic")}
        >
            <PageHeader 
                title={t('companies')} 
                onAction={() => router.push('/companies/new')}
                actionLabel={t('add')}
                ActionIcon={Plus}
                description="Manage corporate portfolios and strategic accounts"
            />

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('totalCompanies')}
                    value={stats.total.toString()}
                    icon={Building2}
                    color="bg-indigo-600"
                    description="Total Registered Portfolios"
                />
                <StatCard
                    title="Active Prospects"
                    value={stats.active.toString()}
                    icon={Target}
                    color="bg-emerald-500"
                    description="Current Engagement Velocity"
                />
                <StatCard
                    title="Total Policy Members"
                    value={stats.totalEmployees.toLocaleString()}
                    icon={Users}
                    color="bg-blue-600"
                    description="Aggregate Employee Base"
                />
                <StatCard
                    title="Retention Rate"
                    value="92%"
                    icon={TrendingUp}
                    color="bg-slate-900"
                    description="Historical Account Stability"
                />
            </div>

            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-100 overflow-hidden bg-white">
                <CardHeader className="border-b bg-slate-50/50 p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative flex-1 w-full max-w-sm">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder={t('searchPlaceholder')}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-10 h-12 rounded-2xl border-2 focus-visible:ring-indigo-500 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Select value={businessLineFilter} onValueChange={setBusinessLineFilter}>
                                <SelectTrigger className="w-full md:w-[220px] h-12 bg-white rounded-2xl border-2 font-bold text-slate-600">
                                    <Filter className="w-4 h-4 mr-2 text-indigo-500" />
                                    <SelectValue placeholder="Line of Business" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-2 shadow-2xl">
                                    <SelectItem value="all" className="font-bold">All Business Lines</SelectItem>
                                    {LOB_OPTIONS.map(lob => (
                                      <SelectItem key={lob} value={lob} className="font-medium">{lob}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="h-12 w-12 rounded-2xl border-2" onClick={() => setGlobalFilter('')}>
                                <Zap className="w-4 h-4 text-amber-500" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <DataTable 
                        table={table}
                        columns={columns} 
                        isLoading={isLoading}
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        hideSearch={true}
                        onRowClick={(row) => router.push(`/companies/${row.id}`)}
                    />
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black tracking-tighter">Delete Company</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
                    This will remove all associated logs and records for <span className="font-bold text-slate-900">{selectedCompany?.name}</span>. This action is permanent and cannot be reversed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-4">
                  <AlertDialogCancel className="rounded-xl font-bold h-12">{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { 
                    if (selectedCompany && firestore) {
                      await deleteDoc(doc(firestore, "companies", selectedCompany.id));
                      toast({ title: "Company deleted" });
                    }
                    setDeleteDialogOpen(false); 
                  }} className="bg-red-600 hover:bg-red-700 rounded-xl font-black h-12 px-8">Confirm Deletion</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
