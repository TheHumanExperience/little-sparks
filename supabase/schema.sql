-- Little Sparks leaderboard. Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- The browser only uses the anon key through the three functions below; the tables
-- themselves have RLS on with no policies, so anon cannot read or write them directly.
-- Player ids are random uuids kept in each browser; the leaderboard never returns them.
-- Names are unique ignoring case and spaces, and the same name on another device joins
-- the same player (trust-based, no logins).

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

-- Names are unique ignoring case and all spaces ("De vansh" = "devansh").
create unique index if not exists players_name_nospace_key on public.players (lower(regexp_replace(name, '\s', '', 'g')));

alter table public.players enable row level security;
alter table public.solves enable row level security;
revoke all on public.players, public.solves from anon, authenticated;

-- "Today" for the leaderboard is India time (Asia/Kolkata).
create or replace function public.ist_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- Save this device's name. p_from is the random uuid kept in the browser.
-- - Name already used by another player → this device joins that player: its own solves move
--   across (duplicates count once), its old row is removed, and that player's id and name return.
-- - Otherwise the device's own row is created, or renamed (also how a case change works).
-- Trust-based by design (no logins): typing someone's name joins their score.
create or replace function public.join_or_create(p_from uuid, p_name text)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if p_from is null then raise exception 'missing id'; end if;
  p_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  if char_length(p_name) not between 1 and 20 then raise exception 'name must be 1-20 characters'; end if;
  if p_name ~ '[[:cntrl:]\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]' then raise exception 'name has hidden characters'; end if;
  select p.id into target from players p
  where lower(regexp_replace(p.name, '\s', '', 'g')) = lower(regexp_replace(p_name, '\s', '', 'g'));
  if target is not null and target <> p_from then
    insert into solves (player_id, date, level, game, points, created_at)
      select target, s.date, s.level, s.game, s.points, s.created_at from solves s where s.player_id = p_from
      on conflict do nothing;
    delete from players p where p.id = p_from;
  else
    target := p_from;
    -- Light anti-spam: at most 60 brand-new players per hour across the whole board.
    if not exists (select 1 from players p where p.id = p_from)
       and (select count(*) from players p where p.created_at > now() - interval '1 hour') >= 60 then
      raise exception 'too many new players, try later';
    end if;
    insert into players as p (id, name) values (p_from, p_name)
    on conflict on constraint players_pkey do update set name = excluded.name;
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
-- so revoke explicitly and grant back only the three RPCs the browser needs.
revoke all on function public.ist_today(), public.join_or_create(uuid, text), public.record_solve(uuid, date, int, int), public.leaderboard(text, uuid) from public, anon, authenticated;
grant execute on function public.join_or_create(uuid, text), public.record_solve(uuid, date, int, int), public.leaderboard(text, uuid) to anon;
