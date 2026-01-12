-- ============================================
-- Repo Graveyard - Update RLS Policies
-- ============================================
-- This script updates RLS policies for the existing graveyards table
-- WITHOUT dropping or recreating the table (preserves existing data)
-- ============================================

-- ============================================
-- TABLE: user_profiles (Create if not exists)
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
-- TABLE: user_rate_limits (Create if not exists)
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

-- ============================================
-- TABLE: priest_stats (Create if not exists)
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
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE graveyards ENABLE ROW LEVEL SECURITY;
ALTER TABLE priest_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE OR UPDATE POLICIES
-- ============================================

-- user_profiles policies
DROP POLICY IF EXISTS "Public read access for user_profiles" ON user_profiles;
CREATE POLICY "Public read access for user_profiles"
  ON user_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- user_rate_limits policies
DROP POLICY IF EXISTS "Users can read own rate limits" ON user_rate_limits;
CREATE POLICY "Users can read own rate limits"
  ON user_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- graveyards policies - CRITICAL: Allow anonymous read
DROP POLICY IF EXISTS "Everyone can read graveyards" ON graveyards;
CREATE POLICY "Everyone can read graveyards"
  ON graveyards FOR SELECT
  USING (true);

-- graveyards: Authenticated users can insert (with user ID check)
DROP POLICY IF EXISTS "Authenticated users can insert" ON graveyards;
CREATE POLICY "Authenticated users can insert"
  ON graveyards FOR INSERT
  TO authenticated
  WITH CHECK (
    undertaker_id = auth.uid()
  );

-- priest_stats policies
DROP POLICY IF EXISTS "Everyone can read priest stats" ON priest_stats;
CREATE POLICY "Everyone can read priest stats"
  ON priest_stats FOR SELECT
  USING (true);

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCTION: increment_respects
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

GRANT EXECUTE ON FUNCTION increment_respects(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION increment_respects(UUID) FROM anon;

-- ============================================
-- FUNCTION: bless_priest
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

GRANT EXECUTE ON FUNCTION bless_priest(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION bless_priest(TEXT) FROM anon;

-- ============================================
-- FUNCTION: update_updated_at
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
