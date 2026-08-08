-- Paystack transaction ledger (idempotency / replay-attack defense).
--
-- Purpose:
--   Tracks every Paystack transaction reference we have already processed
--   (via /api/paystack/verify or /api/paystack/webhook). This prevents a
--   single valid payment from being replayed to repeatedly refresh/extend
--   a subscription's expiry date.
--
-- Maps to OWASP API security best practice: idempotent mutations + replay
-- protection on payment endpoints.

CREATE TABLE IF NOT EXISTS public.sj_paystack_transactions (
  reference        TEXT PRIMARY KEY,
  user_id          UUID NOT NULL,
  plan_type        TEXT NOT NULL CHECK (plan_type IN ('stt', 'ai')),
  plan_id          TEXT NOT NULL,
  amount_minor     INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'GHS',
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups by user (history / audits).
CREATE INDEX IF NOT EXISTS sj_paystack_transactions_user_id_idx
  ON public.sj_paystack_transactions (user_id);

-- RLS: the service-role key is the only writer (server-side verify/webhook).
-- Enable RLS and deny direct client access; server uses service role which
-- bypasses RLS.
ALTER TABLE public.sj_paystack_transactions ENABLE ROW LEVEL SECURITY;

-- Deny all client-side access by default (no policy = no access with RLS on).
-- The service-role key bypasses RLS entirely, which is what the API routes use.