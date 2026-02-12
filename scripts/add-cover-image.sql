-- Add is_cover column to media table for cover/thumbnail images
ALTER TABLE media ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;
