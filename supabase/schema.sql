-- Little Sparks leaderboard. Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- The browser only uses the anon key through the five functions below; the tables
-- themselves have RLS on with no policies, so anon cannot read or write them directly.
-- Player ids are random uuids that act as each browser's secret; they are never returned
-- by the leaderboard. Names are unique (ignoring case and extra spaces); one person on
-- several devices links them with a short sync code (only its SHA-256 hash is stored).

create table if not exists public.players (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 20 and name = btrim(name)),
  created_at timestamptz not null default now()
);

create table if not exists public.solves (
  player_id uuid not null references public.players (id) on delete cascade,
  date date not null,
  level smallint not null check (level in (0, 1, 2)),
  game smallint not null check (game between 0 and 40 and game <> 7),
  points smallint not null check (points in (1, 3, 5)),
  created_at timestamptz not null default now(),
  primary key (player_id, date, level, game),
  check (points = case level when 0 then 1 when 1 then 3 else 5 end)
);
create index if not exists solves_date_idx on public.solves (date);

alter table public.players add column if not exists sync_hash bytea;
alter table public.players add column if not exists sync_at timestamptz;
create unique index if not exists players_sync_hash_idx on public.players (sync_hash) where sync_hash is not null;

-- Failed sync-code claims, for rate limiting guesses.
create table if not exists public.claim_failures (at timestamptz not null default now());
create index if not exists claim_failures_at_idx on public.claim_failures (at);

-- One-time merge (safe to re-run): players sharing a name (ignoring case and spaces) are the
-- same person on several devices. Keep the oldest row, move the others' solves onto it
-- (duplicates of the same puzzle are skipped) and delete the newer rows.
do $$
declare d record;
begin
  for d in
    select id, first_value(id) over w as keep
    from public.players
    window w as (partition by lower(regexp_replace(name, '\s+', ' ', 'g')) order by created_at, id)
  loop
    if d.id <> d.keep then
      insert into public.solves (player_id, date, level, game, points, created_at)
        select d.keep, date, level, game, points, created_at from public.solves where player_id = d.id
        on conflict do nothing;
      delete from public.players where id = d.id;
    end if;
  end loop;
end $$;
create unique index if not exists players_name_key on public.players (lower(regexp_replace(name, '\s+', ' ', 'g')));

alter table public.players enable row level security;
alter table public.solves enable row level security;
alter table public.claim_failures enable row level security;
revoke all on public.players, public.solves, public.claim_failures from anon, authenticated;

