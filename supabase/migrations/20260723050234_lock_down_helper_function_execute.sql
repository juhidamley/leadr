-- CREATE FUNCTION implicitly grants EXECUTE to PUBLIC unless revoked, and
-- hosted Supabase projects additionally grant EXECUTE to anon/authenticated/
-- service_role directly (not merely via PUBLIC) on every new function in an
-- exposed schema. Either way, the anon role ends up able to call these
-- SECURITY DEFINER helpers directly via PostgREST RPC even though they were
-- only ever meant to back RLS policy checks for signed-in users. Revoke both
-- forms explicitly; the earlier `grant execute ... to authenticated` is a
-- separate, untouched grant and keeps working. Caught by the Supabase
-- security advisor.
revoke execute on function public.is_accepted_friend(uuid) from public;
revoke execute on function public.is_accepted_friend(uuid) from anon;
revoke execute on function public.is_group_member(uuid) from public;
revoke execute on function public.is_group_member(uuid) from anon;
