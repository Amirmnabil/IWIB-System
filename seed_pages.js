const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching modules...");
  const { data: modules, error: modErr } = await supabase.from('system_modules').select('id, code');
  
  if (modErr) {
    console.error("Failed to fetch modules", modErr);
    return;
  }

  const moduleMap = {};
  modules.forEach(m => moduleMap[m.code] = m.id);

  const pagesToInsert = [];

  const addPage = (moduleCode, name, pathCode) => {
    if (moduleMap[moduleCode]) {
      pagesToInsert.push({
        module_id: moduleMap[moduleCode],
        name: name,
        code: pathCode,
        path: pathCode
      });
    }
  };

  addPage('crm', 'Companies', '/companies');
  addPage('crm', 'Contacts', '/contacts');
  addPage('crm', 'Leads', '/leads');
  addPage('crm', 'Prospects', '/prospects');
  addPage('crm', 'Activities', '/activities');
  addPage('crm', 'Calendar', '/calendar');
  addPage('crm', 'Sales Pipeline', '/sales-pipeline');

  addPage('underwriting', 'Quotations', '/underwriting/quotations');
  addPage('underwriting', 'SME Medical Pricing', '/underwriting/medical-pricing');
  addPage('underwriting', 'Motor Insurance Pricing', '/underwriting/motor-pricing');
  addPage('underwriting', 'Census', '/census');
  addPage('underwriting', 'Benefit Schedules', '/benefit-schedules');
  addPage('underwriting', 'Risk Scoring', '/risk-scoring');

  addPage('policy_admin', 'Policies', '/policies');
  addPage('policy_admin', 'Medical Analytics', '/policy-admin/medical-utilization');
  addPage('policy_admin', 'Endorsements', '/endorsements');
  addPage('policy_admin', 'Renewals', '/renewals');

  addPage('claims', 'All Claims', '/claims');
  addPage('claims', 'Appeals', '/claim-appeals');
  addPage('claims', 'Fraud Detection', '/fraud-detection');

  addPage('master_data', 'Insurance Companies', '/insurance-companies');
  addPage('master_data', 'TPAs', '/tpas');
  addPage('master_data', 'Provider Network', '/providers');
  addPage('master_data', 'Reference Lists', '/master-data/reference-lists');

  addPage('finance', 'Invoices', '/invoices');
  addPage('finance', 'Payments', '/payments');
  addPage('finance', 'Commissions', '/commissions');

  addPage('complaints', 'KYC Documents', '/kyc-documents');
  addPage('complaints', 'Audit Logs', '/audit-logs');

  addPage('analytics', 'Analytics', '/analytics');
  addPage('settings', 'Settings', '/settings');
  addPage('user_manual', 'User Manual', '/user-manual');

  console.log(`Inserting ${pagesToInsert.length} pages...`);
  
  for (const page of pagesToInsert) {
    const { error } = await supabase.from('system_pages').upsert(page, { onConflict: 'code' });
    if (error) {
      console.error(`Failed to insert ${page.name}:`, error);
    }
  }

  console.log("Done seeding pages.");
}

run();
