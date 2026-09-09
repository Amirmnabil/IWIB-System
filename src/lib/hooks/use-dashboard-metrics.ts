import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useDashboardMetrics(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async (isSilent = false) => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    if (!isSilent) setIsLoading(true);

    try {
      // 1. Always execute live real-time direct table queries across core tables
      const [
        { data: policiesRes, error: polErr },
        { data: companiesRes, error: compErr },
        { data: claimsRes, error: clmErr },
        { data: invoicesRes, error: invErr }
      ] = await Promise.all([
        supabase.from('policies').select('id, client_company_id, premium_gross, premium_total, contract_net, policy_status'),
        supabase.from('companies').select('id, name, status'),
        supabase.from('claims').select('id, claim_amount, paid_amount, claim_status'),
        supabase.from('invoices').select('id, amount, total_amount, status')
      ]);

      if (polErr) console.warn("Policies query notice:", polErr);
      if (compErr) console.warn("Companies query notice:", compErr);
      if (clmErr) console.warn("Claims query notice:", clmErr);
      if (invErr) console.warn("Invoices query notice:", invErr);

      const livePolicies = policiesRes || [];
      const liveCompanies = companiesRes || [];
      const liveClaims = claimsRes || [];
      const liveInvoices = invoicesRes || [];

      // 2. Safely attempt backend RPC if available (do not throw if missing)
      let rpcData: any = null;
      try {
        const { data: rpcRes, error: rpcError } = await supabase.rpc('get_dashboard_all_metrics');
        if (!rpcError && rpcRes) {
          rpcData = rpcRes;
        }
      } catch (e) {
        // RPC missing or uninitialized; fall back gracefully to direct table metrics
      }

      // 3. Active Clients: Count distinct companies with valid/active policies or active status, fallback to total companies
      const activeClientIds = new Set(
        livePolicies
          .filter((p: any) => p.client_company_id && (!p.policy_status || !['cancelled', 'expired'].includes(p.policy_status.toLowerCase())))
          .map((p: any) => p.client_company_id)
      );
      const liveActiveClients = activeClientIds.size > 0 ? activeClientIds.size : liveCompanies.length;

      // 4. Portfolio GWP: Live sum of premiums across active policies
      const liveTotalGwp = livePolicies
        .filter((p: any) => !p.policy_status || p.policy_status.toLowerCase() !== 'cancelled')
        .reduce((sum: number, p: any) => {
          const val = Math.max(Number(p.premium_gross || 0), Number(p.premium_total || 0), Number(p.contract_net || 0));
          return sum + val;
        }, 0);

      // 5. Claims Paid: Sum of paid/approved claims
      const liveClaimsPaid = liveClaims
        .filter((c: any) => !c.claim_status || ['paid', 'settled', 'approved', 'completed'].includes((c.claim_status || '').toLowerCase()))
        .reduce((sum: number, c: any) => sum + (Number(c.paid_amount || c.claim_amount || 0)), 0);

      // 6. Outstanding Receivables: Sum of unpaid invoice amounts or contract net
      const unpaidInvoices = liveInvoices.filter((inv: any) => !inv.status || inv.status.toLowerCase() !== 'paid');
      let liveReceivables = unpaidInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.amount || inv.total_amount || 0)), 0);
      if (liveReceivables === 0 && livePolicies.length > 0) {
        liveReceivables = livePolicies
          .filter((p: any) => !p.policy_status || !['cancelled', 'expired'].includes(p.policy_status.toLowerCase()))
          .reduce((sum: number, p: any) => sum + Number(p.contract_net || p.premium_gross || 0), 0);
      }

      const rpcExec = rpcData?.executive || {};
      const finalExecutiveMetrics = {
        active_clients: liveActiveClients || rpcExec.active_clients || 0,
        total_gwp: liveTotalGwp || rpcExec.total_gwp || 0,
        claims_paid: liveClaimsPaid || rpcExec.claims_paid || 0,
        receivables: liveReceivables || rpcExec.receivables || 0
      };

      setMetrics({
        raw: { policies: livePolicies, claims: liveClaims, companies: liveCompanies },
        global: {
          totalWrittenPremium: liveTotalGwp || rpcData?.global?.totalWrittenPremium || 0,
          totalClaimsPaid: liveClaimsPaid || rpcData?.global?.totalClaimsPaid || 0,
          overallLossRatio: rpcData?.global?.overallLossRatio || 0,
          combinedRatio: rpcData?.global?.combinedRatio || 0,
          activePolicyCount: livePolicies.length || rpcData?.global?.activePolicyCount || 0,
        },
        modules: {
          crm: rpcData?.crm || {},
          sales: rpcData?.sales || {},
          underwriting: rpcData?.underwriting || {},
          policy_admin: rpcData?.policy_admin || {},
          claims: rpcData?.claims || {},
          finance: rpcData?.finance || {},
          master_data: rpcData?.master_data || {},
          ceo: rpcData?.ceo || {},
          executive: finalExecutiveMetrics
        }
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Dashboard metrics fetch error:", err);
      setError(err?.message || "Failed to load dashboard metrics");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchMetrics();

    // Continuous polling interval every 5 seconds for automatic sync
    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 5000);

    // Auto-refresh metrics whenever user refocuses the browser window or tab
    const handleFocus = () => {
      fetchMetrics(true);
    };

    window.addEventListener('focus', handleFocus);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMetrics(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Realtime channel subscription to ensure instant updates when underlying records change
    const channel = supabase
      .channel('schema-db-changes-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'policies' }, () => fetchMetrics(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => fetchMetrics(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => fetchMetrics(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchMetrics(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchMetrics(true))
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refetch: () => fetchMetrics(false), lastUpdated };
}

