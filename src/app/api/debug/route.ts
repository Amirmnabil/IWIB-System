import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const { data: modules, error: err1 } = await supabase.from('system_modules').select('*');
  const { data: users, error: err2 } = await supabase.from('users').select('id, email, is_admin, role').limit(5);
  
  return NextResponse.json({ 
    modules, err1,
    users, err2
  });
}
