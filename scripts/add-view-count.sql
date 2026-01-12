-- ============================================
-- Migration: Add View Count Feature
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add view_count column to graveyards table
ALTER TABLE graveyards ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Add index for faster sorting by views
CREATE INDEX IF NOT EXISTS idx_graveyards_view_count ON graveyards(view_count DESC);

-- 3. Create RPC function to increment view count atomically
CREATE OR REPLACE FUNCTION increment_view_count(grave_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Update grave
  UPDATE graveyards
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = grave_id
  RETURNING view_count INTO new_count;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grave not found';
  END IF;

  RETURN new_count;
END;
$$;

-- Grant execute permission (everyone can increment views)
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO authenticated;
