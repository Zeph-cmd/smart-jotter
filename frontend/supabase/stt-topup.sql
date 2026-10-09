-- ============================================================================
-- Smart Jotter — STT Extra Minutes top-ups
-- ============================================================================
-- Adds purchasable Speech-to-Text minutes that NEVER expire:
--   1. `purchased_seconds_remaining` on jotter.sj_user_entitlements.
--   2. RPC `use_purchased_seconds` — atomic, floor-at-zero deduction, only
--      callable by the row owner.
--   3. Widens the sj_paystack_transactions.plan_type CHECK to accept
--      'stt_topup' (ledger rows for top-up purchases).
--
-- Run once in Supabase Dashboard > SQL Editor (as postgres/service role).
-- Everything is idempotent — safe to run more than once.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. New column: purchased top-up seconds (never expire, stack).
-- ---------------------------------------------------------------------------
alter table jotter.sj_user_entitlements
  add column if not exists purchased_seconds_remaining integer not null default 0;

-- ---------------------------------------------------------------------------
-- 2. RPC: atomically deduct purchased seconds for the CALLING user only.
--    Returns the remaining balance after the deduction (floored at 0).
-- ---------------------------------------------------------------------------
create or replace function jotter.use_purchased_seconds(
  input_user_id uuid,
  input_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = jotter, extensions
as $$
declare
  remaining integer;
begin
  if auth.uid() is null or auth.uid() <> input_user_id then
    raise exception 'Not permitted to update this user''s purchased minutes';
  end if;

  update jotter.sj_user_entitlements
     set purchased_seconds_remaining = greatest(
           0,
           coalesce(purchased_seconds_remaining, 0) - input_seconds
         ),
         updated_at = now()
   where user_id = input_user_id
  returning purchased_seconds_remaining into remaining;

  return coalesce(remaining, 0);
end;
$$;

grant execute on function jotter.use_purchased_seconds(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2b. RPC: atomically ADD purchased seconds (used by the payment grant path,
--     which runs with the service role). Executable by service_role only.
--     Returns the new balance after the addition.
-- ---------------------------------------------------------------------------
create or replace function jotter.add_purchased_seconds(
  input_user_id uuid,
  input_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = jotter, extensions
as $$
declare
  new_balance integer;
begin
  insert into jotter.sj_user_entitlements (user_id, purchased_seconds_remaining)
  values (input_user_id, greatest(0, input_seconds))
  on conflict (user_id) do update
    set purchased_seconds_remaining = greatest(
          0,
          coalesce(jotter.sj_user_entitlements.purchased_seconds_remaining, 0)
            + greatest(0, input_seconds)
        ),
        updated_at = now()
  returning purchased_seconds_remaining into new_balance;

  return coalesce(new_balance, 0);
end;
$$;

revoke execute on function jotter.add_purchased_seconds(uuid, integer) from public, anon, authenticated;
grant execute on function jotter.add_purchased_seconds(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Ledger: allow plan_type = 'stt_topup'.
--    Drops whichever CHECK exists on plan_type and re-adds the widened one.
-- ---------------------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
    from pg_constraint
   where conrelid = 'jotter.sj_paystack_transactions'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%plan_type%';

  if constraint_name is not null then
    execute format('alter table jotter.sj_paystack_transactions drop constraint %I', constraint_name);
  end if;

  alter table jotter.sj_paystack_transactions
    add constraint sj_paystack_transactions_plan_type_check
    check (plan_type in ('stt', 'ai', 'stt_topup'));
end $$;

-- ---------------------------------------------------------------------------
-- 4. Verification — run these and confirm:
--
--    a) Column exists:
--       SELECT column_name, data_type, column_default
--         FROM information_schema.columns
--        WHERE table_schema = 'jotter'
--          AND table_name = 'sj_user_entitlements'
--          AND column_name = 'purchased_seconds_remaining';
--
--    b) Ledger accepts the new type:
--       SELECT conname, pg_get_constraintdef(oid)
--         FROM pg_constraint
--        WHERE conrelid = 'jotter.sj_paystack_transactions'::regclass
--          AND contype = 'c';
--
--    c) RPC exists:
--       SELECT proname FROM pg_proc
--        WHERE pronamespace = 'jotter'::regnamespace
--          AND proname = 'use_purchased_seconds';
-- ============================================================================
