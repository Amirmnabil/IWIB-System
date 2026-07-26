import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { validateRequest } from '@/lib/auth-middleware';

const supabase = getSupabaseAdmin();

export async function GET(req: NextRequest) {
  try {
    await validateRequest();

    const { searchParams } = new URL(req.url);
    const policyId = searchParams.get('policyId');

    if (!policyId) {
      return NextResponse.json({ error: 'Missing policyId parameter' }, { status: 400 });
    }
    // We get FWA alerts by joining fact_claim_line_items to filter by policy_id
    const { data, error } = await supabase
      .from('fwa_alerts')
      .select(`
        *,
        dim_members (member_name, member_code),
        dim_providers (provider_name),
        fact_claim_line_items!inner(policy_id, net_amount, service_date)
      `)
      .eq('fact_claim_line_items.policy_id', policyId)
      .order('risk_score', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data });
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
