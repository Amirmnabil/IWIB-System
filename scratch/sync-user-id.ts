import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

async function syncUserIds(email: string, correctAuthId: string) {
  console.log(`\n🔄 Syncing database ID for: ${email}`);
  console.log(`🎯 New ID: ${correctAuthId}`);
  
  // First, check if the record exists
  const { data: oldRecord } = await supabaseAdmin.from('users').select('*').eq('email', email).maybeSingle();
  
  if (!oldRecord) {
    console.log('❌ No record found in users table to sync.');
    return;
  }

  console.log(`📝 Old ID was: ${oldRecord.id}`);

  // Delete the old record and insert a new one with the correct ID
  // (We do this because updating the ID might violate foreign keys or PK constraints)
  const { error: delError } = await supabaseAdmin.from('users').delete().eq('email', email);
  if (delError) return console.error('Delete error:', delError.message);

  const { error: insError } = await supabaseAdmin.from('users').insert({
    ...oldRecord,
    id: correctAuthId
  });

  if (insError) {
    console.error('❌ Sync failed:', insError.message);
  } else {
    console.log('✅ User record successfully synced with Auth ID!');
  }
}

// IDs found from previous diagnostics
const authId = '673093d3-1952-48ef-9376-0ce07d98e71b';
syncUserIds('amir.nabil@iwib-eg.com', authId);
