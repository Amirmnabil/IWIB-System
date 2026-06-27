'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, type SortingState } from "@tanstack/react-table";
import type { Company } from '@/lib/types';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/lib/hooks/use-toast';
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
import { useMasterData } from '@/lib/hooks/use-master-data';
import { usePermissions } from '@/lib/hooks/use-permissions';

import { StatusBadge } from "@/components/shared/status-badge";
import { formatCompactNumber } from "@/lib/utils";
import { 
  Plus, Search, Filter, Building2, Users, Target, Activity, TrendingUp, Zap, Filter as Funnel, DollarSign, LayoutGrid, List,
  Globe, Mail, Phone, MapPin, Edit3, ArrowUpRight, SortDesc, Flame
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
      <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-card h-full flex flex-col justify-center">
        <CardContent className="p-3 flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-inner text-white", gradient)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
             <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
             <p className="text-card-header text-foreground leading-none mt-1">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

import { CompanyCard } from "@/components/shared/CompanyCard";
import { differenceInDays, startOfDay, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { getCompanyPriority } from "@/lib/company-utils";





export default function CompaniesPage() {
    const { t, isRtl } = useI18n();
    const router = useRouter();
    const { data: companiesData, isLoading } = useSupabaseCollection<Company>('companies');
    const { toast } = useToast();
    const { isAdmin, internalUserId } = usePermissions();
    const { data: productTypes } = useMasterData('product_types');
    
    // If not admin, filter by assigned_user_id
    const companies = useMemo(() => {
        const allCompanies = companiesData || [];
        if (!isAdmin && internalUserId) {
            return allCompanies.filter((c: any) => c.assigned_user_id === internalUserId);
        }
        return allCompanies;
    }, [companiesData, isAdmin, internalUserId]);

    const [globalFilter, setGlobalFilter] = useState('');
    const [businessLineFilter, setBusinessLineFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isSmartSort, setIsSmartSort] = useState(true);
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

    const enhancedCompanies = useMemo(() => {
        return companies.map(c => {
            const priorityInfo = getCompanyPriority(c);
            return {
                ...c,
                _priority: priorityInfo
            };
        });
    }, [companies]);

    const sortedAndFilteredCompanies = useMemo(() => {
        let result = enhancedCompanies.filter((c: any) => {
            if (businessLineFilter !== 'all' && c.insurance_type !== businessLineFilter) return false;
            if (priorityFilter !== 'all' && c._priority.level.toString() !== priorityFilter) return false;
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            return true;
        });

        if (isSmartSort) {
            // Sort by priority score DESC
            result = result.sort((a: any, b: any) => b._priority.score - a._priority.score);
        }

        return result;
    }, [enhancedCompanies, businessLineFilter, priorityFilter, statusFilter, isSmartSort]);

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
                  title={<span className="font-sans">{t('companies')}</span>} 
                  onAction={() => router.push('/companies/new')}
                  actionLabel={t('add')}
                  ActionIcon={Plus}
              />

            </div>

            {/* Main Content Area - Fixed Height with Internal Scroll */}
            <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-card flex-1 flex flex-col min-h-0">
                <div className="flex-none border-b bg-background/50 backdrop-blur-md p-3 flex flex-col xl:flex-row gap-3 items-center justify-between z-10">
                        <div className="relative flex-1 w-full max-w-sm">
                          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                          <Input
                            placeholder={t('searchPlaceholder')}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className={cn("h-10 text-sm rounded-xl border-border focus-visible:ring-indigo-500 bg-card shadow-sm transition-all", isRtl ? "pr-10" : "pl-10")}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-1.5 shadow-sm h-10">
                                <Label htmlFor="smart-sort" className="text-xs font-bold text-muted-foreground cursor-pointer flex items-center gap-1.5">
                                   <Flame className="w-3.5 h-3.5 text-orange-500" /> Smart Sort
                                </Label>
                                <Switch 
                                   id="smart-sort" 
                                   checked={isSmartSort} 
                                   onCheckedChange={setIsSmartSort}
                                   className="data-[state=checked]:bg-orange-500"
                                />
                            </div>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-full md:w-[140px] h-10 bg-card rounded-xl border-border text-xs font-bold text-muted-foreground shadow-sm focus:ring-indigo-500">
                                    <div className="flex items-center gap-2">
                                      <SortDesc className="w-3.5 h-3.5 text-slate-400" />
                                      <SelectValue placeholder="Priority" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                    <SelectItem value="all" className="font-bold rounded-lg">Priorities</SelectItem>
                                    <SelectItem value="1" className="text-small rounded-lg">1 - Renewal Soon</SelectItem>
                                    <SelectItem value="2" className="text-small rounded-lg">2 - Waiting Data</SelectItem>
                                    <SelectItem value="3" className="text-small rounded-lg">3 - Pending Meeting</SelectItem>
                                    <SelectItem value="4" className="text-small rounded-lg">4 - Follow-up</SelectItem>
                                    <SelectItem value="5" className="text-small rounded-lg">5 - Hot Lead</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[150px] h-10 bg-card rounded-xl border-border text-xs font-bold text-muted-foreground shadow-sm focus:ring-indigo-500">
                                    <div className="flex items-center gap-2">
                                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                                      <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                    <SelectItem value="all" className="font-bold rounded-lg">Statuses</SelectItem>
                                    <SelectItem value="waiting_for_data" className="text-small rounded-lg">Waiting for Data</SelectItem>
                                    <SelectItem value="request_meeting" className="text-small rounded-lg">Request Meeting</SelectItem>
                                    <SelectItem value="call_back" className="text-small rounded-lg">Call Back</SelectItem>
                                    <SelectItem value="request_quotation" className="text-small rounded-lg">Request Quotation</SelectItem>
                                    <SelectItem value="renewed" className="text-small rounded-lg">Renewed</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center bg-card rounded-xl border border-border p-1 shadow-sm">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setViewMode('table')}
                                    className={cn("h-8 px-4 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'table' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-muted-foreground")}
                                >
                                    <List className="w-3.5 h-3.5" /> {t('table')}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setViewMode('grid')}
                                    className={cn("h-8 px-4 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-muted-foreground")}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> {t('cards')}
                                </Button>
                            </div>
                            <Select value={businessLineFilter} onValueChange={setBusinessLineFilter}>
                                <SelectTrigger className="w-full md:w-[150px] h-10 bg-card rounded-xl border-border text-xs font-bold text-muted-foreground shadow-sm focus:ring-indigo-500">
                                    <div className="flex items-center gap-2">
                                      <Filter className="w-3.5 h-3.5 text-indigo-500" />
                                      <SelectValue placeholder={t('lineOfBusiness')} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                    <SelectItem value="all" className="font-bold rounded-lg">{t('allBusinessLines')}</SelectItem>
                                    {productTypes.map((pt: any) => (
                                      <SelectItem key={pt.id} value={isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)} className="text-small rounded-lg">
                                        {isRtl ? (pt.name_ar || pt.name) : (pt.name_en || pt.name)}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex items-center bg-card rounded-xl border border-border p-1 shadow-sm">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setViewMode('table')}
                                    className={cn("h-8 px-3 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'table' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-muted-foreground")}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setViewMode('grid')}
                                    className={cn("h-8 px-3 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-muted-foreground")}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-border shadow-sm hover:bg-amber-50 group transition-colors" onClick={() => { setGlobalFilter(''); setPriorityFilter('all'); setStatusFilter('all'); setBusinessLineFilter('all'); }}>
                                <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            </Button>
                        </div>
                </div>
                
                <CardContent className="p-0 flex-1 overflow-hidden bg-background/20">
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
                                          <p className="text-muted-foreground font-black text-xl">{t('noResults')}</p>
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
                  <AlertDialogDescription className="text-muted-foreground font-medium leading-relaxed">
                    {t('deleteConfirmationMessage').replace('{name}', selectedCompany?.name || '')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-4">
                  <AlertDialogCancel className="rounded-xl font-bold h-12">{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => { 
                    if (selectedCompany) {
                      await supabase.from("companies").delete().eq("id", selectedCompany.id);
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
