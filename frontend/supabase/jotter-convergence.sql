-- ============================================================================
-- Smart Jotter — jotter-schema convergence script (idempotent)
-- ----------------------------------------------------------------------------
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.
--
-- Purpose: after moving Smart Jotter's tables into the dedicated `jotter`
-- schema (shared DB with the school app), this script converges the live
-- `jotter` tables to exactly what the app code expects:
--   1. Access grants (hosted Supabase auto-grants only on `public`)
--   2. Any missing columns on sj_user_entitlements / sj_audio_usage
--   3. Missing tables (sj_ai_usage_log), unique constraint for upserts
--   4. RLS policies for the browser's `authenticated` client
--   5. All five RPC functions re-created in `jotter`
--   6. Indexes (including ivfflat for semantic search)
--
-- PREREQUISITE (dashboard, not SQL): add `jotter` under
--   Project Settings > Data API > Settings > Exposed schemas
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Grants: schema usage + tables + sequences
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA jotter TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA jotter TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA jotter TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jotter GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jotter GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. sj_user_entitlements — ensure table + every column the code touches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jotter.sj_user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  usage_seconds integer not null default 0,
  subscription_status text not null default 'none',
  subscription_expiry timestamp with time zone,
  subscription_minutes_allotted integer not null default 0,
  subscription_minutes_used numeric(10,2) not null default 0,
  credits_allotted integer not null default 60,
  credits_used integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (user_id)
);

-- Column convergence (no-ops for columns that already exist)
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS usage_seconds integer not null default 0;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS subscription_status text not null default 'none';
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS subscription_expiry timestamp with time zone;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS subscription_minutes_allotted integer not null default 0;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS subscription_minutes_used numeric(10,2) not null default 0;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS credits_allotted integer not null default 60;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS credits_used integer not null default 0;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS ai_subscription_status text not null default 'none';
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS ai_subscription_expiry date;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS created_at timestamp with time zone not null default timezone('utc', now());
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone not null default timezone('utc', now());

-- ON CONFLICT (user_id) requires a unique index on user_id. If the stale
-- jotter copy predates the constraint, add it now.
CREATE UNIQUE INDEX IF NOT EXISTS sj_user_entitlements_user_id_unique
  ON jotter.sj_user_entitlements (user_id);

CREATE INDEX IF NOT EXISTS sj_user_entitlements_user_idx
  ON jotter.sj_user_entitlements (user_id);

ALTER TABLE jotter.sj_user_entitlements ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. sj_audio_usage — ensure table + columns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jotter.sj_audio_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  month_key text not null,
  seconds_used integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (user_id, month_key)
);

ALTER TABLE jotter.sj_audio_usage ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone not null default timezone('utc', now());

CREATE INDEX IF NOT EXISTS sj_audio_usage_user_month_idx
  ON jotter.sj_audio_usage (user_id, month_key);

ALTER TABLE jotter.sj_audio_usage ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. sj_ai_usage_log — ensure table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jotter.sj_ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  feature text not null
    check (feature in ('simplify', 'improve', 'explain', 'semantic_search', 'ask_notes')),
  credits_used integer not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS sj_ai_usage_log_user_idx
  ON jotter.sj_ai_usage_log (user_id);

CREATE INDEX IF NOT EXISTS sj_ai_usage_log_user_feature_idx
  ON jotter.sj_ai_usage_log (user_id, feature);

ALTER TABLE jotter.sj_ai_usage_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. RLS policies (drop-if-exists then re-create — idempotent)
-- ---------------------------------------------------------------------------

-- sj_user_entitlements
DROP POLICY IF EXISTS "Allow users read own sj_user_entitlements" ON jotter.sj_user_entitlements;
CREATE POLICY "Allow users read own sj_user_entitlements"
  ON jotter.sj_user_entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users insert own sj_user_entitlements" ON jotter.sj_user_entitlements;
CREATE POLICY "Allow users insert own sj_user_entitlements"
  ON jotter.sj_user_entitlements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users update own sj_user_entitlements" ON jotter.sj_user_entitlements;
CREATE POLICY "Allow users update own sj_user_entitlements"
  ON jotter.sj_user_entitlements FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sj_audio_usage
DROP POLICY IF EXISTS "Allow users read own sj_audio_usage" ON jotter.sj_audio_usage;
CREATE POLICY "Allow users read own sj_audio_usage"
  ON jotter.sj_audio_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users insert own sj_audio_usage" ON jotter.sj_audio_usage;
CREATE POLICY "Allow users insert own sj_audio_usage"
  ON jotter.sj_audio_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users update own sj_audio_usage" ON jotter.sj_audio_usage;
CREATE POLICY "Allow users update own sj_audio_usage"
  ON jotter.sj_audio_usage FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sj_ai_usage_log
DROP POLICY IF EXISTS "Allow users read own sj_ai_usage_log" ON jotter.sj_ai_usage_log;
CREATE POLICY "Allow users read own sj_ai_usage_log"
  ON jotter.sj_ai_usage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users insert own sj_ai_usage_log" ON jotter.sj_ai_usage_log;
CREATE POLICY "Allow users insert own sj_ai_usage_log"
  ON jotter.sj_ai_usage_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- sj_notes
DROP POLICY IF EXISTS "Allow users read own sj_notes" ON jotter.sj_notes;
CREATE POLICY "Allow users read own sj_notes"
  ON jotter.sj_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users insert own sj_notes" ON jotter.sj_notes;
CREATE POLICY "Allow users insert own sj_notes"
  ON jotter.sj_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users update own sj_notes" ON jotter.sj_notes;
