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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import { usePermissions } from '@/lib/hooks/use-permissions';
import { query, where } from '@/firebase';
import { StatusBadge } from "@/components/shared/status-badge";
import { 
  Plus, Search, Filter, Building2, Users, Target, Activity, TrendingUp, Zap, Filter as Funnel, DollarSign, LayoutGrid, List,
  Globe, Mail, Phone, MapPin, Edit3, ArrowUpRight
} from 'lucide-react';

const AntiGravityCard = ({ title, value, icon: Icon, gradient }: { title: string, value: string, icon: any, gradient: string }) => {
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

const CompanyCard = ({ company, onClick, onEdit }: { company: Company, onClick: () => void, onEdit: (e: any) => void }) => {
  const { t, isRtl } = useI18n();
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <Card className="rounded-[2rem] border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden bg-white h-full flex flex-col">
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={company.status} />
              <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600" onClick={onEdit}>
                    <Edit3 className="w-4 h-4" />
                 </Button>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
            {isRtl ? company.name_ar || company.name : company.name}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
            <Target className="w-3 h-3" /> {t(company.insurance_type as any) || company.insurance_type}
          </p>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center"><Mail className="w-3 h-3 text-slate-400" /></div>
              <span className="truncate">{company.primary_contact_email || t('notProvided')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center"><Phone className="w-3 h-3 text-slate-400" /></div>
              <span>{company.primary_contact_phone || t('notProvided')}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto border-t border-slate-50 p-4 bg-slate-50/30 flex items-center justify-between">
           <div className="flex -space-x-2">
              {[1, 2].map((i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                  {i === 1 ? 'H' : 'M'}
                </div>
              ))}
           </div>
           <div className="flex items-center gap-1 text-indigo-600 font-black text-[10px] uppercase tracking-tighter">
              {t('viewDetails')} <ArrowUpRight className="w-3 h-3" />
           </div>
        </div>
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
    const { isAdmin, internalUserId } = usePermissions();

    const companiesRef = useMemoFirebase(() => {
        if (!firestore) return null;
        const coll = collection(firestore, 'companies');
        
        // If not admin, filter by assigned_user_id
        // NOTE: In a real production environment, this should also be enforced via RLS in Supabase.
        if (!isAdmin && internalUserId) {
            return query(coll, where('assigned_user_id', '==', internalUserId));
        }
        
        return coll;
    }, [firestore, isAdmin, internalUserId]);

    const { data: companiesData, isLoading } = useCollection<Company>(companiesRef);
    const companies = companiesData || [];

    const [globalFilter, setGlobalFilter] = useState('');
    const [businessLineFilter, setBusinessLineFilter] = useState('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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
            className={cn(
              "flex flex-col h-[calc(100vh-5rem)] overflow-hidden space-y-4 pb-2", 
              isRtl && "font-arabic"
            )}
        >
            {/* Sticky Top Section */}
            <div className="flex-none space-y-4">
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
            </div>

            {/* Main Content Area - Fixed Height with Internal Scroll */}
            <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white flex-1 flex flex-col min-h-0">
                <div className="flex-none border-b bg-slate-50/50 backdrop-blur-md p-3 flex flex-col md:flex-row gap-3 items-center justify-between z-10">
                        <div className="relative flex-1 w-full max-w-sm">
                          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                          <Input
                            placeholder={t('searchPlaceholder')}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className={cn("h-10 text-sm rounded-xl border-slate-200 focus-visible:ring-indigo-500 bg-white shadow-sm transition-all", isRtl ? "pr-10" : "pl-10")}
                          />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setViewMode('table')}
                                    className={cn("h-8 px-4 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'table' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                                >
                                    <List className="w-3.5 h-3.5" /> {t('table')}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setViewMode('grid')}
                                    className={cn("h-8 px-4 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> {t('cards')}
                                </Button>
                            </div>
                            <Select value={businessLineFilter} onValueChange={setBusinessLineFilter}>
                                <SelectTrigger className="w-full md:w-[180px] h-10 bg-white rounded-xl border-slate-200 text-xs font-bold text-slate-600 shadow-sm focus:ring-indigo-500">
                                    <div className="flex items-center gap-2">
                                      <Filter className="w-3.5 h-3.5 text-indigo-500" />
                                      <SelectValue placeholder={t('lineOfBusiness')} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                    <SelectItem value="all" className="font-bold rounded-lg">{t('allBusinessLines')}</SelectItem>
                                    {LOB_OPTIONS.map(lob => (
                                      <SelectItem key={lob} value={lob} className="text-xs font-medium rounded-lg">{t(lob as any)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 shadow-sm hover:bg-amber-50 group transition-colors" onClick={() => setGlobalFilter('')}>
                                <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            </Button>
                        </div>
                </div>
                
                <CardContent className="p-0 flex-1 overflow-hidden bg-slate-50/20">
                    {viewMode === 'table' ? (
                        <div className="h-full p-4">
                          <DataTable 
                              table={table}
                              columns={columns} 
                              isLoading={isLoading}
                              globalFilter={globalFilter}
                              setGlobalFilter={setGlobalFilter}
                              hideSearch={true}
                              onRowClick={(row) => router.push(`/companies/${row.id}`)}
                          />
                        </div>
                    ) : (
                        <ScrollArea className="h-full scrollbar-thin">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                                {isLoading ? (
                                    Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-[2rem]" />)
                                ) : table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map(row => (
                                        <CompanyCard 
                                            key={row.original.id} 
                                            company={row.original} 
                                            onClick={() => router.push(`/companies/${row.original.id}`)}
                                            onEdit={(e) => { e.stopPropagation(); router.push(`/companies/${row.original.id}/edit`); }}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full py-32 text-center flex flex-col items-center gap-6">
                                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                                          <Building2 className="w-12 h-12 text-slate-300" />
                                        </div>
                                        <div>
                                          <p className="text-slate-500 font-black text-xl">{t('noResults')}</p>
                                          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search term.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
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
