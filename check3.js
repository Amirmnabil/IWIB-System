import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: policies } = await supabase.from('policies').select('*');
  
  for (const policy of policies) {
    const policyId = policy.id;
    let baseNet = policy.contract_net || 0;
    const totalCommission = baseNet * ((policy.broker_commission_percent || 0) / 100);

    console.log(`Policy ${policy.policy_number}: baseNet=${baseNet}, broker_comm=${policy.broker_commission_percent}, totalCommission=${totalCommission}`);
    
    if (totalCommission > 0) {
      console.log(`-> Should insert commission invoice for ${totalCommission}`);
      const commissionInvoice = {
        invoice_number: `INV-COM-${policy.policy_number || 'NA'}-${Date.now().toString().slice(-4)}`,
        insurer_id: policy.insurer_id,
        insurer_name: policy.insurer_name,
        policy_id: policy.id,
        policy_number: policy.policy_number,
        invoice_type: 'commission',
        issue_date: '2026-07-08',
        due_date: '2026-08-08',
        amount_due: totalCommission,
        amount_paid: 0,
        status: 'draft',
        notes: `Total Commission: EGP ${totalCommission.toLocaleString()}.`
      };

      const { error } = await supabase.from('invoices').insert(commissionInvoice);
      if (error) {
        console.log("INSERT ERROR:", error);
      } else {
        console.log("INSERT SUCCESS!");
      }
    }
  }
}
run();
