-- ============================================================
-- Helper functions (SECURITY DEFINER, locked-down search_path)
--
-- These run as the function owner (the migration role, which owns
-- the underlying tables and therefore bypasses RLS on them), so
-- they can check friendship/membership without re-triggering RLS
-- recursion on friendships / group_members.
-- ============================================================

create or replace function public.is_accepted_friend(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.user_id = auth.uid() and f.friend_id = target)
        or (f.friend_id = auth.uid() and f.user_id = target)
      )
  );
$$;

grant execute on function public.is_accepted_friend(uuid) to authenticated;

create or replace function public.is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = g
      and gm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;

-- ============================================================
-- activity_types — config, read-only to the app
-- ============================================================

grant select on public.activity_types to authenticated;

create policy "activity_types_select_all" on public.activity_types
  for select to authenticated using (true);

-- ============================================================
-- users — private profile; XP/streak rollups are server-owned
-- ============================================================

grant select, insert on public.users to authenticated;

create policy "users_select_self" on public.users
  for select to authenticated using (id = auth.uid());

create policy "users_insert_self" on public.users
  for insert to authenticated with check (id = auth.uid());

create policy "users_update_self" on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Column-level protection: even though the row-level policy above
-- allows a self-update, clients may only ever touch profile columns.
-- total_xp / current_level / current_streak / longest_streak /
-- last_active_date stay server-only (award-xp edge function, service
-- role, bypasses RLS and column grants entirely).
revoke update on public.users from authenticated;
grant update (display_name, avatar_url, handle, career_goal, target_role, timezone, push_token)
  on public.users to authenticated;

-- ============================================================
-- public_profiles — friend-visible public stats
--
-- Deliberately NOT security_invoker: this view must bypass the
-- self-only base-table RLS on users so it can surface an accepted
-- friend's public stats. The view's own WHERE clause is the sole
-- access control here — only id/handle/display_name/avatar_url and
-- the three gamification counters are selected; phone and push_token
-- are never exposed. Expect the security advisor to flag this view
-- as "security definer" — that's the intended, documented tradeoff.
-- ============================================================

create view public.public_profiles as
select
  u.id,
  u.handle,
  u.display_name,
  u.avatar_url,
  u.total_xp,
  u.current_level,
  u.current_streak
from public.users u
where u.id = auth.uid() or public.is_accepted_friend(u.id);

grant select on public.public_profiles to authenticated;

-- ============================================================
-- activities — the log. No client INSERT/UPDATE/DELETE at all;
-- award-xp (service role) is the only writer. This is what makes
-- XP unforgeable from the client.
-- ============================================================

grant select on public.activities to authenticated;

create policy "activities_select_self" on public.activities
  for select to authenticated using (user_id = auth.uid());

-- ============================================================
-- notifications — self-readable; only read_at is client-writable
-- (mark-as-read). Edge functions create notifications.
-- ============================================================

grant select on public.notifications to authenticated;

create policy "notifications_select_self" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update_self" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant update (read_at) on public.notifications to authenticated;

-- ============================================================
-- friendships — both parties own the row
-- ============================================================

grant select, insert, update, delete on public.friendships to authenticated;

create policy "friendships_select_party" on public.friendships
  for select to authenticated using (auth.uid() in (user_id, friend_id));

create policy "friendships_insert_self" on public.friendships
  for insert to authenticated with check (auth.uid() = user_id);

create policy "friendships_update_party" on public.friendships
  for update to authenticated
  using (auth.uid() in (user_id, friend_id))
  with check (auth.uid() in (user_id, friend_id));

create policy "friendships_delete_party" on public.friendships
  for delete to authenticated using (auth.uid() in (user_id, friend_id));

-- ============================================================
-- groups — owner manages; owner or member can see it
-- ============================================================

grant select, insert, update, delete on public.groups to authenticated;

create policy "groups_select_owner_or_member" on public.groups
  for select to authenticated using (owner_id = auth.uid() or public.is_group_member(id));

create policy "groups_insert_owner" on public.groups
  for insert to authenticated with check (owner_id = auth.uid());

create policy "groups_update_owner" on public.groups
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "groups_delete_owner" on public.groups
  for delete to authenticated using (owner_id = auth.uid());

-- ============================================================
-- group_members — see co-members of your own groups; join yourself
-- ============================================================

grant select, insert on public.group_members to authenticated;

create policy "group_members_select_co_member" on public.group_members
  for select to authenticated using (user_id = auth.uid() or public.is_group_member(group_id));

create policy "group_members_insert_self" on public.group_members
  for insert to authenticated with check (user_id = auth.uid());

-- ============================================================
-- leaderboard_periods — non-sensitive time windows, readable by any
-- authenticated user; edge functions own writes.
-- ============================================================

grant select on public.leaderboard_periods to authenticated;

create policy "leaderboard_periods_select_all" on public.leaderboard_periods
  for select to authenticated using (true);

-- ============================================================
-- leaderboard_entries — materialized standings, visible to self,
-- accepted friends, and co-members of a group-scoped period.
-- ============================================================

grant select on public.leaderboard_entries to authenticated;

create policy "leaderboard_entries_select_visible" on public.leaderboard_entries
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_accepted_friend(user_id)
    or exists (
      select 1
      from public.leaderboard_periods p
      where p.id = leaderboard_entries.period_id
        and p.scope = 'group'
        and p.scope_id is not null
        and public.is_group_member(p.scope_id)
    )
  );

-- ============================================================
-- achievements — public definitions, readable by any authenticated
-- user; not writable by the client.
-- ============================================================

grant select on public.achievements to authenticated;

create policy "achievements_select_all" on public.achievements
  for select to authenticated using (true);

-- ============================================================
-- user_achievements — self only for MVP; awarded server-side.
-- ============================================================

grant select on public.user_achievements to authenticated;

create policy "user_achievements_select_self" on public.user_achievements
  for select to authenticated using (user_id = auth.uid());
