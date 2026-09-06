import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Briefcase, Loader2, Save, DollarSign, Calculator, Percent, ShieldCheck } from 'lucide-react';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const initialAgreementState = {
  id: '',
  commissionStructure: {
    essential: { rate: 0.15, calculationBase: 'Gross Premium', paymentFrequency: 'Monthly' },
    supplementary: null,
    motivational: null,
    retentionIncentive: null,
    volumeBonus: null,
  },
  tpaFee: {
    type: 'percentage',
    value: 0,
    deductedFrom: 'gross'
  }
};

export default function PolicyCommissionAgreements({ policy }: { policy: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filterAgreements = useCallback((q: any) => q.eq('policy_id', policy?.id), [policy?.id]);
  const { data: agreementsData, isLoading } = useSupabaseCollection<any>('commission_agreements', filterAgreements, {
    filterKey: `commission_agreements-${policy?.id}`
  });
  
  const agreements = agreementsData || [];

  const [form, setForm] = useState<any>(initialAgreementState);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const safeFormatDate = (d: any) => {
    if (!d) return '-';
    try {
      return format(new Date(d), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  // Financial & Commission Calculations Central Engine
  const financialSummary = useMemo(() => {
    const grossPremium = Number(policy?.premium_gross || policy?.premium_total || 0);
    const netPremium = Number(policy?.contract_net || 0);

    let totalEssentialCommission = 0;
    let totalSupplementaryCommission = 0;
    let totalMotivationalCommission = 0;
    let totalRetentionCommission = 0;
    let totalVolumeBonus = 0;
    let totalTpaDeductions = 0;

    agreements.forEach((rawAgreement: any) => {
      const commStruct = rawAgreement.commission_structure || rawAgreement.commissionStructure || {};
      const tpa = rawAgreement.tpa_fee || rawAgreement.tpaFee || {};

      const calculateStructureAmount = (item: any) => {
        if (!item || item.rate === undefined || item.rate === null) return 0;
        const baseAmount = item.calculationBase === 'Net Premium' ? netPremium : grossPremium;
        return Number(item.rate) * baseAmount;
      };

      totalEssentialCommission += calculateStructureAmount(commStruct.essential);
      totalSupplementaryCommission += calculateStructureAmount(commStruct.supplementary);
      totalMotivationalCommission += calculateStructureAmount(commStruct.motivational);
      totalRetentionCommission += calculateStructureAmount(commStruct.retentionIncentive);
      totalVolumeBonus += calculateStructureAmount(commStruct.volumeBonus);

      if (tpa && tpa.value) {
        if (tpa.type === 'percentage') {
          const tpaBase = tpa.deductedFrom === 'net' ? netPremium : grossPremium;
          totalTpaDeductions += (Number(tpa.value) / 100) * tpaBase;
        } else {
          totalTpaDeductions += Number(tpa.value);
        }
      }
    });

    const totalGrossCommission = totalEssentialCommission + totalSupplementaryCommission + totalMotivationalCommission + totalRetentionCommission + totalVolumeBonus;
    const netCommissionPayable = Math.max(0, totalGrossCommission - totalTpaDeductions);
    const effectiveCommissionRate = grossPremium > 0 ? (totalGrossCommission / grossPremium) * 100 : 0;

    return {
      grossPremium,
      netPremium,
      totalEssentialCommission,
      totalSupplementaryCommission,
      totalMotivationalCommission,
      totalRetentionCommission,
      totalVolumeBonus,
      totalGrossCommission,
      totalTpaDeductions,
      netCommissionPayable,
      effectiveCommissionRate
    };
  }, [policy, agreements]);

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      policy_id: policy.id,
      insurer_id: policy.insurer_id,
      product_type: policy.policy_type || 'medical',
      effective_from: policy.start_date || new Date().toISOString(),
      effective_to: policy.end_date || new Date().toISOString(),
      status: policy.policy_status || 'active',
      commission_structure: form.commissionStructure,
      tpa_fee: form.tpaFee,
      rate_percent: form.commissionStructure?.essential?.rate || 0
    };

    let res;
    if (form.id) {
      res = await supabase.from('commission_agreements').update(payload).eq('id', form.id);
    } else {
      res = await supabase.from('commission_agreements').insert([payload]);
    }

    if (res.error) {
      toast({ variant: 'destructive', title: 'Failed to save agreement', description: res.error.message });
    } else {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'commission_agreements'] });
      setIsEditing(false);
      setForm(initialAgreementState);
      toast({ title: 'Commission agreement saved successfully' });
    }
    setIsSaving(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('commission_agreements').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to delete', description: error.message });
    } else {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'commission_agreements'] });
      toast({ title: 'Agreement removed' });
    }
  };

  const updateCommission = (key: string, field: string, value: any) => {
    setForm((prev: any) => {
      const obj = prev.commissionStructure[key] || { rate: 0, calculationBase: 'Gross Premium', paymentFrequency: 'Monthly' };
      return {
        ...prev,
        commissionStructure: {
          ...prev.commissionStructure,
          [key]: { ...obj, [field]: value }
        }
      };
    });
  };

  if (!policy) return null;

  return (
    <div className="space-y-6">
      {/* Commission Financial Engine Dashboard Widget */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Broker Commission</p>
              <p className="text-xl font-black text-indigo-950">EGP {financialSummary.totalGrossCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">{financialSummary.effectiveCommissionRate.toFixed(2)}% Effective Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TPA Fee Deductions</p>
              <p className="text-xl font-black text-purple-950">EGP {financialSummary.totalTpaDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Deducted from Premium</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Payable Commission</p>
              <p className="text-xl font-black text-emerald-950">EGP {financialSummary.netCommissionPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Net Broker Revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-slate-50/50 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Agreements Count</p>
              <p className="text-xl font-black text-slate-900">{agreements.length} Active</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Policy Base Premium: EGP {financialSummary.grossPremium.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div>
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-500" /> Commission Agreements
          </h4>
          <p className="text-xs text-muted-foreground mt-1">Manage broker commission structures & TPA deductions for this policy.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => { setForm(initialAgreementState); setIsEditing(true); }} className="h-9 text-xs bg-indigo-900 font-bold px-4 rounded-lg">
            <Plus className="w-4 h-4 mr-2" /> New Agreement
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-4">
          {!isEditing ? (
            agreements.length > 0 ? (
              agreements.map((rawAgreement: any) => {
                const agreement = {
                  ...rawAgreement,
                  productType: rawAgreement.product_type || rawAgreement.productType || policy.policy_type,
                  effectiveFrom: rawAgreement.effective_from || rawAgreement.effectiveFrom || policy.start_date,
                  effectiveTo: rawAgreement.effective_to || rawAgreement.effectiveTo || policy.end_date,
                  commissionStructure: rawAgreement.commission_structure || rawAgreement.commissionStructure,
                  tpaFee: rawAgreement.tpa_fee || rawAgreement.tpaFee
                };
                
                return (
                <Card key={agreement.id} className="border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-background/50 border-b py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-900 flex items-center justify-center text-white">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-indigo-900">{agreement.productType || policy.policy_type || "Policy"} Agreement</CardTitle>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">
                            Effective: {safeFormatDate(agreement.effectiveFrom)} - {safeFormatDate(agreement.effectiveTo)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setForm(agreement); setIsEditing(true); }} className="h-9 font-bold px-4 rounded-lg">Edit</Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(agreement.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase text-slate-600">Essential</p>
                        <p className="text-lg font-bold text-foreground">{((agreement.commissionStructure?.essential?.rate || 0) * 100).toFixed(1)}%</p>
                      </div>
                      {agreement.commissionStructure?.supplementary && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-600">Supplementary</p>
                          <p className="text-lg font-bold text-primary">{((agreement.commissionStructure.supplementary.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.commissionStructure?.motivational && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-600">Motivational</p>
                          <p className="text-lg font-bold text-amber-600">{((agreement.commissionStructure.motivational.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.commissionStructure?.retentionIncentive && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-600">Retention</p>
                          <p className="text-lg font-bold text-success">{((agreement.commissionStructure.retentionIncentive.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.commissionStructure?.volumeBonus && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-600">Vol. Bonus</p>
                          <p className="text-lg font-bold text-primary">{((agreement.commissionStructure.volumeBonus.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.tpaFee && (
                        <div className="space-y-1 pl-4 border-l border-border">
                          <p className="text-xs font-bold uppercase text-slate-600">TPA Fee</p>
                          <p className="text-lg font-bold text-purple-600">
                            {agreement.tpaFee.type === 'percentage' ? `${agreement.tpaFee.value}%` : `EGP ${agreement.tpaFee.value}`}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 capitalize">Deducted from {agreement.tpaFee.deductedFrom}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )})
            ) : (
              <div className="p-8 text-center bg-background rounded-2xl border border-border">
                <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-standard text-muted-foreground">No commission agreements found for this policy.</p>
              </div>
            )
          ) : (
            <div className="p-6 rounded-2xl bg-background space-y-6">
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-900 uppercase">Policy Linked Parameters</p>
                  <p className="text-sm font-semibold text-indigo-950 mt-0.5">
                    Line of Business: <span className="capitalize">{policy.policy_type}</span> • Effective: {safeFormatDate(policy.start_date)} to {safeFormatDate(policy.end_date)}
                  </p>
                </div>
                <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-white capitalize">{policy.policy_status || 'Active'}</Badge>
              </div>

              <div className="space-y-4 pt-2">
                {['essential', 'supplementary', 'motivational', 'retentionIncentive', 'volumeBonus'].map((key) => {
                  const isActive = form.commissionStructure[key] !== null;
                  const isEssential = key === 'essential';
                  
                  const commissionNames: Record<string, string> = {
                    essential: "1. ESSENTIAL COMMISSION (MANDATORY)",
                    supplementary: "2. SUPPLEMENTARY COMMISSION",
                    motivational: "3. MOTIVATIONAL INCENTIVE",
                    retentionIncentive: "4. RETENTION INCENTIVE",
                    volumeBonus: "5. VOLUME BONUS"
                  };
                  
                  return (
                    <div key={key} className={cn(
                      "rounded-xl transition-all bg-card",
                      isActive 
                        ? "border border-indigo-900 border-l-4 shadow-sm" 
                        : "border border-border"
                    )}>
                      <div className={cn("flex justify-between items-center p-4", isActive && "pb-2")}>
                        <h5 className="text-sm font-bold text-foreground tracking-wide">
                          {commissionNames[key]}
                        </h5>
                        {!isEssential && (
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id={`enable-${key}`}
                              checked={isActive} 
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateCommission(key, 'rate', 0.10);
                                } else {
                                  setForm((prev: any) => ({...prev, commissionStructure: {...prev.commissionStructure, [key]: null}}));
                                }
                              }} 
                            />
                            <label htmlFor={`enable-${key}`} className="text-standard text-foreground cursor-pointer">Enable</label>
                          </div>
                        )}
                      </div>

                      {isActive && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 pt-0">
                          <div className="space-y-2">
                            <Label className="text-sm text-foreground">Rate (%)</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              value={form.commissionStructure[key].rate !== null && form.commissionStructure[key].rate !== undefined ? Number((form.commissionStructure[key].rate * 100).toFixed(4)) : ''} 
                              onChange={e => updateCommission(key, 'rate', e.target.value === '' ? 0 : Number(e.target.value) / 100)} 
                              className="h-12 w-full rounded-xl" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-foreground">Calculation Base</Label>
                            <Select value={form.commissionStructure[key].calculationBase} onValueChange={v => updateCommission(key, 'calculationBase', v)}>
                              <SelectTrigger className="h-12 bg-card w-full rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Gross Premium">Gross Premium</SelectItem>
                                <SelectItem value="Net Premium">Net Premium</SelectItem>
                                <SelectItem value="Collected Premium">Collected Premium</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-foreground">Payment Frequency</Label>
                            <Select value={form.commissionStructure[key].paymentFrequency} onValueChange={v => updateCommission(key, 'paymentFrequency', v)}>
                              <SelectTrigger className="h-12 bg-card w-full rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                                <SelectItem value="Annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h5 className="text-sm font-bold text-foreground">TPA Fee Deduction</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Fee Type</Label>
                    <Select value={form.tpaFee?.type || 'percentage'} onValueChange={v => setForm({ ...form, tpaFee: { ...form.tpaFee, type: v } })}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="amount">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Value</Label>
                    <Input type="number" value={form.tpaFee?.value || 0} onChange={e => setForm({ ...form, tpaFee: { ...form.tpaFee, value: Number(e.target.value) } })} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Deducted From</Label>
                    <Select value={form.tpaFee?.deductedFrom || 'gross'} onValueChange={v => setForm({ ...form, tpaFee: { ...form.tpaFee, deductedFrom: v } })}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gross">Gross Premium</SelectItem>
                        <SelectItem value="net">Net Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-900 text-white">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Agreement
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
