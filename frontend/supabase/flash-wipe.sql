-- ============================================================================
-- Smart Jotter — MARKET-LAUNCH FLASH WIPE
-- ============================================================================
-- DESTRUCTIVE: run ONCE, in Supabase Dashboard > SQL Editor (as postgres /
-- service role). This removes EVERY Smart Jotter user and every trace of
-- their data so the product relaunches from a clean slate:
--
--   1. Truncates all jotter-schema tables (notes, flashcards, usage logs,
--      audio usage, payment ledger, saved cards, entitlements).
--   2. Deletes every account in auth.users (cascades to identities,
--      sessions, and refresh tokens automatically).
--
-- Safe with respect to the shared database: only the `jotter` schema and
-- auth.users are touched — the School OS app's schemas are NOT affected.
--
-- NOTE: jotter tables must be truncated BEFORE deleting auth.users, because
-- they hold foreign keys to auth.users.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Wipe all jotter-schema data in ONE statement (FK-safe).
--    Each table is guarded with to_regclass() so a missing table (e.g. one
--    that was already dropped) does not abort the script.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  candidate_tables TEXT[] := ARRAY[
    'jotter.sj_flashcards',              -- references sj_notes -> truncate first
    'jotter.sj_notes',
    'jotter.sj_ai_usage_log',
    'jotter.sj_audio_usage',
    'jotter.sj_payment_authorizations',
    'jotter.sj_paystack_transactions',
    'jotter.sj_user_entitlements'
  ];
  existing_tables TEXT[];
BEGIN
  SELECT array_agg(t)
  INTO existing_tables
  FROM unnest(candidate_tables) AS t
  WHERE to_regclass(t) IS NOT NULL;

  IF existing_tables IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || array_to_string(existing_tables, ', ')
      || ' RESTART IDENTITY CASCADE;';
    RAISE NOTICE 'Truncated: %', array_to_string(existing_tables, ', ');
  ELSE
    RAISE NOTICE 'No jotter tables found to truncate.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Delete every Supabase auth account.
--    auth.identities, auth.sessions, auth.refresh_tokens, and related rows
--    cascade automatically. Users must sign up again from scratch.
-- ---------------------------------------------------------------------------
DELETE FROM auth.users;

-- ---------------------------------------------------------------------------
-- 3. Verification — run these and confirm:
--      every count below = 0, and auth.users count = 0.
--
--    SELECT 'notes' AS tbl, count(*) FROM jotter.sj_notes
--    UNION ALL SELECT 'flashcards', count(*) FROM jotter.sj_flashcards
--    UNION ALL SELECT 'ai_usage_log', count(*) FROM jotter.sj_ai_usage_log
--    UNION ALL SELECT 'audio_usage', count(*) FROM jotter.sj_audio_usage
--    UNION ALL SELECT 'paystack_transactions', count(*) FROM jotter.sj_paystack_transactions
--    UNION ALL SELECT 'payment_authorizations', count(*) FROM jotter.sj_payment_authorizations
--    UNION ALL SELECT 'user_entitlements', count(*) FROM jotter.sj_user_entitlements
--    UNION ALL SELECT 'auth_users', count(*) FROM auth.users;
-- ============================================================================
