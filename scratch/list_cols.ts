export {};
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listColumns() {
  // We can use a trick to get column names by selecting a non-existent column or just one row
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'companies' });
  
  if (error) {
    // If RPC doesn't exist, try getting one row and checking keys
    const { data: rows, error: fetchError } = await supabase.from('companies').select('*').limit(1);
    if (fetchError) {
      console.error('Fetch error:', fetchError);
    } else {
        // If it's empty, we might not see all columns if some are null
        // But we can try to select 'id' to see if it works
        console.log('Table exists. Fetching sample row...');
        console.log('Columns in first row (if any):', rows.length > 0 ? Object.keys(rows[0]) : 'No rows');
    }
  }
}

listColumns();
