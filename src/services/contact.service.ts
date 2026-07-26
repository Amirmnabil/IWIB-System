import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-logger";

export interface SyncContactPayload {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  role_id?: string;
  role_name_en?: string;
  company_id?: string;
  company_name?: string;
  linked_policy_id?: string;
  entity_type?: string;
  entity_id?: string;
  notes?: string;
  preferred_contact_method?: string;
}

export class ContactService {
  /**
   * Automatically syncs a contact to the CRM.
   * If a contact with the same email or phone exists, it updates it.
   * Otherwise, it creates a new contact.
   */
  static async syncContact(
    payload: SyncContactPayload, 
    currentUser: any, 
    sourceModule: string
  ) {
    try {
      if (!payload.first_name && !payload.last_name) return null;
      // Removed requirement for email/phone to allow name-only contacts
      // 1. Fetch the master role ID based on the provided role_name_en
      let role_id = payload.role_id === "" ? null : (payload.role_id || null);
      let role_name = payload.role_name_en;
      
      if (!role_id && payload.role_name_en) {
        const { data: roleData, error: roleError } = await supabase
          .from("contact_roles")
          .select("id, role_name_en")
          .eq("role_name_en", payload.role_name_en)
          .maybeSingle();
        
        if (roleError) throw roleError;
          
        if (roleData) {
          role_id = roleData.id;
          role_name = roleData.role_name_en;
        }
      } else if (role_id && !role_name) {
         const { data: roleData, error: roleError } = await supabase
          .from("contact_roles")
          .select("role_name_en")
          .eq("id", role_id)
          .maybeSingle();
         if (roleError) throw roleError;
         if (roleData) role_name = roleData.role_name_en;
      }

      // 2. Check for existing contact by email or phone
      let existingContact = null;
      
      const searchConditions = [];
      if (payload.email) searchConditions.push(`email.ilike.${payload.email}`);
      if (payload.phone) searchConditions.push(`phone.eq.${payload.phone}`, `mobile.eq.${payload.phone}`);
      if (payload.mobile) searchConditions.push(`phone.eq.${payload.mobile}`, `mobile.eq.${payload.mobile}`);

      if (searchConditions.length > 0) {
        const { data: existingData, error: findError } = await supabase
          .from("contacts")
          .select("*")
          .or(searchConditions.join(","))
          .limit(1);
        if (findError) throw findError;
          
        if (existingData && existingData.length > 0) {
          existingContact = existingData[0];
        }
      }

      // 3. Fallback: Check by name and company if no email/phone match found
      if (!existingContact && payload.first_name && payload.company_id) {
        const { data: existingByName, error: findError } = await supabase
          .from("contacts")
          .select("*")
          .eq("first_name", payload.first_name)
          .eq("last_name", payload.last_name || "")
          .eq("company_id", payload.company_id)
          .limit(1);
        if (findError) throw findError;
          
        if (existingByName && existingByName.length > 0) {
          existingContact = existingByName[0];
        }
      }

      const savePayload = {
        first_name: payload.first_name || existingContact?.first_name,
        last_name: payload.last_name || existingContact?.last_name || "",
        email: payload.email || existingContact?.email || null,
        phone: payload.phone || existingContact?.phone || null,
        mobile: payload.mobile || existingContact?.mobile || null,
        role_type: role_name || existingContact?.role_type || null,
        role_id: role_id || existingContact?.role_id,
        company_id: payload.company_id || existingContact?.company_id,
        company_name: payload.company_name || existingContact?.company_name || "",
        preferred_contact_method: payload.preferred_contact_method || existingContact?.preferred_contact_method || "Email",
        linked_policy_id: payload.linked_policy_id || existingContact?.linked_policy_id,
        entity_type: payload.entity_type || existingContact?.entity_type,
        entity_id: payload.entity_id === "" ? null : (payload.entity_id || existingContact?.entity_id),
        notes: payload.notes || existingContact?.notes || `[Auto-synced from ${sourceModule}]`
      };

      if (existingContact) {
        // Update existing contact
        const { error: updateError } = await supabase
          .from("contacts")
          .update(savePayload)
          .eq("id", existingContact.id);

        if (updateError) throw updateError;

        await logAuditEvent(null, currentUser, {
          action: 'update',
          resource_type: 'contact',
          resource_id: existingContact.id,
          resource_name: `${savePayload.first_name} ${savePayload.last_name}`,
          changes: { ...savePayload, source: sourceModule }
        });

        return existingContact.id;
      } else {
        // Create new contact
        const { data: newContact, error: insertError } = await supabase
          .from("contacts")
          .insert(sanitizeUUIDs({ ...savePayload, created_at: new Date().toISOString() }))
          .select()
          .single();

        if (insertError) throw insertError;

        await logAuditEvent(null, currentUser, {
          action: 'create',
          resource_type: 'contact',
          resource_id: newContact.id,
          resource_name: `${savePayload.first_name} ${savePayload.last_name}`,
          changes: { ...savePayload, source: sourceModule }
        });

        return newContact.id;
      }
    } catch (error: any) {
      console.error("[ContactService] Sync failed! Message:", error?.message);
      console.error("[ContactService] Sync failed! Stack:", error?.stack);
      console.error("[ContactService] Sync failed! Details:", error?.details, error?.hint, error?.code);
      return null;
    }
  }

  /**
   * Utility to sync multiple contacts at once
   */
  static async syncMultipleContacts(
    contacts: SyncContactPayload[],
    currentUser: any,
    sourceModule: string
  ) {
    const results = [];
    for (const c of contacts) {
      const id = await this.syncContact(c, currentUser, sourceModule);
      if (id) results.push(id);
    }
    return results;
  }
}
