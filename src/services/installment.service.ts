import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { addMonths } from "date-fns";

export class InstallmentService {
  /**
   * Generates premium installments based on policy details.
   */
  static async generateInstallments(policyId: string, startDate: string, endDate: string, frequency: string, totalPremium: number): Promise<void> {
    if (!policyId) return;

    // Delete existing installments for this policy to prevent duplicates or clean up zero-premium policies
    const { error: deleteError } = await supabase
      .from('installments')
      .delete()
      .eq('policy_id', policyId);

    if (deleteError) {
      console.error("Failed to delete existing installments:", deleteError);
    }

    if (!startDate || totalPremium === undefined || totalPremium === null || totalPremium < 0) {
      return;
    }

    const { data: policy } = await supabase
      .from('policies')
      .select('contract_net, tax_type, tax_amount, tax_override, taxes_percent, payment_frequency_id, payment_terms')
      .eq('id', policyId)
      .single();

    let resolvedFrequency = frequency;
    if (!resolvedFrequency && policy) {
      if (policy.payment_frequency_id) {
        const { data: freqDoc } = await supabase
          .from('master_payment_frequencies')
          .select('name')
          .eq('id', policy.payment_frequency_id)
          .maybeSingle();
        if (freqDoc) resolvedFrequency = freqDoc.name;
      }
      if (!resolvedFrequency) {
        resolvedFrequency = policy.payment_terms;
      }
    }
    if (!resolvedFrequency) resolvedFrequency = 'Annual';

    let monthsInterval = 12;
    let numInstallments = 1;

    switch (resolvedFrequency.toLowerCase()) {
      case 'monthly':
        monthsInterval = 1;
        numInstallments = 12;
        break;
      case 'quarterly':
        monthsInterval = 3;
        numInstallments = 4;
        break;
      case 'semi-annual':
      case 'semiannual':
        monthsInterval = 6;
        numInstallments = 2;
        break;
      case 'annual':
      default:
        monthsInterval = 12;
        numInstallments = 1;
        break;
    }

    const baseDate = new Date(startDate);
    const installments = [];
    
    const netPremium = totalPremium || policy?.contract_net || 0;
    const installmentNet = netPremium / numInstallments;

    // Calculate Total Tax
    let totalTax = 0;
    const taxAmountVal = policy?.tax_amount || 0;
    if (policy?.tax_type === 'percentage') {
      totalTax = netPremium * (taxAmountVal / 100);
    } else {
      totalTax = taxAmountVal;
    }

    const taxOverride = policy?.tax_override || policy?.taxes_percent || 1; // 1 means first invoice gets 100% tax, >1 means distribute
    const taxPerInstallment = taxOverride > 1 ? (totalTax / numInstallments) : 0;

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = addMonths(baseDate, i * monthsInterval);
      
      let invoiceTax = 0;
      if (taxOverride === 1 && i === 0) {
        invoiceTax = totalTax;
      } else if (taxOverride > 1) {
        invoiceTax = taxPerInstallment;
      }

      const installmentGross = installmentNet + invoiceTax;

      installments.push({
        policy_id: policyId,
        amount: installmentGross,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'Pending',
        created_at: new Date().toISOString()
      });
    }

    const { error } = await supabase
      .from('installments')
      .insert(sanitizeUUIDs(installments));

    if (error) throw error;
  }

  /**
   * Settles claims against an installment.
   */
  static async settleClaims(installmentId: string, claimIds: string[]): Promise<void> {
    if (!installmentId || !claimIds || claimIds.length === 0) return;

    const relations = claimIds.map(claimId => ({
      installment_id: installmentId,
      claim_id: claimId,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('installment_claims')
      .insert(sanitizeUUIDs(relations));

    if (insertError) throw insertError;

    // Update claim status to 'Settled'
    const { error: updateError } = await supabase
      .from('claims')
      .update({ status: 'Settled' })
      .in('id', claimIds);

    if (updateError) throw updateError;
  }

  /**
   * Nets one source invoice against multiple target invoices atomically using an RPC.
   */
  static async netInvoices(sourceId: string, targetIds: string[]): Promise<void> {
    if (!sourceId || !targetIds || targetIds.length === 0) return;

    const { error } = await supabase.rpc('net_installments', {
      p_source_id: sourceId,
      p_target_ids: targetIds
    });

    if (error) throw new Error(error.message);
  }

  /**
   * Reverses a single netting operation atomically using an RPC.
   */
  static async reverseNetting(nettingId: string): Promise<void> {
    const { error } = await supabase.rpc('reverse_installment_netting', {
      p_netting_id: nettingId
    });

    if (error) throw new Error(error.message);
  }
}
