-- Geo-based USD pricing + jotter schema checks for Smart Jotter.
--
-- Context:
--   Smart Jotter lives in the dedicated `jotter` schema of the shared
--   Supabase project (the school OS app uses other schemas in the same DB).
--   International (non-African) visitors are now charged in USD at fixed
--   rates: GHS 50 -> USD 20, GHS 100 -> USD 40. The transaction ledger
--   already stores a `currency` column, so USD payments are recorded as
--   (amount_minor = cents, currency = 'USD').
--
-- Run this in Supabase Dashboard > SQL Editor (as postgres/service role).
-- Everything below is idempotent — safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Make sure the Paystack transaction ledger exists in the `jotter` schema.
--    If it was originally created in `public`, move it over.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.sj_paystack_transactions SET SCHEMA jotter;

CREATE TABLE IF NOT EXISTS jotter.sj_paystack_transactions (
  reference        TEXT PRIMARY KEY,
  user_id          UUID NOT NULL,
  plan_type        TEXT NOT NULL CHECK (plan_type IN ('stt', 'ai')),
  plan_id          TEXT NOT NULL,
  amount_minor     INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'GHS',
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups by user (history / audits).
CREATE INDEX IF NOT EXISTS sj_paystack_transactions_user_id_idx
  ON jotter.sj_paystack_transactions (user_id);

-- RLS: the service-role key is the only writer (server-side verify/webhook).
-- Deny all client-side access by default (no policy = no access with RLS on);
-- the service-role key used by the API routes bypasses RLS entirely.
ALTER TABLE jotter.sj_paystack_transactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Verification queries — run these and confirm the results:
--
--    a) All Smart Jotter tables live in the `jotter` schema:
--       SELECT table_name FROM information_schema.tables
--       WHERE table_schema = 'jotter' ORDER BY table_name;
--
--    b) The ledger accepts USD rows (currency column present):
--       SELECT column_name, data_type, column_default
--       FROM information_schema.columns
--       WHERE table_schema = 'jotter'
--         AND table_name  = 'sj_paystack_transactions';
--
--    c) PostgREST exposes the `jotter` schema (also check Dashboard >
--       Settings > API > Exposed schemas includes 'jotter'):
--       SELECT current_setting('db-schemas', true) AS exposed_schemas;
--       -- (Returns empty on hosted Supabase; use the dashboard instead.)
-- ---------------------------------------------------------------------------
