-- ============================================================
-- Movie Night App — Initial Schema
-- Run this in the Supabase SQL editor (or via supabase db push)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Allowlist ────────────────────────────────────────────────
create table allowed_emails (
  email       text primary key,
  added_at    timestamptz default now() not null
);

-- ── Profiles ─────────────────────────────────────────────────
-- Extends auth.users (created by Supabase Auth)
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz default now() not null
);

-- ── Movie Nights ──────────────────────────────────────────────
create type movie_night_status as enum (
  'pending',
  'nominations_open',
  'voting_open',
  'completed',
  'archived'
);

create table movie_nights (
  id              uuid primary key default gen_random_uuid(),
  month           smallint not null check (month between 1 and 12),
  year            smallint not null check (year >= 2024),
  genre_tmdb_id   integer not null,
  genre_name      text not null,
  event_date      date not null,
  event_time      time not null,
  event_location  text,
  status          movie_night_status not null default 'pending',
  created_at      timestamptz default now() not null,
  unique (month, year)
);

-- ── Nominations ───────────────────────────────────────────────
create table nominations (
  id              uuid primary key default gen_random_uuid(),
  movie_night_id  uuid not null references movie_nights(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  tmdb_movie_id   integer not null,
  tmdb_data       jsonb not null,
  created_at      timestamptz default now() not null,
  unique (movie_night_id, user_id),          -- one nomination per user per month
  unique (movie_night_id, tmdb_movie_id)     -- no duplicate movies
);

-- ── Votes ─────────────────────────────────────────────────────
create table votes (
  id              uuid primary key default gen_random_uuid(),
  movie_night_id  uuid not null references movie_nights(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  ranked_choices  jsonb not null,  -- ordered array of nomination UUIDs
  created_at      timestamptz default now() not null,
  unique (movie_night_id, user_id)
);

-- ── Post-watch Ratings ────────────────────────────────────────
create table post_watch_ratings (
  id              uuid primary key default gen_random_uuid(),
  movie_night_id  uuid not null references movie_nights(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  review          text,
  created_at      timestamptz default now() not null,
  unique (movie_night_id, user_id)
);

-- ── RSVPs ─────────────────────────────────────────────────────
create type rsvp_status as enum ('attending', 'not_attending', 'maybe');

create table rsvps (
  id              uuid primary key default gen_random_uuid(),
  movie_night_id  uuid not null references movie_nights(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  status          rsvp_status not null,
  created_at      timestamptz default now() not null,
  unique (movie_night_id, user_id)
);

-- ── Snack Signups ─────────────────────────────────────────────
create table snack_signups (
  id              uuid primary key default gen_random_uuid(),
  movie_night_id  uuid not null references movie_nights(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  item            text not null,
  created_at      timestamptz default now() not null
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table allowed_emails      enable row level security;
alter table profiles            enable row level security;
alter table movie_nights        enable row level security;
alter table nominations         enable row level security;
alter table votes               enable row level security;
alter table post_watch_ratings  enable row level security;
alter table rsvps               enable row level security;
alter table snack_signups       enable row level security;

-- The FastAPI backend uses the service role key and bypasses RLS.
-- These policies protect direct client-side Supabase access (not used in prod,
-- but good practice and required for local dev with supabase-js).

-- Profiles: anyone authenticated can read; users can update their own
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_insert" on profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on profiles for update to authenticated using (auth.uid() = id);

-- Movie nights: all authenticated users can read
create policy "movie_nights_select" on movie_nights for select to authenticated using (true);

-- Nominations: authenticated users can read (nominator hidden server-side when open)
create policy "nominations_select" on nominations for select to authenticated using (true);

-- Votes: users can only read their own ballot
create policy "votes_select_own" on votes for select to authenticated using (auth.uid() = user_id);

-- RSVPs: all authenticated users can read
create policy "rsvps_select" on rsvps for select to authenticated using (true);

-- Snacks: all authenticated users can read
create policy "snacks_select" on snack_signups for select to authenticated using (true);

-- Post-watch ratings: all authenticated users can read
create policy "ratings_select" on post_watch_ratings for select to authenticated using (true);

-- ============================================================
-- Seed: add yourself as the first admin
-- Replace with your actual email before running.
-- ============================================================
-- insert into allowed_emails (email) values ('your@email.com');
-- After signing in, run:
-- update profiles set is_admin = true where id = (select id from auth.users where email = 'your@email.com');
