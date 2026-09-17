import { getMailTransporter } from './nodemailer';
import { logEmailAttempt } from './email-logger';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  relatedType?: 'member' | 'policy';
  metadata?: {
    companyName?: string;
    actionType?: string;
    memberCount?: number;
    [key: string]: any;
  };
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts?: number;
  retried?: boolean;
}

/**
 * Sends an email using Gmail SMTP via Nodemailer.
 * 
 * Reliability Features:
 * - Exponential backoff retry mechanism (Up to 3 attempts: 1s, 2s, 4s)
 * - Full structured logging with timestamps, recipient, subject, stack traces
 * - Debug Mode Support (EMAIL_DEBUG = true)
 * - Automatic DB logging to `email_logs`
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, relatedType, metadata } = options;
  const from = process.env.EMAIL_FROM || `IWIB System <${process.env.SMTP_USER || 'noreply@iwib.system'}>`;
  const isDebug = process.env.EMAIL_DEBUG === 'true' || process.env.NODE_ENV === 'development';
  const timestamp = new Date().toISOString();

  if (isDebug) {
    console.log(`\n======================================================`);
    console.log(`[${timestamp}] [EMAIL SERVICE DEBUG START]`);
    console.log(`Recipient: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Company Name: ${metadata?.companyName || 'N/A'}`);
    console.log(`Action Type: ${metadata?.actionType || 'N/A'}`);
    console.log(`Member Count: ${metadata?.memberCount || 1}`);
    console.log(`======================================================\n`);
  }

  if (!to || !subject || !html) {
    const errorMsg = 'Invalid parameters: "to", "subject", and "html" are required.';
    console.error(`[${timestamp}] [EMAIL SERVICE ERROR] ${errorMsg}`);
    await logEmailAttempt({
      toEmail: to || 'unknown',
      subject: subject || 'No Subject',
      status: 'failed',
      errorMessage: errorMsg,
      relatedType,
    });
    return { success: false, error: errorMsg, attempts: 0 };
  }

  // Debug copy recipient if set and different
  const recipientsSet = new Set<string>();
  to.split(',').forEach(e => {
    const trimmed = e.trim();
    if (trimmed) recipientsSet.add(trimmed);
  });

  if (isDebug && process.env.DEBUG_RECIPIENT_EMAIL) {
    process.env.DEBUG_RECIPIENT_EMAIL.split(',').forEach(e => {
      const trimmed = e.trim();
      if (trimmed) recipientsSet.add(trimmed);
    });
  }

  const finalTargetEmails = Array.from(recipientsSet).join(', ');

  const mailOptions = {
    from,
    to: finalTargetEmails,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''), // Fallback plain text
  };

  const MAX_ATTEMPTS = 3;
  let lastErrorStack: string = '';
  let lastErrorMessage: string = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptTime = new Date().toISOString();
    console.log(`[${attemptTime}] [SMTP ATTEMPT ${attempt}/${MAX_ATTEMPTS}] Initiating sendMail to "${finalTargetEmails}"...`);

    try {
      const transporter = getMailTransporter();
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`[${attemptTime}] [SMTP SUCCESS] Email delivered successfully to "${finalTargetEmails}".`);
      console.log(`  -> MessageID: ${info.messageId}`);
      console.log(`  -> Envelope: ${JSON.stringify(info.envelope || {})}`);
      console.log(`  -> Response: ${info.response || '250 OK'}`);

      await logEmailAttempt({
        toEmail: finalTargetEmails,
        subject,
        status: 'success',
        relatedType,
      });

      return {
        success: true,
        messageId: info.messageId,
        attempts: attempt,
        retried: attempt > 1,
      };
    } catch (err: any) {
      lastErrorMessage = err?.message || String(err);
      lastErrorStack = err?.stack || lastErrorMessage;

      console.error(`[${attemptTime}] [SMTP FAILURE - ATTEMPT ${attempt}/${MAX_ATTEMPTS}] Failed to send email to "${finalTargetEmails}":`);
      console.error(`  -> Error Message: ${lastErrorMessage}`);
      console.error(`  -> Full Stack: ${lastErrorStack}`);

      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
        console.warn(`[${attemptTime}] [SMTP RETRY WAITING] Waiting ${backoffMs}ms before attempt ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries failed
  const failureTime = new Date().toISOString();
  console.error(`[${failureTime}] [EMAIL SERVICE FATAL ERROR] All ${MAX_ATTEMPTS} attempts failed to deliver email to "${finalTargetEmails}".`);
  console.error(`  -> Final Error: ${lastErrorMessage}`);

  await logEmailAttempt({
    toEmail: finalTargetEmails,
    subject,
    status: 'failed',
    errorMessage: `All ${MAX_ATTEMPTS} attempts failed: ${lastErrorMessage}`,
    relatedType,
  });

  return {
    success: false,
    error: `All ${MAX_ATTEMPTS} attempts failed: ${lastErrorMessage}`,
    attempts: MAX_ATTEMPTS,
    retried: true,
  };
}

/**
 * Fires sendEmail asynchronously in the background without awaiting result.
 */
export function sendEmailAsync(options: SendEmailOptions): void {
  sendEmail(options).catch((err) => {
    console.error('[Email Service Async Error] Unhandled exception in background email execution:', err?.stack || err);
  });
}
