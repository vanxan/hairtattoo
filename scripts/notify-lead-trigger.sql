-- ============================================================
-- Lead notification trigger (ALREADY DEPLOYED)
-- Calls the notify-lead Edge Function on every INSERT into leads
-- Uses pg_net for async HTTP from Postgres
-- ============================================================

-- pg_net extension (already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: fires Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM net.http_post(
    url := 'https://ingorrzmoudvoknhwjjb.supabase.co/functions/v1/notify-lead',
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'listing_id', NEW.listing_id,
        'sender_name', NEW.sender_name,
        'sender_phone', NEW.sender_phone,
        'sender_message', NEW.sender_message,
        'created_at', NEW.created_at
      )
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
    )
  );
  RETURN NEW;
END;
$fn$;

-- Trigger on leads table
DROP TRIGGER IF EXISTS on_new_lead_notify ON public.leads;
CREATE TRIGGER on_new_lead_notify
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead();

-- ============================================================
-- TO ENABLE EMAIL SENDING:
-- 1. Sign up at resend.com, get an API key
-- 2. Set the secret on the Edge Function:
--    supabase secrets set RESEND_API_KEY=re_xxxxxxxx --project-ref ingorrzmoudvoknhwjjb
-- 3. Verify your sending domain at resend.com (hairtattoo.com)
-- 4. Optionally set FROM_EMAIL:
--    supabase secrets set FROM_EMAIL="HairTattoo <leads@hairtattoo.com>" --project-ref ingorrzmoudvoknhwjjb
-- ============================================================
