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
    const { data, error } = await supabaseAdmin
      .from('doctor_on_site_config')
      .select('*')
      .eq('tier_id', tierId)
      .maybeSingle();

    if (error) {
      console.error('[API /api/plan-tiers/doctor-on-site GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || null }, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/plan-tiers/doctor-on-site GET] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { tier_id, target_tier_ids } = payload;

    if (!tier_id) {
      return NextResponse.json({ error: 'Missing tier_id' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const activeTierIds: string[] = Array.isArray(target_tier_ids) && target_tier_ids.length > 0 
      ? target_tier_ids 
      : [tier_id];

    if (!activeTierIds.includes(tier_id)) {
      activeTierIds.push(tier_id);
    }

    const sharedPayload = {
      is_enabled: Boolean(payload.is_enabled),
      visits_per_week: Number(payload.visits_per_week) || 1,
      number_of_locations: Number(payload.number_of_locations) || 1,
      location_en: payload.location_en || null,
      location_ar: payload.location_ar || null,
      schedule_en: payload.schedule_en || null,
      schedule_ar: payload.schedule_ar || null,
      scope_of_service: payload.scope_of_service || 'general_consultation',
      cost_model: payload.cost_model || 'fixed_retainer',
      updated_at: new Date().toISOString()
    };

    let primaryResult: any = null;

    // Process each target tier (sync combined DOS pool across plans)
    for (const targetTierId of activeTierIds) {
      // Check if config exists for targetTierId
      const { data: existing } = await supabaseAdmin
        .from('doctor_on_site_config')
        .select('id')
        .eq('tier_id', targetTierId)
        .maybeSingle();

      if (existing?.id) {
        // Update existing record
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('doctor_on_site_config')
          .update({ ...sharedPayload })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (updateErr) throw updateErr;
        if (targetTierId === tier_id) primaryResult = updated;
      } else {
        // Insert new record
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
              const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });

        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('doctor_on_site_config')
          .insert({
            id: newId,
            tier_id: targetTierId,
            ...sharedPayload
          })
          .select('*')
          .single();

        if (insertErr) throw insertErr;
        if (targetTierId === tier_id) primaryResult = inserted;
      }
    }

    return NextResponse.json({ data: primaryResult }, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/plan-tiers/doctor-on-site POST] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
