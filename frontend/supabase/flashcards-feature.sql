-- Smart Jotter — allow "flashcards" as a logged AI feature
-- ----------------------------------------------------------------------------
-- The note editor's new "Flashcards" button reuses the same credit-check +
-- deduction flow as Explain/Improve (see app/api/ai/flashcards/route.ts and
-- lib/ai/credits.ts). The usage log's `feature` column has a CHECK constraint
-- that lists the allowed values; this migration adds 'flashcards' to it.
--
-- Run this once in the Supabase SQL editor. It is safe to re-run (idempotent):
-- the constraint is dropped and recreated with the full, current feature list.
--
-- After running, flashcard generations will be audited in sj_ai_usage_log and
-- shown on the /usage page (lib/credits.ts already exposes the label + cost).

-- 1) Drop the existing CHECK on sj_ai_usage_log.feature
-- ----------------------------------------------------------------------------
alter table public.sj_ai_usage_log
  drop constraint if exists sj_ai_usage_log_feature_check;

-- 2) Re-create it with the full feature list (including flashcards)
-- ----------------------------------------------------------------------------
alter table public.sj_ai_usage_log
  add constraint sj_ai_usage_log_feature_check
  check (feature in (
    'simplify',
    'improve',
    'explain',
    'semantic_search',
    'ask_notes',
    'flashcards'
  ));