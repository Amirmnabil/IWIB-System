import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

async function diagnoseUser(email: string) {
  console.log(`\n🕵️ Diagnosing user: ${email}`);
  
  // 1. Check Auth
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);
  
  if (!authUser) {
    console.log('❌ NOT FOUND in Auth.');
  } else {
    console.log('✅ Found in Auth. ID:', authUser.id);
  }

  // 2. Check DB
  const { data: dbUser, error: dbError } = await supabaseAdmin.from('users').select('*').eq('email', email).maybeSingle();
  
  if (!dbUser) {
    console.log('❌ NOT FOUND in DB (users table).');
  } else {
    console.log('✅ Found in DB. ID:', dbUser.id, 'Role:', dbUser.role);
    if (authUser && authUser.id !== dbUser.id) {
      console.log('⚠️ ID MISMATCH detected!');
    }
  }
}

diagnoseUser('islam.wahed@iwib-eg.com');
