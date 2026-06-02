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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testCreateUser() {
  console.log("Attempting to create test user...");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'test.trigger@example.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { full_name: 'Test Trigger', role: 'Viewer' }
  });

  if (error) {
    console.error("Create User Error:", error);
  } else {
    console.log("Success! Auth User created:", data.user.id);
    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
}

testCreateUser();
