import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { checkServerPermission } from '@/lib/auth-guard';
import { parseExcelRowToPayload } from '@/lib/census-excel-helper';
import {
  validateInsurerEndorsementConfig,
  calculateProrationFactor,
  calculateAdditionPremium,
  lookupMedicalBracketPremium
} from '@/lib/endorsement-rules';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requester) {
      console.error('Auth check failed:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'Invalid or expired token.'
      }, { status: 401 });
    }

    if (!requester.email) {
      return NextResponse.json({ error: 'Unauthorized: Requester email is missing' }, { status: 401 });
    }

    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, is_admin, role')
      .eq('id', requester.id)
      .single();

    if (profileError || !requesterProfile) {
      console.error('Failed to resolve profile:', profileError);
      return NextResponse.json({ error: 'Unauthorized: Profile not found' }, { status: 401 });
    }

    const hasAccess = await checkServerPermission(supabaseAdmin, requesterProfile.id, '/endorsements', 'create');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to create/upload endorsements' }, { status: 403 });
    }

    const body = await request.json();
    const { policy_id, endorsement_type_id, rows, effective_date, category, notes } = body;

    // 1. Basic validation
    if (!policy_id || !endorsement_type_id || !rows || !Array.isArray(rows) || !effective_date || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Fetch policy details
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('policies')
      .select('*')
      .eq('id', policy_id)
      .maybeSingle();

    if (policyError || !policy) {
      console.error("Policy fetch error in bulk-upload:", policyError);
      return NextResponse.json({ error: 'Policy not found', details: policyError }, { status: 404 });
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

    // Fetch insurer endorsement rules
    const { data: insurerRules } = await supabaseAdmin
      .from('insurer_endorsement_rules')
      .select('*')
      .eq('insurer_id', policy.insurer_id)
      .maybeSingle();

    // Log validation warning instead of blocking creation
    const validation = validateInsurerEndorsementConfig(insurerRules, ['add', 'delete']);
    if (!validation.isValid) {
      console.warn(`Insurer endorsement configuration is incomplete. Missing configuration: ${validation.missingFields.join(', ')}. Using safe defaults.`);
    }

    const prorationMethod = insurerRules?.proration_method || 'daily';
    const refundProrationMethod = insurerRules?.refund_proration_method || prorationMethod;
    const lateAdditionThresholdMonth = insurerRules?.late_addition_threshold_month != null ? Number(insurerRules.late_addition_threshold_month) : 10;
    const minPremiumPercent = insurerRules?.minimum_premium_percentage_after_threshold != null ? Number(insurerRules.minimum_premium_percentage_after_threshold) : 0.25;
    const refundAllowedIfUtilized = !!insurerRules?.refund_allowed_if_utilized;

    // Proration factors using centralized rules engine
    const additionFactor = calculateProrationFactor(policy.start_date, policy.end_date, effective_date, prorationMethod!);
    const deletionFactor = calculateProrationFactor(policy.start_date, policy.end_date, effective_date, refundProrationMethod!);

    // Fetch active claims to verify utilization
    const { data: policyClaims } = await supabaseAdmin
      .from('claims')
      .select('id, national_id, member_name')
      .eq('policy_id', policy_id);

    // Fetch active policy members to resolve deletion base premium
    const { data: activeMembers } = await supabaseAdmin
      .from('policy_members')
      .select('*')
      .eq('policy_id', policy_id);

    // 4. Parse & validate rows, compute impact
    let totalPremiumImpact = 0;
    let totalSumInsuredImpact = 0;
    const itemsToInsert: any[] = [];

    for (const row of rows) {
      const parsedPayload = parseExcelRowToPayload(row);
      const rowName = parsedPayload.member_name || row.name || row.Name || row.vehicle_name || row.description || 'Unknown Item';
      const nationalId = parsedPayload.national_id || row.NationalID || row.chassis || row.plate || null;
      const actionType = String(row.action_type || row.Action || 'add').toLowerCase();
      const sumInsured = Number(row.sum_insured || row.SumInsured || 0);

      if (!['add', 'delete', 'modify'].includes(actionType)) {
        return NextResponse.json({ error: `Invalid action_type: "${actionType}" on row "${rowName}". Must be 'add', 'delete', or 'modify'` }, { status: 400 });
      }

      let rowPremium = Number(row.premium || row.Premium || 0);
      const isMedical = (policy.line_of_business || policy.policy_type)?.toLowerCase() === 'medical';

      if (isMedical) {
        if (actionType === 'add') {
          if (rowPremium === 0) {
            const dob = parsedPayload.date_of_birth;
            const relation = parsedPayload.relation || "Employee";
            const plan = parsedPayload.plan_category || "";
            rowPremium = lookupMedicalBracketPremium(policy, plan, relation, dob);
          }
        } else if (actionType === 'delete') {
          const nameVal = String(rowName || "").trim().toLowerCase();
          const natId = String(nationalId || "").trim();
          const member = (activeMembers || []).find((m: any) => 
            (natId && String(m.national_id).trim() === natId) ||
            (nameVal && String(m.member_name || m.name || "").trim().toLowerCase() === nameVal)
          );
          if (member) {
            rowPremium = Number(member.premium || 0);
            if (rowPremium === 0) {
              rowPremium = lookupMedicalBracketPremium(
                policy,
                member.plan_category || '',
                member.relation || '',
                member.date_of_birth || null
              );
            }
          }
        }
      }

      let proratedPrem = 0;

      if (actionType === 'add') {
        proratedPrem = calculateAdditionPremium(
          rowPremium,
          policy.start_date,
          effective_date,
          additionFactor,
          lateAdditionThresholdMonth,
          minPremiumPercent
        );
        totalPremiumImpact += proratedPrem;
      } else if (actionType === 'delete') {
        proratedPrem = rowPremium * deletionFactor;
        let hasUtilization = false;
        if (policyClaims && policyClaims.length > 0) {
          const natId = String(nationalId || "").trim();
          const nameVal = String(rowName || "").trim().toLowerCase();
          hasUtilization = policyClaims.some((c: any) => 
            (natId && String(c.national_id).trim() === natId) ||
            (nameVal && String(c.member_name || "").trim().toLowerCase() === nameVal)
          );
        }

        if (hasUtilization && !refundAllowedIfUtilized) {
          proratedPrem = 0;
        }
        totalPremiumImpact -= proratedPrem;
      } else {
        proratedPrem = rowPremium * additionFactor;
        totalPremiumImpact += proratedPrem;
      }

      totalSumInsuredImpact += sumInsured * (actionType === 'delete' ? -1 : 1);

      itemsToInsert.push({
        name: rowName,
        national_id: nationalId,
        action_type: actionType,
        premium: rowPremium,
        details: parsedPayload
      });
    }

    // 5. Generate unique endorsement number using crypto.randomUUID()
    const uuid = crypto.randomUUID();
    const shortCode = uuid.split('-')[0].toUpperCase();
    const policyLob = policy.line_of_business || policy.policy_type || 'General';
    const endorsementNumber = `END-${policyLob.substring(0, 3).toUpperCase()}-${shortCode}`;

    // 6. Create parent endorsement record
    const { data: endorsement, error: endCreateError } = await supabaseAdmin
      .from('endorsements')
      .insert({
        policy_id,
        client_id: policy.client_company_id,
        line_of_business: policyLob,
        endorsement_type_id,
        endorsement_number: endorsementNumber,
        category,
        effective_date,
        status: 'Pending Approval',
        premium_impact: totalPremiumImpact,
        sum_insured_impact: totalSumInsuredImpact,
        notes: notes || `Bulk uploaded from file: ${rows.length} items.`,
        created_by: requesterProfile.id,
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
      message: 'Bulk endorsement uploaded successfully as Pending Approval',
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
