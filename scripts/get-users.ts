import { getSupabaseAdmin } from '../src/lib/supabase-admin';
import dotenv from 'dotenv';
dotenv.config();

const supabase = getSupabaseAdmin();

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Registered Users:');
    data.users.forEach(u => {
      console.log(`- Email: ${u.email}, ID: ${u.id}, Metadata:`, u.user_metadata);
    });
  }
}

run();
