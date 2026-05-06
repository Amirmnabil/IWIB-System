
import { createClient } from '@supabase/supabase-js';
import { SME_PLANS } from '../src/lib/plans-data';
import { PLAN_PREMIUMS } from '../src/lib/pricing-matrix';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding plans...');
  for (const plan of SME_PLANS) {
    const { error } = await supabase.from('sme_plans').upsert({
      id: plan.id,
      "Company Name": plan.company,
      "Plan Name": plan.name,
      "Annual Coverage Limits": plan.annualLimit,
      "TPA": plan.tpa,
      "Network": plan.network,
      "Accommodation": plan.accommodation,
      "Inpatient": plan.inpatient,
      "Consultations": plan.consultations,
      "Radiology & laboratory": plan.radiologyLab,
      "Medications": plan.medications,
      "Dental": plan.dental,
      "Optical": plan.optical,
      "Maternity": plan.maternity,
      "Chronic & Pre-existing": plan.chronicPreExisting,
      "COVID-19": plan.covid19,
      "Out-of-Network Reimbursement": plan.outOfNetwork,
      "Minimum Member Count": plan.minMembers,
      "Maximum members count": plan.maxMembers,
      "Payment terms": plan.paymentTerms
    });
    if (error) console.error(`Error seeding plan ${plan.id}:`, error.message);
  }

  console.log('Seeding premiums...');
  const premiumsToInsert = [];
  for (const [planId, ages] of Object.entries(PLAN_PREMIUMS)) {
    for (const [age, rates] of Object.entries(ages)) {
      premiumsToInsert.push({
        id: `${planId}_${age}`,
        plan_id: planId,
        age: parseInt(age),
        emp: rates.emp,
        spouse: rates.spouse,
        child: rates.child
      });
    }
  }

  // Chunk inserts to avoid payload limits
  const chunkSize = 500;
  for (let i = 0; i < premiumsToInsert.length; i += chunkSize) {
    const chunk = premiumsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from('sme_premiums').upsert(chunk);
    if (error) {
      console.error(`Error seeding premiums chunk ${i}:`, error.message);
    } else {
      console.log(`Seeded premiums chunk ${i} to ${i + chunk.length}`);
    }
  }

  console.log('Seeding complete!');
}

seed();
