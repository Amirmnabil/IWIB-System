-- Phase 1: Dashboard Metrics Cache

CREATE TABLE IF NOT EXISTS dashboard_metrics_cache (
    module VARCHAR(50) PRIMARY KEY,
    metrics JSONB, 
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dashboard_metrics_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the cache
CREATE POLICY "Anyone can view dashboard metrics" ON dashboard_metrics_cache
    FOR SELECT USING (auth.role() = 'authenticated');

-- Function to get dashboard summary (Phase 1 API)
CREATE OR REPLACE FUNCTION get_main_dashboard_summary()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(module, metrics)
    INTO result
    FROM dashboard_metrics_cache;
    
    RETURN coalesce(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some initial blank or dummy state for the cache so UI has something to show
INSERT INTO dashboard_metrics_cache (module, metrics) VALUES 
('crm', '{"total_leads": 124, "active_prospects": 45, "win_rate": 28, "pipeline_value": 450000}'),
('underwriting', '{"pending_quotes": 12, "avg_tat_hours": 24, "risk_score_avg": 75}'),
('policy_admin', '{"active_policies": 1450, "renewals_30_days": 85, "endorsement_backlog": 14}'),
('claims', '{"open_claims": 23, "claims_paid_ytd": 1250000, "avg_claim_cost": 4500, "fraud_cases": 2}'),
('finance', '{"total_invoiced": 3400000, "collected_revenue": 2800000, "outstanding": 600000, "commissions": 140000}'),
('master_data', '{"orphaned_records": 0, "data_quality_index": 98}')
ON CONFLICT (module) DO NOTHING;

-- Example of a function that a pg_cron job could call to refresh metrics:
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
    -- Update CRM metrics (simple example without heavy joins for speed)
    UPDATE dashboard_metrics_cache 
    SET metrics = jsonb_build_object(
        'total_leads', (SELECT count(*) FROM companies WHERE status IN ('lead', 'interested')),
        'active_prospects', (SELECT count(*) FROM companies WHERE status = 'prospect'),
        'pipeline_value', (SELECT coalesce(sum(employee_count * 150), 0) FROM companies WHERE status = 'prospect')
    ), last_updated = NOW()
    WHERE module = 'crm';

    -- Update Policy Admin metrics
    UPDATE dashboard_metrics_cache 
    SET metrics = jsonb_build_object(
        'active_policies', (SELECT count(*) FROM policies WHERE policy_status = 'active')
    ), last_updated = NOW()
    WHERE module = 'policy_admin';

    -- Update Claims metrics
    UPDATE dashboard_metrics_cache 
    SET metrics = jsonb_build_object(
        'open_claims', (SELECT count(*) FROM claims WHERE status NOT IN ('paid', 'rejected', 'cancelled'))
    ), last_updated = NOW()
    WHERE module = 'claims';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
