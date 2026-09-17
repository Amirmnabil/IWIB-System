import { NextResponse } from 'next/server';
import { sendMemberNotification } from '@/lib/email/triggers/member-notifications';

export const dynamic = 'force-dynamic';

/**
 * API Endpoint to trigger Member Action Email Notification from Client Components
 * POST /api/notifications/member-action
 */
export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  try {
    const body = await request.json();
    const { companyName, memberName, members, action, details, recipientEmail } = body;

    const targetCompany = companyName || 'Client Company';
    const memberCount = members && Array.isArray(members) ? members.length : (memberName ? 1 : 0);
    const targetRecipient = recipientEmail || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com';

    console.log(`\n------------------------------------------------------`);
    console.log(`[${timestamp}] [API HIT: /api/notifications/member-action]`);
    console.log(`  Client / Policy: ${targetCompany}`);
    console.log(`  Action: ${action}`);
    console.log(`  Member Count: ${memberCount}`);
    console.log(`  Recipient: ${targetRecipient}`);
    console.log(`------------------------------------------------------\n`);

    if (!action) {
      console.error(`[${timestamp}] [API ERROR] Missing required parameter: action`);
      return NextResponse.json(
        { error: 'Missing required parameter: action is required.' },
        { status: 400 }
      );
    }

    if (!memberName && (!members || !Array.isArray(members) || members.length === 0)) {
      console.error(`[${timestamp}] [API ERROR] Missing required parameter: memberName or members array`);
      return NextResponse.json(
        { error: 'Missing required parameter: memberName or members array is required.' },
        { status: 400 }
      );
    }

    const result = await sendMemberNotification({
      companyName: targetCompany,
      memberName,
      members,
      action,
      recipientEmail: targetRecipient,
      details,
    });

    if (!result.success) {
      console.error(`[${timestamp}] [API MEMBER ACTION EMAIL FAILED] ${result.error}`);
      return NextResponse.json(
        { success: false, error: result.error, details: result },
        { status: 500 }
      );
    }

    console.log(`[${timestamp}] [API MEMBER ACTION EMAIL SUCCESS] MessageId: ${result.messageId}`);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(`[${timestamp}] [API MEMBER ACTION EXCEPTION]`, error?.stack || error?.message || error);
    return NextResponse.json({ error: error?.message || 'Internal server error', stack: error?.stack }, { status: 500 });
  }
}
