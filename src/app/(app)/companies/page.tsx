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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatCompactNumber } from "@/lib/utils";
import { 
  Plus, Search, Filter, Building2, Users, Target, Activity, TrendingUp, Zap, Filter as Funnel, DollarSign, LayoutGrid, List,
  Globe, Mail, Phone, MapPin, Edit3, ArrowUpRight, SortDesc, Flame, Trash2, Calendar
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





const EMPTY_ARRAY: any[] = [];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

function isRenewalWithin3Months(company: any): boolean {
  const renewalMonth = company.actual_renewal_date || company.renewal_month;
  if (!renewalMonth) return false;

  const parsedDate = new Date(renewalMonth);
  if (!isNaN(parsedDate.getTime()) && renewalMonth.includes('-')) {
    const today = new Date();
    const monthDiff = (parsedDate.getMonth() - today.getMonth() + 12) % 12;
    return monthDiff >= 0 && monthDiff <= 3;
  }

  const monthIdx = MONTH_NAMES.findIndex(
    m => m.toLowerCase() === renewalMonth.toLowerCase()
  );
  if (monthIdx === -1) return false;

  const currentMonthIdx = new Date().getMonth();
  const distance = (monthIdx - currentMonthIdx + 12) % 12;
  return distance >= 0 && distance <= 3;
}

export default function CompaniesPage() {
    const { t, isRtl } = useI18n();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: companiesData, isLoading } = useSupabaseCollection<Company>('companies');
    const { toast } = useToast();
    const { isAdmin, internalUserId } = usePermissions();
    const { data: productTypes } = useMasterData('product_types');

    // Fetch system users for bulk assignment dropdown
    const { data: usersData } = useSupabaseCollection<any>('users', undefined, {
        select: 'id, name, email, department, level',
        filterKey: 'users-dropdown',
    });
    const users = usersData || EMPTY_ARRAY;
    
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
    const [renewalFilter, setRenewalFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isSmartSort, setIsSmartSort] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [rowSelection, setRowSelection] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);

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
            if (renewalFilter === 'soon' && !isRenewalWithin3Months(c)) return false;
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            return true;
        });

        if (isSmartSort) {
            // Sort by priority score DESC
            result = result.sort((a: any, b: any) => b._priority.score - a._priority.score);
        }

        return result;
    }, [enhancedCompanies, businessLineFilter, renewalFilter, statusFilter, isSmartSort]);

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
        autoResetPageIndex: false,
        getSortedRowModel: getSortedRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        initialState: {
            pagination: {
                pageSize: 50,
            },
        },
        state: { globalFilter, rowSelection },
    });

    const selectedRows = table.getFilteredSelectedRowModel().rows;

    const handleBulkDelete = async () => {
        if (selectedRows.length === 0) return;
        if (!confirm(t('confirmBulkDelete') || `Are you sure you want to delete ${selectedRows.length} items?`)) return;

        setIsProcessing(true);
        try {
            const ids = selectedRows.map(row => (row.original as any).id);
            const { error } = await supabase.from('companies').delete().in('id', ids);
            if (error) throw error;

            toast({ title: t('bulkDeleted') || "Records deleted successfully" });
            setRowSelection({});
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: t('persistenceError'),
                description: error?.message || String(error)
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkAssign = async (userId: string, userName: string) => {
        if (selectedRows.length === 0) return;
        setIsProcessing(true);
        try {
            const ids = selectedRows.map(row => (row.original as any).id);
            const { error } = await supabase
                .from('companies')
                .update({
                    assigned_user_id: userId,
                    assigned_user_name: userName,
                    updated_at: new Date().toISOString()
                })
                .in('id', ids);
            if (error) throw error;

            toast({ title: t('bulkAssigned') || "Records assigned successfully" });
            setRowSelection({});
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: t('persistenceError'),
                description: error?.message || String(error)
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("space-y-6", isRtl && "font-arabic")}
        >
            <PageHeader 
                title={<span className="font-sans">{t('companies')}</span>} 
                onAction={() => router.push('/companies/new')}
                actionLabel={t('add')}
                ActionIcon={Plus}
            />

            {selectedRows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-indigo-100 p-3 rounded-xl flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-indigo-900">{selectedRows.length} {t('rowsSelected')}</span>
                  <div className="h-4 w-px bg-indigo-200" />
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-red-700 hover:bg-destructive/10 font-bold gap-2" onClick={handleBulkDelete} disabled={isProcessing}>
                    <Trash2 className="w-4 h-4" /> {t('delete')}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-indigo-100 font-bold gap-2" disabled={isProcessing}>
                        <Users className="w-4 h-4" /> {t('assign')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      {users.map((u: any) => (
                        <DropdownMenuItem key={u.id} onClick={() => handleBulkAssign(u.id, u.name)}>
                          {u.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
                  {t('clear')}
                </Button>
              </motion.div>
            )}

            {/* Main Content Area */}
            <Card className="border-none shadow-sm overflow-hidden bg-card">
                <div className="border-b bg-background/50 backdrop-blur-md p-3 flex flex-col xl:flex-row gap-3 items-center justify-between z-10">
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
                            <Select value={renewalFilter} onValueChange={setRenewalFilter}>
                                <SelectTrigger className="w-full md:w-[150px] h-10 bg-card rounded-xl border-border text-xs font-bold text-muted-foreground shadow-sm focus:ring-indigo-500">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <SelectValue placeholder="Renewal Soon" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                    <SelectItem value="all" className="font-bold rounded-lg">All Renewals</SelectItem>
                                    <SelectItem value="soon" className="text-small rounded-lg">Renewal Soon</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[160px] h-10 bg-card rounded-xl border-border text-xs font-bold text-muted-foreground shadow-sm focus:ring-indigo-500">
                                    <div className="flex items-center gap-2">
                                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                                      <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                    <SelectItem value="all" className="font-bold rounded-lg">Status</SelectItem>
                                    <SelectItem value="request_meeting" className="text-small rounded-lg">Request Meeting</SelectItem>
                                    <SelectItem value="request_quotation" className="text-small rounded-lg">Request Quotation</SelectItem>
                                    <SelectItem value="hr_left" className="text-small rounded-lg">HR. Left</SelectItem>
                                    <SelectItem value="waiting_for_data" className="text-small rounded-lg">Waiting for Data</SelectItem>
                                    <SelectItem value="call_back" className="text-small rounded-lg">Call Back</SelectItem>
                                    <SelectItem value="send_profile" className="text-small rounded-lg">Send Profile</SelectItem>
                                    <SelectItem value="renewed" className="text-small rounded-lg">Renewed</SelectItem>
                                    <SelectItem value="not_interested" className="text-small rounded-lg">Not Interested</SelectItem>
                                    <SelectItem value="wrong_number" className="text-small rounded-lg">Wrong Number</SelectItem>
                                    <SelectItem value="no_answer" className="text-small rounded-lg">No Answer</SelectItem>
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
                            <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-border shadow-sm hover:bg-amber-50 group transition-colors" onClick={() => { setGlobalFilter(''); setRenewalFilter('all'); setStatusFilter('all'); setBusinessLineFilter('all'); }}>
                                <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            </Button>
                        </div>
                </div>
                
                <CardContent className="p-0 bg-background/20">
                    {viewMode === 'table' ? (
                        <DataTable 
                            table={table}
                            columns={columns} 
                            isLoading={isLoading}
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            hideSearch={true}
                            onRowClick={(row) => router.push(`/companies/${row.id}`)}
                        />
                    ) : (
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
