-- ============================================================================
-- FOSS Pulse — workshop live app schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it drops and recreates everything.
-- ============================================================================

-- Clean slate (order matters: children first) ---------------------------------
drop table if exists verdicts cascade;
drop table if exists items    cascade;
drop table if exists sessions cascade;

-- Tables ----------------------------------------------------------------------
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                 -- e.g. 'FOSS'
  phase      text not null default 'collect'
             check (phase in ('collect','closed','reflect','done')),
  created_at timestamptz not null default now()
);

create table items (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 60),
  source     text not null check (source in ('chip','free')),
  axis       text not null default 'annoy'
             check (axis in ('annoy','works')),     -- 'annoy' = annoyances, 'works' = what works well
  created_at timestamptz not null default now()
);
create index items_session_idx on items (session_id);

create table verdicts (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references items(id) on delete cascade,
  participant_id text not null,                      -- random uuid held in localStorage
  verdict        text not null check (verdict in ('answered','partly','not')),
  created_at     timestamptz not null default now(),
  unique (item_id, participant_id)                   -- one verdict per person per item; upsert to change
);
create index verdicts_item_idx on verdicts (item_id);

-- Realtime --------------------------------------------------------------------
-- Add the tables to the realtime publication so the deck + phones sync live.
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table verdicts;

-- Row level security ----------------------------------------------------------
-- 12-person internal workshop on an unlisted URL. Permissive anon policies by
-- design (spec §3). No permission system.
alter table sessions enable row level security;
alter table items    enable row level security;
alter table verdicts enable row level security;

-- sessions: anyone may read; presenter (anon) may flip the phase.
create policy sessions_select on sessions for select to anon using (true);
create policy sessions_update on sessions for update to anon using (true) with check (true);

-- items: anyone may read and add.
create policy items_select on items for select to anon using (true);
create policy items_insert on items for insert to anon with check (true);

-- verdicts: anyone may read, add, and change their own (upsert).
create policy verdicts_select on verdicts for select to anon using (true);
create policy verdicts_insert on verdicts for insert to anon with check (true);
create policy verdicts_update on verdicts for update to anon using (true) with check (true);

-- Seed the one session --------------------------------------------------------
insert into sessions (code, phase) values ('FOSS', 'collect');

-- Sanity check ----------------------------------------------------------------
select id, code, phase from sessions;
