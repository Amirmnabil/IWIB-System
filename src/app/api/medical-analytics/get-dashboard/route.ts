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
      .select('engine_name, data')
      .eq('policy_id', policyId)
      .in('engine_name', ['cost_utilization', 'pharmacy_analytics', 'chronic_disease', 'episode_grouping']);

    if (error) throw error;

    const dashboardData = data.reduce((acc: any, row) => {
      acc[row.engine_name] = row.data;
      return acc;
    }, {});

    return NextResponse.json({ success: true, data: dashboardData });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
