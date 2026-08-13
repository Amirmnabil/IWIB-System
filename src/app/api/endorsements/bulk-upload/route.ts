import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { policy_id, endorsement_type_id, rows, effective_date, category, notes, user_id } = body;

    // 1. Basic validation
    if (!policy_id || !endorsement_type_id || !rows || !Array.isArray(rows) || !effective_date || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Fetch policy details
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('policies')
      .select('id, client_company_id, line_of_business')
      .eq('id', policy_id)
      .maybeSingle();

    if (policyError || !policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // 3. Fetch endorsement type details
    const { data: endorsementType, error: typeError } = await supabaseAdmin
      .from('endorsement_types')
      .select('*')
      .eq('id', endorsement_type_id)
      .maybeSingle();

    if (typeError || !endorsementType) {
      return NextResponse.json({ error: 'Endorsement type not found' }, { status: 404 });
    }

    // 4. Parse & validate rows, compute impact
    let totalPremiumImpact = 0;
    let totalSumInsuredImpact = 0;
    const itemsToInsert: any[] = [];

    for (const row of rows) {
      const rowName = row.name || row.Name || row.member_name || row.vehicle_name || row.description || 'Unknown Item';
      const nationalId = row.national_id || row.NationalID || row.chassis || row.plate || null;
      const actionType = String(row.action_type || row.Action || 'add').toLowerCase();
      const premium = Number(row.premium || row.Premium || 0);
      const sumInsured = Number(row.sum_insured || row.SumInsured || 0);

      if (!['add', 'delete', 'modify'].includes(actionType)) {
        return NextResponse.json({ error: `Invalid action_type: "${actionType}" on row "${rowName}". Must be 'add', 'delete', or 'modify'` }, { status: 400 });
      }

      // Deletions deduct premium, additions increase premium
      const direction = actionType === 'delete' ? -1 : 1;
      totalPremiumImpact += premium * direction;
      totalSumInsuredImpact += sumInsured * direction;

      itemsToInsert.push({
        name: rowName,
        national_id: nationalId,
        action_type: actionType,
        premium: premium,
        details: { ...row }
      });
    }

    // 5. Generate unique endorsement number
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const endorsementNumber = `END-${policy.line_of_business ? policy.line_of_business.substring(0, 3).toUpperCase() : 'GEN'}-${randomSuffix}`;

    // 6. Create parent endorsement record
    const { data: endorsement, error: endCreateError } = await supabaseAdmin
      .from('endorsements')
      .insert({
        policy_id,
        client_id: policy.client_company_id,
        line_of_business: policy.line_of_business || 'General',
        endorsement_type_id,
        endorsement_number: endorsementNumber,
        category,
        effective_date,
        status: 'Draft',
        premium_impact: totalPremiumImpact,
        sum_insured_impact: totalSumInsuredImpact,
        notes: notes || `Bulk uploaded from file: ${rows.length} items.`,
        created_by: user_id || null,
        source: 'Excel Upload'
      })
      .select('id')
      .single();

    if (endCreateError || !endorsement) {
      console.error('Endorsement creation failed:', endCreateError);
      return NextResponse.json({ error: 'Failed to create endorsement: ' + endCreateError?.message }, { status: 500 });
    }

    // 7. Create children endorsement items
    const itemsPayload = itemsToInsert.map(item => ({
      ...item,
      endorsement_id: endorsement.id
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('endorsement_items')
      .insert(itemsPayload);

    if (itemsError) {
      // Rollback parent endorsement
      await supabaseAdmin.from('endorsements').delete().eq('id', endorsement.id);
      return NextResponse.json({ error: 'Failed to insert endorsement items: ' + itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Bulk endorsement uploaded successfully as Draft',
      endorsement_id: endorsement.id,
      endorsement_number: endorsementNumber,
      parsed_rows: rows.length,
      premium_impact: totalPremiumImpact,
      sum_insured_impact: totalSumInsuredImpact
    });
  } catch (err: any) {
    console.error('Bulk upload error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
