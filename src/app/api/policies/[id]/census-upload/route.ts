import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { parseExcelRowToPayload, excelDateToISOString, checkPreviousDeletionStatus } from '@/lib/census-excel-helper';
import {
  validateInsurerEndorsementConfig,
  calculateProrationFactor,
  calculateAdditionPremium,
  lookupMedicalBracketPremium
} from '@/lib/endorsement-rules';
import { validateMemberAddition, validateMemberDeletion } from '@/lib/endorsement-validation';
import { sendMemberNotification } from '@/lib/email/triggers/member-notifications';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policy_id } = await context.params;
    if (!policy_id) {
      return NextResponse.json({ error: 'Missing policy_id parameter' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requester) {
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }

    const body = await request.json();
    const { rows, is_continuing } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided in upload payload' }, { status: 400 });
    }

    // 1. Fetch policy details
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('policies')
      .select('*')
      .eq('id', policy_id)
      .maybeSingle();

    if (policyError || !policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const policyStartDate = policy.start_date ? excelDateToISOString(policy.start_date) : null;
    const policyEndDate = policy.end_date ? excelDateToISOString(policy.end_date) : null;

    // Check if policy is continuing/renewed
    const statusLower = (policy.policy_status || '').toLowerCase();
    const isContinuingPolicy =
      is_continuing === true ||
      ['active', 'renewed', 'in_force'].includes(statusLower) ||
      !!policy.is_renewal;

    // 2. Fetch insurer endorsement rules
    const { data: insurerRules } = await supabaseAdmin
      .from('insurer_endorsement_rules')
      .select('*')
      .eq('insurer_id', policy.insurer_id)
      .maybeSingle();

    const prorationMethod = insurerRules?.proration_method || 'daily';
    const refundProrationMethod = insurerRules?.refund_proration_method || prorationMethod;
    const lateAdditionThresholdMonth = insurerRules?.late_addition_threshold_month != null ? Number(insurerRules.late_addition_threshold_month) : 10;
    const minPremiumPercent = insurerRules?.minimum_premium_percentage_after_threshold != null ? Number(insurerRules.minimum_premium_percentage_after_threshold) : 0.25;
    const refundAllowedIfUtilized = !!insurerRules?.refund_allowed_if_utilized;
    const dependentCascadeDelete = insurerRules?.dependent_termination_on_main_delete !== false;

    // Fetch endorsement types for lookup
    const { data: endorsementTypes } = await supabaseAdmin
      .from('endorsement_types')
      .select('*');

    const findTypeId = (typeName: string, fallbackCategory: string = 'Corporate') => {
      const match = (endorsementTypes || []).find((t: any) =>
        t.name?.toLowerCase().includes(typeName.toLowerCase())
      );
      return match?.id || (endorsementTypes && endorsementTypes[0]?.id) || null;
    };

    const additionTypeId = findTypeId('Addition');
    const deletionTypeId = findTypeId('Deletion');
    const refundTypeId = findTypeId('Refund') || deletionTypeId;

    // Fetch existing policy members for reference
    const { data: existingMembers } = await supabaseAdmin
      .from('policy_members')
      .select('*')
      .eq('policy_id', policy_id);

    // Fetch existing policy endorsements with items for re-addition detection
    const { data: existingEndorsements } = await supabaseAdmin
      .from('endorsements')
      .select('*, endorsement_items(*)')
      .eq('policy_id', policy_id);

    const warnings: string[] = [];
    const baseMemberRows: any[] = [];
    const datedAdditionsMap = new Map<string, any[]>();
    const datedDeletionsMap = new Map<string, any[]>();
    const startRefundRows: any[] = [];


    // 3. Classify uploaded rows
    for (const rawRow of rows) {
      const parsed = parseExcelRowToPayload(rawRow);
      const additionDate = parsed.addition_date ? excelDateToISOString(parsed.addition_date) : null;
      const deletionDate = parsed.deletion_date ? excelDateToISOString(parsed.deletion_date) : null;

      const isAddOnStart = additionDate && policyStartDate && additionDate === policyStartDate;
      const isDelOnStart = deletionDate && policyStartDate && deletionDate === policyStartDate;

      if (!isContinuingPolicy) {
        // Fallback for new/draft policy: include all in base roster
        baseMemberRows.push(parsed);
        continue;
      }

      // Classification buckets:
      // a. No dates OR additionDate === policy.start_date OR deletionDate === policy.start_date -> Base member
      if ((!additionDate && !deletionDate) || isAddOnStart || isDelOnStart) {
        baseMemberRows.push(parsed);

        // Exception: Deletion date equals start_date -> also trigger refund endorsement
        if (isDelOnStart) {
          startRefundRows.push(parsed);
        }
      } else if (additionDate && !isAddOnStart) {
        // b. Has addition_date -> dated addition
        const group = datedAdditionsMap.get(additionDate) || [];
        group.push(parsed);
        datedAdditionsMap.set(additionDate, group);
      } else if (deletionDate && !isDelOnStart) {
        // c. Has deletion_date -> dated deletion
        const group = datedDeletionsMap.get(deletionDate) || [];
        group.push(parsed);
        datedDeletionsMap.set(deletionDate, group);
      } else {
        baseMemberRows.push(parsed);
      }
    }

    // 4. Update base roster policy_members with date sanitization
    const sanitizeMemberDates = (m: any) => ({
      ...m,
      date_of_birth: m.date_of_birth ? excelDateToISOString(m.date_of_birth) : null,
      addition_date: m.addition_date ? excelDateToISOString(m.addition_date) : null,
      deletion_date: m.deletion_date ? excelDateToISOString(m.deletion_date) : null
    });

    const baseMembersPayload = baseMemberRows.map(m => ({
      ...sanitizeMemberDates(m),
      policy_id: policy_id,
      created_at: new Date().toISOString()
    }));

    if (baseMembersPayload.length > 0) {
      // Clear existing members if re-uploading base census
      await supabaseAdmin.from('policy_members').delete().eq('policy_id', policy_id);

      const { error: insertBaseError } = await supabaseAdmin
        .from('policy_members')
        .insert(baseMembersPayload);

      if (insertBaseError) {
        console.error('Failed to insert base policy_members:', insertBaseError);
        return NextResponse.json({ error: 'Failed to insert base census members: ' + insertBaseError.message }, { status: 500 });
      }
    }

    let createdAdditionsCount = 0;
    let createdDeletionsCount = 0;
    let createdRefundsCount = 0;
    let totalProratedImpact = 0;

    // Helper to generate endorsement record
    const createAutoApprovedEndorsement = async (
      typeId: string | null,
      categoryName: string,
      effectiveDate: string,
      items: any[],
      typeAction: 'add' | 'delete'
    ) => {
      if (items.length === 0 || !policyStartDate || !policyEndDate) return;

      const factor = calculateProrationFactor(
        policyStartDate,
        policyEndDate,
        effectiveDate,
        typeAction === 'add' ? prorationMethod : refundProrationMethod
      );

      let groupPremiumImpact = 0;
      let groupSumInsuredImpact = 0;
      const endorsementItemsPayload: any[] = [];

      for (const item of items) {
        let annualPrem = Number(item.premium || 0);
        if (annualPrem === 0) {
          annualPrem = lookupMedicalBracketPremium(
            policy,
            item.plan_category || '',
            item.relation || 'Employee',
            item.date_of_birth || null
          );
        }

        let prorated = 0;
        if (typeAction === 'add') {
          prorated = calculateAdditionPremium(
            annualPrem,
            policyStartDate,
            effectiveDate,
            factor,
            lateAdditionThresholdMonth,
            minPremiumPercent
          );

          // Run validation checks for addition
          const vResult = validateMemberAddition(
            {
              member_name: item.member_name || 'Member',
              national_id: item.national_id || '',
              date_of_birth: item.date_of_birth || null,
              gender: item.gender || 'Male',
              relation: item.relation || 'Principal',
              plan_category: item.plan_category || '',
              staff_code: item.staff_code || null,
              nationality: item.nationality || null
            },
            {
              policy: { max_allowed_age: 65 },
              medicalBrackets: policy.medical_brackets
            }
          );
          if (!vResult.isValid) {
            Object.values(vResult.errors).forEach(err => warnings.push(`[Addition ${item.member_name}]: ${err}`));
          }

          groupPremiumImpact += prorated;
        } else {
          prorated = annualPrem * factor;
          groupPremiumImpact -= prorated;
        }

        groupSumInsuredImpact += Number(item.sum_insured || 0) * (typeAction === 'delete' ? -1 : 1);

        endorsementItemsPayload.push({
          name: item.member_name || item.name || 'Member Item',
          national_id: item.national_id || null,
          action_type: typeAction,
          premium: annualPrem,
          details: item
        });
      }

      // Check dependent cascade deletion if deleting a principal
      if (typeAction === 'delete' && dependentCascadeDelete) {
        for (const item of items) {
          const isPrincipal = (item.relation || '').toLowerCase() === 'principal' || (item.relation || '').toLowerCase() === 'employee';
          if (isPrincipal && item.staff_code) {
            const dependents = (existingMembers || []).filter((m: any) =>
              m.principle_id === item.staff_code || m.principle_id === item.id
            );
            for (const dep of dependents) {
              const depPrem = Number(dep.premium || 0);
              const depProrated = depPrem * factor;
              groupPremiumImpact -= depProrated;
              endorsementItemsPayload.push({
                name: dep.member_name,
                national_id: dep.national_id,
                action_type: 'delete',
                premium: depPrem,
                details: { ...dep, cascade_deleted_from_principal: item.member_name }
              });
            }
          }
        }
      }

      const reAdditionNotes: string[] = [];
      if (typeAction === 'add') {
        for (const item of items) {
          const check = checkPreviousDeletionStatus(existingMembers || [], existingEndorsements || [], item);
          if (check.wasDeleted && check.note) {
            reAdditionNotes.push(check.note);
            warnings.push(`[Re-addition]: ${check.note}`);
          }
        }
      }

      const notesText = reAdditionNotes.length > 0
        ? `Auto-generated from bulk census upload for effective date ${effectiveDate}. ${reAdditionNotes.join(' ')}`
        : `Auto-generated from bulk census upload for effective date ${effectiveDate}.`;

      const uuid = crypto.randomUUID();
      const shortCode = uuid.split('-')[0].toUpperCase();
      const lob = policy.line_of_business || policy.policy_type || 'General';
      const endorsementNumber = `END-${lob.substring(0, 3).toUpperCase()}-${shortCode}`;

      const { data: endorsement, error: createError } = await supabaseAdmin
        .from('endorsements')
        .insert({
          policy_id: policy_id,
          client_id: policy.client_company_id,
          line_of_business: lob,
          endorsement_type_id: typeId,
          endorsement_number: endorsementNumber,
          category: categoryName,
          effective_date: effectiveDate,
          status: 'Approved',
          auto_approved: true,
          source: 'bulk_census_upload',
          approval_date: new Date().toISOString(),
          approval_ref: 'AUTO-APPROVED-CENSUS',
          premium_impact: groupPremiumImpact,
          sum_insured_impact: groupSumInsuredImpact,
          notes: notesText,
          created_by: requester.id
        })
        .select('id')
        .single();

      if (createError || !endorsement) {
        console.error('Failed to auto-create endorsement:', createError);
        warnings.push(`Failed to create ${typeAction} endorsement for date ${effectiveDate}: ${createError?.message}`);
        return;
      }

      const itemsWithEndorsementId = endorsementItemsPayload.map(i => ({
        ...i,
        endorsement_id: endorsement.id
      }));

      await supabaseAdmin.from('endorsement_items').insert(itemsWithEndorsementId);

      totalProratedImpact += groupPremiumImpact;
      if (typeAction === 'add') createdAdditionsCount++;
      else createdDeletionsCount++;
    };

    // 5. Generate Addition Endorsements
    for (const [effectiveDate, addRows] of datedAdditionsMap.entries()) {
      await createAutoApprovedEndorsement(additionTypeId, 'Corporate', effectiveDate, addRows, 'add');
    }

    // 6. Generate Deletion Endorsements
    for (const [effectiveDate, delRows] of datedDeletionsMap.entries()) {
      await createAutoApprovedEndorsement(deletionTypeId, 'Corporate', effectiveDate, delRows, 'delete');
    }

    // 7. Generate Start-Date Refund Endorsements
    if (startRefundRows.length > 0 && policyStartDate) {
      await createAutoApprovedEndorsement(refundTypeId, 'Exception', policyStartDate, startRefundRows, 'delete');
      createdRefundsCount++;
    }

    // 8. Trigger email notifications for added/deleted members
    const targetCompanyName = policy.client_company_name || 'Client Company';
    try {
      for (const [effectiveDate, addRows] of datedAdditionsMap.entries()) {
        const addedMembers = addRows.map(item => ({
          memberName: item.member_name || item.name || 'Member',
          relation: item.relation,
          department: item.department,
          nationalId: item.national_id,
        }));
        await sendMemberNotification({
          companyName: targetCompanyName,
          action: 'Added',
          members: addedMembers,
          recipientEmail: process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com',
        });
      }
      for (const [effectiveDate, delRows] of datedDeletionsMap.entries()) {
        const deletedMembers = delRows.map(item => ({
          memberName: item.member_name || item.name || 'Member',
          relation: item.relation,
          department: item.department,
          nationalId: item.national_id,
        }));
        await sendMemberNotification({
          companyName: targetCompanyName,
          action: 'Deleted',
          members: deletedMembers,
          recipientEmail: process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com',
        });
      }
    } catch (emailErr) {
      console.error('[Census Upload Email Error]', emailErr);
    }

    return NextResponse.json({
      success: true,
      base_members_count: baseMembersPayload.length,
      addition_endorsements_created: createdAdditionsCount,
      deletion_endorsements_created: createdDeletionsCount,
      refund_endorsements_created: createdRefundsCount,
      total_prorated_premium_impact: totalProratedImpact,
      warnings,
      message: 'Census processed successfully: base members and dated endorsements auto-generated.'
    });

  } catch (err: any) {
    console.error('Census upload error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
