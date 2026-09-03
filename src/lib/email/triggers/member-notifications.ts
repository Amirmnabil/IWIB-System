import { sendEmail } from '../email.service';
import { getMemberNotificationHtml } from '../templates/member-notification-template';

export interface MemberNotificationParams {
  companyName: string;
  memberName: string;
  action: 'Added' | 'Deleted';
  recipientEmail?: string;
  dateTime?: string;
  details?: {
    relation?: string;
    nationalId?: string;
    department?: string;
  };
}

/**
 * Triggers an automated notification email when a member is Added or Deleted on the Client Portal.
 */
export async function sendMemberNotification(params: MemberNotificationParams) {
  const { companyName, memberName, action, recipientEmail, dateTime, details } = params;

  // Fallback email recipient (Internal team / company HR email)
  const targetEmail = recipientEmail || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com';

  const subject = `Member ${action} - ${companyName}`;

  const html = getMemberNotificationHtml({
    companyName,
    memberName,
    action,
    dateTime: dateTime || new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' }),
    details,
  });

  return await sendEmail({
    to: targetEmail,
    subject,
    html,
    relatedType: 'member',
  });
}
