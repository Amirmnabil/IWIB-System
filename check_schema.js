require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: plansError } = await supabase.from('sme_plans').select('*').limit(1);
  const { data: premiumsError } = await supabase.from('sme_premiums').select('*').limit(1);
  
  const { data: plansSchema, error: pErr } = await supabase.rpc('query_schema', { query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sme_plans'` });
  
  console.log('Plans:', plansSchema, pErr);
}
run();
