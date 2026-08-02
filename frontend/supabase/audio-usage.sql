-- Tracks per-user monthly audio transcription usage (seconds) for quota limits.
-- Limit: 4 hours (14,400 seconds) of audio per calendar month per user.

create table if not exists public.sj_audio_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  -- Calendar month in YYYY-MM format (UTC). One row per user per month.
  month_key text not null,
  seconds_used integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (user_id, month_key)
);

create index if not exists sj_audio_usage_user_month_idx
  on public.sj_audio_usage (user_id, month_key);

alter table public.sj_audio_usage enable row level security;

-- Users can read their own usage (so the UI can show remaining quota).
drop policy if exists "Allow users read own sj_audio_usage" on public.sj_audio_usage;
create policy "Allow users read own sj_audio_usage"
  on public.sj_audio_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow users to insert/update their own usage rows. The transcribe route
-- enforces the quota before incrementing.
drop policy if exists "Allow users insert own sj_audio_usage" on public.sj_audio_usage;
create policy "Allow users insert own sj_audio_usage"
  on public.sj_audio_usage
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Allow users update own sj_audio_usage" on public.sj_audio_usage;
create policy "Allow users update own sj_audio_usage"
  on public.sj_audio_usage
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Atomic increment function. Called via supabase.rpc("increment_audio_usage", ...).
-- Returns the new total seconds_used for the user/month.
create or replace function public.increment_audio_usage(
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
  insert into public.sj_audio_usage (user_id, month_key, seconds_used)
  values (
    input_user_id,
    to_char(timezone('utc', now()), 'YYYY-MM'),
    input_seconds
  )
  on conflict (user_id, month_key)
  do update
    set seconds_used = public.sj_audio_usage.seconds_used + input_seconds,
        updated_at = timezone('utc', now())
  returning public.sj_audio_usage.seconds_used into new_total;

  return new_total;
end;
$$;

grant execute on function public.increment_audio_usage(uuid, integer) to authenticated;
