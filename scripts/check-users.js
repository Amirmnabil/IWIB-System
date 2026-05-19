const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  console.log("=== Active Users in Supabase ===");
  users.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | Department: ${u.department} | Level: ${u.level} | Status: ${u.status}`);
  });
  console.log("================================");
}

run();
