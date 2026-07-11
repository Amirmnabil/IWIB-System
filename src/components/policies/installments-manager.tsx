'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { InstallmentService } from '@/services/installment.service';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/shared/status-badge';
import { Installment, Claim, InvoiceNetting } from '@/lib/types';
import { Loader2, Receipt, Search, ChevronsUpDown, Undo2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import FormDialog from '@/components/shared/FormDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/lib/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/data-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { supabase } from '@/lib/supabase';

export default function InstallmentsManager({ policyId }: { policyId: string }) {
  const { data: installments, isLoading: instLoading } = useSupabaseCollection<Installment>('installments', q => q.eq('policy_id', policyId), { filterKey: `installments-${policyId}` });
  const { data: claims, isLoading: claimsLoading } = useSupabaseCollection<Claim>('claims', q => q.eq('policy_id', policyId).eq('status', 'Unsettled'), { filterKey: `claims-unsettled-${policyId}` });
  const { data: nettingHistory, isLoading: nettingLoading } = useSupabaseCollection<InvoiceNetting>('invoice_netting');

  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [isSettling, setIsSettling] = useState(false);

  const [selectedNettingInst, setSelectedNettingInst] = useState<Installment | null>(null);
  const [selectedTargetInsts, setSelectedTargetInsts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNetting, setIsNetting] = useState(false);
  const [isUndoing, setIsUndoing] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSettle = async () => {
    if (!selectedInstallment || selectedClaims.length === 0) return;
    setIsSettling(true);
    try {
      await InstallmentService.settleClaims(selectedInstallment.id, selectedClaims);
      toast({ title: 'Claims settled successfully' });
      setSelectedInstallment(null);
      setSelectedClaims([]);
      queryClient.invalidateQueries({ queryKey: ['supabase', 'installments'] });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'claims'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error settling claims', description: err.message });
    } finally {
      setIsSettling(false);
    }
  };

  const handleNetInvoices = async () => {
    if (!selectedNettingInst || selectedTargetInsts.length === 0) return;
    setIsNetting(true);
    try {
      await InstallmentService.netInvoices(selectedNettingInst.id, selectedTargetInsts);
      toast({ title: 'Invoices netted successfully' });
      setSelectedNettingInst(null);
      setSelectedTargetInsts([]);
      queryClient.invalidateQueries({ queryKey: ['supabase', 'installments'] });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoice_netting'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error netting invoices', description: err.message });
    } finally {
      setIsNetting(false);
    }
  };

  const handleUndoNetting = async (nettingId: string) => {
    setIsUndoing(nettingId);
    try {
      await InstallmentService.reverseNetting(nettingId);
      toast({ title: 'Netting reversed successfully' });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'installments'] });
      queryClient.invalidateQueries({ queryKey: ['supabase', 'invoice_netting'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error reversing netting', description: err.message });
    } finally {
      setIsUndoing(null);
    }
  };

  const setIssueDate = async (installmentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('installments').update({ issue_date: today, status: 'Issued' }).eq('id', installmentId);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to issue', description: error.message });
      return;
    }
    toast({ title: 'Installment issued successfully' });
    queryClient.invalidateQueries({ queryKey: ['supabase', 'installments'] });
  };

  const getNettingHistory = (instId: string) => {
    if (!nettingHistory) return [];
    return nettingHistory.filter(n => n.source_invoice_id === instId || n.target_invoice_id === instId);
  };

  const columns = [
    {
      header: 'Direction',
      accessorKey: 'financial_direction',
      cell: ({ row }: any) => {
        const dir = row.original.financial_direction || 'Debit';
        return <span className={`font-bold ${dir === 'Credit' ? 'text-emerald-500' : 'text-rose-500'}`}>{dir}</span>;
      }
    },
    {
      header: 'Original Amount',
      accessorKey: 'amount',
      cell: ({ row }: any) => <span className="font-medium">EGP {Number(row.original.amount).toLocaleString()}</span>
    },
    {
      header: 'Settled Amount',
      accessorKey: 'settled_amount',
      cell: ({ row }: any) => <span className="font-medium text-muted-foreground">EGP {Number(row.original.settled_amount || 0).toLocaleString()}</span>
    },
    {
      header: 'Remaining Amount',
      id: 'remaining_amount',
      cell: ({ row }: any) => {
        const rem = Number(row.original.remaining_amount ?? row.original.amount);
        return <span className="font-bold text-primary">EGP {rem.toLocaleString()}</span>;
      }
    },
    {
      header: 'Due Date',
      accessorKey: 'due_date',
      cell: ({ row }: any) => format(new Date(row.original.due_date), 'MMM d, yyyy')
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />
    },
    {
      header: 'Netting History',
      id: 'netting_history',
      cell: ({ row }: any) => {
        const history = getNettingHistory(row.original.id);
        if (history.length === 0) return <span className="text-muted-foreground text-xs">-</span>;
        
        return (
          <div className="flex flex-col gap-1 max-w-[250px]">
            {history.map(h => {
              const isSource = h.source_invoice_id === row.original.id;
              return (
                <div key={h.id} className="text-[10px] text-muted-foreground flex items-center justify-between gap-2 p-1 bg-slate-50 rounded">
                  <span className="truncate">
                    {isSource ? 'Applied to ' : 'Received from '} 
                    {isSource ? h.target_invoice_id.substring(0,6) : h.source_invoice_id.substring(0,6)}
                    : <span className="font-bold ml-1">EGP {Number(h.amount).toLocaleString()}</span>
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => handleUndoNetting(h.id)}
                    disabled={isUndoing === h.id}
                    title="Undo Netting"
                  >
                    {isUndoing === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                  </Button>
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const inst = row.original;
        const rem = Number(inst.remaining_amount ?? inst.amount);
        return (
          <div className="flex items-center gap-2">
            {!inst.issue_date && (
              <Button size="sm" variant="outline" onClick={() => setIssueDate(inst.id)}>Set Issue Date</Button>
            )}
            <Button 
              size="sm" 
              variant="default" 
              disabled={inst.status === 'Paid'} 
              onClick={() => setSelectedInstallment(inst)}
            >
              Settle Claims
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              disabled={rem === 0}
              onClick={() => setSelectedNettingInst(inst)}
            >
              Settle with Invoices
            </Button>
          </div>
        );
      }
    }
  ];

  const table = useReactTable({
    data: installments || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Calculate available targets for netting modal
  const availableTargets = selectedNettingInst && installments ? installments.filter(inst => {
    if (inst.id === selectedNettingInst.id) return false;
    const srcDir = selectedNettingInst.financial_direction || 'Debit';
    const tgtDir = inst.financial_direction || 'Debit';
    if (srcDir === tgtDir) return false;
    const rem = Number(inst.remaining_amount ?? inst.amount);
    if (rem <= 0) return false;
    return true;
  }) : [];

  if (instLoading) return <div>Loading installments...</div>;

  return (
    <Card className="mt-6 border-slate-200 shadow-sm overflow-hidden rounded-3xl">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-500" /> Premium Installments
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable table={table} columns={columns} globalFilter={""} setGlobalFilter={() => {}} />
        {installments?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No installments found for this policy.</p>}
      </CardContent>

      {/* Settle Claims Modal (Unchanged) */}
      <FormDialog 
        open={!!selectedInstallment} 
        onOpenChange={(v) => !v && setSelectedInstallment(null)}
        title="Settle Claims"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Select unsettled claims to link to this installment.</p>
          {claimsLoading ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : claims?.length === 0 ? (
            <p className="text-sm">No unsettled claims available.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
              {claims?.map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                  <Checkbox 
                    checked={selectedClaims.includes(c.id)} 
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedClaims([...selectedClaims, c.id]);
                      else setSelectedClaims(selectedClaims.filter(id => id !== c.id));
                    }}
                  />
                  <div className="flex-1 text-sm flex justify-between">
                    <span>{c.claim_number}</span>
                    <span className="font-medium">EGP {c.claim_amount?.toLocaleString() || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSelectedInstallment(null)}>Cancel</Button>
            <Button disabled={isSettling || selectedClaims.length === 0} onClick={handleSettle}>
              {isSettling ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Confirm Settlement
            </Button>
          </div>
        </div>
      </FormDialog>

      {/* Netting Modal */}
      <FormDialog 
        open={!!selectedNettingInst} 
        onOpenChange={(v) => {
          if (!v) {
            setSelectedNettingInst(null);
            setSearchQuery("");
            setSelectedTargetInsts([]);
          }
        }}
        title="Settle with Invoices (Netting)"
      >
        <div className="p-4 space-y-6">
          {selectedNettingInst && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Source Invoice</h4>
              <div className="flex justify-between items-center">
                <div>
                  <span className={`font-bold mr-2 ${selectedNettingInst.financial_direction === 'Credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedNettingInst.financial_direction || 'Debit'}
                  </span>
                  <span className="text-sm font-mono text-slate-500">{selectedNettingInst.id.substring(0, 8)}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Remaining to Settle</div>
                  <div className="font-black text-lg">EGP {Number(selectedNettingInst.remaining_amount ?? selectedNettingInst.amount).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select available invoices (with opposite financial direction) to net against the source invoice.</p>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedTargetInsts.length > 0 ? `${selectedTargetInsts.length} invoice(s) selected` : 'Select invoices...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 focus-visible:ring-0 placeholder:text-muted-foreground"
                    placeholder="Search invoices by ID or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {(() => {
                    const filtered = availableTargets.filter(t => {
                      const text = `${t.id} ${t.amount} ${t.remaining_amount ?? t.amount}`.toLowerCase();
                      return text.includes(searchQuery.toLowerCase());
                    });

                    if (filtered.length === 0) {
                      return <div className="py-6 text-center text-sm text-muted-foreground">No available invoices to net.</div>;
                    }

                    return filtered.map(t => {
                      const dir = t.financial_direction || 'Debit';
                      const rem = Number(t.remaining_amount ?? t.amount);
                      
                      return (
                        <div 
                          key={t.id} 
                          className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer border-b last:border-0"
                          onClick={() => {
                            if (selectedTargetInsts.includes(t.id)) {
                              setSelectedTargetInsts(selectedTargetInsts.filter(id => id !== t.id));
                            } else {
                              setSelectedTargetInsts([...selectedTargetInsts, t.id]);
                            }
                          }}
                        >
                          <Checkbox 
                            checked={selectedTargetInsts.includes(t.id)} 
                            onCheckedChange={() => {}} 
                          />
                          <div className="flex-1 flex justify-between items-center">
                            <div>
                              <span className={`font-bold mr-2 text-[10px] uppercase ${dir === 'Credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {dir}
                              </span>
                              <span className="font-mono text-xs">{t.id.substring(0, 8)}</span>
                            </div>
                            <span className="font-medium text-primary">Rem: EGP {rem.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => { setSelectedNettingInst(null); setSearchQuery(""); setSelectedTargetInsts([]); }}>Cancel</Button>
            <Button disabled={isNetting || selectedTargetInsts.length === 0} onClick={handleNetInvoices} className="bg-indigo-600 hover:bg-indigo-700">
              {isNetting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Confirm Netting
            </Button>
          </div>
        </div>
      </FormDialog>
    </Card>
  );
}
