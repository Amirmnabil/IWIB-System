-- Migration: Live Executive Metrics RPC
-- Purpose: Replace stale materialized view query with live real-time queries for Executive Overview cards.

CREATE OR REPLACE FUNCTION get_dashboard_executive(
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_active_clients bigint;
    v_total_gwp numeric;
    v_claims_paid numeric;
    v_receivables numeric;
    result jsonb;
BEGIN
    -- 1. Active Clients: Count distinct companies linked to policies or total active companies
    SELECT COUNT(DISTINCT client_company_id) 
    INTO v_active_clients
    FROM public.policies
    WHERE client_company_id IS NOT NULL 
      AND (policy_status IS NULL OR LOWER(policy_status) NOT IN ('cancelled', 'expired'));
    
    IF v_active_clients IS NULL OR v_active_clients = 0 THEN
      SELECT COUNT(*) INTO v_active_clients FROM public.companies;
    END IF;

    -- 2. Total Portfolio GWP: Live sum of premium_gross / premium_total / contract_net
    SELECT COALESCE(SUM(GREATEST(COALESCE(premium_gross, 0), COALESCE(premium_total, 0), COALESCE(contract_net, 0))), 0)
    INTO v_total_gwp
    FROM public.policies
    WHERE policy_status IS NULL OR LOWER(policy_status) NOT IN ('cancelled');

    -- 3. Total Claims Paid
    SELECT COALESCE(SUM(COALESCE(paid_amount, claim_amount, net_amount, 0)), 0)
    INTO v_claims_paid
    FROM public.claims
    WHERE LOWER(claim_status) IN ('paid', 'settled', 'approved');

    -- 4. Total Outstanding Receivables: Sum of unpaid invoice amounts or active policy contract net
    SELECT COALESCE(SUM(COALESCE(amount, total_amount, 0)), 0)
    INTO v_receivables
    FROM public.invoices
    WHERE status IS NULL OR LOWER(status) NOT IN ('paid', 'cancelled');

    IF v_receivables IS NULL OR v_receivables = 0 THEN
      SELECT COALESCE(SUM(COALESCE(contract_net, premium_gross, 0)), 0)
      INTO v_receivables
      FROM public.policies
      WHERE policy_status IS NULL OR LOWER(policy_status) NOT IN ('cancelled', 'expired');
    END IF;

    SELECT jsonb_build_object(
        'active_clients', COALESCE(v_active_clients, 0),
        'total_gwp', COALESCE(v_total_gwp, 0),
        'claims_paid', COALESCE(v_claims_paid, 0),
        'receivables', COALESCE(v_receivables, 0)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
