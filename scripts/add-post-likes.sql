-- Post likes table — cookie-based visitor likes
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, visitor_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Public insert likes" ON post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete likes" ON post_likes FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
