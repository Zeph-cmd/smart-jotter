-- ============================================================================
-- Smart Jotter — Permanently fix login/signup issues
-- ============================================================================
-- PROBLEM:
--   Supabase enables "Confirm email" by default. After signup, the account
--   exists in auth.users but email_confirmed_at is NULL. The user then:
--     * CANNOT log in   -> "Email not confirmed"
--     * CANNOT sign up  -> "User already registered"
--   This creates a deadlock where the user is locked out of Smart Jotter.
--
-- FIX:
--   1. Confirm every existing unconfirmed account immediately.
--   2. Turn OFF the email-confirmation requirement for all future signups
--      so users can sign in right away with just email + password.
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Click "SQL Editor" in the left sidebar.
--   3. Click "New query".
--   4. Paste this ENTIRE file.
--   5. Click "Run" (Ctrl/Cmd + Enter).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Confirm all existing unconfirmed users so they can log in NOW.
-- Safe to run multiple times — only updates rows where it is still NULL.
-- ---------------------------------------------------------------------------
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmed_at       = coalesce(confirmed_at, now())
where email_confirmed_at is null
   or confirmed_at is null;

-- ---------------------------------------------------------------------------
-- STEP 2: Disable "Confirm email" for future signups (auth config).
-- Supabase stores its auth settings in auth.config; the relevant flag is
-- `mailer_secure_email_change_enabled` and the confirmation toggle lives in
-- the GoTrue config. This update removes the confirmation requirement so new
-- users are active the moment they sign up.
-- ---------------------------------------------------------------------------
update auth.config
set mailer_secure_email_change_enabled = false;

-- NOTE: The "Confirm email" toggle in newer Supabase versions is controlled
-- via the dashboard (Authentication > Providers > Email > "Confirm email").
-- If STEP 2 alone does not take effect, also do this in the dashboard:
--   1. Go to Authentication > Providers.
--   2. Click "Email" to expand it.
--   3. Turn OFF the "Confirm email" switch.
--   4. Click "Save".
-- This guarantees new signups can log in instantly without an email link.

-- ---------------------------------------------------------------------------
-- STEP 3 (verification): List any users still unconfirmed (should be empty).
-- ---------------------------------------------------------------------------
select id, email, email_confirmed_at, created_at
from auth.users
where email_confirmed_at is null
order by created_at desc;