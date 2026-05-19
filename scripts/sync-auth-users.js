const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error listing auth users:", error);
    return;
  }

  console.log(`Found ${users.length} authenticated users.`);

  for (const user of users) {
    const email = user.email;
    const name = user.user_metadata?.full_name || email.split('@')[0];
    
    console.log(`Syncing user: ${email} (ID: ${user.id})...`);
    
    // Check if user already exists in public.users
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    const userPayload = {
      id: user.id,
      email: email,
      name: name,
      role: 'Sales Manager',
      department: 'Sales',
      level: 'Manager',
      status: 'active',
      created_at: user.created_at || new Date().toISOString()
    };

    if (existing) {
      console.log(`User ${email} exists. Updating profile to Sales Manager...`);
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update(userPayload)
        .eq('id', user.id);
      if (updateErr) console.error("Update error:", updateErr);
    } else {
      console.log(`User ${email} is missing. Inserting as Sales Manager...`);
      const { error: insertErr } = await supabaseAdmin
        .from('users')
        .insert([userPayload]);
      if (insertErr) console.error("Insert error:", insertErr);
    }
  }

  // Also, let's update all existing leads in the database to be assigned to the first synced user!
  if (users.length > 0) {
    const targetUser = users[0];
    const targetName = targetUser.user_metadata?.full_name || targetUser.email.split('@')[0];
    console.log(`Updating all existing leads & companies to be assigned to: ${targetName}`);
    
    const { error: compErr } = await supabaseAdmin
      .from('companies')
      .update({
        assigned_user_id: targetUser.id,
        assigned_user_name: targetName
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows

    if (compErr) console.error("Error updating companies:", compErr);

    const { error: leadErr } = await supabaseAdmin
      .from('leads')
      .update({
        assigned_user_id: targetUser.id,
        assigned_user_name: targetName
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows

    if (leadErr) console.error("Error updating leads:", leadErr);
  }

  console.log("Sync completed successfully!");
}

run();
