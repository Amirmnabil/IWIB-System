import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { addMonths } from "date-fns";

export class InstallmentService {
  /**
   * Generates premium installments based on policy details.
   */
  static async generateInstallments(policyId: string, startDate: string, endDate: string, frequency: string, totalPremium: number): Promise<void> {
    if (!policyId || !startDate || !totalPremium || !frequency) return;

    const { data: policy } = await supabase.from('policies').select('contract_net, tax_type, tax_amount, taxes_percent').eq('id', policyId).single();

    let monthsInterval = 12;
    let numInstallments = 1;

    switch (frequency) {
      case 'Monthly':
        monthsInterval = 1;
        // Approximate months
        numInstallments = 12;
        break;
      case 'Quarterly':
        monthsInterval = 3;
        numInstallments = 4;
        break;
      case 'Semi-Annual':
        monthsInterval = 6;
        numInstallments = 2;
        break;
      case 'Annual':
      default:
        monthsInterval = 12;
        numInstallments = 1;
        break;
    }

    const baseDate = new Date(startDate);
    const installments = [];
    
    let netPremium = policy?.contract_net || 0;
    let totalTax = 0;
    if (policy?.tax_type === 'percentage') {
      totalTax = netPremium * ((policy.tax_amount || 0) / 100);
    } else if (policy?.tax_type === 'amount') {
      totalTax = policy.tax_amount || 0;
    }

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = addMonths(baseDate, i * monthsInterval);
      
      let amount = totalPremium / numInstallments;
      if (policy?.taxes_percent && policy.taxes_percent > 0) {
        const installmentNet = netPremium / numInstallments;
        if (i + 1 === policy.taxes_percent) {
          amount = installmentNet + totalTax;
        } else {
          amount = installmentNet;
        }
      }

      installments.push({
        policy_id: policyId,
        amount: amount,
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

    const { error } = await supabase.rpc('net_invoices', {
      p_source_id: sourceId,
      p_target_ids: targetIds
    });

    if (error) throw new Error(error.message);
  }

  /**
   * Reverses a single netting operation atomically using an RPC.
   */
  static async reverseNetting(nettingId: string): Promise<void> {
    const { error } = await supabase.rpc('reverse_netting', {
      p_netting_id: nettingId
    });

    if (error) throw new Error(error.message);
  }
}
