const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
  const { data: users } = await supabase.from('users').select('*');
  const { data: roles } = await supabase.from('roles').select('*');
  const { data: user_roles } = await supabase.from('user_roles').select('*');
  const { data: rpp } = await supabase.from('role_page_permissions').select('*');
  const { data: pages } = await supabase.from('system_pages').select('*');

  console.log("Users:");
  users.forEach(u => console.log(`- ${u.name} (Role: ${u.role}, Level: ${u.level}, Admin: ${u.is_admin})`));
  
  console.log("\nRoles:");
  roles.forEach(r => console.log(`- ${r.name} (ID: ${r.id})`));

  console.log("\nUser Roles mapping:");
  user_roles.forEach(ur => console.log(`- User: ${ur.user_id}, Role: ${ur.role_id}`));

  console.log(`\nRole Page Permissions count: ${rpp.length}`);
  
  // Find which roles have CRM access (e.g. page code starting with /companies)
  const companiesPage = pages.find(p => p.code === '/companies');
  if (companiesPage) {
     const crmPerms = rpp.filter(r => r.page_id === companiesPage.id);
     console.log(`\nRoles with access to /companies:`, crmPerms.map(rp => roles.find(r => r.id === rp.role_id)?.name));
  }
}
run();
