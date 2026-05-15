import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

async function checkUserRecord(email: string) {
  console.log(`\n🔍 Checking database record for: ${email}`);
  
  const { data: userRecord, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('❌ Error querying users table:', error.message);
    return;
  }

  if (!userRecord) {
    console.log('❌ User record NOT FOUND in public.users table.');
    console.log('💡 This will cause permission issues. You should add this user to the system database.');
    return;
  }

  console.log('✅ User record FOUND in public.users table!');
  console.log('📊 Details:', JSON.stringify(userRecord, null, 2));
}

checkUserRecord('amir.nabil@iwib-eg.com');
