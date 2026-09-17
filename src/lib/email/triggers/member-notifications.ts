import { sendEmail } from '../email.service';
import { getMemberNotificationHtml, MemberItemDetails } from '../templates/member-notification-template';

export interface MemberNotificationParams {
  companyName: string;
  memberName?: string;
  members?: MemberItemDetails[];
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
 * Triggers an automated notification email when member(s) are Added or Deleted on the Client Portal.
 * Supports single member or batch array of members.
 */
export async function sendMemberNotification(params: MemberNotificationParams) {
  const timestamp = new Date().toISOString();
  const { companyName, memberName, members: rawMembers, action, recipientEmail, dateTime, details } = params;

  // Build members list
  let memberList: MemberItemDetails[] = [];
  if (rawMembers && rawMembers.length > 0) {
    memberList = rawMembers;
  } else if (memberName) {
    memberList = [{
      memberName,
      relation: details?.relation,
      nationalId: details?.nationalId,
      department: details?.department,
    }];
  }

  console.log(`[${timestamp}] [MEMBER NOTIFICATION TRIGGER] Called for Company: "${companyName}", Action: "${action}", Members Count: ${memberList.length}`);

  if (memberList.length === 0) {
    console.warn(`[${timestamp}] [MEMBER NOTIFICATION WARNING] No members specified for email notification.`);
    return { success: false, error: 'No members provided' };
  }

  // Ensure system recipient (islam.wahed@iwib-eg.com) is always included alongside optional recipientEmail
  const systemEmail = process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com';
  const recipientSet = new Set<string>();
  if (recipientEmail) {
    recipientEmail.split(',').forEach((e) => {
      const trimmed = e.trim();
      if (trimmed) recipientSet.add(trimmed);
    });
  }
  recipientSet.add(systemEmail);
  const targetEmail = Array.from(recipientSet).join(', ');

  const countStr = memberList.length > 1 ? ` (${memberList.length} Beneficiaries)` : '';
  const subject = `Member ${action}${countStr} - ${companyName}`;

  const html = getMemberNotificationHtml({
    companyName,
    action,
    dateTime: dateTime || new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' }),
    members: memberList,
  });

  return await sendEmail({
    to: targetEmail,
    subject,
    html,
    relatedType: 'member',
    metadata: {
      companyName,
      actionType: action,
      memberCount: memberList.length,
      members: memberList.map(m => m.memberName),
    },
  });
}
