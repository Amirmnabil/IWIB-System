import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import type { Prospect } from "@/lib/types";

export class ProspectService {
  /**
   * Creates a new prospect.
   */
  static async createProspect(payload: Omit<Prospect, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from("prospects")
      .insert(sanitizeUUIDs({
        ...payload,
        created_at: new Date().toISOString()
      }))
      .select()
      .single();

    if (error) throw error;

    // Keep company profile status synchronized to 'prospect'
    if (payload.company_id) {
      await supabase
        .from("companies")
        .update({ status: 'prospect', updated_at: new Date().toISOString() })
        .eq("id", payload.company_id);
    }

    return data;
  }

  /**
   * Updates an existing prospect.
   */
  static async updateProspect(id: string, payload: Partial<Prospect>) {
    const { data, error } = await supabase
      .from("prospects")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Keep company profile status synchronized to 'prospect'
    if (payload.company_id) {
      await supabase
        .from("companies")
        .update({ status: 'prospect', updated_at: new Date().toISOString() })
        .eq("id", payload.company_id);
    }

    return data;
  }

  /**
   * Deletes a prospect.
   */
  static async deleteProspect(id: string) {
    const { error } = await supabase
      .from("prospects")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }

  /**
   * Converts a prospect to a policy.
   * Updates the pipeline stage, company status, and creates the policy draft.
   */
  static async convertToPolicy(prospect: Prospect) {
    // 1. Update prospect stage to 'closed_won'
    const { error: convertError } = await supabase
      .from('prospects')
      .update({ pipeline_stage: 'closed_won' })
      .eq('id', prospect.id);

    if (convertError) throw convertError;

    // 2. Update company status to 'client'
    if (prospect.company_id) {
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          status: 'client',
          updated_at: new Date().toISOString()
        })
        .eq('id', prospect.company_id);
      if (companyError) throw companyError;
    }

    // 3. Match insurer
    let insurerId = null;
    let insurerName = prospect.current_insurer || "";
    if (insurerName) {
      const { data: matchedInsurers } = await supabase
        .from('insurance_companies')
        .select('id, companyName')
        .ilike('companyName', insurerName)
        .limit(1);
      if (matchedInsurers && matchedInsurers.length > 0) {
        insurerId = matchedInsurers[0].id;
        insurerName = matchedInsurers[0].companyName;
      }
    }

    // Match policy type
    const VALID_POLICY_TYPES = ["medical", "life", "motor", "property", "liability", "travel"];
    const reqProduct = prospect.requested_products?.[0]?.toLowerCase() || "";
    const policyType = VALID_POLICY_TYPES.includes(reqProduct) ? reqProduct : "medical";

    // Generate draft policy number
    const cleanName = (prospect.company_name || "CO")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generatedPolicyNumber = `POL-DRAFT-${cleanName}-${rand}`;

    // 4. Create Policy record
    const { data: insertedPolicy, error: policyError } = await supabase
      .from('policies')
      .insert(sanitizeUUIDs({
        policy_number: generatedPolicyNumber,
        client_company_name: prospect.company_name,
        client_company_id: prospect.company_id || null,
        insurer_name: insurerName,
        insurer_id: insurerId,
        tpa_name: prospect.current_tpa || null,
        tpa_id: null,
        policy_type: policyType,
        premium_total: prospect.estimated_value || 0,
        premium_gross: prospect.estimated_value || 0,
        contract_net: prospect.estimated_value || 0,
        sales_person: prospect.assigned_user_name || "",
        policy_status: 'draft',
        created_at: new Date().toISOString()
      }))
      .select('id')
      .single();

    if (policyError) throw policyError;

    return {
      policyId: insertedPolicy.id,
      generatedPolicyNumber
    };
  }
}
