-- Link Page feature: tables, columns, and policies
-- Run in Supabase SQL Editor

-- 1. Link page items table
CREATE TABLE IF NOT EXISTS link_page_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '🔗',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE link_page_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read link items" ON link_page_items FOR SELECT USING (true);
CREATE POLICY "Auth insert link items" ON link_page_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update link items" ON link_page_items FOR UPDATE USING (true);
CREATE POLICY "Auth delete link items" ON link_page_items FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_link_page_items_listing ON link_page_items(listing_id);

-- 2. Add link page columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS link_page_enabled BOOLEAN DEFAULT true;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS link_page_bio TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS link_page_accent TEXT DEFAULT '#2D5A3D';

-- 3. Link clicks tracking table
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  link_item_id UUID REFERENCES link_page_items(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  referrer TEXT
);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read link clicks" ON link_clicks FOR SELECT USING (true);
CREATE POLICY "Public log link clicks" ON link_clicks FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_link_clicks_listing ON link_clicks(listing_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_item ON link_clicks(link_item_id);

-- 4. Seed default links for INK INK (listing_id 786)
INSERT INTO link_page_items (listing_id, label, url, icon, sort_order, is_active, is_default) VALUES
  (786, 'View My Full Profile', '/near-me/miami-fl/ink-ink', '👤', 0, true, true),
  (786, 'Leave a Review', '/review.html?listing=ink-ink', '⭐', 1, true, true),
  (786, 'Call Us', 'tel:9803903300', '📞', 2, true, true),
  (786, 'Instagram', 'https://instagram.com/mysite', '📸', 3, true, true),
  (786, 'TikTok', 'https://tiktok.com/@mysite', '🎵', 4, true, true),
  (786, 'Facebook', 'https://facebook.com/my-site', '👍', 5, true, true),
  (786, 'Website', 'https://mysite.com', '🌐', 6, true, true);

-- Set link page bio for INK INK
UPDATE listings SET link_page_bio = 'Premium SMP artistry in Miami. Specializing in natural-looking hairline restoration and density work.' WHERE id = 786;
