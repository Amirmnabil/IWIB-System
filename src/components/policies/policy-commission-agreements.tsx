import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Briefcase, Loader2, Save } from 'lucide-react';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const initialAgreementState = {
  id: '',
  productType: '',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'Active',
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

  const handleSave = async () => {
    if (!form.productType || !form.effectiveFrom || !form.effectiveTo) {
      return toast({ variant: 'destructive', title: 'Please fill required fields.' });
    }
    
    setIsSaving(true);
    const payload = {
      policy_id: policy.id,
      insurer_id: policy.insurer_id,
      productType: form.productType,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo,
      status: form.status,
      commissionStructure: form.commissionStructure,
      tpaFee: form.tpaFee
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-500" /> Commission Agreements
          </h4>
          <p className="text-xs text-slate-500 mt-1">Manage broker commission from the insurer and TPA deductions.</p>
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
              agreements.map((agreement: any) => (
                <Card key={agreement.id} className="border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-slate-50/50 border-b py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-900 flex items-center justify-center text-white">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-indigo-900">{agreement.productType || "Policy"} Agreement</CardTitle>
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-0.5">
                            Effective: {safeFormatDate(agreement.effectiveFrom)} - {safeFormatDate(agreement.effectiveTo)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setForm(agreement); setIsEditing(true); }} className="h-9 font-bold px-4 rounded-lg">Edit</Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(agreement.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase text-slate-400">Essential</p>
                        <p className="text-lg font-bold text-slate-900">{((agreement.commissionStructure?.essential?.rate || 0) * 100).toFixed(1)}%</p>
                      </div>
                      {agreement.commissionStructure?.supplementary && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-400">Supplementary</p>
                          <p className="text-lg font-bold text-indigo-600">{((agreement.commissionStructure.supplementary.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.commissionStructure?.motivational && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-400">Motivational</p>
                          <p className="text-lg font-bold text-amber-600">{((agreement.commissionStructure.motivational.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.commissionStructure?.retentionIncentive && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-400">Retention</p>
                          <p className="text-lg font-bold text-emerald-600">{((agreement.commissionStructure.retentionIncentive.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.commissionStructure?.volumeBonus && (
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-slate-400">Vol. Bonus</p>
                          <p className="text-lg font-bold text-blue-600">{((agreement.commissionStructure.volumeBonus.rate || 0) * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {agreement.tpaFee && (
                        <div className="space-y-1 pl-4 border-l border-slate-100">
                          <p className="text-xs font-bold uppercase text-slate-400">TPA Fee</p>
                          <p className="text-lg font-bold text-purple-600">
                            {agreement.tpaFee.type === 'percentage' ? `${agreement.tpaFee.value}%` : `EGP ${agreement.tpaFee.value}`}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 capitalize">Deducted from {agreement.tpaFee.deductedFrom}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">No commission agreements found for this policy.</p>
              </div>
            )
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Insurance Line</Label>
                  <Select value={form.productType} onValueChange={v => setForm({ ...form, productType: v })}>
                    <SelectTrigger className="h-12 bg-white rounded-xl"><SelectValue placeholder="Medical" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medical">Medical</SelectItem>
                      <SelectItem value="Life">Life</SelectItem>
                      <SelectItem value="Motor">Motor</SelectItem>
                      <SelectItem value="Property">Property</SelectItem>
                      <SelectItem value="Liability">Liability</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Effective From</Label>
                  <Input type="date" value={form.effectiveFrom ? form.effectiveFrom.substring(0,10) : ''} onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} className="h-12 bg-white rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Expiry Date</Label>
                  <Input type="date" value={form.effectiveTo ? form.effectiveTo.substring(0,10) : ''} onChange={e => setForm({ ...form, effectiveTo: e.target.value })} className="h-12 bg-white rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-12 bg-white rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4">
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
                      "rounded-xl transition-all bg-white",
                      isActive 
                        ? "border border-indigo-900 border-l-4 shadow-sm" 
                        : "border border-slate-200"
                    )}>
                      <div className={cn("flex justify-between items-center p-4", isActive && "pb-2")}>
                        <h5 className="text-sm font-bold text-slate-900 tracking-wide">
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
                            <label htmlFor={`enable-${key}`} className="text-sm font-medium text-slate-800 cursor-pointer">Enable</label>
                          </div>
                        )}
                      </div>

                      {isActive && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 pt-0">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-800">Rate (e.g. 0.15)</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              value={form.commissionStructure[key].rate || ''} 
                              onChange={e => updateCommission(key, 'rate', Number(e.target.value))} 
                              className="h-12 w-full rounded-xl" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-800">Calculation Base</Label>
                            <Select value={form.commissionStructure[key].calculationBase} onValueChange={v => updateCommission(key, 'calculationBase', v)}>
                              <SelectTrigger className="h-12 bg-white w-full rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Gross Premium">Gross Premium</SelectItem>
                                <SelectItem value="Net Premium">Net Premium</SelectItem>
                                <SelectItem value="Collected Premium">Collected Premium</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-800">Payment Frequency</Label>
                            <Select value={form.commissionStructure[key].paymentFrequency} onValueChange={v => updateCommission(key, 'paymentFrequency', v)}>
                              <SelectTrigger className="h-12 bg-white w-full rounded-xl"><SelectValue /></SelectTrigger>
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

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h5 className="text-sm font-bold text-slate-800">TPA Fee Deduction</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">Fee Type</Label>
                    <Select value={form.tpaFee?.type || 'percentage'} onValueChange={v => setForm({ ...form, tpaFee: { ...form.tpaFee, type: v } })}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="amount">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">Value</Label>
                    <Input type="number" value={form.tpaFee?.value || 0} onChange={e => setForm({ ...form, tpaFee: { ...form.tpaFee, value: Number(e.target.value) } })} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">Deducted From</Label>
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

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
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
