
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // Get all active integrations that need syncing
    const now = new Date();
    const { data: integrations, error: integrationsError } = await supabase
      .from('ecommerce_integrations')
      .select('*')
      .eq('is_active', true)
      .lte('next_sync_at', now.toISOString());

    if (integrationsError) throw integrationsError;

    const syncResults = [];
    for (const integration of integrations || []) {
      try {
        // Call sync-ecommerce function for each integration
        const syncResponse = await fetch(
          `${supabaseUrl}/functions/v1/sync-ecommerce`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              integration_id: integration.id,
              platform: integration.platform,
              store_url: integration.store_url,
              credentials: integration.credentials,
            }),
          }
        );

        const syncResult = await syncResponse.json();

        // Calculate next sync time based on frequency
        const nextSync = new Date(now.getTime() + integration.sync_frequency * 1000);

        // Update integration status
        await supabase
          .from('ecommerce_integrations')
          .update({
            last_sync_status: { 
              status: syncResult.success ? 'success' : 'error',
              message: syncResult.error || null,
              last_sync: now.toISOString(),
            },
            next_sync_at: nextSync.toISOString(),
          })
          .eq('id', integration.id);

        // Calculate metrics after successful sync
        if (syncResult.success) {
          await fetch(`${supabaseUrl}/functions/v1/calculate-ecommerce-metrics`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              integration_id: integration.id,
            }),
          });
        }

        syncResults.push({
          integration_id: integration.id,
          success: syncResult.success,
          next_sync: nextSync,
        });

      } catch (error) {
        syncResults.push({
          integration_id: integration.id,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        syncs_processed: syncResults.length,
        results: syncResults,
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in scheduled sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
