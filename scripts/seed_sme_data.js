const fs = require('fs');
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const plansFile = fs.readFileSync('src/lib/plans-data.ts', 'utf8');
const plansContent = plansFile.substring(plansFile.indexOf('['), plansFile.indexOf(';') + 1);
let SME_PLANS = [];
try {
  SME_PLANS = eval('(' + plansContent.slice(0, -1) + ')');
} catch (e) {
  console.error("Error parsing SME_PLANS", e);
}

async function run() {
  console.log("Seeding SME_PLANS:", SME_PLANS.length);
  if (SME_PLANS.length > 0) {
    const { error } = await supabase.from('sme_plans').insert(SME_PLANS);
    if (error) {
      console.log('Error inserting SME_PLANS:', error);
    } else {
      console.log('Success SME_PLANS');
    }
  }
}

run();
