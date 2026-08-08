const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const docsList = [
    { category: 'required_docs', key: 'Medical', value: 'Member Census (Excel), Existing Table of Benefits, 3 Years Claims History, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Medical_SME', value: 'Member Census (Excel), CR Copy, Tax Card, Existing Policy (if any)', is_active: true },
    { category: 'required_docs', key: 'Medical_Corporate', value: 'Member Census (Excel), Existing Table of Benefits, 3 Years Claims History, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Motor', value: 'Vehicle Census (Excel), Existing Policy Schedule, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Motor_SME', value: 'Vehicle Census (Excel), CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Motor_Corporate', value: 'Vehicle Census (Excel), Existing Policy Schedule, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Life', value: 'Employee Census (Excel), CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Life_SME', value: 'Employee Census (Excel), CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Life_Corporate', value: 'Employee Census (Excel), Existing Table of Benefits, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Property', value: 'Asset List & Valuations, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Property_SME', value: 'Asset List, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Property_Corporate', value: 'Asset List & Valuations, Fire Safety Report, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Liability', value: 'CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Marine', value: 'Cargo Valuations, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Engineering', value: 'Project Details, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Financial Lines', value: 'Financial Statements, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Cyber', value: 'Security Audits, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Travel', value: 'Traveler Details, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'Personal Accident', value: 'Employee List, CR Copy, Tax Card', is_active: true },
    { category: 'required_docs', key: 'default', value: 'CR Copy, Tax Card, Existing Policy (if any)', is_active: true }
];

async function run() {
  console.log("Upserting dynamic required documents lists by LOB and Subtype...");

  for (const doc of docsList) {
    const { error } = await supabaseAdmin
      .from('reference_list')
      .upsert(doc, { onConflict: 'category,key' });

    if (error) {
      console.error(`Error upserting key '${doc.key}':`, error);
    } else {
      console.log(`Successfully upserted key '${doc.key}'`);
    }
  }

  console.log("Required documents seeding complete!");
  process.exit(0);
}

run();
