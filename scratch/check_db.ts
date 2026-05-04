export {};
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Env variables:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  console.log('Checking table "companies"...');
  const { data, error } = await supabase.from('companies').select('*').limit(1);
  if (error) {
    console.error('Error fetching from companies:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success fetching from companies. Data found:', data.length);
  }
}

checkTable();
