  -- Défi Cup Juniors Été 2026 (MVP schema)

  create extension if not exists "pgcrypto";

  -- Enums
  do $$ begin
    create type match_status as enum (
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
  exception when duplicate_object then null; end $$;

  do $$ begin
    create type booking_responsible as enum ('player_a','player_b','undecided');
  exception when duplicate_object then null; end $$;

  do $$ begin
    create type booking_status as enum ('not_started','pending','booked','failed');
  exception when duplicate_object then null; end $$;

  do $$ begin
    create type score_status as enum ('published','disputed','resolved');
  exception when duplicate_object then null; end $$;

  -- Tables
  create table if not exists public.players (
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

  create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    player_a_id uuid not null references public.players(id) on delete cascade,
    player_b_id uuid not null references public.players(id) on delete cascade,
    inviter_player_id uuid null references public.players(id) on delete set null,
    status match_status not null default 'not_scheduled',
    proposed_times timestamptz[] not null default '{}'::timestamptz[],
    opponent_available_times timestamptz[] not null default '{}'::timestamptz[],
    selected_time timestamptz null,
    court_location text null,
    court_number text null,
    proposed_by text null check (proposed_by in ('player_a','player_b')),
    booking_responsible booking_responsible not null default 'undecided',
    booking_status booking_status not null default 'not_started',
    constraint matches_distinct_players check (player_a_id <> player_b_id)
  );

  -- Ensure only 1 match per pair (canonical ordering)
  create unique index if not exists matches_unique_pair on public.matches (
    least(player_a_id, player_b_id),
    greatest(player_a_id, player_b_id)
  );

  create table if not exists public.scores (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    match_id uuid not null unique references public.matches(id) on delete cascade,
    score_text text not null,
    score_status score_status not null default 'published',
    disputed_by_player_id uuid null references public.players(id) on delete set null,
    dispute_note text null,
    disputed_at timestamptz null,
    note text null
  );

  -- RLS (MVP: public access for parents without login)
  alter table public.players enable row level security;
  alter table public.matches enable row level security;
  alter table public.scores enable row level security;

  drop policy if exists "players_public_read" on public.players;
  create policy "players_public_read" on public.players
  for select to public using (true);

  drop policy if exists "matches_public_all" on public.matches;
  create policy "matches_public_all" on public.matches
  for all to public using (true) with check (true);

  drop policy if exists "scores_public_all" on public.scores;
  create policy "scores_public_all" on public.scores
  for all to public using (true) with check (true);

