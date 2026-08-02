-- ============================================================================
-- Smart Jotter — Confirm existing locked-out users (one-time fix)
-- ============================================================================
-- PROBLEM:
--   Supabase enables "Confirm email" by default. After signup, the account
--   exists in auth.users but email_confirmed_at is NULL. The user then:
--     * CANNOT log in   -> "Email not confirmed"
--     * CANNOT sign up  -> "User already registered"
--   This creates a deadlock where the user is locked out of Smart Jotter.
--
-- IMPORTANT: This project shares a Supabase instance with a school project,
-- so we CANNOT disable email confirmation globally. Instead this script is a
-- one-time fix for existing locked-out users. New signups are auto-confirmed
-- by the Smart Jotter backend (see app/api/auth/signup/route.ts) using the
-- Supabase service role key.
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
-- `confirmed_at` is a generated column in newer Supabase versions, so we only
-- update `email_confirmed_at`.
-- ---------------------------------------------------------------------------
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- ---------------------------------------------------------------------------
-- STEP 2 (verification): List any users still unconfirmed (should be empty).
-- ---------------------------------------------------------------------------
select id, email, email_confirmed_at, created_at
from auth.users
where email_confirmed_at is null
order by created_at desc;