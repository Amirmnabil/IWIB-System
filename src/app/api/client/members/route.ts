import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendMemberNotification } from '@/lib/email/triggers/member-notifications';

/**
 * Client Portal API for Member Operations
 * 
 * POST /api/client/members - Add Member
 * DELETE /api/client/members - Delete Member
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { policy_id, company_name, member_name, hr_email, relation, department, national_id } = body;

    if (!policy_id || !member_name) {
      return NextResponse.json(
        { error: 'Missing required fields: policy_id and member_name are required.' },
        { status: 400 }
      );
    }

    // Insert member into policy_members table
    const { data: member, error: insertError } = await supabase
      .from('policy_members')
      .insert([{
        policy_id,
        member_name,
        relation: relation || 'Employee',
        department: department || null,
        national_id: national_id || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[API Member Add Error]', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Fetch company name if not provided
    let targetCompanyName = company_name;
    if (!targetCompanyName) {
      const { data: policy } = await supabase
        .from('policies')
        .select('client_company_name')
        .eq('id', policy_id)
        .maybeSingle();
      targetCompanyName = policy?.client_company_name || 'Client Company';
    }

    // Trigger async email notification (Non-blocking)
    sendMemberNotification({
      companyName: targetCompanyName,
      memberName: member_name,
      action: 'Added',
      recipientEmail: hr_email || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com',
      dateTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' }),
      details: {
        relation: relation || 'Employee',
        department: department || undefined,
        nationalId: national_id || undefined,
      },
    }).catch(err => console.error('[Member Add Email Trigger Error]', err));

    return NextResponse.json({
      success: true,
      message: `Member ${member_name} added successfully.`,
      member,
    });
  } catch (error: any) {
    console.error('[API Member Add Exception]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const member_id = searchParams.get('member_id');
    const policy_id = searchParams.get('policy_id');
    const member_name = searchParams.get('member_name') || 'Employee';
    const company_name = searchParams.get('company_name');
    const hr_email = searchParams.get('hr_email');

    if (!member_id) {
      return NextResponse.json({ error: 'Missing member_id parameter.' }, { status: 400 });
    }

    // Delete member record
    const { error: deleteError } = await supabase
      .from('policy_members')
      .delete()
      .eq('id', member_id);

    if (deleteError) {
      console.error('[API Member Delete Error]', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Fetch company name if not provided
    let targetCompanyName = company_name;
    if (!targetCompanyName && policy_id) {
      const { data: policy } = await supabase
        .from('policies')
        .select('client_company_name')
        .eq('id', policy_id)
        .maybeSingle();
      targetCompanyName = policy?.client_company_name || 'Client Company';
    }

    // Trigger async email notification (Non-blocking)
    sendMemberNotification({
      companyName: targetCompanyName || 'Client Company',
      memberName: member_name,
      action: 'Deleted',
      recipientEmail: hr_email || process.env.NOTIFICATION_RECIPIENT_EMAIL || 'islam.wahed@iwib-eg.com',
      dateTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'medium' }),
    }).catch(err => console.error('[Member Delete Email Trigger Error]', err));

    return NextResponse.json({
      success: true,
      message: `Member ${member_name} deleted successfully.`,
    });
  } catch (error: any) {
    console.error('[API Member Delete Exception]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
