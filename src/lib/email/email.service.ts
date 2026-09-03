import { getMailTransporter } from './nodemailer';
import { logEmailAttempt } from './email-logger';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  relatedType?: 'member' | 'policy';
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retried?: boolean;
}

/**
 * Sends an email using Gmail SMTP via Nodemailer.
 * 
 * Features:
 * - Safe async/non-blocking execution
 * - Single automatic retry on transient failures
 * - System error resilience (does not crash caller)
 * - Automatic DB logging to `email_logs`
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, relatedType } = options;
  const from = process.env.EMAIL_FROM || `IWIB System <${process.env.SMTP_USER || 'noreply@iwib.system'}>`;

  if (!to || !subject || !html) {
    const errorMsg = 'Invalid parameters: "to", "subject", and "html" are required.';
    console.error(`[Email Service Error] ${errorMsg}`);
    await logEmailAttempt({
      toEmail: to || 'unknown',
      subject: subject || 'No Subject',
      status: 'failed',
      errorMessage: errorMsg,
      relatedType,
    });
    return { success: false, error: errorMsg };
  }

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''), // Fallback plain text representation
  };

  const attemptSend = async (): Promise<{ success: boolean; messageId?: string; error?: any }> => {
    const transporter = getMailTransporter();
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  };

  try {
    // Primary Attempt
    const result = await attemptSend();
    console.log(`[Email Service] Email sent successfully to ${to}. MessageId: ${result.messageId}`);
    
    await logEmailAttempt({
      toEmail: to,
      subject,
      status: 'success',
      relatedType,
    });

    return { success: true, messageId: result.messageId };
  } catch (firstError: any) {
    const firstErrorMessage = firstError?.message || String(firstError);
    console.warn(`[Email Service Warning] First attempt failed to send email to ${to}: ${firstErrorMessage}. Retrying in 1s...`);

    // Retry Attempt after 1 second delay
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const retryResult = await attemptSend();
      console.log(`[Email Service Retry Success] Retry succeeded for email to ${to}. MessageId: ${retryResult.messageId}`);

      await logEmailAttempt({
        toEmail: to,
        subject,
        status: 'success',
        relatedType,
      });

      return { success: true, messageId: retryResult.messageId, retried: true };
    } catch (retryError: any) {
      const finalErrorMessage = retryError?.message || String(retryError);
      console.error(`[Email Service Error] Final attempt failed to send email to ${to}: ${finalErrorMessage}`);

      await logEmailAttempt({
        toEmail: to,
        subject,
        status: 'failed',
        errorMessage: finalErrorMessage,
        relatedType,
      });

      return { success: false, error: finalErrorMessage, retried: true };
    }
  }
}

/**
 * Fires sendEmail asynchronously in the background without awaiting result.
 */
export function sendEmailAsync(options: SendEmailOptions): void {
  sendEmail(options).catch((err) => {
    console.error('[Email Service Async Error] Unhandled exception in background email execution:', err);
  });
}
