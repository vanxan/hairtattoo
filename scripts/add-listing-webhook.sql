-- Supabase Database Webhook: Trigger Cloudflare Pages rebuild on listings changes
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Enable pg_net extension (needed for HTTP requests from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. Create trigger function that POSTs to Cloudflare Deploy Hook
CREATE OR REPLACE FUNCTION notify_cloudflare_rebuild()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/6d53f0a8-0fa5-4237-96dd-ddc3096baac0',
    body := '{}'::jsonb
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Create trigger on listings table for INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS on_listing_change_rebuild ON listings;
CREATE TRIGGER on_listing_change_rebuild
  AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION notify_cloudflare_rebuild();
