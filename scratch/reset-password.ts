import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

async function resetUserPassword(email: string, newPassword: string) {
  console.log(`\n🔄 Attempting to reset password for: ${email}`);
  
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) return console.error('Error:', listError.message);

  const user = users.find(u => u.email === email);
  if (!user) return console.log('❌ User not found.');

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (error) {
    console.error('❌ Failed to reset password:', error.message);
  } else {
    console.log('✅ Password successfully reset to:', newPassword);
    console.log('🚀 The user should now be able to login.');
  }
}

resetUserPassword('amir.nabil@iwib-eg.com', 'A1m2i3r4');
