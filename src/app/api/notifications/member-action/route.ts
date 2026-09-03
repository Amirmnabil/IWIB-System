import { NextResponse } from 'next/server';
import { sendMemberNotification } from '@/lib/email/triggers/member-notifications';

export const dynamic = 'force-dynamic';

/**
 * API Endpoint to trigger Member Action Email Notification from Client Components
 * POST /api/notifications/member-action
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, memberName, action, details, recipientEmail } = body;

    if (!memberName || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: memberName and action are required.' },
        { status: 400 }
      );
    }

    const result = await sendMemberNotification({
      companyName: companyName || 'Client Company',
      memberName,
      action,
      recipientEmail: recipientEmail || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com',
      details,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[API Member Action Email Error]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
