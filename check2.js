import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('invoices').select('id').limit(1);
  console.log("Invoices table error:", error);
  console.log("Invoices table data:", data);

  const { data: cols, error: err2 } = await supabase.from('insurance_companies').select('commission_tax_percent').limit(1);
  console.log("Insurance companies error:", err2);
  console.log("Insurance companies tax data:", cols);
}
run();
