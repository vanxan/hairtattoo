-- Stripe Pro subscription columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_listings_stripe_customer ON listings(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_stripe_subscription ON listings(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
