-- ============================================================
-- Add profile photo support to media table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Add is_profile column to media table
ALTER TABLE media ADD COLUMN IF NOT EXISTS is_profile BOOLEAN DEFAULT false;

-- Ensure only one profile photo per listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_profile_unique
  ON media (listing_id) WHERE is_profile = true;
