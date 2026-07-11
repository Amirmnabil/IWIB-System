const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: m } = await supabase.from('system_modules').select('*').limit(1);
  const { data: p } = await supabase.from('system_pages').select('*').limit(1);
  console.log("Modules:", m ? "accessible" : "not accessible");
  console.log("Pages:", p ? "accessible" : "not accessible");
}
run();
