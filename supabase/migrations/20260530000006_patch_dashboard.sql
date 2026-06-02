CREATE OR REPLACE FUNCTION get_dashboard_all_metrics()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Add sales to the unified fetcher
    result := jsonb_build_object(
        'global', get_dashboard_global(),
        'crm', get_dashboard_crm(),
        'sales', get_dashboard_sales(),
        'underwriting', get_dashboard_underwriting(),
        'policy_admin', get_dashboard_policy_admin(),
        'claims', get_dashboard_claims(),
        'finance', get_dashboard_finance(),
        'master_data', get_dashboard_master_data(),
        'ceo', get_ceo_analytics()
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
