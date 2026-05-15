import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function testPublicAccess() {
  console.log('\n🕵️ Testing public access to "users" table using Anon Key...');
  
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('email', 'amir.nabil@iwib-eg.com')
    .maybeSingle();

  if (error) {
    console.error('❌ Error (likely RLS blocked):', error.message);
  } else if (data) {
    console.log('🔓 Public access is OPEN (or policy allows it). Data found:', data);
  } else {
    console.log('🔒 No data returned. Either RLS is on or record doesn\'t exist for this key.');
  }
}

testPublicAccess();
