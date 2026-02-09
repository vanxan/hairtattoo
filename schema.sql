-- LISTINGS TABLE (replaces embedded JSON)
CREATE TABLE listings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  address TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  services TEXT[] DEFAULT '{}',
  price_range TEXT DEFAULT '$',
  about TEXT,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_by UUID REFERENCES auth.users(id),
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS TABLE (contact form submissions)
CREATE TABLE leads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- SIGNUPS TABLE (business signup requests)
CREATE TABLE signups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city_state TEXT,
  instagram TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;

-- Public can read all listings
CREATE POLICY "Public read listings" ON listings FOR SELECT USING (true);

-- Public can insert leads (contact form)
CREATE POLICY "Public insert leads" ON leads FOR INSERT WITH CHECK (true);

-- Public can insert signups
CREATE POLICY "Public insert signups" ON signups FOR INSERT WITH CHECK (true);

-- Claimed owners can update their own listing
CREATE POLICY "Owners update listings" ON listings FOR UPDATE USING (claimed_by = auth.uid());

-- Index for fast city/state lookups
CREATE INDEX idx_listings_city_state ON listings(city, state);
CREATE INDEX idx_listings_slug ON listings(slug);
