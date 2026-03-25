-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_members (
  journal_id uuid not null references public.journals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (journal_id, user_id)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight numeric(6,2),
  hips numeric(6,2),
  tummy numeric(6,2),
  under_bust numeric(6,2),
  tummy_sucking_count integer,
  sucking_type text check (sucking_type in ('observed', 'reported', 'both')),
  water_intake numeric(6,2),
  notes text,
  recorded_by text,
  created_at timestamptz not null default now()
);

alter table public.journals enable row level security;
alter table public.journal_members enable row level security;
alter table public.entries enable row level security;

create policy "members can view journals"
on public.journals
for select
using (
  exists (
    select 1 from public.journal_members jm
    where jm.journal_id = journals.id and jm.user_id = auth.uid()
  )
);

create policy "authenticated users can create journals"
on public.journals
for insert
to authenticated
with check (created_by = auth.uid());

create policy "members can view membership"
on public.journal_members
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.journal_members jm
    where jm.journal_id = journal_members.journal_id and jm.user_id = auth.uid()
  )
);

create policy "users can join journals"
on public.journal_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users can update own membership"
on public.journal_members
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "members can view entries"
on public.entries
for select
using (
  exists (
    select 1 from public.journal_members jm
    where jm.journal_id = entries.journal_id and jm.user_id = auth.uid()
  )
);

create policy "members can add entries"
on public.entries
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.journal_members jm
    where jm.journal_id = entries.journal_id and jm.user_id = auth.uid()
  )
);

create index if not exists idx_journal_members_user_id on public.journal_members(user_id);
create index if not exists idx_entries_journal_id on public.entries(journal_id);
create index if not exists idx_entries_entry_date on public.entries(entry_date desc);
