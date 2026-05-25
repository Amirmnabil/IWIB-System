import { getSupabaseAdmin } from '../src/lib/supabase-admin';
import dotenv from 'dotenv';
dotenv.config();

const supabase = getSupabaseAdmin();

async function run() {
  const email = 'test@iwib.com';
  const newPassword = 'Password123!';
  
  // Find user ID
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User ${email} not found`);
    return;
  }
  
  const { error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );
  
  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log(`Successfully updated password for ${email} to ${newPassword}`);
  }
}

run();
