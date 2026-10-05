-- ============================================================================
-- Auto-renew support for Smart Jotter subscriptions (idempotent).
-- ----------------------------------------------------------------------------
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.
--
-- Adds:
--   1. Auto-renew flags + last-plan tracking on jotter.sj_user_entitlements
--   2. jotter.sj_payment_authorizations — one saved card per user, used by
--      the daily renew job to re-charge via Paystack charge_authorization
--
-- Flags default to TRUE (auto-renew on). Users opt out via the toggle on the
-- Usage page, which writes through the app's authenticated client.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. New columns on sj_user_entitlements
-- ---------------------------------------------------------------------------
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS auto_renew_ai boolean NOT NULL DEFAULT true;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS auto_renew_stt boolean NOT NULL DEFAULT true;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS ai_last_plan_id text;
ALTER TABLE jotter.sj_user_entitlements ADD COLUMN IF NOT EXISTS stt_last_plan_id text;

-- ---------------------------------------------------------------------------
-- 2. Saved card authorizations (service-role only — RLS on, no client policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jotter.sj_payment_authorizations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  authorization_code text NOT NULL,
  customer_code      text,
  email              text NOT NULL,
  card_type          text,
  last4              text,
  exp_month          text,
  exp_year           text,
  bank               text,
  currency           text NOT NULL CHECK (currency IN ('GHS', 'USD')),
  created_at         timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at         timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE jotter.sj_payment_authorizations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Grants (hosted Supabase does not auto-grant on custom schemas)
-- ---------------------------------------------------------------------------
GRANT ALL ON TABLE jotter.sj_payment_authorizations TO service_role;
GRANT SELECT, UPDATE ON TABLE jotter.sj_user_entitlements TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Verification queries
--
--    a) Columns present:
--       SELECT column_name FROM information_schema.columns
--       WHERE table_schema='jotter' AND table_name='sj_user_entitlements'
--       ORDER BY ordinal_position;
--
--    b) Authorization table exists with RLS on:
--       SELECT tablename, rowsecurity FROM pg_tables
--       WHERE schemaname='jotter' AND tablename='sj_payment_authorizations';
-- ============================================================================
