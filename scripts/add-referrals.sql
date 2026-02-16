-- Pro-to-Pro Referral Program
-- Run in Supabase SQL Editor

-- 1. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  referred_listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'clicked',
  -- status: 'clicked' (visited link), 'signed_up' (created account), 'converted' (paid for Pro)
  commission_percent DECIMAL(5,2) DEFAULT 20.00,
  commission_amount DECIMAL(10,2),
  paid_out BOOLEAN DEFAULT false,
  visitor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read own referrals" ON referrals FOR SELECT USING (true);
CREATE POLICY "Public insert referrals" ON referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update referrals" ON referrals FOR UPDATE USING (true);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_listing_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 4. Add referral_code to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 5. Set referral_code = slug for all currently promoted listings
UPDATE listings SET referral_code = slug
WHERE promoted = true AND referral_code IS NULL AND slug IS NOT NULL;
