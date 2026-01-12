-- ============================================
-- Repo Graveyard - Supabase Database Init Script
-- ============================================
-- Run this in your Supabase SQL Editor to initialize the database
--
-- Tables:
--   1. user_profiles - User profiles from GitHub Auth
--   2. user_rate_limits - Rate limiting per user
--   3. graveyards - Main table for buried projects
--   4. priest_stats - AI priest likes/endorsements
--
-- RPC Functions:
--   1. increment_respects - Atomically increment respects_paid
--   2. bless_priest - Atomically increment priest likes
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: user_profiles
-- User profiles linked to Supabase Auth
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT UNIQUE,
  github_id INTEGER UNIQUE,
  avatar_url TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: user_rate_limits
-- Rate limiting per authenticated user
-- ============================================
CREATE TABLE IF NOT EXISTS user_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  burials_today INTEGER DEFAULT 0,
  burials_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
  respects_today INTEGER DEFAULT 0,
  respects_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
  last_burial_at TIMESTAMPTZ,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_reset ON user_rate_limits(burials_reset_at);

-- ============================================
-- TABLE: graveyards
-- ============================================
-- First, check if we need to migrate existing table
DO $$
BEGIN
  -- Check if undertaker_id column exists and is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'graveyards'
    AND column_name = 'undertaker_id'
    AND data_type = 'text'
  ) THEN
    -- Create new UUID column
    ALTER TABLE graveyards RENAME COLUMN undertaker_id TO undertaker_id_old;
    ALTER TABLE graveyards ADD COLUMN undertaker_id UUID;

    -- Copy data, converting text to UUID (set NULL for invalid UUIDs)
    UPDATE graveyards
    SET undertaker_id = CASE
      WHEN undertaker_id_old ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN undertaker_id_old::UUID
      ELSE NULL
    END;

    -- Drop old column
    ALTER TABLE graveyards DROP COLUMN undertaker_id_old;
  END IF;
END $$;

-- Now create or recreate the table with proper schema
DROP TABLE IF EXISTS graveyards CASCADE;

