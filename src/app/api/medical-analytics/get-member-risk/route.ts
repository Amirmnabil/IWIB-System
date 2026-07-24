import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateRequest } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  try {
    await validateRequest();

    const { searchParams } = new URL(req.url);
    const policyId = searchParams.get('policyId');

    if (!policyId) {
      return NextResponse.json({ error: 'Missing policyId parameter' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('member_risk_scores')
      .select(`
        *,
        dim_members!inner(policy_id, member_name, member_code, date_of_birth)
      `)
      .eq('dim_members.policy_id', policyId)
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
