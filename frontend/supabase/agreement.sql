-- Smart Jotter — Terms agreement
-- ----------------------------------------------------------------------------
-- Adds the terms-agreement state to the existing sj_user_entitlements table.
--
-- Run this once in the Supabase SQL editor. It is idempotent (safe to re-run).
--
-- COLUMNS:
--   agreed_to_terms     boolean, NOT NULL, default false.
--                       New signups and ALL existing users start as false, so
--                       every user must accept the terms once before they can
--                       use notes / AI features.
--   agreed_to_terms_at  timestamptz, nullable. Set to now() when the user
--                       checks the box and taps "Continue".

alter table public.sj_user_entitlements
  add column if not exists agreed_to_terms boolean not null default false;

alter table public.sj_user_entitlements
  add column if not exists agreed_to_terms_at timestamp with time zone;

-- ----------------------------------------------------------------------------
-- RPC: accept_terms
-- Marks the user as having agreed to the terms. Creates the row on first use.
-- Sets agreed_to_terms = true and agreed_to_terms_at = now().
-- Idempotent: re-running for an already-agreed user just refreshes the timestamp.
-- ----------------------------------------------------------------------------
create or replace function public.accept_terms(
  input_user_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.sj_user_entitlements (user_id, agreed_to_terms, agreed_to_terms_at)
  values (input_user_id, true, timezone('utc', now()))
  on conflict (user_id)
  do update
    set agreed_to_terms = true,
        agreed_to_terms_at = timezone('utc', now()),
        updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.accept_terms(uuid) to authenticated;