-- ============================================================
-- Friend system core (Task 13)
--
-- Task 4's base-table RLS makes `users` self-only and `public_profiles`
-- visible only to self + accepted friends. That means a raw client
-- cannot search other users by handle, or see a *pending* requester's
-- handle/avatar (not an accepted friend yet). So the whole feature is
-- SECURITY DEFINER RPCs: each checks auth.uid() itself, enforces the
-- friendship state machine, and returns only public fields — never
-- phone/push_token. Base-table RLS on friendships stays as a backstop
-- (a party can still read/delete their own rows directly if ever
-- needed), but every *transition* goes through these functions so the
-- rules (self-block, reciprocal auto-accept, recipient-only accept,
-- decline-deletes) can't be bypassed by a direct table write.
-- ============================================================

create type public.friend_relationship as enum ('none', 'outgoing', 'incoming', 'friends', 'blocked');
create type public.friend_request_direction as enum ('incoming', 'outgoing');

-- ============================================================
-- search_users — case-insensitive handle-prefix search. Handles are
-- already constrained lowercase (users_handle_format), so lowering the
-- query is enough for case-insensitivity without an ILIKE scan. Excludes
-- self and any pair where either side has blocked the other.
-- ============================================================

create or replace function public.search_users(q text, lim int default 20)
returns table (
  id uuid,
  handle text,
  display_name text,
  avatar_url text,
  relationship public.friend_relationship
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.handle,
    u.display_name,
    u.avatar_url,
    case
      when f_out.status = 'accepted' or f_in.status = 'accepted' then 'friends'::public.friend_relationship
      when f_out.status = 'pending' then 'outgoing'::public.friend_relationship
      when f_in.status = 'pending' then 'incoming'::public.friend_relationship
      else 'none'::public.friend_relationship
    end as relationship
  from public.users u
  left join public.friendships f_out
    on f_out.user_id = auth.uid() and f_out.friend_id = u.id
  left join public.friendships f_in
    on f_in.user_id = u.id and f_in.friend_id = auth.uid()
  where u.id is distinct from auth.uid()
    and char_length(trim(q)) > 0
    and u.handle like (lower(trim(q)) || '%')
    and f_out.status is distinct from 'blocked'
    and f_in.status is distinct from 'blocked'
  order by u.handle
  limit greatest(1, least(coalesce(lim, 20), 50));
$$;

grant execute on function public.search_users(text, int) to authenticated;
revoke execute on function public.search_users(text, int) from public;
revoke execute on function public.search_users(text, int) from anon;

-- ============================================================
-- send_friend_request — self/target validated, blocks rejected,
-- already-friends is a no-op, and a reverse pending request is
-- auto-accepted instead of creating a second row (there is only ever
-- one row per accepted pair, in whichever direction it was created).
-- ============================================================

create or replace function public.send_friend_request(target uuid)
returns public.friendship_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_existing public.friendships%rowtype;
  v_reverse public.friendships%rowtype;
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  if v_caller = target then
    raise exception 'Cannot send a friend request to yourself';
  end if;

  if not exists (select 1 from public.users where id = target) then
    raise exception 'User not found';
  end if;

  -- Lock any existing row(s) between this pair (either direction) so a
  -- concurrent send/accept can't race past these checks.
  perform 1 from public.friendships
    where (user_id = v_caller and friend_id = target)
       or (user_id = target and friend_id = v_caller)
    for update;

  select * into v_existing from public.friendships where user_id = v_caller and friend_id = target;
  select * into v_reverse from public.friendships where user_id = target and friend_id = v_caller;

  if v_existing.status = 'blocked' or v_reverse.status = 'blocked' then
    raise exception 'Cannot send a friend request to this user';
  end if;

  if v_existing.status = 'accepted' or v_reverse.status = 'accepted' then
    return 'accepted';
  end if;

  if v_existing.status = 'pending' then
    return 'pending';
  end if;

  if v_reverse.status = 'pending' then
    update public.friendships set status = 'accepted' where user_id = target and friend_id = v_caller;
    return 'accepted';
  end if;

  insert into public.friendships (user_id, friend_id, status) values (v_caller, target, 'pending');
  return 'pending';
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;
revoke execute on function public.send_friend_request(uuid) from public;
revoke execute on function public.send_friend_request(uuid) from anon;

-- ============================================================
-- respond_to_request — only the recipient (friend_id = caller) may
-- respond to a pending request. Accept flips status; decline deletes
-- the row entirely (no `declined` status — a fresh request can be sent
-- later). A sender looking up their own outgoing request finds no
-- matching row here (they're user_id, not friend_id), so they can't
-- accept their own request.
-- ============================================================

create or replace function public.respond_to_request(requester uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_row public.friendships%rowtype;
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from public.friendships
    where user_id = requester and friend_id = v_caller
    for update;

  if not found then
    raise exception 'No pending request from this user';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  if accept then
    update public.friendships set status = 'accepted' where user_id = requester and friend_id = v_caller;
  else
    delete from public.friendships where user_id = requester and friend_id = v_caller;
  end if;
end;
$$;

grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
revoke execute on function public.respond_to_request(uuid, boolean) from public;
revoke execute on function public.respond_to_request(uuid, boolean) from anon;

-- ============================================================
-- cancel_friend_request — the sender withdrawing their own still-pending
-- outgoing request. Not in the base RPC list from the spec, but needed
-- for the "outgoing (Cancel)" UI action; added as a small helper so the
-- client still never writes to friendships directly (base-table RLS
-- already permits a party to delete their own row — this just keeps
-- every friend mutation going through an RPC, consistent with the rest
-- of the feature, rather than one path being a raw table write).
-- ============================================================

create or replace function public.cancel_friend_request(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friendships
  where user_id = auth.uid() and friend_id = target and status = 'pending';
$$;

grant execute on function public.cancel_friend_request(uuid) to authenticated;
revoke execute on function public.cancel_friend_request(uuid) from public;
revoke execute on function public.cancel_friend_request(uuid) from anon;

-- ============================================================
-- block_user — removes any existing friendship (either direction),
-- then records the caller as blocker. on conflict guards a concurrent
-- double-block from erroring.
-- ============================================================

create or replace function public.block_user(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  if v_caller = target then
    raise exception 'Cannot block yourself';
  end if;

  delete from public.friendships
    where (user_id = v_caller and friend_id = target)
       or (user_id = target and friend_id = v_caller);

  insert into public.friendships (user_id, friend_id, status)
  values (v_caller, target, 'blocked')
  on conflict (user_id, friend_id) do update set status = 'blocked';
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;
revoke execute on function public.block_user(uuid) from public;
revoke execute on function public.block_user(uuid) from anon;

-- ============================================================
-- unblock_user — only removes a row the caller themselves blocked
-- (blocked rows always store the blocker as user_id).
-- ============================================================

create or replace function public.unblock_user(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friendships
  where user_id = auth.uid() and friend_id = target and status = 'blocked';
$$;

grant execute on function public.unblock_user(uuid) to authenticated;
revoke execute on function public.unblock_user(uuid) from public;
revoke execute on function public.unblock_user(uuid) from anon;

-- ============================================================
-- remove_friend — deletes an accepted friendship the caller is party to.
-- ============================================================

create or replace function public.remove_friend(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friendships
  where status = 'accepted'
    and ((user_id = auth.uid() and friend_id = other) or (user_id = other and friend_id = auth.uid()));
$$;

grant execute on function public.remove_friend(uuid) to authenticated;
revoke execute on function public.remove_friend(uuid) from public;
revoke execute on function public.remove_friend(uuid) from anon;

-- ============================================================
-- list_friends — accepted friends' public fields plus the counters the
-- friends list needs (total_xp, current_level, current_streak).
-- ============================================================

create or replace function public.list_friends()
returns table (
  id uuid,
  handle text,
  display_name text,
  avatar_url text,
  total_xp int,
  current_level int,
  current_streak int
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.handle, u.display_name, u.avatar_url, u.total_xp, u.current_level, u.current_streak
  from public.friendships f
  join public.users u on u.id = (case when f.user_id = auth.uid() then f.friend_id else f.user_id end)
  where f.status = 'accepted'
    and auth.uid() in (f.user_id, f.friend_id)
  order by u.handle;
$$;

grant execute on function public.list_friends() to authenticated;
revoke execute on function public.list_friends() from public;
revoke execute on function public.list_friends() from anon;

-- ============================================================
-- list_friend_requests — incoming (someone else's pending request to
-- the caller) and outgoing (the caller's own pending request), tagged
-- by direction so the client can split them into two lists.
-- ============================================================

create or replace function public.list_friend_requests()
returns table (
  direction public.friend_request_direction,
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select 'incoming'::public.friend_request_direction, u.id, u.handle, u.display_name, u.avatar_url, f.created_at
  from public.friendships f
  join public.users u on u.id = f.user_id
  where f.friend_id = auth.uid() and f.status = 'pending'
  union all
  select 'outgoing'::public.friend_request_direction, u.id, u.handle, u.display_name, u.avatar_url, f.created_at
  from public.friendships f
  join public.users u on u.id = f.friend_id
  where f.user_id = auth.uid() and f.status = 'pending'
  order by created_at desc;
$$;

grant execute on function public.list_friend_requests() to authenticated;
revoke execute on function public.list_friend_requests() from public;
revoke execute on function public.list_friend_requests() from anon;
