-- Smart Jotter - grant the free AI starter credits to existing free users.
-- Run after ai-credits.sql and ai-subscription.sql in the Supabase SQL editor.
-- Safe to re-run: only missing or untouched free accounts are changed.

update public.sj_user_entitlements
set credits_allotted = 60,
    updated_at = timezone('utc', now())
where coalesce(credits_allotted, 0) = 0
  and coalesce(credits_used, 0) = 0
  and coalesce(ai_subscription_status, 'none') = 'none'
  and coalesce(subscription_status, 'none') = 'none';

insert into public.sj_user_entitlements (user_id, credits_allotted)
select users.id, 60
from auth.users as users
where not exists (
  select 1
  from public.sj_user_entitlements as entitlements
  where entitlements.user_id = users.id
);