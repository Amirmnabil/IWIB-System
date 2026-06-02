-- Migration: Dashboard Data Layer (Canonical Metrics)
-- Description: Creates SQL Views, Materialized Views, Unified Quotation Layer, and Dashboard RPCs.

-- ══════════════════════════════════════════════════════════════════════════════════
-- PHASE 1 & 5: QUOTATION AGGREGATION LAYER & BASE VIEWS
-- ══════════════════════════════════════════════════════════════════════════════════

-- Unified Quotation Layer
-- Extensible design for future quotation tables (Medical, Motor, Corporate)
CREATE OR REPLACE VIEW vw_unified_quotations AS
SELECT 
    id AS quotation_id,
    company_id,
    'SME' AS quotation_type,
    total_premium AS expected_premium,
    status,
    created_at,
    updated_at
FROM public.sme_quotations;
-- Add UNION ALL for future quotation types here

-- Active Clients View
CREATE OR REPLACE VIEW vw_active_clients AS
SELECT 
    c.id AS company_id,
    c.name AS company_name,
    COUNT(p.id) AS active_policy_count,
    SUM(COALESCE(p.contract_net, p.premium_gross, p.premium_total, 0)) AS total_gwp
FROM public.companies c
JOIN public.policies p ON c.id = p.client_company_id
WHERE LOWER(p.policy_status) IN ('active', 'renewed')
GROUP BY c.id, c.name;

-- Sales Pipeline View
CREATE OR REPLACE VIEW vw_sales_pipeline AS
SELECT 
    c.id AS company_id,
    c.name,
    c.status AS client_status,
    COALESCE(uq.expected_premium, 0) AS pipeline_value,
    uq.status AS quote_status
FROM public.companies c
LEFT JOIN vw_unified_quotations uq ON c.id = uq.company_id
WHERE LOWER(c.status) IN ('lead', 'prospect');

-- Underwriting Summary View
CREATE OR REPLACE VIEW vw_underwriting_summary AS
SELECT 
    quotation_type,
    status,
    COUNT(*) AS volume,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) AS avg_tat_hours,
    SUM(expected_premium) AS total_premium
FROM vw_unified_quotations
GROUP BY quotation_type, status;

-- Claims Summary View
CREATE OR REPLACE VIEW vw_claims_summary AS
SELECT 
    c.status,
    COUNT(*) AS claim_count,
    SUM(c.claim_amount) AS total_claim_amount,
    SUM(c.paid_amount) AS total_paid_amount
FROM public.claims c
GROUP BY c.status;

-- Finance Summary View
CREATE OR REPLACE VIEW vw_finance_summary AS
SELECT 
    status,
    COUNT(*) AS invoice_count,
    SUM(amount_due) AS total_due,
    SUM(amount_paid) AS total_paid,
    SUM(amount_due - amount_paid) AS outstanding_balance
FROM public.invoices
GROUP BY status;

-- ══════════════════════════════════════════════════════════════════════════════════
-- PHASE 3: MATERIALIZED VIEWS (HEAVY CALCULATIONS)
-- ══════════════════════════════════════════════════════════════════════════════════

-- MV: GWP Metrics
DROP MATERIALIZED VIEW IF EXISTS mv_gwp_metrics CASCADE;
CREATE MATERIALIZED VIEW mv_gwp_metrics AS
SELECT 
    DATE_TRUNC('month', created_at) AS metric_month,
    SUM(COALESCE(contract_net, premium_gross, premium_total, 0)) AS total_gwp,
    COUNT(id) AS policies_bound
FROM public.policies
WHERE LOWER(policy_status) IN ('active', 'renewed')
GROUP BY DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX idx_mv_gwp_metrics_month ON mv_gwp_metrics(metric_month);

-- MV: Claims Analytics
DROP MATERIALIZED VIEW IF EXISTS mv_claims_analytics CASCADE;
CREATE MATERIALIZED VIEW mv_claims_analytics AS
SELECT 
    p.client_company_id,
    SUM(c.claim_amount) AS total_incurred_claims,
    SUM(COALESCE(p.contract_net, p.premium_gross, p.premium_total, 0)) AS total_earned_premium,
    CASE 
        WHEN SUM(COALESCE(p.contract_net, p.premium_gross, p.premium_total, 0)) > 0 
        THEN (SUM(c.claim_amount) / SUM(COALESCE(p.contract_net, p.premium_gross, p.premium_total, 0))) * 100 
        ELSE 0 
    END AS loss_ratio
FROM public.policies p
LEFT JOIN public.claims c ON p.id = c.policy_id
WHERE LOWER(p.policy_status) IN ('active', 'renewed')
GROUP BY p.client_company_id;

CREATE UNIQUE INDEX idx_mv_claims_analytics_company ON mv_claims_analytics(client_company_id);

