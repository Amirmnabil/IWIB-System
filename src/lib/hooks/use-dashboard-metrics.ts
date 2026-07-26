import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useDashboardMetrics(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    async function fetchMetrics() {
      setIsLoading(true);
      try {
        // Execute the unified backend calculation
        // All SUM, COUNT, and date filters happen directly in PostgreSQL via RPC
        const { data, error: rpcError } = await supabase.rpc('get_dashboard_all_metrics');
        
        if (rpcError) throw rpcError;
        
        // Map the backend JSON structure to the unified frontend format
        if (data) {
          setMetrics({
            raw: { policies: [], claims: [], companies: [] }, // Raw arrays removed for performance; only aggregations are passed
            global: {
              totalWrittenPremium: data.global.totalWrittenPremium,
              totalClaimsPaid: data.global.totalClaimsPaid,
              overallLossRatio: data.global.overallLossRatio,
              combinedRatio: data.global.combinedRatio,
              activePolicyCount: data.global.activePolicyCount,
            },
            modules: {
              crm: data.crm,
              sales: data.sales,
              underwriting: data.underwriting,
              policy_admin: data.policy_admin,
              claims: data.claims,
              finance: data.finance,
              master_data: data.master_data,
              ceo: data.ceo,
              executive: data.executive
            }
          });
        }
      } catch (err: any) {
        console.error("Dashboard API Error: ", err);
        console.error("Detailed Error:", { name: err?.name, message: err?.message, stack: err?.stack, stringified: JSON.stringify(err) });
        const errorMessage = err?.message || err?.details || JSON.stringify(err);
        
        // Custom message if the RPC function is missing
        if (err?.code === 'PGRST202' || errorMessage === '{}') {
           setError("CRITICAL: The backend SQL migration '20260530000003_dashboard_api.sql' has not been executed on your Supabase database. Please run the SQL file in your Supabase SQL Editor to initialize the dashboard API.");
        } else {
           setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [enabled]);

  return { metrics, isLoading, error };
}
