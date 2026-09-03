import { supabase } from '@/lib/supabase';

export interface EmailLogData {
  toEmail: string;
  subject: string;
  status: 'success' | 'failed';
  errorMessage?: string | null;
  relatedType?: 'member' | 'policy';
}

/**
 * Persists email sending result into the email_logs table.
 * Designed to handle errors internally without breaking application flow.
 */
export async function logEmailAttempt(data: EmailLogData): Promise<void> {
  try {
    const payload = {
      to_email: data.toEmail,
      subject: data.subject,
      status: data.status,
      error_message: data.errorMessage || null,
      related_type: data.relatedType || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('email_logs').insert([payload]);

    if (error) {
      console.error('[Email Logger Error] Failed to write to email_logs:', error.message || error);
    } else {
      console.log(`[Email Logger] Successfully logged email dispatch [${data.status}] to ${data.toEmail}`);
    }
  } catch (err: any) {
    console.error('[Email Logger Exception] Exception occurred while logging email:', err?.message || err);
  }
}
