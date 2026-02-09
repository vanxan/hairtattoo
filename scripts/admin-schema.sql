-- =============================================
-- ADMIN SCHEMA UPDATES
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Add columns to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS promoted BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS promoted_until TIMESTAMPTZ;

-- 2. Page views tracking
CREATE TABLE page_views (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id),
  path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert views" ON page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read views" ON page_views FOR SELECT USING (true);
CREATE INDEX idx_views_listing ON page_views(listing_id);

-- 3. RLS policies for admin listing management
CREATE POLICY "Public update listings" ON listings FOR UPDATE USING (true);
CREATE POLICY "Public delete listings" ON listings FOR DELETE USING (true);

-- 4. Listing stats view (joins views + leads counts)
CREATE VIEW listing_stats AS
SELECT
  l.id, l.name, l.slug, l.city, l.state, l.status, l.promoted, l.claimed,
  COUNT(DISTINCT pv.id) AS view_count,
  COUNT(DISTINCT ld.id) AS lead_count
FROM listings l
LEFT JOIN page_views pv ON pv.listing_id = l.id
LEFT JOIN leads ld ON ld.listing_id = l.id
GROUP BY l.id;
