-- ============================================================
-- FRAGMENTS — Database setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists anecdotes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  content    text not null,
  created_at timestamptz default now()
);

alter table anecdotes enable row level security;

do $$ begin
  drop policy if exists "Allow full access" on anecdotes;
exception when others then null;
end $$;

create policy "Allow full access"
  on anecdotes for all
  using (true) with check (true);

create table if not exists story_events (
  id          uuid primary key default gen_random_uuid(),
  year        integer not null,
  month       integer not null check (month >= 1 and month <= 12),
  title       text not null,
  description text default '',
  created_at  timestamptz default now()
);

alter table story_events enable row level security;

do $$ begin
  drop policy if exists "Allow full access" on story_events;
exception when others then null;
end $$;

create policy "Allow full access"
  on story_events for all
  using (true) with check (true);