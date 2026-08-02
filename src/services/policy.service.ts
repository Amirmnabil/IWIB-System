import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { sanitizeStorageFilename } from "@/lib/utils/sanitize-storage-filename";
import { InstallmentService } from "./installment.service";

export class PolicyService {
  /**
   * Helper to validate/sanitize UUID strings.
   */
  private static cleanUuid(uuidStr?: string) {
    if (!uuidStr) return null;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuidStr) ? uuidStr : null;
  }

  /**
   * Uploads a file to the documents storage bucket.
   */
  static async uploadFile(file: File, path: string): Promise<string> {
    const safeFilename = sanitizeStorageFilename(file.name);
    const fileName = `${path}/${Date.now()}_${safeFilename}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Creates a new policy and optionally inserts policy members.
   */
  static async createPolicy(policyData: any, membersPayload?: any[]): Promise<string> {
    const { data, error } = await supabase
      .from("policies")
      .insert(sanitizeUUIDs({
        ...policyData,
        created_at: new Date().toISOString()
      }))
      .select()
      .single();

    if (error) throw error;
    const policyId = data.id;

    if (membersPayload && membersPayload.length > 0) {
      const sanitizedMembers = membersPayload.map(m => ({
        ...m,
        policy_id: this.cleanUuid(policyId)
      }));

      const { error: membersError } = await supabase
        .from("policy_members")
        .insert(sanitizeUUIDs(sanitizedMembers));

      if (membersError) throw membersError;

      // Update member count on policy record
      const { error: updateError } = await supabase
        .from("policies")
        .update({ member_count: membersPayload.length })
        .eq("id", policyId);

      if (updateError) throw updateError;
    }

    if (policyData.payment_frequency && policyData.start_date && policyData.contract_net) {
      await InstallmentService.generateInstallments(
        policyId,
        policyData.start_date,
        policyData.end_date,
        policyData.payment_frequency,
        policyData.contract_net
      );
    }

    return policyId;
  }

  /**
   * Updates an existing policy and optionally replaces policy members.
   */
  static async updatePolicy(id: string, policyData: any, membersPayload?: any[]): Promise<void> {
    const { error } = await supabase
      .from("policies")
      .update(policyData)
      .eq("id", id);

    if (error) throw error;

    if (membersPayload && membersPayload.length > 0) {
      // Delete old members
      await supabase
        .from('policy_members')
        .delete()
        .eq('policy_id', id);

      const sanitizedMembers = membersPayload.map(m => ({
        ...m,
        policy_id: this.cleanUuid(id)
      }));

      const { error: insertError } = await supabase
        .from('policy_members')
        .insert(sanitizeUUIDs(sanitizedMembers));

      if (insertError) throw insertError;

      // Update member count on policy record
      const { error: updateError } = await supabase
        .from("policies")
        .update({ member_count: membersPayload.length })
        .eq("id", id);

      if (updateError) throw updateError;
    }
  }

  /**
   * Deletes a policy by its ID.
   */
  static async deletePolicy(id: string): Promise<void> {
    const { error } = await supabase
      .from("policies")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
