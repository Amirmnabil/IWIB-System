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
import { Card, CardContent } from "@/components/ui/card";
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
  Plus, Search, Filter, Building2, Users, Target, Activity, TrendingUp, Zap, Filter as Funnel, DollarSign
} from 'lucide-react';

const AntiGravityCard = ({ title, value, icon: Icon, gradient }: any) => {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [0, -2, 0] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      whileHover={{ y: -4, rotateX: 2, rotateY: -2, scale: 1.02 }}
      style={{ perspective: 1000 }}
      className="h-full"
    >
      <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white h-full flex flex-col justify-center">
        <CardContent className="p-3 flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-inner text-white", gradient)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
             <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
             <p className="text-xl font-bold text-slate-800 leading-none mt-1">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
import { differenceInDays, startOfDay, isValid } from 'date-fns';
import { cn } from "@/lib/utils";

const LOB_OPTIONS = [
  "type_medical", "type_life", "type_motor", "type_property", "type_liability", 
  "type_marine", "type_engineering", "type_financial_lines", "type_cyber", 
  "type_travel", "type_personal_accident"
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
        const clients = companies.filter(c => c.status === 'client' || c.status === 'renewed').length;
        const conversionRate = total > 0 ? Math.round((clients / total) * 100) : 0;
        
        // Mock pipeline value logic (employee_count * $150 average premium)
        const pipelineValue = companies
            .filter(c => c.status !== 'not_interested' && c.status !== 'wrong_number' && c.status !== 'client' && c.status !== 'renewed')
            .reduce((acc, curr) => acc + ((curr.employee_count || 10) * 150), 0);
            
        return { total, active, conversionRate, pipelineValue };
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
            className={cn("space-y-4 pb-8 flex flex-col h-[calc(100vh-6rem)]", isRtl && "font-arabic")}
        >
            <PageHeader 
                title={t('companies')} 
                onAction={() => router.push('/companies/new')}
                actionLabel={t('add')}
                ActionIcon={Plus}
            />

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <AntiGravityCard
                    title={t('totalCompanies')}
                    value={stats.total.toString()}
                    icon={Building2}
                    gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
                />
                <AntiGravityCard
                    title={t('activeProspects')}
                    value={stats.active.toString()}
                    icon={Activity}
                    gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
                <AntiGravityCard
                    title={t('conversionRate')}
                    value={`${stats.conversionRate}%`}
                    icon={Funnel}
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                />
                <AntiGravityCard
                    title={t('pipelineValue')}
                    value={`${t('egp')} ${stats.pipelineValue.toLocaleString()}`}
                    icon={DollarSign}
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                />
            </div>

            <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white flex-1 flex flex-col">
                <div className="border-b bg-slate-50/50 p-2 flex flex-col md:flex-row gap-2 items-center justify-between">
                        <div className="relative flex-1 w-full max-w-xs">
                          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                          <Input
                            placeholder={t('searchPlaceholder')}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className={cn("h-8 text-sm rounded-lg border-slate-200 focus-visible:ring-indigo-500 bg-white shadow-sm", isRtl ? "pr-9" : "pl-9")}
                          />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Select value={businessLineFilter} onValueChange={setBusinessLineFilter}>
                                <SelectTrigger className="w-full md:w-[160px] h-8 bg-white rounded-lg border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
                                    <Filter className={cn("w-3.5 h-3.5 text-indigo-500", isRtl ? "ml-2" : "mr-2")} />
                                    <SelectValue placeholder={t('lineOfBusiness')} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border shadow-lg">
                                    <SelectItem value="all" className="font-medium">{t('allBusinessLines')}</SelectItem>
                                    {LOB_OPTIONS.map(lob => (
                                      <SelectItem key={lob} value={lob} className="text-sm">{t(lob as any)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="h-8 w-8 p-0 rounded-lg border-slate-200 shadow-sm" onClick={() => setGlobalFilter('')}>
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                            </Button>
                        </div>
                </div>
                <CardContent className="p-0 flex-1 overflow-hidden">
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
                  <AlertDialogTitle className="text-2xl font-black tracking-tighter">{t('deleteCompany')}</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
                    {t('deleteConfirmationMessage').replace('{name}', selectedCompany?.name || '')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-4">
                  <AlertDialogCancel className="rounded-xl font-bold h-12">{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { 
                    if (selectedCompany && firestore) {
                      await deleteDoc(doc(firestore, "companies", selectedCompany.id));
                      toast({ title: t('deleteCompany') });
                    }
                    setDeleteDialogOpen(false); 
                  }} className="bg-red-600 hover:bg-red-700 rounded-xl font-black h-12 px-8">{t('confirmDeletion')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
