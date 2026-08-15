import { supabase } from "./supabase";
import { addMonths } from "date-fns";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";

export async function generatePolicyInvoices(policyId: string) {
  try {
    console.log("Generating automated invoices for policy:", policyId);

    // 1. Fetch Policy Data
    const { data: policy, error: policyError } = await supabase
      .from('policies')
      .select('*')
      .eq('id', policyId)
      .maybeSingle();

    if (policyError || !policy) {
      console.error("Policy fetch error in invoice generation:", policyError);
      throw new Error(`Policy not found or error fetching: ${policyError?.message || 'unknown'}`);
    }

    if ((policy.contract_net || 0) <= 0) {
      console.log("Net Premium is 0, clearing existing draft invoices.");
      await supabase
        .from('invoices')
        .delete()
        .eq('policy_id', policyId)
        .eq('status', 'draft');
      return { count: 0 };
    }

    // 2. Determine Payment Frequency & Num Installments
    const frequency = policy.payment_terms || 'annual';
    let monthsInterval = 12;
    let numInstallments = 1;

    switch (frequency.toLowerCase()) {
      case 'monthly':
        monthsInterval = 1;
        numInstallments = 12;
        break;
      case 'quarterly':
        monthsInterval = 3;
        numInstallments = 4;
        break;
      case 'semi-annual':
        monthsInterval = 6;
        numInstallments = 2;
        break;
      case 'annual':
      default:
        monthsInterval = 12;
        numInstallments = 1;
        break;
    }

    if (!policy.start_date) {
      console.warn("Policy start_date is missing. Cannot generate invoices.");
      return { count: 0 };
    }

    const baseDate = new Date(policy.start_date);
    const invoicesToInsert: any[] = [];
    const taxOverride = policy.tax_override || policy.taxes_percent || 1; // 1 means first invoice, N means distribute

    // --- 1) CONTRACT VALUE INVOICES (Premium Invoices) ---
    const netPremium = policy.contract_net || 0;
    const installmentNet = netPremium / numInstallments;
    
    // Calculate Total Tax
    let totalTax = 0;
    if (policy.tax_type === 'percentage') {
      totalTax = netPremium * ((policy.tax_amount || 0) / 100);
    } else {
      totalTax = policy.tax_amount || 0;
    }

    const taxPerInstallment = taxOverride > 1 ? (totalTax / numInstallments) : 0;

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = addMonths(baseDate, i * monthsInterval);
      
      let invoiceTax = 0;
      if (taxOverride === 1 && i === 0) {
        invoiceTax = totalTax; // 100% on first invoice
      } else if (taxOverride > 1) {
        invoiceTax = taxPerInstallment; // Distributed equally
      }

      const grossAmount = installmentNet + invoiceTax;

      invoicesToInsert.push({
        invoice_number: `${policy.policy_number}-PRM-${i + 1}`,
        policy_id: policy.id,
        policy_number: policy.policy_number,
        client_company_id: policy.client_company_id,
        client_company_name: policy.client_company_name,
        invoice_type: 'premium',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        amount_due: grossAmount,
        amount_paid: 0,
        status: 'draft',
        notes: `Premium Installment ${i + 1} of ${numInstallments} (Net: ${installmentNet.toFixed(2)}, Tax: ${invoiceTax.toFixed(2)})`,
      });
    }

    // --- 2) COMMISSION INVOICES ---
    // Fetch Commission Agreements
    const { data: agreements } = await supabase
      .from('commission_agreements')
      .select('*')
      .eq('policy_id', policyId);

    if (agreements && agreements.length > 0) {
      const aggr = agreements[0];
      
      // Step 1: Adjust Net Premium (deduct TPA Fees if any)
      let adjustedNetPremium = netPremium;
      let tpaFeeDeduction = 0;
      
      const tpaFee = aggr.tpa_fee || aggr.tpaFee;
      if (tpaFee) {
        if (tpaFee.type === 'percentage') {
          tpaFeeDeduction = netPremium * (Number(tpaFee.value) / 100);
        } else {
          tpaFeeDeduction = Number(tpaFee.value) || 0;
        }
        adjustedNetPremium = Math.max(0, netPremium - tpaFeeDeduction);
      }

      // Step 2: Commission Value
      const commRate = aggr.commission_structure?.essential?.rate || aggr.rate_percent || 0;
      const totalCommission = adjustedNetPremium * commRate;
      const installmentCommission = totalCommission / numInstallments;

      // Step 3: Apply Insurance Company Taxes
      const insurerTaxPercent = policy.insurance_companies?.commission_tax_percent || 0;
      const totalCommTax = totalCommission * (insurerTaxPercent / 100);
      const installmentCommTax = totalCommTax / numInstallments;

      for (let i = 0; i < numInstallments; i++) {
        const dueDate = addMonths(baseDate, i * monthsInterval);
        const netComm = installmentCommission - installmentCommTax;

        invoicesToInsert.push({
          invoice_number: `${policy.policy_number}-COM-${i + 1}`,
          policy_id: policy.id,
          policy_number: policy.policy_number,
          client_company_id: policy.client_company_id,
          client_company_name: policy.client_company_name,
          invoice_type: 'commission',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          amount_due: netComm, // Net commission payable
          amount_paid: 0,
          status: 'draft',
          notes: `Commission Installment ${i + 1} of ${numInstallments} (Net: ${installmentCommission.toFixed(2)}, Tax: ${installmentCommTax.toFixed(2)})`,
        });
      }
    }

    // --- 3) SHARING INVOICES ---
    // Assuming policy has internal sharing configuration in metadata
    const sharingConfig = policy.metadata?.sharing;
    if (sharingConfig && sharingConfig.amount > 0) {
      const sharingAmount = sharingConfig.amount;
      const installmentSharing = sharingAmount / numInstallments;
      
      const sharingTaxPercent = sharingConfig.applyTax ? (policy.tax_amount || 0) : 0; // Configurable tax
      
      for (let i = 0; i < numInstallments; i++) {
        const dueDate = addMonths(baseDate, i * monthsInterval);
        const sharingTax = sharingConfig.applyTax ? (installmentSharing * (sharingTaxPercent / 100)) : 0;
        const totalSharing = installmentSharing + sharingTax;

        invoicesToInsert.push({
          invoice_number: `${policy.policy_number}-SHR-${i + 1}`,
          policy_id: policy.id,
          policy_number: policy.policy_number,
          client_company_id: policy.client_company_id,
          client_company_name: policy.client_company_name,
          invoice_type: 'sharing',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          amount_due: totalSharing,
          amount_paid: 0,
          status: 'draft',
          notes: `Sharing Installment ${i + 1} of ${numInstallments} (Net: ${installmentSharing.toFixed(2)}, Tax: ${sharingTax.toFixed(2)})`,
        });
      }
    }

    // Delete existing unpaid auto-generated invoices for this policy to prevent duplication if regenerated
    await supabase
      .from('invoices')
      .delete()
      .eq('policy_id', policyId)
      .eq('status', 'draft');

    // Insert all newly generated invoices
    if (invoicesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('invoices')
        .insert(sanitizeUUIDs(invoicesToInsert));

      if (insertError) throw insertError;
    }

    return { count: invoicesToInsert.length };

  } catch (error: any) {
    console.error("Error generating invoices:", error);
    throw new Error(error.message || "Failed to generate invoices");
  }
}

export async function generateInvoicesForAllPolicies() {
  const { data: policies, error } = await supabase.from('policies').select('id');
  if (error || !policies) throw new Error("Failed to fetch policies");

  let count = 0;
  for (const p of policies) {
    try {
      const res = await generatePolicyInvoices(p.id);
      count += res.count;
    } catch (e) {
      console.warn(`Failed to generate invoices for policy ${p.id}`, e);
    }
  }

  return { count };
}

export async function checkAndNotifyUpcomingInvoices(userId: string) {
  // Check logic for upcoming invoices and generate notifications
  const { data: upcoming } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'draft')
    .lte('due_date', addMonths(new Date(), 1).toISOString())
    .limit(10);
    
  // Stub notification logic...
  return upcoming?.length || 0;
}
