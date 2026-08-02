-- Smart Jotter — User entitlements & subscription management
-- ----------------------------------------------------------------------------
-- This table tracks per-user audio usage (free tier) and subscription status.
-- Run this once in the Supabase SQL editor.
--
-- FREE TIER: usage_seconds accumulates all transcription time. Cap = 5400s (90 min).
-- SUBSCRIPTION: When subscription_status = 'active', the cap switches to
--   subscription_minutes_allotted (checked against subscription_minutes_used).
--   Access expires when subscription_expiry passes.

create table if not exists public.sj_user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),

  -- FREE TIER: cumulative seconds of transcription used (never resets).
  usage_seconds integer not null default 0,

  -- SUBSCRIPTION STATE
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'active', 'expired')),
  subscription_expiry timestamp with time zone,
  subscription_minutes_allotted integer not null default 0,
  subscription_minutes_used numeric(10,2) not null default 0,

  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (user_id)
);

create index if not exists sj_user_entitlements_user_idx
  on public.sj_user_entitlements (user_id);

alter table public.sj_user_entitlements enable row level security;

-- Users can read their own entitlements (quota display, gating UI).
drop policy if exists "Allow users read own sj_user_entitlements" on public.sj_user_entitlements;
create policy "Allow users read own sj_user_entitlements"
  on public.sj_user_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow inserts (first-time row creation). The quota-enforcement happens
-- server-side before increments, so client-side inserts are safe.
drop policy if exists "Allow users insert own sj_user_entitlements" on public.sj_user_entitlements;
create policy "Allow users insert own sj_user_entitlements"
  on public.sj_user_entitlements
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow updates so the RPC increment functions can run (security definer).
drop policy if exists "Allow users update own sj_user_entitlements" on public.sj_user_entitlements;
create policy "Allow users update own sj_user_entitlements"
  on public.sj_user_entitlements
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- RPC: increment_usage_seconds
-- Adds seconds to the free-tier cumulative usage. Creates the row on first use.
-- Returns the new usage_seconds total.
-- ----------------------------------------------------------------------------
create or replace function public.increment_usage_seconds(
  input_user_id uuid,
  input_seconds integer
)
returns integer
language plpgsql
security definer
as $$
declare
  new_total integer;
begin
  insert into public.sj_user_entitlements (user_id, usage_seconds)
  values (input_user_id, input_seconds)
  on conflict (user_id)
  do update
    set usage_seconds = public.sj_user_entitlements.usage_seconds + input_seconds,
        updated_at = timezone('utc', now())
  returning public.sj_user_entitlements.usage_seconds into new_total;

  return new_total;
end;
$$;

grant execute on function public.increment_usage_seconds(uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: increment_subscription_minutes_used
-- Adds minutes to the subscription usage counter. Creates the row on first use.
-- Returns the new subscription_minutes_used total.
-- ----------------------------------------------------------------------------
create or replace function public.increment_subscription_minutes_used(
  input_user_id uuid,
  input_minutes numeric
)
returns numeric
language plpgsql
security definer
as $$
declare
  new_total numeric;
begin
  insert into public.sj_user_entitlements (user_id, subscription_minutes_used)
  values (input_user_id, input_minutes)
  on conflict (user_id)
  do update
    set subscription_minutes_used = public.sj_user_entitlements.subscription_minutes_used + input_minutes,
        updated_at = timezone('utc', now())
  returning public.sj_user_entitlements.subscription_minutes_used into new_total;

  return new_total;
end;
$$;

grant execute on function public.increment_subscription_minutes_used(uuid, numeric) to authenticated;