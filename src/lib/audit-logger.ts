import { supabase } from "@/lib/supabase";

export interface AuditUser {
  uid?: string;
  displayName?: string;
  email?: string;
}

export interface AuditEvent {
  action: 'create' | 'update' | 'delete' | 'duplicate_attempt' | 'merge';
  resource_type: 'contact' | 'company' | 'activity';
  resource_id?: string;
  resource_name?: string;
  changes?: Record<string, any>;
}

/**
 * Persists an administrative audit event to the 'audit_logs' table in Supabase.
 */
export async function logAuditEvent(
  _dummy: any, // Kept signature for backwards compatibility
  user: AuditUser | null,
  event: AuditEvent
): Promise<void> {
  try {
    const logData = {
      user_id: user?.uid || null,
      user_name: user?.displayName || user?.email || "System/Anonymous",
      action: event.action,
      resource_type: event.resource_type,
      resource_id: event.resource_id || "",
      resource_name: event.resource_name || "",
      changes: event.changes ? JSON.parse(JSON.stringify(event.changes)) : null,
      created_at: new Date().toISOString()
    };
    await supabase.from("audit_logs").insert(logData);
  } catch (error) {
    console.error("[AuditLogger] Failed to persist audit event:", error);
  }
}
