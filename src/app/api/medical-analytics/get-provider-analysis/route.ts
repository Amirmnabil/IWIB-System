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
    const { data, error } = await supabase
      .from('medical_analytics_results')
      .select('data')
      .eq('policy_id', policyId)
      .eq('engine_name', 'provider_analytics')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'

    return NextResponse.json({ success: true, data: data?.data || { topProviders: [] } });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
