import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tierId = searchParams.get('tier_id');

    if (!tierId) {
      return NextResponse.json({ error: 'Missing tier_id parameter' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch Pools
    const { data: poolsData, error: poolsErr } = await supabaseAdmin
      .from('combined_pools')
      .select('*')
      .eq('tier_id', tierId)
      .order('created_at');

    if (poolsErr) throw poolsErr;

    // 2. Fetch Configs
    const { data: configsData, error: confErr } = await supabaseAdmin
      .from('plan_benefit_config')
      .select('*')
      .eq('tier_id', tierId);

    if (confErr) throw confErr;

    // 3. Fetch OON Rules if configs exist
    let oonData: any[] = [];
    if (configsData && configsData.length > 0) {
      const configIds = configsData.map((c: any) => c.id);
      const { data: oonRules, error: oonErr } = await supabaseAdmin
        .from('oon_reimbursement_rules')
        .select('*')
        .in('plan_benefit_config_id', configIds);
      if (oonErr) throw oonErr;
      oonData = oonRules || [];
    }

    // 4. Fetch Doctor on Site config if existing
    const { data: doctorData } = await supabaseAdmin
      .from('doctor_on_site_config')
      .select('*')
      .eq('tier_id', tierId)
      .maybeSingle();

    return NextResponse.json({
      pools: poolsData || [],
      configs: configsData || [],
      oonRules: oonData || [],
      doctorConfig: doctorData || null
    }, { status: 200 });

  } catch (err: any) {
    console.error('[API /api/plan-tiers/details GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
