-- Allow anonymous users to pay respects with mourner name tracking
-- This is a simplified version WITHOUT the Top Mourners leaderboard

-- Create respects_log table to track who paid respects (for rate limiting per nickname)
DROP TABLE IF EXISTS respects_log CASCADE;

CREATE TABLE respects_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  grave_id UUID NOT NULL REFERENCES graveyards(id) ON DELETE CASCADE,
  mourner_name TEXT NOT NULL, -- Nickname for anonymous users, or GitHub username for authenticated users
  mourner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_respects_log_grave_id ON respects_log(grave_id);
CREATE INDEX idx_respects_log_mourner_name ON respects_log(mourner_name);
CREATE INDEX idx_respects_log_created_at ON respects_log(created_at);

-- Enable RLS
ALTER TABLE respects_log ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Everyone can read respects_log" ON respects_log;
CREATE POLICY "Everyone can read respects_log"
  ON respects_log FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert respects_log" ON respects_log;
CREATE POLICY "Authenticated users can insert respects_log"
  ON respects_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can insert respects_log" ON respects_log;
CREATE POLICY "Anonymous users can insert respects_log"
  ON respects_log FOR INSERT
  TO anon
  WITH CHECK (true);

-- Recreate increment_respects function to accept mourner_name and log the respect
DROP FUNCTION IF EXISTS increment_respects(UUID, TEXT) CASCADE;

CREATE FUNCTION increment_respects(row_id UUID, mourner_name TEXT DEFAULT 'Anonymous')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
  user_id UUID;
BEGIN
  -- Get current user ID if authenticated
  user_id := auth.uid();

  -- Update grave
  UPDATE graveyards
  SET respects_paid = respects_paid + 1,
      updated_at = NOW()
  WHERE id = row_id
  RETURNING respects_paid INTO new_count;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grave not found';
  END IF;

  -- Log the respect (for tracking/anti-spam purposes)
  INSERT INTO respects_log (grave_id, mourner_name, mourner_id)
  VALUES (row_id, mourner_name, user_id);

  RETURN new_count;
END;
$$;

-- Grant execute permission to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION increment_respects(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_respects(UUID, TEXT) TO anon;

-- Verify the function was created (optional - you can check in Supabase Dashboard)
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'increment_respects';
