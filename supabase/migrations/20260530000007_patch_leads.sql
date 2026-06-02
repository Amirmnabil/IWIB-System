-- Patch to make the Dashboard read directly from the leads and prospects tables
-- instead of relying on the companies table status string.

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
