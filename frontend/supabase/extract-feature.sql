-- ============================================================================
-- Smart Jotter — allow Image/PDF extraction as logged AI features
-- ============================================================================
-- The new import feature (upload an image or text PDF, extract its text into
-- a note) logs usage as 'image_extract' (2 credits) and 'pdf_extract'
-- (1 credit) in sj_ai_usage_log. The `feature` column has a CHECK constraint
-- listing allowed values; this migration widens it.
--
-- ALSO adds 'expand' — the Expand feature shipped before this constraint was
-- last widened, so its log rows would be failing without this.
--
-- Run once in Supabase Dashboard > SQL Editor. Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop whichever feature CHECK exists (name-agnostic, jotter schema).
-- ---------------------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
    from pg_constraint
   where conrelid = 'jotter.sj_ai_usage_log'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%feature%';

  if constraint_name is not null then
    execute format('alter table jotter.sj_ai_usage_log drop constraint %I', constraint_name);
    raise notice 'Dropped constraint %', constraint_name;
  else
    raise notice 'No feature CHECK found on jotter.sj_ai_usage_log';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Re-create the CHECK with the full, current feature list.
-- ---------------------------------------------------------------------------
alter table jotter.sj_ai_usage_log
  add constraint sj_ai_usage_log_feature_check
  check (feature in (
    'simplify',
    'improve',
    'explain',
    'expand',
    'semantic_search',
    'ask_notes',
    'flashcards',
    'image_extract',
    'pdf_extract'
  ));

-- ---------------------------------------------------------------------------
-- 3. Verification — run and confirm the constraint lists all 9 features:
--
--    SELECT conname, pg_get_constraintdef(oid)
--      FROM pg_constraint
--     WHERE conrelid = 'jotter.sj_ai_usage_log'::regclass
--       AND contype = 'c';
-- ============================================================================
