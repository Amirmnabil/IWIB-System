import { NextResponse } from 'next/server';
import { checkPolicyExpirations } from '@/lib/email/cron/policy-expiry-cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout limit

/**
 * Endpoint for daily Policy Expiry Cron Job
 * GET /api/cron/policy-expiry
 * POST /api/cron/policy-expiry
 */
export async function GET(request: Request) {
  try {
    const result = await checkPolicyExpirations();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: result,
    });
  } catch (error: any) {
    console.error('[API Cron Route Error] Policy expiry check failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error during cron execution' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
