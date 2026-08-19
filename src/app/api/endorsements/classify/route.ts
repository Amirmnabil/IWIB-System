import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { checkServerPermission } from '@/lib/auth-guard';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requester) {
      console.error('Auth check failed:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'Invalid or expired token.'
      }, { status: 401 });
    }

    if (!requester.email) {
      return NextResponse.json({ error: 'Unauthorized: Requester email is missing' }, { status: 401 });
    }

    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, is_admin, role')
      .eq('id', requester.id)
      .single();

    if (profileError || !requesterProfile) {
      console.error('Failed to resolve profile:', profileError);
      return NextResponse.json({ error: 'Unauthorized: Profile not found' }, { status: 401 });
    }

    const hasAccess = await checkServerPermission(supabaseAdmin, requesterProfile.id, '/endorsements', 'view');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to view endorsements' }, { status: 403 });
    }

    const body = await request.json();
    const { endorsement_type_id } = body;

    if (!endorsement_type_id) {
      return NextResponse.json({ error: 'Missing endorsement_type_id' }, { status: 400 });
    }


    const { data: endorsementType, error } = await supabaseAdmin
      .from('endorsement_types')
      .select('*')
      .eq('id', endorsement_type_id)
      .maybeSingle();

    if (error || !endorsementType) {
      return NextResponse.json({ error: 'Endorsement type not found' }, { status: 404 });
    }

    return NextResponse.json({
      is_financial: endorsementType.is_financial,
      category: endorsementType.category,
      line_of_business: endorsementType.line_of_business,
      name: endorsementType.name
    });
  } catch (err: any) {
    console.error('Classification error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
