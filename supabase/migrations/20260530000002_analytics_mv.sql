-- Phase 1: Analytics Materialized Views

-- 1. Client Profitability Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS client_profitability_mv AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    COUNT(p.id) AS total_policies,
    SUM(p.premium_total) AS total_written_premium,
    COALESCE(SUM(cl.claim_amount), 0) AS total_claims_paid,
    CASE 
        WHEN SUM(p.premium_total) > 0 
        THEN (COALESCE(SUM(cl.claim_amount), 0) / SUM(p.premium_total)) * 100 
        ELSE 0 
    END AS loss_ratio,
    COUNT(DISTINCT p.policy_type) AS distinct_lines_held
FROM companies c
LEFT JOIN policies p ON c.id = p.client_company_id AND p.policy_status = 'active'
LEFT JOIN claims cl ON p.id = cl.policy_id AND cl.status = 'paid'
GROUP BY c.id, c.name;

-- Create Indexes for fast querying
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_prof_id ON client_profitability_mv (client_id);
CREATE INDEX IF NOT EXISTS idx_client_prof_loss_ratio ON client_profitability_mv (loss_ratio);

-- 2. Line of Business (LOB) KPI Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS lob_kpi_mv AS
SELECT 
    p.policy_type AS line_of_business,
    COUNT(p.id) AS active_policies,
    SUM(p.premium_total) AS earned_premium,
    COALESCE(SUM(cl.claim_amount), 0) AS claims_paid,
    CASE 
        WHEN SUM(p.premium_total) > 0 
        THEN (COALESCE(SUM(cl.claim_amount), 0) / SUM(p.premium_total)) * 100 
        ELSE 0 
    END AS loss_ratio,
    COUNT(cl.id) AS total_claims_count
FROM policies p
LEFT JOIN claims cl ON p.id = cl.policy_id AND cl.status IN ('paid', 'approved')
WHERE p.policy_status = 'active'
GROUP BY p.policy_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lob_kpi_type ON lob_kpi_mv (line_of_business);

-- 3. Monthly Premium Growth Materialized View (For Charting)
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_premium_growth_mv AS
SELECT 
    date_trunc('month', created_at) AS month,
    SUM(premium_total) AS total_premium,
    COUNT(id) AS new_policies
FROM policies
WHERE policy_status != 'cancelled'
GROUP BY date_trunc('month', created_at)
ORDER BY date_trunc('month', created_at) DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_growth_month ON monthly_premium_growth_mv (month);

-- Phase 2: Refresh Functions and Cron

CREATE OR REPLACE FUNCTION refresh_analytics_mvs()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY client_profitability_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY lob_kpi_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_premium_growth_mv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily cron to hit the materialized views refresh (requires pg_cron)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'refresh_analytics_mvs',
            '0 2 * * *', -- 2 AM daily
            'SELECT refresh_analytics_mvs();'
        );
    END IF;
END $$;
