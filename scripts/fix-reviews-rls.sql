-- ============================================================
-- Fix Reviews RLS Policies
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Drop restrictive policies
DROP POLICY IF EXISTS "Public read approved reviews" ON reviews;
DROP POLICY IF EXISTS "Public insert reviews" ON reviews;
DROP POLICY IF EXISTS "Auth update own listing reviews" ON reviews;

-- Allow anyone to read ALL reviews (admin + dashboard need pending/rejected too)
CREATE POLICY "Public read all reviews" ON reviews FOR SELECT USING (true);

-- Allow anyone to insert reviews (public review form)
CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);

-- Allow anyone to update reviews (admin approve/reject, artist reply)
CREATE POLICY "Public update reviews" ON reviews FOR UPDATE USING (true);

-- Verify: should return the new policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'reviews';
