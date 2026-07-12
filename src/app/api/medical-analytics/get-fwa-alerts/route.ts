import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const policyId = searchParams.get('policyId');

  if (!policyId) {
    return NextResponse.json({ error: 'Missing policyId parameter' }, { status: 400 });
  }

  try {
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
