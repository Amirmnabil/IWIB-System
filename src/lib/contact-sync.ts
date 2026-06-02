
import { ContactService, SyncContactPayload } from "./services/ContactService";

export interface SyncContactData {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_id?: string;
  company_name?: string;
  role_type?: string;
  role_id?: string;
  is_primary?: boolean;
  notes?: string;
}

/**
 * Synchronizes a contact to the global 'contacts' collection using Supabase.
 * If a contact with the same email exists, it updates it.
 * Otherwise, it creates a new record.
 */
export async function syncContact(firestore: any | null, data: SyncContactData, user: any = null) {
  if (!data.name) return;

  try {
    const nameParts = data.name.trim().split(' ');
    const first_name = nameParts[0];
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';

    const payload: SyncContactPayload = {
      first_name,
      last_name,
      email: data.email?.toLowerCase().trim() || "",
      phone: data.phone || "",
      mobile: data.mobile || "",
      role_id: data.role_id || "",
      company_id: data.company_id || "",
      company_name: data.company_name || "",
      notes: data.notes || ""
    };

    // If it's explicitly from legacy fallback types
    if (!data.role_id && data.role_type) {
      if (data.role_type === 'Insurer') payload.role_name_en = 'Insurer Contact';
      else if (data.role_type === 'Broker') payload.role_name_en = 'Broker Contact';
      else if (data.role_type === 'Client') payload.role_name_en = 'HR Manager';
      else payload.role_name_en = data.role_type;
    } // Usually primary contacts at clients are HR/Admin

    await ContactService.syncContact(payload, user, 'Legacy Module Sync');
    
  } catch (error) {
    console.error("Error syncing contact via ContactService:", error);
  }
}
