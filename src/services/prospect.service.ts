import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import type { Prospect } from "@/lib/types";

export class ProspectService {
  /**
   * Creates a new prospect.
   */
  static cleanUuid(uuidStr?: string) {
    if (!uuidStr) return null;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuidStr) ? uuidStr : null;
  }

  static async createProspect(payload: any) {
    const detailsData = {
      proposal_versions: payload.proposal_versions || [],
      final_premium: payload.final_premium || payload.estimated_value || 0,
      insurance_company: payload.insurance_company || payload.current_insurer || "",
      commission: payload.commission || 0,
      decision_maker: payload.decision_maker || "",
      competitors: payload.competitors || [],
      notes: payload.notes || ""
    };

    const prospectPayload = { ...payload };
    delete prospectPayload.proposal_versions;
    delete prospectPayload.final_premium;
    delete prospectPayload.insurance_company;
    delete prospectPayload.commission;
    delete prospectPayload.decision_maker;
    delete prospectPayload.competitors;
    delete prospectPayload.details;
    delete prospectPayload.outcome;

    const { data, error } = await supabase
      .from("prospects")
      .insert(sanitizeUUIDs({
        ...prospectPayload,
        created_at: new Date().toISOString()
      }))
      .select()
      .single();

    if (error) throw error;

    if (data) {
      await supabase
        .from("prospect_details")
        .insert(sanitizeUUIDs({
          prospect_id: data.id,
          company_id: this.cleanUuid(data.company_id),
          ...detailsData
        }));
    }

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
  static async updateProspect(id: string, payload: any) {
    const detailsData = {} as any;
    if ('proposal_versions' in payload) detailsData.proposal_versions = payload.proposal_versions;
    if ('final_premium' in payload) detailsData.final_premium = payload.final_premium;
    if ('insurance_company' in payload) detailsData.insurance_company = payload.insurance_company;
    if ('commission' in payload) detailsData.commission = payload.commission;
    if ('decision_maker' in payload) detailsData.decision_maker = payload.decision_maker;
    if ('competitors' in payload) detailsData.competitors = payload.competitors;
    if ('notes' in payload) detailsData.notes = payload.notes;

    const prospectPayload = { ...payload };
    delete prospectPayload.proposal_versions;
    delete prospectPayload.final_premium;
    delete prospectPayload.insurance_company;
    delete prospectPayload.commission;
    delete prospectPayload.decision_maker;
    delete prospectPayload.competitors;
    delete prospectPayload.details;
    delete prospectPayload.outcome;

    const { data, error } = await supabase
      .from("prospects")
      .update(prospectPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (Object.keys(detailsData).length > 0) {
      await supabase
        .from("prospect_details")
        .upsert(sanitizeUUIDs({
          prospect_id: id,
          company_id: this.cleanUuid(data.company_id),
          ...detailsData,
          updated_at: new Date().toISOString()
        }), { onConflict: 'prospect_id' });
    }

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
  static async convertToPolicy(prospect: Prospect, wonData?: any) {
    // 1. Update prospect stage to 'closed_won'
    const { error: convertError } = await supabase
      .from('prospects')
      .update({ pipeline_stage: 'closed_won' })
      .eq('id', prospect.id);

    if (convertError) throw convertError;

    // 1b. Upsert Deal outcome (won)
    await supabase
      .from('deal_outcomes')
      .upsert(sanitizeUUIDs({
        prospect_id: prospect.id,
        outcome: 'won',
        reason: 'Closed Won',
        details: wonData?.details || 'Deal successfully won.'
      }), { onConflict: 'prospect_id' });

    // 1c. Update final prospect details
    if (wonData) {
      await supabase
        .from('prospect_details')
        .upsert(sanitizeUUIDs({
          prospect_id: prospect.id,
          company_id: this.cleanUuid(prospect.company_id),
          final_premium: wonData.final_premium || prospect.estimated_value || 0,
          insurance_company: wonData.insurance_company || prospect.current_insurer || '',
          commission: wonData.commission || 0,
          updated_at: new Date().toISOString()
        }), { onConflict: 'prospect_id' });
    }

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
