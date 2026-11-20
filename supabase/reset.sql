-- One-time reset: deletes ALL leaderboard data and the old functions.
-- Run this once, then run schema.sql. Browsers re-join by name on their next visit.
drop table if exists public.solves, public.players, public.claim_failures cascade;
drop function if exists public.upsert_player(uuid, text);
drop function if exists public.sync_code(uuid);
drop function if exists public.claim_code(text, uuid);
drop function if exists public.norm_sync_code(text);
drop function if exists public.join_or_create(uuid, text);
drop function if exists public.record_solve(uuid, date, int, int);
drop function if exists public.leaderboard(text, uuid);
drop function if exists public.ist_today();
