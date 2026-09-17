import nodemailer, { Transporter } from 'nodemailer';

let globalTransporter: Transporter | null = null;

/**
 * Gmail SMTP Configuration with Connection Pooling & Rate Limiting
 * Host: smtp.gmail.com
 * Port: 587 (STARTTLS)
 */
export function getMailTransporter(): Transporter {
  if (globalTransporter) {
    return globalTransporter;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('[SMTP Warning] SMTP_USER or SMTP_PASS environment variables are not set.');
  }

  globalTransporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // TLS / STARTTLS on port 587
    pool: true, // Enable connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5, // Max 5 messages/sec
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  return globalTransporter;
}

/**
 * Helper to verify SMTP server connectivity
 */
export async function verifySMTPConnection(): Promise<boolean> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SMTP CONNECT START] Verifying connection to ${process.env.SMTP_HOST || 'smtp.gmail.com'}...`);
  try {
    const transporter = getMailTransporter();
    await transporter.verify();
    console.log(`[${timestamp}] [SMTP CONNECT SUCCESS] Gmail SMTP connection verified successfully.`);
    return true;
  } catch (error: any) {
    console.error(`[${timestamp}] [SMTP CONNECT ERROR] Failed to connect to Gmail SMTP:`, error?.stack || error?.message || error);
    return false;
  }
}
