-- Smart Jotter - remove obsolete folder storage
--
-- Run this once in the Supabase SQL editor after deploying the matching code.
-- It is idempotent and removes the unused sj_folders table and its old note
-- relationship.

alter table if exists public.sj_notes
  drop column if exists folder_id;

drop table if exists public.sj_folders;
