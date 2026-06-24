import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SME_PLANS, SME_PREMIUMS } from '../src/lib/plans-data';
import { PLAN_PREMIUMS } from '../src/lib/pricing-matrix';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Seeding SME_PLANS:", SME_PLANS.length);

  if (SME_PLANS.length > 0) {
    const { error } = await supabase.from('sme_plans').upsert(
      SME_PLANS.map(plan => ({
        id: plan.id,
        "Company Name": plan.company,
        "Plan Name": plan.name,
        "Life Insurance": plan.lifeInsurance,
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
      }))
    );
    if (error) {
      console.log('Error inserting SME_PLANS:', error.message);
    } else {
      console.log('Success SME_PLANS');
    }
  }

  console.log("Generating and seeding SME_PREMIUMS");
  const allPlanIds = Object.keys(PLAN_PREMIUMS);
  const planIds = new Set(SME_PLANS.map(p => p.id));
  const allPremiums = allPlanIds.flatMap(planId => {
    if (!planIds.has(planId)) return [];
    const rates = PLAN_PREMIUMS[planId];
    if (!rates) return [];
    const points = [];
    for (let age = 1; age <= 65; age++) {
      const rate = rates[age] || { emp: 0, spouse: 0, child: 0 };
      points.push({
        id: `${planId}_${age}`,
        plan_id: planId,
        age: age,
        emp: rate.emp,
        spouse: rate.spouse,
        child: rate.child
      });
    }
    return points;
  });

  console.log("Total premium records:", allPremiums.length);

  // Insert in batches of 1000 to avoid request size limits
  const BATCH_SIZE = 1000;
  for (let i = 0; i < allPremiums.length; i += BATCH_SIZE) {
    const batch = allPremiums.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('sme_premiums').upsert(batch);
    if (error) {
      console.log('Error inserting SME_PREMIUMS batch', i, ':', error.message);
    }
  }
  console.log('Finished seeding SME_PREMIUMS');
}

run().catch(console.error);
