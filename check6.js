import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: policies } = await supabase.from('policies').select('id, policy_number, contract_net, broker_commission_percent');
  console.log("Total policies:", policies?.length);
  
  if (policies) {
    for (const p of policies) {
      console.log(`Policy ${p.policy_number}: net=${p.contract_net}, comm_percent=${p.broker_commission_percent}`);
      let baseNet = p.contract_net || 0;
      const totalCommission = baseNet * ((p.broker_commission_percent || 0) / 100);
      console.log(`  -> Calculated Commission: ${totalCommission}`);
    }
  }

  const { data: invoices } = await supabase.from('invoices').select('*');
  console.log("Total invoices in DB:", invoices?.length);
  if (invoices && invoices.length > 0) {
    const res = await supabase.from('invoices').insert({ invoice_number: 'TEST', invoice_type: 'test' }); console.log('Insert response:', res.error);
  }
}

check();

async function run() { const { data } = await supabase.from('policies').select('id, policy_number, payment_frequency_id, client_company_name'); console.log(data); const { data: inv } = await supabase.from('invoices').select('id, invoice_number'); console.log(inv); } run();

async function clean() { await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000'); console.log('Deleted invoices!'); } clean();
