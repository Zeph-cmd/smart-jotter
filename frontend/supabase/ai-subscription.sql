-- Smart Jotter — AI Writing Assist subscription columns
-- ----------------------------------------------------------------------------
-- Adds a SEPARATE subscription track for the AI text features
-- (Simplify, Improve, Explain, Semantic Search, Ask Your Notes).
--
-- These are DISTINCT from the existing speech-to-text columns
-- (subscription_status / subscription_expiry), which only govern recording time.
-- A user can subscribe to either, both, or neither independently.
--
-- Run this once in the Supabase SQL editor. It is idempotent (safe to re-run).
--
-- AI CREDIT PLANS (manual activation via MoMo + WhatsApp):
--   Plan A: 50 GHS  — 3,000 credits — valid 1 week
--   Plan B: 100 GHS — 6,000 credits — valid 1 month
--
-- Manual activation (via Supabase table editor) sets:
--   credits_allotted         = 3000 (Plan A) or 6000 (Plan B)
--   ai_subscription_status   = 'active'
--   ai_subscription_expiry   = <today + 7 days for Plan A, +30 days for Plan B>

-- ----------------------------------------------------------------------------
-- 1) AI subscription columns on sj_user_entitlements
-- ----------------------------------------------------------------------------
alter table public.sj_user_entitlements
  add column if not exists ai_subscription_status text not null default 'none'
    check (ai_subscription_status in ('none', 'active', 'expired'));

-- Date (no time component) representing when the AI credit plan lapses.
-- NULL means no AI plan has ever been activated.
alter table public.sj_user_entitlements
  add column if not exists ai_subscription_expiry date;

-- ----------------------------------------------------------------------------
-- 2) Notes on existing columns (no changes required)
-- ----------------------------------------------------------------------------
-- credits_allotted (integer, default 60) — total AI credits available.
--   When you manually activate a plan, set this to 3000 or 6000.
--   The default 60 is the temporary free starter grant.
-- credits_used (integer, default 0) — cumulative AI credits consumed.
--   Remaining AI credits = credits_allotted - credits_used.

-- ----------------------------------------------------------------------------
-- 3) Verification query (run after applying to confirm the columns exist)
-- ----------------------------------------------------------------------------
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'sj_user_entitlements'
--   and column_name in (
--     'ai_subscription_status',
--     'ai_subscription_expiry',
--     'credits_allotted',
--     'credits_used',
--     'subscription_status',
--     'subscription_expiry'
--   );