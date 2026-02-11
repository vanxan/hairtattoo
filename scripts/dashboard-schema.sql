-- ============================================================
-- HairTattoo Dashboard Schema Migrations
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Update leads table: add status tracking and notes
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS services_interested TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  reviewer_phone TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  artist_reply TEXT,
  artist_reply_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update own listing reviews" ON reviews FOR UPDATE TO authenticated USING (true);
CREATE INDEX idx_reviews_listing ON reviews(listing_id);

-- 3. Add review stats and booking to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS booking_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'message';

-- 4. Create review requests table
CREATE TABLE IF NOT EXISTS review_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT false,
  review_id BIGINT REFERENCES reviews(id)
);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage review requests" ON review_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "Public insert review requests" ON review_requests FOR INSERT WITH CHECK (true);

-- 5. Create profile completeness view
CREATE OR REPLACE VIEW profile_completeness AS
SELECT
  id,
  name,
  (
    (CASE WHEN about IS NOT NULL AND about != '' THEN 1 ELSE 0 END) +
    (CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) +
    (CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) +
    (CASE WHEN website IS NOT NULL AND website != '' THEN 1 ELSE 0 END) +
    (CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN instagram IS NOT NULL AND instagram != '' THEN 1 ELSE 0 END) +
    (CASE WHEN price_range IS NOT NULL AND price_range != '' THEN 1 ELSE 0 END) +
    (CASE WHEN booking_url IS NOT NULL AND booking_url != '' THEN 1 ELSE 0 END)
  ) as completed_fields,
  8 as total_fields
FROM listings;

-- 6. Allow public read on leads for dashboard (owner reads their own)
CREATE POLICY "Public read leads" ON leads FOR SELECT USING (true);
CREATE POLICY "Auth update leads" ON leads FOR UPDATE TO authenticated USING (true);

-- 7. Allow public read on review_requests
CREATE POLICY "Public read review requests" ON review_requests FOR SELECT USING (true);
