-- Marketplace Overhaul: dual product system (artist + curated)
-- Run in Supabase SQL Editor

-- 1. Add source column (artist = pro-uploaded, curated = admin picks)
ALTER TABLE products ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'artist';

-- 2. Add sell_mode (direct = order form, external = link to seller's store)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_mode TEXT DEFAULT 'direct';

-- 3. Add external_url (when sell_mode='external', link to their Shopify/Etsy/etc.)
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_url TEXT;

-- 4. affiliate_url already exists from prior migration (used for source='curated' Amazon links)

-- 5. image_url already exists from prior migration

-- 6. Add slug for SEO product pages
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);

-- 8. Migrate existing Amazon-linked products to source='curated'
-- All 18 seed products have affiliate_url set — mark them as curated
UPDATE products SET source = 'curated' WHERE affiliate_url IS NOT NULL AND affiliate_url != '';

-- 9. Generate slugs for all existing products
UPDATE products SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- 10. Handle duplicate slugs by appending listing_id
UPDATE products p SET slug = p.slug || '-' || p.listing_id
WHERE (SELECT COUNT(*) FROM products p2 WHERE p2.slug = p.slug) > 1;
