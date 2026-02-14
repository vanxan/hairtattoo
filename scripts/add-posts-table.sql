-- Posts table for business feed system
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ingorrzmoudvoknhwjjb/sql

CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE media ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Auth insert posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update own posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Auth delete own posts" ON posts FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_posts_listing_id ON posts(listing_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_post_id ON media(post_id);
