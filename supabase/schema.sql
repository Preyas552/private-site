-- Game leaderboard schema for the self-hosted Supabase instance.
-- Run this in the Supabase SQL editor (Studio) or via psql against the DB.
--
-- Security model: the browser uses the PUBLIC anon key, so every rule that
-- matters is a Row-Level Security policy here. Anonymous users may read the
-- board and insert ONE well-formed row; they cannot update or delete anything,
-- and CHECK constraints stop garbage/oversized data.

create table if not exists public.scores (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  score      integer not null,
  created_at timestamptz not null default now(),

  -- Must match the client sanitization in lib/scores.ts
  constraint scores_name_len  check (char_length(name) between 1 and 12),
  constraint scores_score_rng check (score between 0 and 10000)
);

-- Fast "top N by score" reads.
create index if not exists scores_score_desc_idx
  on public.scores (score desc, created_at asc);

alter table public.scores enable row level security;

-- Anyone (anon role) may read the leaderboard.
drop policy if exists "public read scores" on public.scores;
create policy "public read scores"
  on public.scores for select
  to anon
  using (true);

-- Anyone may insert a score row. The WITH CHECK re-applies the bounds at the
-- policy layer (defense in depth alongside the table CHECK constraints).
drop policy if exists "public insert scores" on public.scores;
create policy "public insert scores"
  on public.scores for insert
  to anon
  with check (
    char_length(name) between 1 and 12
    and score between 0 and 10000
  );

-- No update/delete policies => those operations are denied for anon by default.