CREATE POLICY "Allow users update own sj_notes"
  ON jotter.sj_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users delete own sj_notes" ON jotter.sj_notes;
CREATE POLICY "Allow users delete own sj_notes"
  ON jotter.sj_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- sj_flashcards
DROP POLICY IF EXISTS "Allow users read own sj_flashcards" ON jotter.sj_flashcards;
CREATE POLICY "Allow users read own sj_flashcards"
  ON jotter.sj_flashcards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users insert own sj_flashcards" ON jotter.sj_flashcards;
CREATE POLICY "Allow users insert own sj_flashcards"
  ON jotter.sj_flashcards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users update own sj_flashcards" ON jotter.sj_flashcards;
CREATE POLICY "Allow users update own sj_flashcards"
  ON jotter.sj_flashcards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users delete own sj_flashcards" ON jotter.sj_flashcards;
CREATE POLICY "Allow users delete own sj_flashcards"
  ON jotter.sj_flashcards FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- sj_paystack_transactions: RLS enabled, no policies (service role only).
ALTER TABLE jotter.sj_paystack_transactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. RPC functions — re-created in `jotter` (bodies target jotter tables).
--    Public copies are dropped to avoid drift.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.increment_usage_seconds(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_subscription_minutes_used(uuid, numeric);
DROP FUNCTION IF EXISTS public.increment_credits_used(uuid, integer);
DROP FUNCTION IF EXISTS public.increment_audio_usage(uuid, integer);
DROP FUNCTION IF EXISTS public.match_sj_notes(uuid, vector, int);

CREATE OR REPLACE FUNCTION jotter.increment_usage_seconds(
  input_user_id uuid, input_seconds integer
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_total integer;
BEGIN
  INSERT INTO jotter.sj_user_entitlements (user_id, usage_seconds)
  VALUES (input_user_id, input_seconds)
  ON CONFLICT (user_id) DO UPDATE
    SET usage_seconds = jotter.sj_user_entitlements.usage_seconds + input_seconds,
        updated_at = timezone('utc', now())
  RETURNING jotter.sj_user_entitlements.usage_seconds INTO new_total;
  RETURN new_total;
END; $$;
GRANT EXECUTE ON FUNCTION jotter.increment_usage_seconds(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION jotter.increment_subscription_minutes_used(
  input_user_id uuid, input_minutes numeric
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_total numeric;
BEGIN
  INSERT INTO jotter.sj_user_entitlements (user_id, subscription_minutes_used)
  VALUES (input_user_id, input_minutes)
  ON CONFLICT (user_id) DO UPDATE
    SET subscription_minutes_used = jotter.sj_user_entitlements.subscription_minutes_used + input_minutes,
        updated_at = timezone('utc', now())
  RETURNING jotter.sj_user_entitlements.subscription_minutes_used INTO new_total;
  RETURN new_total;
END; $$;
GRANT EXECUTE ON FUNCTION jotter.increment_subscription_minutes_used(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION jotter.increment_credits_used(
  input_user_id uuid, input_credits integer
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_total integer;
BEGIN
  INSERT INTO jotter.sj_user_entitlements (user_id, credits_used)
  VALUES (input_user_id, input_credits)
  ON CONFLICT (user_id) DO UPDATE
    SET credits_used = jotter.sj_user_entitlements.credits_used + input_credits,
        updated_at = timezone('utc', now())
  RETURNING jotter.sj_user_entitlements.credits_used INTO new_total;
  RETURN new_total;
END; $$;
GRANT EXECUTE ON FUNCTION jotter.increment_credits_used(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION jotter.increment_audio_usage(
  input_user_id uuid, input_seconds integer
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_total integer;
BEGIN
  INSERT INTO jotter.sj_audio_usage (user_id, month_key, seconds_used)
  VALUES (input_user_id, to_char(timezone('utc', now()), 'YYYY-MM'), input_seconds)
  ON CONFLICT (user_id, month_key) DO UPDATE
    SET seconds_used = jotter.sj_audio_usage.seconds_used + input_seconds,
        updated_at = timezone('utc', now())
  RETURNING jotter.sj_audio_usage.seconds_used INTO new_total;
  RETURN new_total;
END; $$;
GRANT EXECUTE ON FUNCTION jotter.increment_audio_usage(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION jotter.match_sj_notes(
  query_user_id uuid,
  query_embedding vector(1536),
  match_count int default 6
) RETURNS TABLE (
  id uuid,
  title text,
  content text,
  created_at timestamp with time zone,
  similarity double precision
) LANGUAGE sql STABLE AS $$
  SELECT n.id, n.title, n.content, n.created_at,
         1 - (n.embedding <=> query_embedding) AS similarity
  FROM jotter.sj_notes n
  WHERE n.embedding IS NOT NULL AND n.user_id = query_user_id
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count; $$;
GRANT EXECUTE ON FUNCTION jotter.match_sj_notes(uuid, vector, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Indexes for sj_notes (user filter + semantic search)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS sj_notes_user_id_idx ON jotter.sj_notes (user_id);
CREATE INDEX IF NOT EXISTS sj_notes_embedding_idx
  ON jotter.sj_notes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- 8. Verification — run these and confirm sensible results
-- ---------------------------------------------------------------------------
-- a) Exposed columns on entitlements:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema='jotter' AND table_name='sj_user_entitlements'
--    ORDER BY ordinal_position;
--
-- b) All five functions exist in jotter:
--    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='jotter';
--
-- c) Your balance intact:
--    SELECT credits_allotted, credits_used, usage_seconds
--    FROM jotter.sj_user_entitlements
--    WHERE user_id='52698c3f-eff2-4f66-984d-9b88f2806f6e';
-- ============================================================================
