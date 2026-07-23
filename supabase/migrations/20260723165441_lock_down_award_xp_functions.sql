-- Hosted Supabase grants EXECUTE directly to anon/authenticated (not
-- merely via PUBLIC) on every new function in an exposed schema — the
-- same gap caught by the security advisor in Tasks 4 and 7, missed here
-- again because award_xp only revoked from `public`. This one is far
-- more serious: it meant an unauthenticated (anon) caller could invoke
-- award_xp directly with an arbitrary p_user_id and forge XP for any
-- user, completely bypassing the edge function's JWT-derived uid.
-- Revoke from both roles explicitly; service_role keeps its grant.
revoke execute on function public.award_xp(uuid, text, text, timestamptz, text, public.activity_source, text) from anon;
revoke execute on function public.award_xp(uuid, text, text, timestamptz, text, public.activity_source, text) from authenticated;

-- xp_for_level/level_for_xp are harmless pure functions (no table access,
-- no side effects), but lock them down too for least-privilege
-- consistency — no legitimate reason for a client to call the SQL
-- mirror of the TS level helper directly.
revoke execute on function public.xp_for_level(int) from public;
revoke execute on function public.xp_for_level(int) from anon;
revoke execute on function public.xp_for_level(int) from authenticated;
revoke execute on function public.level_for_xp(int) from public;
revoke execute on function public.level_for_xp(int) from anon;
revoke execute on function public.level_for_xp(int) from authenticated;

-- Also caught by the advisor: these two were missing a locked search_path.
alter function public.xp_for_level(int) set search_path = '';
alter function public.level_for_xp(int) set search_path = '';