-- "Today" for the leaderboard is India time (Asia/Kolkata).
create or replace function public.ist_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- Create or rename a player. The id is a random uuid kept in the player's browser.
-- A name already used by someone else is refused with 'name taken' (SQLSTATE 23505).
create or replace function public.upsert_player(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  p_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  if char_length(p_name) not between 1 and 20 then raise exception 'name must be 1-20 characters'; end if;
  if p_name ~ '[[:cntrl:]\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]' then raise exception 'name has hidden characters'; end if;
  -- Light anti-spam: at most 60 brand-new players per hour across the whole board.
  if not exists (select 1 from players where id = p_id)
     and (select count(*) from players where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too many new players, try later';
  end if;
  if exists (select 1 from players where id <> p_id and lower(regexp_replace(name, '\s+', ' ', 'g')) = lower(p_name)) then
    raise exception 'name taken' using errcode = '23505';
  end if;
  insert into players (id, name) values (p_id, p_name)
  on conflict (id) do update set name = excluded.name;
end $$;

-- Sync codes are 8 characters of Crockford base32 (no I, L, O, U), shown as XXXX-XXXX:
-- 40 random bits. Lookalikes are folded so typing O for 0 or l for 1 still works.
create or replace function public.norm_sync_code(p_code text) returns text
language sql immutable as $$
  select translate(regexp_replace(upper(coalesce(p_code, '')), '[^0-9A-Z]', '', 'g'), 'OIL', '011')
$$;

-- A fresh sync code for the player who owns p_id (their secret). Replaces any older code;
-- each code works once, within 24 hours. Returns null for an unknown id.
create or replace function public.sync_code(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  abc constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea; code text := ''; i int;
begin
  if not exists (select 1 from players where id = p_id) then return null; end if;
  loop
    b := uuid_send(gen_random_uuid());
    code := '';
    -- bytes 6 and 8 carry the uuid version/variant bits, so skip them
    foreach i in array array[0, 1, 2, 3, 4, 5, 9, 10] loop
      code := code || substr(abc, get_byte(b, i) % 32 + 1, 1);
    end loop;
    exit when not exists (select 1 from players where sync_hash = sha256(convert_to(code, 'UTF8')));
  end loop;
  update players set sync_hash = sha256(convert_to(code, 'UTF8')), sync_at = now() where id = p_id;
  return code;
end $$;

-- Link a device: a correct, unexpired code (used up by this call) returns that player's id and name. If the caller already had
-- its own player row (p_from), its solves move across and the old row is removed.
-- Wrong codes return no row and are counted; after 100 misses in an hour across the whole
-- board, claims pause ('too many tries').
create or replace function public.claim_code(p_code text, p_from uuid default null)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare target uuid; c text := norm_sync_code(p_code);
begin
  if (select count(*) from claim_failures f where f.at > now() - interval '1 hour') >= 100 then
    raise exception 'too many tries, try later';
  end if;
  if char_length(c) = 8 then
    select p.id into target from players p
    where p.sync_hash = sha256(convert_to(c, 'UTF8')) and p.sync_at > now() - interval '1 day';
  end if;
  if target is null then
    delete from claim_failures f where f.at < now() - interval '1 day';
    insert into claim_failures default values;
    return;
  end if;
  update players p set sync_hash = null, sync_at = null where p.id = target; -- single use
  if p_from is not null and p_from <> target and exists (select 1 from players p where p.id = p_from) then
    insert into solves (player_id, date, level, game, points, created_at)
      select target, s.date, s.level, s.game, s.points, s.created_at from solves s where s.player_id = p_from
      on conflict do nothing;
    delete from players p where p.id = p_from;
  end if;
  return query select p.id, p.name from players p where p.id = target;
end $$;

-- Record a first solve. Points come from the level (Gentle 1, Medium 3, Tricky 5).
-- Duplicates are ignored; dates more than a day away from India's today are rejected.
create or replace function public.record_solve(p_player uuid, p_date date, p_level int, p_game int) returns int
language plpgsql security definer set search_path = public as $$
declare pts int := case p_level when 0 then 1 when 1 then 3 when 2 then 5 end; n int;
begin
  if pts is null then raise exception 'bad level'; end if;
  if p_date not between ist_today() - 1 and ist_today() + 1 then raise exception 'date out of range'; end if;
  if (select count(*) from solves where player_id = p_player and date = p_date) >= 60 then raise exception 'too many solves'; end if;
  insert into solves (player_id, date, level, game, points) values (p_player, p_date, p_level, p_game, pts)
  on conflict do nothing;
  get diagnostics n = row_count;
  return case when n = 1 then pts else 0 end; -- 0 = already counted
end $$;

-- Ranked totals for 'day', 'week' (Monday start) or 'month', in India time.
-- Returns the top 50 plus the asking player's own row; ids are never exposed.
create or replace function public.leaderboard(p_period text, p_player uuid default null)
returns table (rank bigint, name text, points bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  with b as (
    select case p_period
             when 'day' then ist_today()
             when 'week' then date_trunc('week', ist_today())::date
             else date_trunc('month', ist_today())::date end as start
  ), t as (
    select s.player_id, sum(s.points)::bigint as pts
    from solves s, b where s.date between b.start and ist_today()
    group by s.player_id
  ), r as (
    select rank() over (order by t.pts desc) as rk, p.name, t.pts, p.id = p_player as me
    from t join players p on p.id = t.player_id
  )
  select rk, name, pts, coalesce(me, false) from r where rk <= 50 or me order by rk, name;
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated by default,
-- so revoke explicitly and grant back only the five RPCs the browser needs.
revoke all on function public.ist_today(), public.norm_sync_code(text), public.upsert_player(uuid, text), public.record_solve(uuid, date, int, int), public.leaderboard(text, uuid), public.sync_code(uuid), public.claim_code(text, uuid) from public, anon, authenticated;
grant execute on function public.upsert_player(uuid, text), public.record_solve(uuid, date, int, int), public.leaderboard(text, uuid), public.sync_code(uuid), public.claim_code(text, uuid) to anon;
