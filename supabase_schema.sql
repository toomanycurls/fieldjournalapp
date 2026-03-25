-- Enable extensions
create extension if not exists pgcrypto;

-- =========================
-- Tables
-- =========================

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_members (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (journal_id, user_id)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,

  weight numeric,
  hips numeric,
  tummy numeric,
  under_bust numeric,

  tummy_sucking_count integer,
  tummy_sucking_source text check (tummy_sucking_source in ('observed', 'reported', 'both')),

  water_intake text,
  notes text,

  created_at timestamptz not null default now()
);

-- =========================
-- Helpful indexes
-- =========================

create index if not exists idx_journals_invite_code
  on public.journals(invite_code);

create index if not exists idx_journal_members_user_id
  on public.journal_members(user_id);

create index if not exists idx_journal_members_journal_id
  on public.journal_members(journal_id);

create index if not exists idx_entries_journal_id
  on public.entries(journal_id);

create index if not exists idx_entries_created_at
  on public.entries(created_at desc);

create index if not exists idx_entries_entry_date
  on public.entries(entry_date desc);

-- =========================
-- Row Level Security
-- =========================

alter table public.journals enable row level security;
alter table public.journal_members enable row level security;
alter table public.entries enable row level security;

-- Clean out old policies if rerunning
drop policy if exists "members can view journals" on public.journals;
drop policy if exists "authenticated users can create journals" on public.journals;

drop policy if exists "users can view own membership" on public.journal_members;
drop policy if exists "users can join journals" on public.journal_members;
drop policy if exists "users can update own membership" on public.journal_members;

drop policy if exists "members can view entries" on public.entries;
drop policy if exists "members can add entries" on public.entries;

-- Journals
create policy "members can view journals"
on public.journals
for select
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.journal_members jm
    where jm.journal_id = journals.id
      and jm.user_id = auth.uid()
  )
);

create policy "authenticated users can create journals"
on public.journals
for insert
to authenticated
with check (true);

-- Journal members
create policy "users can view own membership"
on public.journal_members
for select
using (user_id = auth.uid());

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

-- Entries
create policy "members can view entries"
on public.entries
for select
using (
  exists (
    select 1
    from public.journal_members jm
    where jm.journal_id = entries.journal_id
      and jm.user_id = auth.uid()
  )
);

create policy "members can add entries"
on public.entries
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.journal_members jm
    where jm.journal_id = entries.journal_id
      and jm.user_id = auth.uid()
  )
);

-- Optional, useful if you later add editing/deleting in the UI
drop policy if exists "members can update own entries" on public.entries;
drop policy if exists "members can delete own entries" on public.entries;

create policy "members can update own entries"
on public.entries
for update
to authenticated
using (
  created_by = auth.uid()
  and exists (
    select 1
    from public.journal_members jm
    where jm.journal_id = entries.journal_id
      and jm.user_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.journal_members jm
    where jm.journal_id = entries.journal_id
      and jm.user_id = auth.uid()
  )
);

create policy "members can delete own entries"
on public.entries
for delete
to authenticated
using (
  created_by = auth.uid()
  and exists (
    select 1
    from public.journal_members jm
    where jm.journal_id = entries.journal_id
      and jm.user_id = auth.uid()
  )
);

-- =========================
-- RPC for joining by invite code
-- =========================

create or replace function public.join_journal_by_code(code text)
returns public.journals
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.journals;
begin
  select *
  into j
  from public.journals
  where invite_code = code
  limit 1;

  if j is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.journal_members (journal_id, user_id)
  values (j.id, auth.uid())
  on conflict (journal_id, user_id) do nothing;

  return j;
end;
$$;

revoke all on function public.join_journal_by_code(text) from public;
grant execute on function public.join_journal_by_code(text) to authenticated;
