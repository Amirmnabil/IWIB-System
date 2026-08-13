import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

    // 2. Classify: non-financial endorsements do not generate invoices
    const premiumImpact = Number(endorsement.premium_impact || 0);
    if (premiumImpact === 0) {
      // Mark as Approved/Invoiced directly if there's no financial impact
      await supabaseAdmin
        .from('endorsements')
        .update({ status: 'Approved' })
        .eq('id', endorsement_id);
      return NextResponse.json({ message: 'Non-financial endorsement processed with zero invoice impact' });
    }

    // 3. Fetch policy details for linking
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('policies')
      .select('policy_number, client_company_name, client_company_id, insurer_id, insurer_name')
      .eq('id', endorsement.policy_id)
      .maybeSingle();

    if (policyError || !policy) {
      return NextResponse.json({ error: 'Policy not found for this endorsement' }, { status: 404 });
    }

    // 4. Generate unique invoice number
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `INV-END-${randomSuffix}`;

    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days net

    // Invoice type classification
    let invoiceType = 'Additional Premium';
    if (premiumImpact < 0) {
      invoiceType = 'Refund';
    } else if (endorsement.category === 'Exception') {
      invoiceType = 'Adjustment';
    }

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
      amount_due: premiumImpact,
      amount_paid: 0,
      status: premiumImpact < 0 ? 'paid' : 'unpaid', // refund/credit note marked paid or settled
      notes: `Auto-generated for endorsement ref: ${endorsement.endorsement_number || endorsement_id}. Notes: ${endorsement.notes || ''}`
    };

    // 5. Insert invoice
    const { data: invoice, error: invError } = await supabaseAdmin
      .from('invoices')
      .insert(invoicePayload)
      .select('id')
      .single();

    if (invError || !invoice) {
      console.error('Invoice creation failed:', invError);
      return NextResponse.json({ error: 'Failed to create invoice: ' + invError?.message }, { status: 500 });
    }

    // 6. Update endorsement status and link invoice
    const { error: updateError } = await supabaseAdmin
      .from('endorsements')
      .update({
        linked_invoice_id: invoice.id,
        status: 'Invoiced'
      })
      .eq('id', endorsement_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update endorsement: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Invoice created and linked successfully',
      invoice_id: invoice.id,
      invoice_number: invoiceNumber
    });
  } catch (err: any) {
    console.error('Invoicing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
