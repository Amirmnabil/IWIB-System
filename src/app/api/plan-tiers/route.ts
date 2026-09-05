import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('plan_tiers')
      .select('*, medical_networks!plan_tiers_network_id_fkey(name_en, name_ar)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /api/plan-tiers GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/plan-tiers GET] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('plan_tiers')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('[API /api/plan-tiers POST] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/plan-tiers POST] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing tier id' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('plan_tiers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API /api/plan-tiers PATCH] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/plan-tiers PATCH] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
