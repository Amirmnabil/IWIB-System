import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, role, department, is_admin } = body;

    // 1. Basic validation
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Authorization check (only Super Admins can create users)
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let requester;
    let authError;

    if (token) {
      // Verify using the provided Bearer token
      const { data, error } = await supabase.auth.getUser(token);
      requester = data.user;
      authError = error;
    } else {
      // Fallback to cookies
      const cookieStore = await cookies();
      const { data, error } = await supabase.auth.getUser(cookieStore.toString());
      requester = data.user;
      authError = error;
    }

    if (authError || !requester) {
      console.error('Auth check failed:', authError);
      const cookieStore = token ? null : await cookies();
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'No active session found. Please ensure you are logged in.',
        debug: { 
          usingToken: !!token,
          hasCookies: cookieStore ? cookieStore.getAll().length > 0 : 'N/A'
        }
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
