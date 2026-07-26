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
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
