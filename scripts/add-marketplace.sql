-- SMP Marketplace: products, orders, and policies
-- Run in Supabase SQL Editor

-- 1. Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT DEFAULT 'other',
  in_stock BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Auth insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Auth delete products" ON products FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_products_listing ON products(listing_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 2. Product orders table
CREATE TABLE IF NOT EXISTS product_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_street TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  status TEXT DEFAULT 'new',
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert orders" ON product_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth read own orders" ON product_orders FOR SELECT USING (true);
CREATE POLICY "Auth update own orders" ON product_orders FOR UPDATE USING (true);
CREATE INDEX IF NOT EXISTS idx_product_orders_listing ON product_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_product ON product_orders(product_id);

-- 3. Add product_id column to media table
ALTER TABLE media ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_media_product_id ON media(product_id);

-- 4. Seed test products for INK INK (listing_id 786)
INSERT INTO products (listing_id, name, description, price, category, in_stock, sort_order) VALUES
  (786, 'Signature Aftercare Kit', 'Everything your scalp needs after an SMP session. Includes antiseptic foam (2oz) and healing serum (2oz) in a travel pouch. Formulated specifically for SMP. Made in USA.', 38.00, 'aftercare', true, 0),
  (786, 'Scalp Anti-Shine Mattifying Gel', 'Eliminates scalp shine for a natural matte finish. Lightweight, non-greasy formula. Apply daily for best results. 4oz bottle.', 22.00, 'aftercare', true, 1),
  (786, 'SPF 50 Scalp Protection Spray', 'Protect your SMP from UV damage. Lightweight spray formula, no white residue. Water resistant 80 minutes. 3oz spray bottle.', 18.00, 'aftercare', true, 2),
  (786, 'Pre-Treatment Exfoliating Scrub', 'Gentle exfoliant to prep skin before SMP sessions. Removes dead skin for better pigment retention. 2oz jar.', 15.00, 'aftercare', false, 3);
