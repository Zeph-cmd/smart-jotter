create extension if not exists "pgcrypto";
create extension if not exists vector;

create table if not exists public.sj_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.sj_folders
alter column user_id set default auth.uid();

create index if not exists sj_folders_user_id_idx on public.sj_folders (user_id);

alter table public.sj_folders enable row level security;

drop policy if exists "Allow users read own sj_folders" on public.sj_folders;
drop policy if exists "Allow users insert own sj_folders" on public.sj_folders;
drop policy if exists "Allow users update own sj_folders" on public.sj_folders;
drop policy if exists "Allow users delete own sj_folders" on public.sj_folders;

create policy "Allow users read own sj_folders"
on public.sj_folders
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow users insert own sj_folders"
on public.sj_folders
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow users update own sj_folders"
on public.sj_folders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Allow users delete own sj_folders"
on public.sj_folders
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.sj_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  folder_id uuid references public.sj_folders(id) on delete set null,
  title text not null,
  content text not null default '',
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.sj_notes
alter column user_id set default auth.uid();

alter table public.sj_notes
add column if not exists embedding vector(1536);

alter table public.sj_notes
add column if not exists related_notes uuid[] not null default '{}';

alter table public.sj_notes enable row level security;

create or replace function public.match_sj_notes(
  query_user_id uuid,
  query_embedding vector(1536),
  match_count int default 6
)
returns table (
  id uuid,
  title text,
  content text,
  created_at timestamp with time zone,
  similarity double precision
)
language sql
stable
as $$
  select
    sj_notes.id,
    sj_notes.title,
    sj_notes.content,
    sj_notes.created_at,
    1 - (sj_notes.embedding <=> query_embedding) as similarity
  from public.sj_notes
  where sj_notes.embedding is not null
    and sj_notes.user_id = query_user_id
  order by sj_notes.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_sj_notes(uuid, vector, int) to authenticated;

create index if not exists sj_notes_user_id_idx on public.sj_notes (user_id);
create index if not exists sj_notes_folder_id_idx on public.sj_notes (folder_id);
create index if not exists sj_notes_embedding_idx
on public.sj_notes
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create table if not exists public.sj_flashcards (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.sj_notes(id) on delete cascade,
  user_id uuid references auth.users(id),
  question text not null,
  answer text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  next_review timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.sj_flashcards
alter column user_id set default auth.uid();

create index if not exists sj_flashcards_note_id_idx on public.sj_flashcards (note_id);
create index if not exists sj_flashcards_user_id_idx on public.sj_flashcards (user_id);
create index if not exists sj_flashcards_next_review_idx on public.sj_flashcards (next_review);

alter table public.sj_flashcards enable row level security;

drop policy if exists "Allow users read own sj_notes" on public.sj_notes;
drop policy if exists "Allow users insert own sj_notes" on public.sj_notes;
drop policy if exists "Allow users update own sj_notes" on public.sj_notes;
drop policy if exists "Allow users delete own sj_notes" on public.sj_notes;

create policy "Allow users read own sj_notes"
on public.sj_notes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow users insert own sj_notes"
on public.sj_notes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow users update own sj_notes"
on public.sj_notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Allow users delete own sj_notes"
on public.sj_notes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Allow users read own sj_flashcards" on public.sj_flashcards;
drop policy if exists "Allow users insert own sj_flashcards" on public.sj_flashcards;
drop policy if exists "Allow users update own sj_flashcards" on public.sj_flashcards;
drop policy if exists "Allow users delete own sj_flashcards" on public.sj_flashcards;

create policy "Allow users read own sj_flashcards"
on public.sj_flashcards
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow users insert own sj_flashcards"
on public.sj_flashcards
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow users update own sj_flashcards"
on public.sj_flashcards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Allow users delete own sj_flashcards"
on public.sj_flashcards
for delete
to authenticated
using (auth.uid() = user_id);
