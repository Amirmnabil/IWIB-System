import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { checkServerPermission } from '@/lib/auth-guard';
import * as XLSX from 'xlsx';
import {
  validateInsurerEndorsementConfig,
  calculateProrationFactor,
  calculateAdditionPremium,
  calculateEndorsementTax,
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

    const hasAccess = await checkServerPermission(supabaseAdmin, requesterProfile.id, '/endorsements', 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to process endorsement invoice' }, { status: 403 });
    }

    const body = await request.json();
    const { endorsement_id, approval_ref, approval_date } = body;

    if (!endorsement_id) {
      return NextResponse.json({ error: 'Missing endorsement_id' }, { status: 400 });
    }

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

    // 2. Fetch policy details
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

    // Validate Addition Endorsement rules:
    const hasAdditions = items.some((i: any) => i.action_type === 'add');
    if (hasAdditions) {
      // 1. Verify & Approve step has been completed for all additions
      const allVerified = items
        .filter((i: any) => i.action_type === 'add')
        .every((i: any) => i.details?.verified === true);
      
      if (!allVerified) {
        return NextResponse.json({ 
          error: 'Verify & Approve step must be completed for all member additions before invoicing.' 
        }, { status: 400 });
      }

      // 2. The required IDs (Insured ID, Principal ID, Individual ID) are available
      const allIdsPresent = items
        .filter((i: any) => i.action_type === 'add')
        .every((i: any) => 
          i.details?.member_id_insurance && 
          i.details?.principle_id && 
          i.details?.member_id_individual
        );

      if (!allIdsPresent) {
        return NextResponse.json({ 
          error: 'Required IDs (Insurer ID, Principal ID, Individual ID) are missing for some additions.' 
        }, { status: 400 });
      }
    }


    // 4. Fetch insurer configuration settings
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
    const refundProcessingDelayDays = Number(insurerRules?.refund_processing_delay_days || 0);

    // Proration factors using centralized rules engine
    const additionFactor = calculateProrationFactor(policy.start_date, policy.end_date, endorsement.effective_date, prorationMethod!);
    const deletionFactor = calculateProrationFactor(policy.start_date, policy.end_date, endorsement.effective_date, refundProrationMethod!);

    let computedPremiumImpact = 0;
    let computedSumInsuredImpact = 0;
    const auditLogsToInsert: any[] = [];
    const membersToInsert: any[] = [];
    const memberDeletionsToQueue: any[] = [];
    const itemsToUpdate: any[] = [];

    // Hoist & Cache active members lookup for deletion premium resolution
    const { data: activeMembers } = await supabaseAdmin
      .from('policy_members')
      .select('*')
      .eq('policy_id', policy.id);

    // Hoist & Cache claims lookup
    const { data: policyClaims } = await supabaseAdmin
      .from('claims')
      .select('national_id, member_name')
      .eq('policy_id', policy.id);
    const claimsSet = new Set((policyClaims || []).map(c => String(c.national_id || '').trim().toLowerCase()));
    const claimsNames = new Set((policyClaims || []).map(c => String(c.member_name || '').trim().toLowerCase()));

    // Hoist & Cache utilization Excel reports lookup
    const { data: reports } = await supabaseAdmin
      .from('policy_utilization_reports')
      .select('file_url')
      .eq('policy_id', policy.id);

    const reportNationalIds = new Set<string>();
    const reportStaffCodes = new Set<string>();
    const reportTpaIds = new Set<string>();
    const reportNames = new Set<string>();

    if (reports && reports.length > 0) {
      for (const r of reports) {
        if (r.file_url) {
          try {
            const res = await fetch(r.file_url);
            if (res.ok) {
              const arrB = await res.arrayBuffer();
              const wb = XLSX.read(new Uint8Array(arrB), { type: 'array' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(ws) as any[];

              const nameKeys = ['membername', 'patientname', 'employeename', 'beneficiary', 'name'];

              for (const row of rows) {
                const rowVals = Object.values(row).map(v => String(v || '').trim().toLowerCase());
                rowVals.forEach(v => {
                  if (v) {
                    reportNationalIds.add(v);
                    reportStaffCodes.add(v);
                    reportTpaIds.add(v);
                  }
                });

                for (const key of Object.keys(row)) {
                  const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (nameKeys.some(nk => normKey.includes(nk))) {
                    const val = String(row[key] || '').trim().toLowerCase();
                    if (val) reportNames.add(val);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error fetching/parsing report inside invoice route:', e);
          }
        }
      }
    }

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
          
          const member = (activeMembers || []).find((m: any) => 
            (natId && String(m.national_id || '').trim() === natId) ||
            (nameVal && String(m.member_name || m.name || "").trim().toLowerCase() === nameVal)
          );
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
      let itemNeedsReview = false;

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
          full_name_arabic: details.full_name_arabic || null,
          marital_status: details.marital_status || null,
          bank_name: details.bank_name || null,
          bank_account: details.bank_account || null,
          iban: details.iban || null,
          principle_id: details.principle_id || null,
          staff_code: details.staff_code || null,
          member_id_insurance: details.member_id_insurance || null,
          member_id_tpa: details.member_id_tpa || details.member_id_individual || null,
          premium: annualPremium || 0,
          notes: details.notes || 'Added via Endorsement'
        });

      } else if (actionType === 'delete') {
        const nameVal = String(item.name || '').trim().toLowerCase();
        const natId = String(item.national_id || '').trim().toLowerCase();
        const staff = String(details.staff_code || '').trim().toLowerCase();
        const tpa = String(details.member_id_tpa || '').trim().toLowerCase();

        let hasConfidenceMatch = false;
        let hasNameMatchOnly = false;

        // 1. Check National ID exact match (highest confidence)
        if (natId) {
          if (claimsSet.has(natId)) {
            hasConfidenceMatch = true;
          } else if (reportNationalIds.has(natId)) {
            hasConfidenceMatch = true;
          }
        }

        // 2. Check Staff Code / TPA member ID exact match
        if (!hasConfidenceMatch) {
          if (staff && reportStaffCodes.has(staff)) {
            hasConfidenceMatch = true;
          } else if (tpa && reportTpaIds.has(tpa)) {
            hasConfidenceMatch = true;
          }
        }

        // 3. Name match only as a last resort
        if (!hasConfidenceMatch && nameVal) {
          if (claimsNames.has(nameVal)) {
            hasNameMatchOnly = true;
          } else if (reportNames.has(nameVal)) {
            hasNameMatchOnly = true;
          } else {
            for (const rn of reportNames) {
              if (rn === nameVal || (rn.length > 5 && nameVal.length > 5 && (rn.includes(nameVal) || nameVal.includes(rn)))) {
                hasNameMatchOnly = true;
                break;
              }
            }
          }
        }

        let refundPremium = 0;

        if (hasConfidenceMatch) {
          if (refundAllowedIfUtilized) {
            refundPremium = annualPremium * deletionFactor * -1;
          } else {
            refundPremium = 0;
          }
        } else if (hasNameMatchOnly) {
          // Flag for manual review, but do not zero out refund silently
          refundPremium = annualPremium * deletionFactor * -1;
          itemNeedsReview = true;
        } else {
          refundPremium = annualPremium * deletionFactor * -1;
        }

        itemPremiumImpact = refundPremium;
        itemSumInsuredImpact = sumInsured * -1;

        memberDeletionsToQueue.push({
          national_id: item.national_id,
          name: item.name,
          relation: details.relation
        });
      }

      itemsToUpdate.push({
        id: item.id,
        premium: itemPremiumImpact,
        needs_review: itemNeedsReview
      });

      computedPremiumImpact += itemPremiumImpact;
      computedSumInsuredImpact += itemSumInsuredImpact;

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

    const premiumImpact = computedPremiumImpact;
    const sumInsuredImpact = computedSumInsuredImpact;

    // Generate unique invoice number and calculate invoice details
    // Generate unique invoice number using crypto.randomUUID()
    const uuid = crypto.randomUUID();
    const shortCode = uuid.split('-')[0].toUpperCase();
    const invoiceNumber = `INV-END-${shortCode}`;

    const issueDate = new Date().toISOString().split('T')[0];
    let dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (premiumImpact < 0 && refundProcessingDelayDays > 0) {
      dueDate = new Date(Date.now() + refundProcessingDelayDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    let invoiceType = 'Additional Premium';
    if (premiumImpact < 0) {
      invoiceType = 'Refund';
    } else if (endorsement.category === 'Exception') {
      invoiceType = 'Adjustment';
    }

    const calculatedTax = calculateEndorsementTax(premiumImpact, policy);
    const grossImpact = premiumImpact + calculatedTax;

    const invoiceNotes = `Auto-generated for endorsement ref: ${endorsement.endorsement_number || endorsement_id}. Net: EGP ${premiumImpact.toFixed(2)}, Tax: EGP ${calculatedTax.toFixed(2)}, Gross: EGP ${grossImpact.toFixed(2)}. Notes: ${endorsement.notes || ''}`;

    // 6. Call the single process_endorsement_invoicing database RPC transaction
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_endorsement_invoicing', {
      p_endorsement_id: endorsement_id,
      p_invoice_number: invoiceNumber,
      p_invoice_type: invoiceType,
      p_issue_date: issueDate,
      p_due_date: dueDate,
      p_amount_due: grossImpact,
      p_notes: invoiceNotes,
      p_computed_premium_impact: premiumImpact,
      p_computed_sum_insured_impact: sumInsuredImpact,
      p_items_to_update: itemsToUpdate,
      p_members_to_insert: membersToInsert,
      p_members_to_delete: memberDeletionsToQueue,
      p_audit_logs_to_insert: auditLogsToInsert,
      p_user_id: requesterProfile.id,
      p_lob_key: policy.policy_type || (endorsement as any).line_of_business || 'MEDICAL'
    });

    if (rpcError) {
      console.error('RPC process_endorsement_invoicing failed:', rpcError);
      return NextResponse.json({ error: 'Failed to process endorsement invoicing transaction: ' + rpcError.message }, { status: 500 });
    }

    // Update status to Issued and set approval fields
    const { error: statusUpdateError } = await supabaseAdmin
      .from('endorsements')
      .update({
        status: 'Issued',
        approval_ref: approval_ref || null,
        approval_date: approval_date || null
      })
      .eq('id', endorsement_id);

    if (statusUpdateError) {
      console.error('Failed to update status to Issued:', statusUpdateError);
    }

    return NextResponse.json({
      message: rpcResult.status === 'Approved' ? 'Non-financial endorsement processed with zero invoice impact' : 'Invoice created, members synchronized and linked successfully',
      invoice_id: rpcResult.invoice_id,
      invoice_number: rpcResult.invoice_number
    });

  } catch (err: any) {
    console.error('Invoicing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
