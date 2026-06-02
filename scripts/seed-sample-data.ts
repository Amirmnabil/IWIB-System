import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key missing in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const isSampleFlag = "[SAMPLE_DATA]";

async function seed() {
  console.log("Starting DB seeding with sample data...");

  // 1. Check/Insert Insurance Companies
  const insurersToInsert = [
    { companyName: `Misr Insurance ${isSampleFlag}`, companyCode: "MISR-SAMP", companyType: "Commercial", proration_method: "daily", status: "Active" },
    { companyName: `Allianz Egypt ${isSampleFlag}`, companyCode: "ALLZ-SAMP", companyType: "Commercial", proration_method: "monthly", status: "Active" }
  ];

  const { data: existingInsurers } = await supabase.from('insurance_companies').select('id, companyCode, companyName').like('companyName', `%${isSampleFlag}%`);
  
  let insurers = existingInsurers || [];
  if (insurers.length < 2) {
    console.log("Inserting sample insurance companies...");
    const { data: newInsurers, error: err1 } = await supabase.from('insurance_companies').insert(insurersToInsert).select('id, companyCode, companyName');
    if (err1) console.error("Error inserting insurers:", err1);
    else insurers = newInsurers || [];
  } else {
    console.log("Sample insurance companies already exist.");
  }

  // 2. Check/Insert Clients (Companies)
  const clientsToInsert = [
    { name: `TechFlow Inc ${isSampleFlag}`, industry: "Technology", status: "active", employee_count: 150 },
    { name: `Global Logistics ${isSampleFlag}`, industry: "Logistics", status: "active", employee_count: 800 }
  ];

  const { data: existingClients } = await supabase.from('companies').select('id, name').like('name', `%${isSampleFlag}%`);
  let clients = existingClients || [];
  if (clients.length < 2) {
    console.log("Inserting sample clients...");
    const { data: newClients, error: err2 } = await supabase.from('companies').insert(clientsToInsert).select('id, name');
    if (err2) console.error("Error inserting clients:", err2);
    else clients = newClients || [];
  } else {
    console.log("Sample clients already exist.");
  }

  if (insurers.length < 2 || clients.length < 2) {
    console.error("Failed to ensure base entities. Aborting.");
    return;
  }

  const misr = insurers.find(i => i.companyCode === "MISR-SAMP") || insurers[0];
  const allianz = insurers.find(i => i.companyCode === "ALLZ-SAMP") || insurers[1];
  const techflow = clients.find(c => c.name.includes("TechFlow")) || clients[0];
  const globalLog = clients.find(c => c.name.includes("Global Logistics")) || clients[1];

  // 3. Check/Insert Policies
  const policiesToInsert = [
    { 
      client_company_id: techflow.id, 
      client_company_name: techflow.name,
      insurer_id: misr.id,
      insurer_name: misr.companyName,
      policy_number: `POL-TECH-${Date.now()}`,
      policy_type: "medical",
      policy_status: "active",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      premium_total: 250000
    },
    { 
      client_company_id: globalLog.id, 
      client_company_name: globalLog.name,
      insurer_id: allianz.id,
      insurer_name: allianz.companyName,
      policy_number: `POL-GLOB-${Date.now()}`,
      policy_type: "medical",
      policy_status: "active",
      start_date: "2026-06-01",
      end_date: "2027-05-31",
      premium_total: 1200000
    }
  ];

  const { data: existingPolicies } = await supabase.from('policies').select('id, policy_number').like('policy_number', `%POL-%`);
  let policies = existingPolicies || [];
  
  if (policies.length < 2) {
    console.log("Inserting sample policies...");
    const { data: newPolicies, error: err3 } = await supabase.from('policies').insert(policiesToInsert).select('id, policy_number');
    if (err3) console.error("Error inserting policies:", err3);
    else policies = newPolicies || [];
  } else {
    console.log("Sample policies already exist.");
  }

  if (policies.length < 2) return;
  const techPolicy = policies[0];
  const globPolicy = policies[1];

  // 4. Insert Policy Members
  const { count: memberCount } = await supabase.from('policy_members').select('*', { count: 'exact', head: true }).eq('policy_id', techPolicy.id);
  if (!memberCount || memberCount === 0) {
    console.log("Inserting sample policy members...");
    const membersToInsert = [
      { policy_id: techPolicy.id, member_name: "Alice Smith", relation: "employee", premium: 5000, status: "active", national_id: "29001010101010", company_name: techflow.name, policy_number: techPolicy.policy_number },
      { policy_id: techPolicy.id, member_name: "Bob Jones", relation: "employee", premium: 5500, status: "active", national_id: "29002020202020", company_name: techflow.name, policy_number: techPolicy.policy_number },
      { policy_id: globPolicy.id, member_name: "Charlie Brown", relation: "employee", premium: 4500, status: "active", national_id: "28503030303030", company_name: globalLog.name, policy_number: globPolicy.policy_number },
      { policy_id: globPolicy.id, member_name: "Diana Prince", relation: "spouse", premium: 4000, status: "active", national_id: "29204040404040", company_name: globalLog.name, policy_number: globPolicy.policy_number }
    ];
    await supabase.from('policy_members').insert(membersToInsert);
  }

  // 5. Insert Endorsements & Endorsement Items for TechPolicy
  const { data: existingEndorsements } = await supabase.from('endorsements').select('id').eq('policy_id', techPolicy.id);
  if (!existingEndorsements || existingEndorsements.length === 0) {
    console.log("Inserting sample endorsements...");
    
    // Addition Endorsement
    const addEnd = {
      policy_id: techPolicy.id,
      endorsement_number: "END-ADD-001",
      endorsement_type: "addition",
      effective_date: "2026-03-01", // 305 days left (approx 0.83 factor)
      members_added: 2,
      members_deleted: 0,
      premium_adjustment: 8356.16, // Example 10000 * (305/365)
      status: "approved",
      details: { proration_method: "daily", note: isSampleFlag }
    };
    const { data: addedEnd, error: errAdd } = await supabase.from('endorsements').insert(addEnd).select('id').single();
    if (errAdd) console.error("Error adding Endorsement 1:", errAdd);
    else if (addedEnd) {
      await supabase.from('endorsement_items').insert([
        { endorsement_id: addedEnd.id, member_name: "Eve Adams", action_type: "add", annual_premium: 5000, calculation_method: "daily", prorated_factor: 0.8356, calculated_premium: 4178.08 },
        { endorsement_id: addedEnd.id, member_name: "Frank Castle", action_type: "add", annual_premium: 5000, calculation_method: "daily", prorated_factor: 0.8356, calculated_premium: 4178.08 }
      ]);
    }

    // Deletion Endorsement
    const delEnd = {
      policy_id: techPolicy.id,
      endorsement_number: "END-DEL-002",
      endorsement_type: "deletion",
      effective_date: "2026-07-01", // 183 days left
      members_added: 0,
      members_deleted: 1,
      premium_adjustment: -2506.85, // Example -5000 * (183/365)
      status: "pending",
      details: { proration_method: "daily", note: isSampleFlag }
    };
    const { data: deletedEnd, error: errDel } = await supabase.from('endorsements').insert(delEnd).select('id').single();
    if (errDel) console.error("Error adding Endorsement 2:", errDel);
    else if (deletedEnd) {
      await supabase.from('endorsement_items').insert([
        { endorsement_id: deletedEnd.id, member_name: "Bob Jones", action_type: "delete", annual_premium: 5000, calculation_method: "daily", prorated_factor: 0.5013, calculated_premium: -2506.85 }
      ]);
    }
  } else {
    console.log("Sample endorsements already exist.");
  }

  console.log("✅ Seed completed successfully!");
}

seed().catch(console.error);
