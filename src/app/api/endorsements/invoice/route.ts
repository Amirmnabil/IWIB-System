import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  validateInsurerEndorsementConfig,
  calculateProrationFactor,
  calculateAdditionPremium,
  calculateEndorsementTax,
  lookupMedicalBracketPremium
} from '@/lib/endorsement-rules';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endorsement_id } = body;

    if (!endorsement_id) {
      return NextResponse.json({ error: 'Missing endorsement_id' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch endorsement details
    const { data: endorsement, error: endError } = await supabaseAdmin
      .from('endorsements')
      .select('*')
      .eq('id', endorsement_id)
      .maybeSingle();

    if (endError || !endorsement) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 });
    }

    if (endorsement.status === 'Invoiced') {
      return NextResponse.json({ message: 'Endorsement is already invoiced', invoice_id: endorsement.linked_invoice_id });
    }

    const { data: policy, error: policyError } = await supabaseAdmin
      .from('policies')
      .select('id, policy_number, client_company_name, client_company_id, insurer_id, insurer_name, start_date, end_date, max_allowed_age, tax_type, tax_amount, policy_type, medical_brackets')
      .eq('id', endorsement.policy_id)
      .maybeSingle();

    if (policyError || !policy) {
      return NextResponse.json({ error: 'Policy not found for this endorsement' }, { status: 404 });
    }

    // 3. Fetch endorsement items
    const { data: rawItems, error: itemsError } = await supabaseAdmin
      .from('endorsement_items')
      .select('*')
      .eq('endorsement_id', endorsement_id);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch endorsement items: ' + itemsError.message }, { status: 500 });
    }

    const items = rawItems || [];

    // 4. Fetch insurer configuration settings from dedicated rules table
    const { data: insurerRules } = await supabaseAdmin
      .from('insurer_endorsement_rules')
      .select('*')
      .eq('insurer_id', policy.insurer_id)
      .maybeSingle();

    // Log validation warning instead of blocking invoicing
    const validation = validateInsurerEndorsementConfig(insurerRules, ['add', 'delete']);
    if (!validation.isValid) {
      console.warn(`Insurer endorsement configuration is incomplete. Missing configuration: ${validation.missingFields.join(', ')}. Using safe defaults.`);
    }

    const prorationMethod = insurerRules?.proration_method || 'daily';
    const refundProrationMethod = insurerRules?.refund_proration_method || prorationMethod;
    const lateAdditionThresholdMonth = insurerRules?.late_addition_threshold_month != null ? Number(insurerRules.late_addition_threshold_month) : 10;
    const minPremiumPercent = insurerRules?.minimum_premium_percentage_after_threshold != null ? Number(insurerRules.minimum_premium_percentage_after_threshold) : 0.25;
    const refundAllowedIfUtilized = !!insurerRules?.refund_allowed_if_utilized;
    const refundProcessingDelayDays = Number(insurerRules?.refund_processing_delay_days || 0);
    const dependentTerminationOnMainDelete = insurerRules?.dependent_termination_on_main_delete != null ? !!insurerRules.dependent_termination_on_main_delete : true;

    // Proration factors using centralized rules engine
    const additionFactor = calculateProrationFactor(policy.start_date, policy.end_date, endorsement.effective_date, prorationMethod!);
    const deletionFactor = calculateProrationFactor(policy.start_date, policy.end_date, endorsement.effective_date, refundProrationMethod!);

    let computedPremiumImpact = 0;
    let computedSumInsuredImpact = 0;
    const auditLogsToInsert: any[] = [];
    const membersToInsert: any[] = [];
    const memberDeletionsToApply: any[] = [];

    // 5. Loop and process each item
    for (const item of items) {
      const details = item.details || {};
      const actionType = item.action_type;
      let annualPremium = Number(item.premium || details.premium || 0);
      const sumInsured = Number(details.sum_insured || 0);
      const isMedical = ((policy as any).line_of_business || policy.policy_type)?.toLowerCase() === 'medical';

      if (annualPremium === 0 && isMedical) {
        if (actionType === 'add') {
          annualPremium = lookupMedicalBracketPremium(
            policy,
            details.plan_category || '',
            details.relation || 'Employee',
            details.date_of_birth || null
          );
        } else if (actionType === 'delete') {
          const nameVal = String(item.name || "").trim().toLowerCase();
          const natId = String(item.national_id || "").trim();
          
          let query = supabaseAdmin.from('policy_members').select('*').eq('policy_id', policy.id);
          if (natId) {
            query = query.eq('national_id', natId);
          } else {
            query = query.eq('member_name', item.name);
          }
          const { data: member } = await query.maybeSingle();
          if (member) {
            annualPremium = Number(member.premium || 0);
            if (annualPremium === 0) {
              annualPremium = lookupMedicalBracketPremium(
                policy,
                member.plan_category || '',
                member.relation || '',
                member.date_of_birth || null
              );
            }
          }
        }
      }

      let itemPremiumImpact = 0;
      let itemSumInsuredImpact = 0;

      if (actionType === 'add') {
        const proratedPremium = calculateAdditionPremium(
          annualPremium,
          policy.start_date,
          endorsement.effective_date,
          additionFactor,
          lateAdditionThresholdMonth,
          minPremiumPercent
        );

        itemPremiumImpact = proratedPremium;
        itemSumInsuredImpact = sumInsured;

        // Push to insertion queue
        membersToInsert.push({
          policy_id: policy.id,
          member_name: item.name,
          date_of_birth: details.date_of_birth || null,
          gender: details.gender || 'Male',
          relation: details.relation || 'Employee',
          nationality: details.nationality || 'Egyptian',
          national_id: item.national_id,
          plan_category: details.plan_category || '',
          location: details.location || '',
          department: details.department || '',
          job_title: details.job_title || '',
          mobile_number: details.mobile_number || '',
          addition_date: endorsement.effective_date,
          linked_main_member_id: details.linked_main_member_id || null,
          notes: details.notes || 'Added via Endorsement'
        });

      } else if (actionType === 'delete') {
        // Check for utilization (claims)
        let hasUtilization = false;
        if (item.national_id) {
          const { data: claims, error: claimsError } = await supabaseAdmin
            .from('claims')
            .select('id')
            .eq('policy_id', policy.id)
            .or(`national_id.eq.${item.national_id},member_name.eq.${item.name}`)
            .limit(1);
          if (!claimsError && claims && claims.length > 0) {
            hasUtilization = true;
          }
        }

        let refundPremium = 0;
        if (hasUtilization && !refundAllowedIfUtilized) {
          refundPremium = 0;
        } else {
          refundPremium = annualPremium * deletionFactor * -1; // negative for refund
        }

        itemPremiumImpact = refundPremium;
        itemSumInsuredImpact = sumInsured * -1;

        // Queue cancellation update
        memberDeletionsToApply.push({
          national_id: item.national_id,
          name: item.name,
          relation: details.relation
        });
      }

      // Update item in DB with computed premium impact
      await supabaseAdmin
        .from('endorsement_items')
        .update({ premium: itemPremiumImpact })
        .eq('id', item.id);

      computedPremiumImpact += itemPremiumImpact;
      computedSumInsuredImpact += itemSumInsuredImpact;

      // Queue audit logs
      auditLogsToInsert.push({
        action: actionType === 'add' ? 'ADD_MEMBER' : 'DELETE_MEMBER',
        resource_type: 'endorsement_item',
        resource_id: item.id,
        resource_name: item.name,
        changes: {
          action_type: actionType,
          premium_impact: itemPremiumImpact,
          national_id: item.national_id,
          source: endorsement.source || 'Client Portal'
        }
      });
    }

    // 6. Apply members additions/deletions and cascade updates
    // A. Additions
    if (membersToInsert.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('policy_members')
        .insert(membersToInsert);
      if (insErr) {
        console.error("Failed to insert policy members:", insErr);
        return NextResponse.json({ error: 'Failed to insert policy members: ' + insErr.message }, { status: 500 });
      }
    }

    // B. Deletions & Cascade
    for (const del of memberDeletionsToApply) {
      // Find matching active member
      let query = supabaseAdmin.from('policy_members').update({ deletion_date: endorsement.effective_date });
      if (del.national_id) {
        query = query.eq('national_id', del.national_id);
      } else {
        query = query.eq('member_name', del.name);
      }
      const { data: updatedMembers, error: delErr } = await query.eq('policy_id', policy.id).select('id');

      if (delErr) {
        console.error("Failed to cancel member coverage:", delErr);
      }

      // Cascade check for dependents
      if (updatedMembers && updatedMembers.length > 0 && dependentTerminationOnMainDelete) {
        for (const mainM of updatedMembers) {
          if (del.relation?.toLowerCase() === 'employee' || del.relation?.toLowerCase() === 'principal') {
            const { error: cascErr } = await supabaseAdmin
              .from('policy_members')
              .update({ deletion_date: endorsement.effective_date })
              .eq('linked_main_member_id', mainM.id)
              .is('deletion_date', null);
            if (cascErr) {
              console.error("Failed to cascade delete dependents:", cascErr);
            }
          }
        }
      }
    }

    // Update parent endorsement calculated impacts
    const premiumImpact = computedPremiumImpact;
    const sumInsuredImpact = computedSumInsuredImpact;

    // 7. Non-Financial Check
    if (premiumImpact === 0) {
      await supabaseAdmin
        .from('endorsements')
        .update({ 
          status: 'Approved',
          premium_impact: premiumImpact,
          sum_insured_impact: sumInsuredImpact
        })
        .eq('id', endorsement_id);

      // Log parent endorsement approval
      await supabaseAdmin.from('audit_logs').insert({
        action: 'APPROVE_ENDORSEMENT',
        resource_type: 'endorsement',
        resource_id: endorsement_id,
        resource_name: endorsement.endorsement_number,
        changes: {
          old_status: endorsement.status,
          new_status: 'Approved',
          premium_impact: 0,
          source: endorsement.source || 'Client Portal'
        }
      });

      return NextResponse.json({ message: 'Non-financial endorsement processed with zero invoice impact' });
    }

    // 8. Generate unique invoice number
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `INV-END-${randomSuffix}`;

    const issueDate = new Date().toISOString().split('T')[0];
    let dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days net
    if (premiumImpact < 0 && refundProcessingDelayDays > 0) {
      dueDate = new Date(Date.now() + refundProcessingDelayDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // Invoice type classification
    let invoiceType = 'Additional Premium';
    if (premiumImpact < 0) {
      invoiceType = 'Refund';
    } else if (endorsement.category === 'Exception') {
      invoiceType = 'Adjustment';
    }

    // Calculate tax and gross amounts using policy tax configurations
    const calculatedTax = calculateEndorsementTax(premiumImpact, policy);
    const grossImpact = premiumImpact + calculatedTax;

    const invoicePayload = {
      invoice_number: invoiceNumber,
      client_company_id: policy.client_company_id,
      client_company_name: policy.client_company_name,
      policy_id: endorsement.policy_id,
      policy_number: policy.policy_number,
      insurer_id: policy.insurer_id,
      insurer_name: policy.insurer_name,
      invoice_type: invoiceType,
      issue_date: issueDate,
      due_date: dueDate,
      amount_due: grossImpact, // Set to gross premium impact (Net + Tax)
      amount_paid: 0,
      status: premiumImpact < 0 ? 'paid' : 'unpaid', // refund/credit note marked paid or settled
      notes: `Auto-generated for endorsement ref: ${endorsement.endorsement_number || endorsement_id}. Net: EGP ${premiumImpact.toFixed(2)}, Tax: EGP ${calculatedTax.toFixed(2)}, Gross: EGP ${grossImpact.toFixed(2)}. Notes: ${endorsement.notes || ''}`
    };

    // 9. Insert invoice
    const { data: invoice, error: invError } = await supabaseAdmin
      .from('invoices')
      .insert(invoicePayload)
      .select('id')
      .single();

    if (invError || !invoice) {
      console.error('Invoice creation failed:', invError);
      return NextResponse.json({ error: 'Failed to create invoice: ' + invError?.message }, { status: 500 });
    }

    // 10. Financial Linkage Integration
    const { data: refItems } = await supabaseAdmin.from('reference_list').select('*');
    if (refItems) {
      const lobId = refItems.find(r => r.category === 'line_of_business' && r.key === 'MEDICAL')?.id;
      const typeId = refItems.find(r => r.category === 'transaction_type' && r.key === (premiumImpact >= 0 ? 'ADDITION' : 'REFUND'))?.id;
      const directionId = refItems.find(r => r.category === 'financial_direction' && r.key === (premiumImpact >= 0 ? 'DEBIT' : 'CREDIT'))?.id;
      const statusId = refItems.find(r => r.category === 'movement_status' && r.key === 'APPLIED')?.id;

      if (lobId && typeId && directionId && statusId) {
        // Insert financial movement
        const { data: finMov, error: finErr } = await supabaseAdmin
          .from('policy_financial_movements')
          .insert({
            policy_id: policy.id,
            line_of_business: lobId,
            type: typeId,
            financial_direction: directionId,
            amount: Math.abs(premiumImpact),
            description: `Financial movement for Endorsement: ${endorsement.endorsement_number}`,
            transaction_date: issueDate,
            status: statusId
          })
          .select('id')
          .single();

        if (!finErr && finMov) {
          // Link financial movement to invoice
          await supabaseAdmin.from('invoice_financial_movements').insert({
            invoice_id: invoice.id,
            movement_id: finMov.id
          });
        } else {
          console.error("Failed to create policy financial movement:", finErr);
        }
      }
    }

    // 11. Update endorsement status and link invoice
    const { error: updateError } = await supabaseAdmin
      .from('endorsements')
      .update({
        linked_invoice_id: invoice.id,
        status: 'Invoiced',
        premium_impact: premiumImpact,
        sum_insured_impact: sumInsuredImpact
      })
      .eq('id', endorsement_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update endorsement: ' + updateError.message }, { status: 500 });
    }

    // 12. Write audit logs
    // Insert parent log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'APPROVE_ENDORSEMENT',
      resource_type: 'endorsement',
      resource_id: endorsement_id,
      resource_name: endorsement.endorsement_number,
      changes: {
        old_status: endorsement.status,
        new_status: 'Invoiced',
        premium_impact: premiumImpact,
        source: endorsement.source || 'Client Portal'
      }
    });

    // Insert item logs
    if (auditLogsToInsert.length > 0) {
      await supabaseAdmin.from('audit_logs').insert(auditLogsToInsert);
    }

    return NextResponse.json({
      message: 'Invoice created, members synchronized and linked successfully',
      invoice_id: invoice.id,
      invoice_number: invoiceNumber
    });
  } catch (err: any) {
    console.error('Invoicing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
