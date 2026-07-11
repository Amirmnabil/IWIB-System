import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Users, DollarSign, Percent, AlertCircle, Loader2 } from 'lucide-react';
import { useSupabaseCollection } from '@/lib/hooks/use-supabase-collection';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function BrokerCommissionSharing({ policy, users, editMode, totalCommission, commissionBase }: { policy: any, users: any[], editMode?: boolean, totalCommission?: number, commissionBase?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filterShares = useCallback((q: any) => q.eq('policy_id', policy?.id), [policy?.id]);
  const { data: sharesData, isLoading } = useSupabaseCollection<any>('policy_commission_shares', filterShares, {
    filterKey: `policy_commission_shares-${policy?.id}`
  });
  
  const shares = sharesData || [];

  const [newShare, setNewShare] = useState({
    user_id: '',
    sharing_type: 'percentage',
    sharing_value: '',
    notes: ''
  });
  const [isAdding, setIsAdding] = useState(false);

  // Financials
  const netPremium = commissionBase !== undefined ? commissionBase : (policy?.contract_net || 0);
  const brokerCommissionPercent = policy?.broker_commission_percent || 0;
  const totalBrokerCommission = totalCommission !== undefined ? totalCommission : (netPremium * (brokerCommissionPercent / 100));

  const totalShared = shares.reduce((sum, s) => sum + Number(s.calculated_amount), 0);
  const remainingCommission = totalBrokerCommission - totalShared;

  const handleAdd = async () => {
    if (!newShare.user_id) return toast({ variant: 'destructive', title: 'Select a user' });
    if (!newShare.sharing_value || Number(newShare.sharing_value) <= 0) return toast({ variant: 'destructive', title: 'Enter a valid sharing value' });
    
    if (shares.length >= 3) return toast({ variant: 'destructive', title: 'Maximum 3 commission sharing entries allowed.' });
    if (shares.find(s => s.user_id === newShare.user_id)) return toast({ variant: 'destructive', title: 'User is already added to sharing.' });

    const val = Number(newShare.sharing_value);
    let calcAmount = 0;

    if (newShare.sharing_type === 'percentage') {
      calcAmount = netPremium * (val / 100);
      
      // Validation: Sum of percentages shouldn't exceed broker commission percent
      const currentPercentTotal = shares.filter(s => s.sharing_type === 'percentage').reduce((sum, s) => sum + Number(s.sharing_value), 0);
      if (currentPercentTotal + val > brokerCommissionPercent) {
        return toast({ variant: 'destructive', title: `Total shared percentage cannot exceed brokerage commission (${brokerCommissionPercent}%).` });
      }
    } else {
      calcAmount = val;
    }

    if (calcAmount > remainingCommission) {
      return toast({ variant: 'destructive', title: 'Calculated amount exceeds remaining brokerage commission.' });
    }

    setIsAdding(true);
    const user = users.find(u => u.id === newShare.user_id);
    
    const { error } = await supabase.from('policy_commission_shares').insert({
      policy_id: policy.id,
      user_id: newShare.user_id,
      user_name: user?.name,
      sharing_type: newShare.sharing_type,
      sharing_value: val,
      calculated_amount: calcAmount,
      notes: newShare.notes
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to add share', description: error.message });
    } else {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'policy_commission_shares'] });
      setNewShare({ user_id: '', sharing_type: 'percentage', sharing_value: '', notes: '' });
      toast({ title: 'Commission share added successfully' });
    }
    setIsAdding(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('policy_commission_shares').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to remove', description: error.message });
    } else {
      queryClient.invalidateQueries({ queryKey: ['supabase', 'policy_commission_shares'] });
      toast({ title: 'Share removed' });
    }
  };

  if (!policy) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2A75F3]" /> Broker Commission Sharing
          </h4>
          <p className="text-xs text-muted-foreground mt-1">Distribute policy commission among registered users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-center">
           <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Commission</p>
           <p className="text-xl font-black text-foreground">EGP {totalBrokerCommission.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary/10 border border-indigo-100 flex flex-col justify-center">
           <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Total Shared</p>
           <p className="text-xl font-black text-indigo-700">EGP {totalShared.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-success/10 border border-emerald-100 flex flex-col justify-center">
           <p className="text-xs font-bold text-success uppercase tracking-wider mb-1">Remaining</p>
           <p className="text-xl font-black text-emerald-700">EGP {remainingCommission.toLocaleString()}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-4">
          {shares.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-border rounded-2xl overflow-hidden">
              {shares.map((share) => (
                <div key={share.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-muted-foreground">
                      {share.user_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{share.user_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {share.sharing_type === 'percentage' ? (
                           <><Percent className="w-3 h-3"/> {share.sharing_value}% (of Policy Premium)</>
                        ) : (
                           <><DollarSign className="w-3 h-3"/> Fixed Amount</>
                        )}
                        {share.notes && <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-md truncate max-w-[150px]">{share.notes}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="font-black text-success">EGP {Number(share.calculated_amount).toLocaleString()}</p>
                    </div>
                    {editMode && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(share.id)} className="text-red-400 hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-background rounded-2xl border border-border">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-standard text-muted-foreground">No commission sharing configured.</p>
            </div>
          )}

          {editMode && shares.length < 3 && (
            <div className="p-4 border border-border rounded-2xl bg-card shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold text-muted-foreground">User</Label>
                  <Select value={newShare.user_id} onValueChange={(v) => setNewShare({ ...newShare, user_id: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select User" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Type</Label>
                  <Select value={newShare.sharing_type} onValueChange={(v) => setNewShare({ ...newShare, sharing_type: v, sharing_value: '' })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Value</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={newShare.sharing_value} 
                      onChange={(e) => setNewShare({ ...newShare, sharing_value: e.target.value })}
                      className="h-10 pl-8" 
                      placeholder="0"
                    />
                    <div className="absolute left-3 top-3 text-slate-400">
                      {newShare.sharing_type === 'percentage' ? <Percent className="w-4 h-4"/> : <DollarSign className="w-4 h-4"/>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</Label>
                  <Input 
                    value={newShare.notes} 
                    onChange={(e) => setNewShare({ ...newShare, notes: e.target.value })}
                    className="h-10" 
                    placeholder="E.g., Referral split"
                  />
                </div>
                <Button onClick={handleAdd} disabled={isAdding} className="h-10 bg-[#2A75F3] hover:bg-blue-700 text-white gap-2">
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />} Add Share
                </Button>
              </div>

              {/* Live Calculation Preview */}
              {newShare.sharing_value && Number(newShare.sharing_value) > 0 && (
                <div className="p-3 bg-background rounded-xl text-sm flex items-center justify-between border border-border">
                   <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="w-4 h-4 text-[#2A75F3]"/>
                      Calculated Commission Share:
                   </div>
                   <div className="font-bold text-success">
                      EGP {(newShare.sharing_type === 'percentage' 
                        ? netPremium * (Number(newShare.sharing_value) / 100) 
                        : Number(newShare.sharing_value)
                      ).toLocaleString()}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
