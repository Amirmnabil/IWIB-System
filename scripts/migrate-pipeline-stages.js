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
  console.log("Starting master pipeline stages update...");

  // 1. Delete all existing stages to clean them up
  const { error: deleteError } = await supabaseAdmin
    .from('master_pipeline_stages')
    .delete()
    .neq('name', '___NON_EXISTENT_STAGE___');

  if (deleteError) {
    console.error("Error clearing pipeline stages:", deleteError);
    process.exit(1);
  }

  // 2. Insert new stages in correct order
  const newStages = [
    { name: 'Qualification', code: 'qualification', order: 1 },
    { name: 'Proposal sent', code: 'proposal_sent', order: 2 },
    { name: 'Needs adjustments', code: 'needs_adjustments', order: 3 },
    { name: 'Negotiation', code: 'negotiation', order: 4 },
    { name: 'Won', code: 'closed_won', order: 5 },
    { name: 'Lost', code: 'closed_lost', order: 6 }
  ];

  const { error: insertError } = await supabaseAdmin
    .from('master_pipeline_stages')
    .insert(newStages);

  if (insertError) {
    console.error("Error inserting updated pipeline stages:", insertError);
    process.exit(1);
  }

  console.log("Successfully updated master_pipeline_stages table.");

  // 3. Migrate existing prospects' stage codes
  console.log("Migrating existing prospects stage codes...");

  const { error: migrateProposalSentError } = await supabaseAdmin
    .from('prospects')
    .update({ pipeline_stage: 'proposal_sent' })
    .eq('pipeline_stage', 'needs_analysis');

  if (migrateProposalSentError) {
    console.error("Error migrating 'needs_analysis' -> 'proposal_sent':", migrateProposalSentError);
  }

  const { error: migrateNeedsAdjustmentsError } = await supabaseAdmin
    .from('prospects')
    .update({ pipeline_stage: 'needs_adjustments' })
    .eq('pipeline_stage', 'proposal');

  if (migrateNeedsAdjustmentsError) {
    console.error("Error migrating 'proposal' -> 'needs_adjustments':", migrateNeedsAdjustmentsError);
  }

  console.log("Prospect stages migration complete.");
  process.exit(0);
}

run();