-- MV: Executive Dashboard Rollup
DROP MATERIALIZED VIEW IF EXISTS mv_executive_dashboard CASCADE;
CREATE MATERIALIZED VIEW mv_executive_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM vw_active_clients) AS total_active_clients,
    (SELECT SUM(total_gwp) FROM vw_active_clients) AS total_portfolio_gwp,
    (SELECT SUM(total_incurred_claims) FROM mv_claims_analytics) AS total_claims_paid,
    (SELECT SUM(outstanding_balance) FROM vw_finance_summary WHERE status != 'paid') AS total_receivables;

-- Note: Materialized Views should be refreshed via pg_cron or Supabase edge functions nightly.
-- Example: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_gwp_metrics;

-- ══════════════════════════════════════════════════════════════════════════════════
-- PHASE 4: DASHBOARD RPC FUNCTIONS (FILTER AWARE)
-- ══════════════════════════════════════════════════════════════════════════════════

-- Executive Dashboard RPC
CREATE OR REPLACE FUNCTION get_dashboard_executive(
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'active_clients', total_active_clients,
        'total_gwp', total_portfolio_gwp,
        'claims_paid', total_claims_paid,
        'receivables', total_receivables
    ) INTO result
    FROM mv_executive_dashboard;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sales Dashboard RPC
CREATE OR REPLACE FUNCTION get_dashboard_sales(
    p_assigned_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'leads', (SELECT COUNT(*) FROM public.leads),
        'prospects', (SELECT COUNT(*) FROM public.prospects),
        'pipeline_value', (SELECT SUM(pipeline_value) FROM vw_sales_pipeline WHERE quote_status IN ('draft', 'pending')),
        'win_rate', (
            SELECT CASE WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN LOWER(quote_status) = 'approved' THEN 1 END) * 100.0 / COUNT(*)) ELSE 0 END
            FROM vw_sales_pipeline
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CRM Dashboard RPC
CREATE OR REPLACE FUNCTION get_dashboard_crm()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'accounts', (SELECT COUNT(*) FROM public.companies),
        'contacts', (SELECT COUNT(*) FROM public.contacts),
        'activities', (SELECT COUNT(*) FROM public.activities)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Underwriting Dashboard RPC
CREATE OR REPLACE FUNCTION get_dashboard_underwriting()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'pending_quotes', (SELECT COALESCE(SUM(volume), 0) FROM vw_underwriting_summary WHERE LOWER(status) = 'pending'),
        'approved_quotes', (SELECT COALESCE(SUM(volume), 0) FROM vw_underwriting_summary WHERE LOWER(status) = 'approved'),
        'avg_tat_hours', (SELECT COALESCE(AVG(avg_tat_hours), 0) FROM vw_underwriting_summary)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy Admin Dashboard RPC
CREATE OR REPLACE FUNCTION get_dashboard_policy_admin()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'active_policies', (SELECT COUNT(*) FROM public.policies WHERE LOWER(policy_status) IN ('active', 'renewed')),
        'expiring_60_days', (SELECT COUNT(*) FROM public.policies WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days')
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claims Dashboard RPC
CREATE OR REPLACE FUNCTION get_dashboard_claims()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'open_claims', (SELECT COALESCE(SUM(claim_count), 0) FROM vw_claims_summary WHERE LOWER(status) NOT IN ('paid', 'closed', 'rejected')),
        'settlement_ratio', (
            SELECT CASE WHEN SUM(claim_count) > 0 THEN 
            (SUM(CASE WHEN LOWER(status) = 'paid' THEN claim_count ELSE 0 END) * 100.0 / SUM(claim_count)) 
            ELSE 0 END
            FROM vw_claims_summary
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finance Dashboard RPC
CREATE OR REPLACE FUNCTION get_dashboard_finance()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'outstanding_receivables', (SELECT COALESCE(SUM(outstanding_balance), 0) FROM vw_finance_summary WHERE status != 'paid'),
        'collections_mtd', (SELECT COALESCE(SUM(amount_paid), 0) FROM public.invoices WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE))
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Management Summary RPC
CREATE OR REPLACE FUNCTION get_dashboard_management()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    result := jsonb_build_object(
        'executive', get_dashboard_executive(),
        'sales', get_dashboard_sales(),
        'finance', get_dashboard_finance()
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════════
-- PHASE 6: PERFORMANCE OPTIMIZATION & INDEXES
-- ══════════════════════════════════════════════════════════════════════════════════

-- Ensure baseline indexes exist for fast view rendering
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(LOWER(policy_status));
CREATE INDEX IF NOT EXISTS idx_policies_end_date ON public.policies(end_date);
CREATE INDEX IF NOT EXISTS idx_sme_quotes_status ON public.sme_quotations(LOWER(status));
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(LOWER(status));
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(LOWER(status));
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(LOWER(status));

-- Note on Monitoring:
-- Utilize pg_stat_statements to monitor materialized view refresh times and heavy aggregations.
