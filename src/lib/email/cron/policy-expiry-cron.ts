import { supabase } from '@/lib/supabase';
import { sendEmail } from '../email.service';
import { getPolicyExpiryHtml } from '../templates/policy-expiry-template';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

export interface ExpiryCheckResult {
  totalChecked: number;
  emailsSent: number;
  matchedPolicies: Array<{
    id: string;
    policyNumber: string;
    companyName: string;
    endDate: string;
    daysRemaining: number;
  }>;
  errors: string[];
}

/**
 * Daily Policy Expiry Checker
 * Checks active policies in the database and sends reminder emails for policies expiring in exactly 90 days.
 */
export async function checkPolicyExpirations(): Promise<ExpiryCheckResult> {
  const result: ExpiryCheckResult = {
    totalChecked: 0,
    emailsSent: 0,
    matchedPolicies: [],
    errors: [],
  };

  try {
    console.log('[Cron Job] Executing daily policy expiry check...');
    
    // Fetch active/all policies
    const { data: policies, error } = await supabase
      .from('policies')
      .select('id, policy_number, client_company_name, client_company_id, end_date, hr_email, company_email');

    if (error) {
      console.error('[Cron Job Error] Failed to fetch policies from DB:', error.message);
      result.errors.push(`DB Error: ${error.message}`);
      return result;
    }

    if (!policies || policies.length === 0) {
      console.log('[Cron Job] No policies found in system.');
      return result;
    }

    result.totalChecked = policies.length;
    const today = startOfDay(new Date());

    for (const policy of policies) {
      if (!policy.end_date) continue;

      try {
        const endDateParsed = startOfDay(parseISO(policy.end_date));
        const daysRemaining = differenceInDays(endDateParsed, today);

        // Check if policy expiration is exactly 90 days away
        if (daysRemaining === 90) {
          const companyName = policy.client_company_name || 'Client Company';
          const policyNumber = policy.policy_number || policy.id;
          const formattedEndDate = policy.end_date.split('T')[0];

          result.matchedPolicies.push({
            id: policy.id,
            policyNumber,
            companyName,
            endDate: formattedEndDate,
            daysRemaining,
          });

          // Determine recipient email (HR / Client Company Email / Default system email)
          const recipientEmail = policy.hr_email || policy.company_email || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com';

          const subject = `Policy Expiry Reminder - ${companyName}`;

          const html = getPolicyExpiryHtml({
            policyNumber,
            companyName,
            expiryDate: formattedEndDate,
            daysRemaining: 90,
            reminderMessage: `Your insurance policy #${policyNumber} for ${companyName} will expire in 3 months on ${formattedEndDate}. Please review your plan details and initiate renewal procedures.`,
          });

          const sendResult = await sendEmail({
            to: recipientEmail,
            subject,
            html,
            relatedType: 'policy',
          });

          if (sendResult.success) {
            result.emailsSent++;
          } else if (sendResult.error) {
            result.errors.push(`Policy ${policyNumber}: ${sendResult.error}`);
          }
        }
      } catch (policyErr: any) {
        console.error(`[Cron Job Error] Exception evaluating policy ID ${policy.id}:`, policyErr?.message || policyErr);
        result.errors.push(`Policy ${policy.id}: ${policyErr?.message || policyErr}`);
      }
    }

    console.log(`[Cron Job Summary] Checked ${result.totalChecked} policies. Matched: ${result.matchedPolicies.length}, Emails Sent: ${result.emailsSent}`);
  } catch (err: any) {
    console.error('[Cron Job Exception] Unhandled error during policy expiry scan:', err?.message || err);
    result.errors.push(`Global Error: ${err?.message || err}`);
  }

  return result;
}
