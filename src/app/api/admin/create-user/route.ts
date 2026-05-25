import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { validateRequest } from '@/lib/auth-middleware';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, role, department, level, is_admin } = body;

    // 1. Basic validation
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Authorization check (only Super Admins can create users)
    const supabaseAdmin = getSupabaseAdmin();
    
    let requester;
    try {
      requester = await validateRequest();
    } catch (authError: any) {
      console.error('Auth check failed:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'No active session found. Please ensure you are logged in.'
      }, { status: 401 });
    }

    // Check if requester is an admin in the public.users table
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_admin, role')
      .eq('email', requester.email)
      .single();

    if (profileError || (!requesterProfile.is_admin && requesterProfile.role !== 'Admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 3. Create user in Supabase Auth
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: role }
    });

    if (createUserError) {
      return NextResponse.json({ error: createUserError.message }, { status: 500 });
    }

    // 4. Sync with public.users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authUser.user.id, // Match Auth ID
          email,
          name,
          role,
          department,
          level: level || null,
          is_admin: is_admin || false,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ]);

    if (dbError) {
      // Cleanup: delete the auth user if DB sync fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'Failed to sync user with database: ' + dbError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'User created successfully', user: authUser.user });
  } catch (err: any) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
