export {};
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Testing insert into "companies"...');
  const testData = {
    name: "Test Company " + Date.now(),
    status: 'interested',
    priority: 'medium',
    insurance_type: 'Medical',
    checklist_completion: 'Pending'
  };

  const { data, error } = await supabase
    .from('companies')
    .insert(testData)
    .select()
    .single();

  if (error) {
    console.error('Insert error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Insert success:', data);
  }
}

testInsert();
