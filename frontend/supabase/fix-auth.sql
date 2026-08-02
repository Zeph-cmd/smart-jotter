-- ============================================================================
-- Smart Jotter — Fix "can't sign in or sign up" issue
-- ============================================================================
-- PROBLEM:
--   After signing out you can neither sign in ("Email not confirmed") nor sign
--   up again ("User already registered"). This happens when an account exists
--   in auth.users but its email was never confirmed (or the link expired).
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Click "SQL Editor" in the left sidebar.
--   3. Click "New query".
--   4. Paste this ENTIRE file.
--   5. Click "Run" (Ctrl/Cmd + Enter).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1 (optional): Inspect the current state of the account.
-- Uncomment the SELECT below and run it first if you want to see what's there.
-- ---------------------------------------------------------------------------
-- select
--   id,
--   email,
--   email_confirmed_at,
--   created_at,
--   last_sign_in_at
-- from auth.users
-- where email = 'yumpinizephaniah@gmail.com';


-- ---------------------------------------------------------------------------
-- STEP 2 (RECOMMENDED FIX): Confirm the email so you can sign in immediately.
-- This sets email_confirmed_at if it was NULL. Safe to run more than once.
-- ---------------------------------------------------------------------------
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'yumpinizephaniah@gmail.com';

-- STEP 2b (OPTIONAL): ALSO RESET THE PASSWORD.
-- Your new password will be: pass@code   (change it inside crypt('...') if you like)
--
-- !!! CRITICAL RULES !!!
--   * There is NO semicolon between `update auth.users` and `set`.
--     WRONG:  update auth.users ; set encrypted_password = ...   <- breaks + unsafe
--     RIGHT:  update auth.users set encrypted_password = ...
--   * NEVER remove the WHERE clause. Without it you would set EVERY user's
--     password to the same value and lock everyone out.
--   * pgcrypto (already enabled by schema.sql) provides crypt() and gen_salt().
-- Uncomment the THREE lines below to reset the password, then run.
 update auth.users
 set encrypted_password = crypt('pass@code', gen_salt('bf'))
-- where email = 'yumpinizephaniah@gmail.com';


-- ---------------------------------------------------------------------------
-- STEP 3 (ALTERNATIVE / FALLBACK): Completely remove the account so you can
-- sign up fresh from the app. Only use this if Step 2 did not work.
-- This deletes the auth user AND any of their notes/folders/flashcards.
-- Uncomment both lines, then run.
-- ---------------------------------------------------------------------------
-- delete from public.sj_flashcards where user_id = (select id from auth.users where email = 'yumpinizephaniah@gmail.com');
-- delete from public.sj_notes      where user_id = (select id from auth.users where email = 'yumpinizephaniah@gmail.com');
-- delete from public.sj_folders    where user_id = (select id from auth.users where email = 'yumpinizephaniah@gmail.com');
-- delete from auth.users where email = 'yumpinizephaniah@gmail.com';