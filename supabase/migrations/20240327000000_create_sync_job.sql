
-- Enable the pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the sync job to run every 5 minutes
SELECT cron.schedule(
  'sync-ecommerce-data',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://maymgnzrxjrrkqsffrsx.supabase.co/functions/v1/scheduled-sync',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