CREATE TABLE graveyards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- GitHub Repo Info
  repo_url TEXT NOT NULL UNIQUE,
  repo_name TEXT NOT NULL,
  description TEXT,
  language TEXT,
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  birth_date TIMESTAMPTZ,
  death_date TIMESTAMPTZ,
  owner_name TEXT NOT NULL,

  -- Burial Details
  cause_of_death TEXT NOT NULL,
  eulogy TEXT NOT NULL,
  epitaph TEXT,
  respects_paid INTEGER DEFAULT 0,

  -- Undertaker Info (linked to auth.users)
  undertaker_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  undertaker_name TEXT,

  -- AI Priest Info
  provider TEXT CHECK (provider IN ('GEMINI', 'OPENAI', 'DEEPSEEK')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on repo_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_graveyards_repo_url ON graveyards(repo_url);
CREATE INDEX IF NOT EXISTS idx_graveyards_owner_name ON graveyards(owner_name);
CREATE INDEX IF NOT EXISTS idx_graveyards_undertaker_id ON graveyards(undertaker_id);
CREATE INDEX IF NOT EXISTS idx_graveyards_created_at ON graveyards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graveyards_stars_count ON graveyards(stars_count DESC);
CREATE INDEX IF NOT EXISTS idx_graveyards_respects_paid ON graveyards(respects_paid DESC);

-- ============================================
-- TABLE: priest_stats
-- ============================================
CREATE TABLE IF NOT EXISTS priest_stats (
  provider TEXT PRIMARY KEY CHECK (provider IN ('GEMINI', 'OPENAI', 'DEEPSEEK')),
  likes_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default priest stats
INSERT INTO priest_stats (provider, likes_count) VALUES
  ('GEMINI', 0),
  ('OPENAI', 0),
  ('DEEPSEEK', 0)
ON CONFLICT (provider) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE graveyards ENABLE ROW LEVEL SECURITY;
ALTER TABLE priest_stats ENABLE ROW LEVEL SECURITY;

-- user_profiles: Everyone can read, only authenticated users can read their own
DROP POLICY IF EXISTS "Public read access for user_profiles" ON user_profiles;
CREATE POLICY "Public read access for user_profiles"
  ON user_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- user_rate_limits: Users can read their own limits
DROP POLICY IF EXISTS "Users can read own rate limits" ON user_rate_limits;
CREATE POLICY "Users can read own rate limits"
  ON user_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- graveyards: Everyone can read
DROP POLICY IF EXISTS "Everyone can read graveyards" ON graveyards;
CREATE POLICY "Everyone can read graveyards"
  ON graveyards FOR SELECT
  USING (true);

-- graveyards: Only authenticated users can insert
DROP POLICY IF EXISTS "Enable insert for all users" ON graveyards;

DROP POLICY IF EXISTS "Authenticated users can insert" ON graveyards;
CREATE POLICY "Authenticated users can insert"
  ON graveyards FOR INSERT
  TO authenticated
  WITH CHECK (
    undertaker_id IS NOT NULL
    AND undertaker_id = auth.uid()
  );

-- priest_stats: Everyone can read
DROP POLICY IF EXISTS "Enable read access for priest stats" ON priest_stats;

DROP POLICY IF EXISTS "Everyone can read priest stats" ON priest_stats;
CREATE POLICY "Everyone can read priest stats"
  ON priest_stats FOR SELECT
  USING (true);

-- priest_stats: No direct updates (must use RPC)
DROP POLICY IF EXISTS "No direct updates to priest_stats" ON priest_stats;
CREATE POLICY "No direct updates to priest_stats"
  ON priest_stats FOR UPDATE
  USING (false);

-- ============================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, github_username, github_id, avatar_url, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data->>'provider_id')::INTEGER,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'name'
  );

  -- Create rate limit entry for new user
  INSERT INTO user_rate_limits (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCTION: increment_respects
-- Atomically increment the respects_paid counter for a grave
-- Requires authentication
-- ============================================
DROP FUNCTION IF EXISTS increment_respects(UUID) CASCADE;

CREATE FUNCTION increment_respects(row_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
  user_limit RECORD;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check user's daily respect limit
  SELECT * INTO user_limit
  FROM user_rate_limits
  WHERE user_id = auth.uid();

  -- Reset if needed
  IF user_limit.respects_reset_at < NOW() THEN
    UPDATE user_rate_limits
    SET respects_today = 0,
        respects_reset_at = DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
    WHERE user_id = auth.uid();
    user_limit.respects_today := 0;
  END IF;

  -- Check limit (100 respects per day)
  IF user_limit.respects_today >= 100 THEN
    RAISE EXCEPTION 'Daily respect limit reached';
  END IF;

  -- Update grave
  UPDATE graveyards
  SET respects_paid = respects_paid + 1,
      updated_at = NOW()
  WHERE id = row_id
  RETURNING respects_paid INTO new_count;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grave not found';
  END IF;

  -- Increment user's respect count
  UPDATE user_rate_limits
  SET respects_today = respects_today + 1
  WHERE user_id = auth.uid();

  RETURN new_count;
END;
$$;

-- Grant execute permission (only authenticated users)
GRANT EXECUTE ON FUNCTION increment_respects(UUID) TO authenticated;

-- ============================================
-- FUNCTION: bless_priest
-- Atomically increment the likes count for a priest
-- Requires authentication
-- ============================================
DROP FUNCTION IF EXISTS bless_priest(TEXT) CASCADE;

CREATE FUNCTION bless_priest(provider_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate provider
  IF provider_id NOT IN ('GEMINI', 'OPENAI', 'DEEPSEEK') THEN
    RAISE EXCEPTION 'Invalid provider';
  END IF;

  UPDATE priest_stats
  SET likes_count = likes_count + 1,
      updated_at = NOW()
  WHERE provider = provider_id
  RETURNING likes_count INTO new_count;

  RETURN new_count;
END;
$$;

-- Grant execute permission (only authenticated users)
GRANT EXECUTE ON FUNCTION bless_priest(TEXT) TO authenticated;

-- Revoke anonymous access
REVOKE EXECUTE ON FUNCTION increment_respects(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION bless_priest(TEXT) FROM anon;

-- ============================================
-- FUNCTION: update_updated_at
-- Automatically update updated_at timestamp
-- ============================================
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_graveyards_updated_at ON graveyards;
CREATE TRIGGER update_graveyards_updated_at
  BEFORE UPDATE ON graveyards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_priest_stats_updated_at ON priest_stats;
CREATE TRIGGER update_priest_stats_updated_at
  BEFORE UPDATE ON priest_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEW: leaderboard_summary
-- Aggregated view for leaderboard queries
-- ============================================
CREATE OR REPLACE VIEW leaderboard_summary AS
SELECT
  g.undertaker_id,
  u.github_username as undertaker_name,
  u.avatar_url,
  COUNT(*) as burial_count,
  MAX(g.created_at) as last_buried_at
FROM graveyards g
LEFT JOIN user_profiles u ON g.undertaker_id = u.id
WHERE g.undertaker_id IS NOT NULL
GROUP BY g.undertaker_id, u.github_username, u.avatar_url
ORDER BY burial_count DESC;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment below to insert sample data

/*
INSERT INTO graveyards (
  repo_url, repo_name, description, language, stars_count, forks_count,
  birth_date, death_date, owner_name, cause_of_death, eulogy, epitaph,
  undertaker_id, undertaker_name, provider
) VALUES
(
  'https://github.com/example/abandoned-project',
  'abandoned-project',
  'A once-promising project that was left behind',
  'TypeScript',
  42,
  5,
  '2023-01-15T00:00:00Z',
  '2024-06-01T00:00:00Z',
  'example-user',
  'Lost Interest (3-Minute Passion)',
  'Here lies a project that started with great enthusiasm but was quickly forgotten when the next shiny framework appeared.',
  'Gone but not forgotten (mostly just gone)',
  uuid_generate_v4(),
  'SkepticalUndertaker#42',
  'GEMINI'
);
*/
