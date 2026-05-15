const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's try to get system_modules without auth first
  let { data: modules, error } = await supabase.from('system_modules').select('*');
  console.log('Modules (anon):', modules);
  if (error) console.log('Error:', error);
}
run();
