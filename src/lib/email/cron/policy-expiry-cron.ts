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
 * Checks registered active policies in the database and sends reminder emails ONLY for registered policies expiring in exactly 90 days.
 * Email reminders are NOT sent for companies/prospects registered in the CRM system.
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
    
    // Fetch registered policies with policy_status
    const { data: policies, error } = await supabase
      .from('policies')
      .select('id, policy_number, client_company_name, client_company_id, end_date, hr_email, company_email, policy_status');

    if (error) {
      console.error('[Cron Job Error] Failed to fetch policies from DB:', error.message);
      result.errors.push(`DB Error: ${error.message}`);
      return result;
    }

    if (!policies || policies.length === 0) {
      console.log('[Cron Job] No policies found in system.');
      return result;
    }

    // Fetch company statuses to exclude CRM prospect/lead companies
    const companyIds = Array.from(new Set(policies.map((p: any) => p.client_company_id).filter(Boolean)));
    let companyStatusMap = new Map<string, string>();
    if (companyIds.length > 0) {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, status')
        .in('id', companyIds);
      if (companiesData) {
        companiesData.forEach((c: any) => companyStatusMap.set(c.id, (c.status || '').toLowerCase()));
      }
    }

    result.totalChecked = policies.length;
    const today = startOfDay(new Date());

    for (const policy of policies) {
      if (!policy.end_date) continue;

      // 1. Exclude draft, prospect, cancelled, or non-registered policies
      const policyStatus = (policy.policy_status || 'active').toLowerCase();
      if (['draft', 'prospect', 'cancelled', 'terminated', 'pending'].includes(policyStatus)) {
        continue;
      }

      // 2. Exclude companies registered in the CRM system as prospects or leads
      if (policy.client_company_id) {
        const companyStatus = companyStatusMap.get(policy.client_company_id);
        if (companyStatus === 'prospect' || companyStatus === 'lead') {
          console.log(`[Cron Job] Skipping policy ${policy.policy_number || policy.id}: Company is registered in CRM system as ${companyStatus}.`);
          continue;
        }
      }

      try {
        const endDateParsed = startOfDay(parseISO(policy.end_date));
        const daysRemaining = differenceInDays(endDateParsed, today);

        // Check if registered policy expiration is exactly 90 days away
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

          // Build target recipient list (HR Email / Company Email + System Recipient islam.wahed@iwib-eg.com)
          const systemRecipient = process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com';
          const recipientSet = new Set<string>();
          if (policy.hr_email) recipientSet.add(policy.hr_email.trim());
          if (policy.company_email) recipientSet.add(policy.company_email.trim());
          recipientSet.add(systemRecipient.trim());
          const recipientEmail = Array.from(recipientSet).join(', ');

          const subject = `Policy Expiry Reminder - ${companyName}`;

          const html = getPolicyExpiryHtml({
            policyNumber,
            companyName,
            expiryDate: formattedEndDate,
            daysRemaining: 90,
            reminderMessage: `Your registered insurance policy #${policyNumber} for ${companyName} will expire in 3 months on ${formattedEndDate}. Please review your plan details and initiate renewal procedures.`,
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

    console.log(`[Cron Job Summary] Checked ${result.totalChecked} policies. Matched registered 90-day policies: ${result.matchedPolicies.length}, Emails Sent: ${result.emailsSent}`);
  } catch (err: any) {
    console.error('[Cron Job Exception] Unhandled error during policy expiry scan:', err?.message || err);
    result.errors.push(`Global Error: ${err?.message || err}`);
  }

  return result;
}
