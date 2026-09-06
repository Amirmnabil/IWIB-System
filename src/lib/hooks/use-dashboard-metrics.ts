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
      // Execute the unified backend calculation
      // All SUM, COUNT, and date filters happen directly in PostgreSQL via RPC
      const { data, error: rpcError } = await supabase.rpc('get_dashboard_all_metrics');
      
      if (rpcError) throw rpcError;
            // Map the backend JSON structure to the unified frontend format
        if (data) {
          // Perform live real-time query aggregation across core tables to ensure 100% precision
          const [
            { data: policiesRes },
            { data: companiesRes },
            { data: claimsRes },
            { data: invoicesRes }
          ] = await Promise.all([
            supabase.from('policies').select('id, client_company_id, premium_gross, premium_total, contract_net, policy_status'),
            supabase.from('companies').select('id'),
            supabase.from('claims').select('claim_amount, paid_amount, net_amount, claim_status'),
            supabase.from('invoices').select('amount, total_amount, status')
          ]);

          const livePolicies = policiesRes || [];
          const liveCompanies = companiesRes || [];
          const liveClaims = claimsRes || [];
          const liveInvoices = invoicesRes || [];

          // 1. Active Clients: Count distinct companies with active/valid policies, fallback to total companies
          const activeClientIds = new Set(
            livePolicies
              .filter((p: any) => p.client_company_id && (!p.policy_status || !['cancelled', 'expired'].includes(p.policy_status.toLowerCase())))
              .map((p: any) => p.client_company_id)
          );
          const liveActiveClients = activeClientIds.size > 0 ? activeClientIds.size : liveCompanies.length;

          // 2. Portfolio GWP: Live sum of premiums across active policies
          const liveTotalGwp = livePolicies
            .filter((p: any) => !p.policy_status || p.policy_status.toLowerCase() !== 'cancelled')
            .reduce((sum: number, p: any) => {
              const val = Math.max(Number(p.premium_gross || 0), Number(p.premium_total || 0), Number(p.contract_net || 0));
              return sum + val;
            }, 0);

          // 3. Claims Paid: Sum of paid/approved claims
          const liveClaimsPaid = liveClaims
            .filter((c: any) => c.claim_status && ['paid', 'settled', 'approved'].includes(c.claim_status.toLowerCase()))
            .reduce((sum: number, c: any) => sum + (Number(c.paid_amount || c.claim_amount || c.net_amount || 0)), 0);

          // 4. Outstanding Receivables: Sum of unpaid invoice amounts or contract net
          const unpaidInvoices = liveInvoices.filter((inv: any) => !inv.status || inv.status.toLowerCase() !== 'paid');
          let liveReceivables = unpaidInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.amount || inv.total_amount || 0)), 0);
          if (liveReceivables === 0) {
            liveReceivables = livePolicies
              .filter((p: any) => !p.policy_status || !['cancelled', 'expired'].includes(p.policy_status.toLowerCase()))
              .reduce((sum: number, p: any) => sum + Number(p.contract_net || p.premium_gross || 0), 0);
          }

          const rpcExec = data?.executive || {};
          const finalExecutiveMetrics = {
            active_clients: liveActiveClients || rpcExec.active_clients || 0,
            total_gwp: liveTotalGwp || rpcExec.total_gwp || 0,
            claims_paid: liveClaimsPaid || rpcExec.claims_paid || 0,
            receivables: liveReceivables || rpcExec.receivables || 0
          };

          setMetrics({
            raw: { policies: [], claims: [], companies: [] },
            global: {
              totalWrittenPremium: liveTotalGwp || data.global?.totalWrittenPremium || 0,
              totalClaimsPaid: liveClaimsPaid || data.global?.totalClaimsPaid || 0,
              overallLossRatio: data.global?.overallLossRatio || 0,
              combinedRatio: data.global?.combinedRatio || 0,
              activePolicyCount: livePolicies.length || data.global?.activePolicyCount || 0,
            },
            modules: {
              crm: data.crm || {},
              sales: data.sales || {},
              underwriting: data.underwriting || {},
              policy_admin: data.policy_admin || {},
              claims: data.claims || {},
              finance: data.finance || {},
              master_data: data.master_data || {},
              ceo: data.ceo || {},
              executive: finalExecutiveMetrics
            }
          });
          setLastUpdated(new Date());
          setError(null);
        }
    } catch (err: any) {
      console.error("Dashboard API Error: ", err);
      console.error("Detailed Error:", { name: err?.name, message: err?.message, stack: err?.stack, stringified: JSON.stringify(err) });
      const errorMessage = err?.message || err?.details || JSON.stringify(err);
      
      if (err?.code === 'PGRST202' || errorMessage === '{}') {
         setError("CRITICAL: The backend SQL migration '20260530000003_dashboard_api.sql' has not been executed on your Supabase database. Please run the SQL file in your Supabase SQL Editor to initialize the dashboard API.");
      } else {
         setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchMetrics();

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
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refetch: () => fetchMetrics(false), lastUpdated };
}

