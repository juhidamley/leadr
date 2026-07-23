-- ============================================================
-- redeem_invite (Task 14) — an invite link carries the inviter's
-- @handle. Redeeming it (both sides already consented: the inviter by
-- sharing, the invitee by signing up through the link) creates an
-- ACCEPTED friendship directly, skipping the pending step Task 13's
-- send_friend_request uses for a cold handle search. Reuses that same
-- SECURITY DEFINER / locked search_path / friendship-state-machine
-- pattern.
-- ============================================================

create or replace function public.redeem_invite(inviter_handle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_inviter_id uuid;
  v_existing public.friendships%rowtype;
  v_reverse public.friendships%rowtype;
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_inviter_id from public.users where handle = lower(trim(inviter_handle));

  if v_inviter_id is null then
    raise exception 'Invite not found';
  end if;

  if v_inviter_id = v_caller then
    raise exception 'Cannot redeem your own invite';
  end if;

  -- Lock any existing row(s) between this pair so a concurrent redeem
  -- (e.g. a double-fired app-open callback) can't race past these checks.
  perform 1 from public.friendships
    where (user_id = v_caller and friend_id = v_inviter_id)
       or (user_id = v_inviter_id and friend_id = v_caller)
    for update;

  select * into v_existing from public.friendships where user_id = v_caller and friend_id = v_inviter_id;
  select * into v_reverse from public.friendships where user_id = v_inviter_id and friend_id = v_caller;

  if v_existing.status = 'blocked' or v_reverse.status = 'blocked' then
    raise exception 'Cannot redeem this invite';
  end if;

  -- Idempotent: already friends (from this invite or any other path) is
  -- a silent no-op, not an error — redeem can safely be retried.
  if v_existing.status = 'accepted' or v_reverse.status = 'accepted' then
    return;
  end if;

  if v_existing.status = 'pending' then
    update public.friendships set status = 'accepted' where user_id = v_caller and friend_id = v_inviter_id;
    return;
  end if;

  if v_reverse.status = 'pending' then
    update public.friendships set status = 'accepted' where user_id = v_inviter_id and friend_id = v_caller;
    return;
  end if;

  insert into public.friendships (user_id, friend_id, status) values (v_caller, v_inviter_id, 'accepted');
end;
$$;

grant execute on function public.redeem_invite(text) to authenticated;
revoke execute on function public.redeem_invite(text) from public;
revoke execute on function public.redeem_invite(text) from anon;
