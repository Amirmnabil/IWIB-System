import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugUser(email: string) {
  console.log(`\n🔍 Checking status for: ${email}`);
  
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error.message);
      return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      console.log('❌ User NOT FOUND in Supabase Auth.');
      console.log('💡 You might need to create this user using the Admin system.');
      return;
    }

    console.log('✅ User FOUND!');
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📧 Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`📅 Created At: ${user.created_at}`);
    console.log(`🔒 Last Sign In: ${user.last_sign_in_at || 'Never'}`);
    console.log(`🚫 Banned: ${user.banned_until ? 'Yes' : 'No'}`);
    
    if (!user.email_confirmed_at) {
      console.log('⚠️ Warning: Email is not confirmed. This might prevent login depending on your Supabase settings.');
    }

  } catch (err: any) {
    console.error('💥 Unexpected error:', err.message);
  }
}

const targetEmail = 'amir.nabil@iwib-eg.com';
debugUser(targetEmail);
