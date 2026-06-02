import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { type, table, record, old_record } = body;

    console.log(`Evaluating notifications for type: ${type}, table: ${table}`);

    // Fetch active rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('notification_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;

    const notificationsToInsert = [];

    // Simple rule engine evaluation
    for (const rule of rules || []) {
      // Very basic matching logic for demo purposes
      if (type === 'cron_daily' && rule.trigger_event === 'cron_daily') {
         // Evaluate cron rules...
         // Usually we would fetch records that match conditions
      } 
      else if ((type === 'INSERT' || type === 'UPDATE') && rule.trigger_event === 'on_update' && rule.entity_type === table) {
         // Evaluate conditions against record
         let conditionMet = true;
         if (rule.conditions) {
            for (const [key, expectedValue] of Object.entries(rule.conditions)) {
               if (record[key] !== expectedValue) {
                  conditionMet = false;
                  break;
               }
            }
         }

         if (conditionMet) {
            console.log(`Rule ${rule.name} matched!`);
            // Determine target users based on target_audiences
            // Example: ["assigned_user_id"]
            for (const audience of rule.target_audiences || []) {
               if (audience === 'assigned_user_id' && record.assigned_user_id) {
                  notificationsToInsert.push({
                     user_id: record.assigned_user_id,
                     rule_id: rule.id,
                     title: rule.template_title?.replace('{{name}}', record.name || 'Record') || 'Notification',
                     message: rule.template_body?.replace('{{name}}', record.name || 'Record') || 'You have a new notification.',
                     priority: rule.priority,
                     entity_type: table,
                     entity_id: record.id
                  });
               }
               // Add logic for Role broadcasting, etc.
            }
         }
      }
    }

    if (notificationsToInsert.length > 0) {
       const { error: insertError } = await supabaseClient
         .from('notifications')
         .insert(notificationsToInsert);
       
       if (insertError) throw insertError;
       console.log(`Inserted ${notificationsToInsert.length} notifications.`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
