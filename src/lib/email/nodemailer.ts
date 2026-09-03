import nodemailer from 'nodemailer';

/**
 * Gmail SMTP Configuration
 * Host: smtp.gmail.com
 * Port: 587
 * Secure: false (STARTTLS)
 */
export function getMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('[SMTP Warning] SMTP_USER or SMTP_PASS environment variables are not set.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false, // TLS / STARTTLS on port 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

/**
 * Helper to verify SMTP server connectivity
 */
export async function verifySMTPConnection(): Promise<boolean> {
  try {
    const transporter = getMailTransporter();
    await transporter.verify();
    console.log('[SMTP Success] Gmail SMTP connection verified successfully.');
    return true;
  } catch (error: any) {
    console.error('[SMTP Error] Failed to connect to Gmail SMTP:', error?.message || error);
    return false;
  }
}
