import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

async function checkRLS() {
  console.log('\n🛡️ Checking RLS policies for "users" table...');
  
  const { data, error } = await supabaseAdmin.rpc('get_policies_for_table', { table_name: 'users' });
  
  if (error) {
    // If the helper RPC doesn't exist, we can try a direct query to pg_policies
    const { data: pgData, error: pgError } = await supabaseAdmin.from('pg_policies').select('*').eq('tablename', 'users');
    
    if (pgError) {
      console.log('⚠️ Could not check policies via RPC or direct query. This usually means the service role key doesn\'t have enough system-level permissions or the table/helper is missing.');
      console.log('💡 I will try a manual check by attempting a restricted query.');
      return;
    }
    console.log('📊 Policies found:', pgData);
  } else {
    console.log('📊 Policies found:', data);
  }
}

// Another way: try to select as the user would (using Anon key but with a session)
// Since we can't easily simulate a session here, let's just look at the table definition if possible.

checkRLS();
