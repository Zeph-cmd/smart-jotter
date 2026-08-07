-- Smart Jotter — AI credits & usage logging
-- ----------------------------------------------------------------------------
-- Adds credit columns to the existing sj_user_entitlements table and creates
-- a new sj_ai_usage_log table for per-call auditing.
--
-- Run this once in the Supabase SQL editor. It is idempotent (safe to re-run).
--
-- CREDIT MODEL:
--   credits_allotted = total credits the user's plan grants (0 until upgraded)
--   credits_used     = cumulative AI credits consumed
--   Remaining = credits_allotted - credits_used
--
-- Features (see lib/credits.ts):
--   simplify/improve/explain/semantic_search = 1 credit
--   ask_notes                                = 2 credits

-- ----------------------------------------------------------------------------
-- 1) Add credit columns to sj_user_entitlements
-- ----------------------------------------------------------------------------
alter table public.sj_user_entitlements
  add column if not exists credits_allotted integer not null default 0;

alter table public.sj_user_entitlements
  add column if not exists credits_used integer not null default 0;

-- ----------------------------------------------------------------------------
-- 2) Create sj_ai_usage_log
-- ----------------------------------------------------------------------------
create table if not exists public.sj_ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  feature text not null
    check (feature in ('simplify', 'improve', 'explain', 'semantic_search', 'ask_notes')),
  credits_used integer not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists sj_ai_usage_log_user_idx
  on public.sj_ai_usage_log (user_id);

create index if not exists sj_ai_usage_log_user_feature_idx
  on public.sj_ai_usage_log (user_id, feature);

alter table public.sj_ai_usage_log enable row level security;

-- Users can read only their own usage rows (usage page).
drop policy if exists "Allow users read own sj_ai_usage_log" on public.sj_ai_usage_log;
create policy "Allow users read own sj_ai_usage_log"
  on public.sj_ai_usage_log
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts are done server-side via the service role, but allow direct inserts
-- scoped to the user so client-safe flows work too.
drop policy if exists "Allow users insert own sj_ai_usage_log" on public.sj_ai_usage_log;
create policy "Allow users insert own sj_ai_usage_log"
  on public.sj_ai_usage_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3) RPC: increment_credits_used
-- Adds credits to the cumulative AI counter. Creates the row on first use.
-- Returns the new credits_used total.
-- ----------------------------------------------------------------------------
create or replace function public.increment_credits_used(
  input_user_id uuid,
  input_credits integer
)
returns integer
language plpgsql
security definer
as $$
declare
  new_total integer;
begin
  insert into public.sj_user_entitlements (user_id, credits_used)
  values (input_user_id, input_credits)
  on conflict (user_id)
  do update
    set credits_used = public.sj_user_entitlements.credits_used + input_credits,
        updated_at = timezone('utc', now())
  returning public.sj_user_entitlements.credits_used into new_total;

  return new_total;
end;
$$;

grant execute on function public.increment_credits_used(uuid, integer) to authenticated;