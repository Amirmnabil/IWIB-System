import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('payment_frequencies').select('*');
  console.log('Payment frequencies:', data);
  const { data: p } = await supabase.from('payment_frequencies').select('id, name_en'); console.log('Payment frequencies:', p.data);
  console.log('Sample policy freq id:', p);
}
run();
