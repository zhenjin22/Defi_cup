-- =============================================================================
-- Défi Cup Juniors — FULL RESET (Supabase SQL editor)
-- Run in a dev project with NO production data. Destroys players/matches/scores.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Drop dependent objects
-- -----------------------------------------------------------------------------
drop policy if exists "scores_public_all" on public.scores;
drop policy if exists "matches_public_all" on public.matches;
drop policy if exists "players_public_read" on public.players;

drop table if exists public.scores cascade;
drop table if exists public.matches cascade;
drop table if exists public.players cascade;

drop type if exists public.score_status cascade;
drop type if exists public.booking_status cascade;
drop type if exists public.booking_responsible cascade;
drop type if exists public.match_status cascade;

-- Optional admin allowlist (uses auth.users)
drop table if exists public.app_admins cascade;

-- -----------------------------------------------------------------------------
-- 2) Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 3) Enum types
-- -----------------------------------------------------------------------------
create type public.match_status as enum (
  'not_scheduled',
  'waiting_response',
  'accepted',
  'declined',
  'closed_by_other_acceptance',
  'proposed',
  'availability_confirmed',
  'booking_failed',
  'scheduled',
  'published',
  'disputed',
  'resolved'
);

create type public.booking_responsible as enum ('player_a', 'player_b', 'undecided');
create type public.booking_status as enum ('not_started', 'pending', 'booked', 'failed');
create type public.score_status as enum ('published', 'disputed', 'resolved');

-- -----------------------------------------------------------------------------
-- 4) Tables
-- -----------------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  birth_year int not null,
  level text not null,
  group_name text not null,
  parent_email text null,
  parent_phone text null
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  player_a_id uuid not null references public.players (id) on delete cascade,
  player_b_id uuid not null references public.players (id) on delete cascade,
  inviter_player_id uuid null references public.players (id) on delete set null,
  status public.match_status not null default 'not_scheduled',
  proposed_times timestamptz[] not null default '{}'::timestamptz[],
  opponent_available_times timestamptz[] not null default '{}'::timestamptz[],
  selected_time timestamptz null,
  court_name text null,
  court_number text null,
  court_address_notes text null,
  proposed_by text null,
  booking_responsible public.booking_responsible not null default 'undecided',
  booking_status public.booking_status not null default 'not_started',
  constraint matches_distinct_players check (player_a_id <> player_b_id),
  constraint matches_proposed_by_side check (
    proposed_by is null or proposed_by in ('player_a', 'player_b')
  ),
  constraint matches_waiting_requires_inviter check (
    status <> 'waiting_response' or inviter_player_id is not null
  )
);

-- One lifecycle row per unordered player pair (app updates this row).
create unique index matches_unique_pair on public.matches (
  least(player_a_id, player_b_id),
  greatest(player_a_id, player_b_id)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  match_id uuid not null unique references public.matches (id) on delete cascade,
  score_text text not null,
  score_status public.score_status not null default 'published',
  winner_player_id uuid null references public.players (id) on delete set null,
  final_score_preset text null,
  no_show_status text not null default 'none'
    check (no_show_status in ('none','player_a_absent','player_b_absent','both_absent')),
  disputed_by_player_id uuid null references public.players (id) on delete set null,
  dispute_note text null,
  disputed_at timestamptz null,
  note text null
);

-- -----------------------------------------------------------------------------
-- 5) Admin allowlist (optional): insert your auth.users.id after first login
-- -----------------------------------------------------------------------------
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6) Row Level Security (MVP: anon for parents; authenticated for everyone too)
-- -----------------------------------------------------------------------------
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.scores enable row level security;
alter table public.app_admins enable row level security;

-- Parents use the anon key in the browser (no parent email auth).
drop policy if exists "players_anon_all" on public.players;
create policy "players_anon_all" on public.players
  for all to anon using (true) with check (true);

drop policy if exists "matches_anon_all" on public.matches;
create policy "matches_anon_all" on public.matches
  for all to anon using (true) with check (true);

drop policy if exists "scores_anon_all" on public.scores;
create policy "scores_anon_all" on public.scores
  for all to anon using (true) with check (true);

drop policy if exists "app_admins_self_read" on public.app_admins;
create policy "app_admins_self_read" on public.app_admins
  for select to authenticated using (auth.uid() = user_id);

-- Authenticated users listed in app_admins: full CRUD (admin UI).
drop policy if exists "players_admin_all" on public.players;
create policy "players_admin_all" on public.players
  for all to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

drop policy if exists "matches_admin_all" on public.matches;
create policy "matches_admin_all" on public.matches
  for all to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

drop policy if exists "scores_admin_all" on public.scores;
create policy "scores_admin_all" on public.scores
  for all to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 7) Seed players (Groupe 5) — levels match official roster (R5–R8)
-- -----------------------------------------------------------------------------
insert into public.players (first_name, last_name, birth_year, level, group_name, parent_email, parent_phone)
values
  ('Ron', 'Cohen', 2014, 'R5', 'Groupe 5', null, null),
  ('Oscar', 'Bragadir', 2015, 'R5', 'Groupe 5', null, null),
  ('John', 'Ruiz', 2014, 'R5', 'Groupe 5', null, null),
  ('Laloe Kingombe', 'Robert', 2014, 'R6', 'Groupe 5', null, null),
  ('Guy', 'William', 2015, 'R6', 'Groupe 5', null, null),
  ('Isaac', 'Silmont', 2014, 'R6', 'Groupe 5', null, null),
  ('Yacine', 'Tazi', 2014, 'R6', 'Groupe 5', null, null),
  ('Antoine', 'Achikian', 2013, 'R6', 'Groupe 5', null, null),
  ('Victor', 'Vispe', 2012, 'R6', 'Groupe 5', null, null),
  ('Paolo', 'Sofia', 2012, 'R6', 'Groupe 5', null, null),
  ('Arthur', 'Zaugg', 2012, 'R6', 'Groupe 5', null, null),
  ('Edgard', 'Perret', 2012, 'R7', 'Groupe 5', null, null),
  ('Dan', 'Khyuppenen', 2012, 'R7', 'Groupe 5', null, null),
  ('Baptiste', 'Devins', 2013, 'R7', 'Groupe 5', null, null),
  ('Louis', 'Boulard', 2014, 'R7', 'Groupe 5', null, null),
  ('Julian', 'Altherr', 2015, 'R7', 'Groupe 5', null, null),
  ('James', 'Caze', 2013, 'R7', 'Groupe 5', null, null),
  ('Deyi', 'Jin', 2015, 'R7', 'Groupe 5', null, null),
  ('Janali', 'Steudler', 2012, 'R8', 'Groupe 5', null, null);

commit;
