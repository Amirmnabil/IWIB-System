import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, email, password, name, role, department, level, is_admin, status } = body;

    // 1. Basic validation
    if (!id || !email || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // 2. Authorization check (only Admins can update users)
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requester) {
      console.error('Auth check failed:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'Invalid or expired token.'
      }, { status: 401 });
    }

    // Check if requester is an admin in the public.users table
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_admin, role')
      .ilike('email', requester.email || '')
      .single();

    if (profileError || (!requesterProfile.is_admin && requesterProfile.role !== 'Admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 3. Update user in Supabase Auth (metadata, email, and password if provided)
    const updateData: any = {
      email,
      user_metadata: { full_name: name, role: role }
    };

    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);

    if (updateAuthError) {
      return NextResponse.json({ error: updateAuthError.message }, { status: 500 });
    }

    // 4. Update user in public.users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        email,
        name,
        role,
        department,
        level: level || null,
        is_admin: is_admin || false,
        status: status || 'active'
      })
      .eq('id', id);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to update user in database: ' + dbError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (err: any) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
