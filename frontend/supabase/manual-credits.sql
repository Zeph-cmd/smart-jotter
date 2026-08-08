-- Smart Jotter — Manual entitlement overrides
-- ----------------------------------------------------------------------------
-- Idempotent helper script for granting credits to specific accounts manually.
-- Safe to re-run; use for QA/testing and for the future manual-activation flow.
-- ----------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- QA / TEST ACCOUNT (developer) — bump for full feature testing.
-- User: 52698c3f-eff2-4f66-984d-9b88f2806f6e
-- Grant: 200 credits (enough to exercise all 5 AI features end-to-end).
-- NOTE: This is a one-time developer grant, NOT the default signup flow.
-- ---------------------------------------------------------------------------
insert into public.sj_user_entitlements (user_id, credits_allotted)
values ('52698c3f-eff2-4f66-984d-9b88f2806f6e', 200)
on conflict (user_id)
do update
  set credits_allotted = 200,
      updated_at = timezone('utc', now());

-- ---------------------------------------------------------------------------
-- FUTURE: MANUAL ACTIVATION AFTER PAYMENT (WhatsApp/MoMo)
-- ---------------------------------------------------------------------------
-- Once real subscriptions launch, new signups should NOT automatically receive
-- credits. Instead, after confirming a MoMo payment via WhatsApp, run:
--
--   insert into public.sj_user_entitlements (user_id, credits_allotted)
--   values ('<user-uuid>', <plan-credits>)
--   on conflict (user_id)
--   do update
--     set credits_allotted = sj_user_entitlements.credits_allotted + <plan-credits>,
--         updated_at = timezone('utc', now());
--
-- Also remember to set the default on credits_allotted back to 0 in
-- ai-credits.sql and remove the STARTER_CREDITS block in signup/route.ts.
-- ---------------------------------------------------------------------------