begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- ============================================================
-- Fixtures (run as postgres, the table owner — bypasses RLS)
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated');

insert into public.users (id, handle, display_name, phone, push_token) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_a', 'User A', '+15550000001', 'push-token-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_b', 'User B', '+15550000002', 'push-token-b'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_c', 'User C', '+15550000003', 'push-token-c');

-- C is an accepted friend of A. B is not a friend of A, but is an accepted
-- friend of C (so we have a friendship row that neither A nor B may touch).
insert into public.friendships (user_id, friend_id, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'accepted'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'accepted');

insert into public.activities (user_id, activity_type_id, xp_awarded, client_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, id, 5, 'client-a-1'
from public.activity_types where key = 'daily_checkin'
union all
select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, id, 5, 'client-b-1'
from public.activity_types where key = 'daily_checkin';

insert into public.notifications (user_id, type) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'streak_reminder'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak_reminder');

insert into public.achievements (id, key, label) values
  ('22222222-2222-2222-2222-222222222222', 'test_achievement', 'Test Achievement');

insert into public.user_achievements (user_id, achievement_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222');

-- ============================================================
-- Act as A (authenticated, sub = A's uuid)
-- ============================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- Cross-user SELECT is blocked --------------------------------------------

select is(
  (select count(*) from public.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'A cannot SELECT B''s users row'
);

select is(
  (select count(*) from public.activities where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'A cannot SELECT B''s activities'
);

select is(
  (select count(*) from public.notifications where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'A cannot SELECT B''s notifications'
);

select is(
  (select count(*) from public.user_achievements where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'A cannot SELECT B''s user_achievements'
);

-- Cross-user UPDATE is blocked ---------------------------------------------

with attempt as (
  update public.users set display_name = 'hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' returning 1
)
select is(count(*)::bigint, 0::bigint, 'A cannot UPDATE B''s users row') from attempt;

-- Column grants block client writes to server-owned rollups ----------------

select throws_ok(
  $$ update public.users set total_xp = 999999 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'A cannot update its own total_xp column'
);

select throws_ok(
  $$ update public.users set current_level = 99 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'A cannot update its own current_level column'
);

select throws_ok(
  $$ update public.users set current_streak = 99 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'A cannot update its own current_streak column'
);

select lives_ok(
  $$ update public.users set display_name = 'A, updated' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'A CAN update its own display_name (permitted profile column)'
);

-- public_profiles: friend-only, never leaks private columns ----------------

select is(
  (select count(*) from public.public_profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1::bigint,
  'A can read accepted friend C via public_profiles'
);

select is(
  (select count(*) from public.public_profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'A cannot read non-friend B via public_profiles'
);

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'public_profiles'
     and column_name in ('phone', 'push_token')),
  0::bigint,
  'public_profiles view never exposes phone or push_token columns'
);

-- friendships: only the two parties can read/update a given row ------------

select is(
  (select count(*) from public.friendships
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and friend_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1::bigint,
  'A can read its own friendship with C'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and friend_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  0::bigint,
  'A cannot read the friendship row between B and C'
);

with attempt as (
  update public.friendships set status = 'blocked'
  where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and friend_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  returning 1
)
select is(count(*)::bigint, 0::bigint, 'A cannot UPDATE the friendship row between B and C') from attempt;

-- activity_types / achievements: readable, not client-writable --------------

select is(
  (select count(*) from public.activity_types),
  9::bigint,
  'activity_types is readable by any authenticated user (9 seeded rows)'
);

select is(
  (select count(*) from public.achievements),
  1::bigint,
  'achievements is readable by any authenticated user'
);

select throws_ok(
  $$ insert into public.activity_types (key, label, base_xp, category) values ('hack', 'Hack', 1000000, 'x') $$,
  '42501',
  null,
  'authenticated cannot INSERT into activity_types'
);

select throws_ok(
  $$ insert into public.achievements (key, label) values ('hack', 'Hack') $$,
  '42501',
  null,
  'authenticated cannot INSERT into achievements'
);

-- activities: no client INSERT/UPDATE/DELETE, ever --------------------------

select throws_ok(
  $$
    insert into public.activities (user_id, activity_type_id, xp_awarded, client_id)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 999999, 'forged-client-id'
    from public.activity_types where key = 'daily_checkin'
  $$,
  '42501',
  null,
  'A cannot INSERT an activities row directly'
);

select throws_ok(
  $$ update public.activities set xp_awarded = 999999 where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'A cannot UPDATE its own activities row'
);

select throws_ok(
  $$ delete from public.activities where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'A cannot DELETE its own activities row'
);

-- notifications: only read_at is client-writable -----------------------------

select lives_ok(
  $$ update public.notifications set read_at = now() where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'A CAN mark its own notification read_at'
);

select throws_ok(
  $$ update public.notifications set type = 'weekly_result' where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501',
  null,
  'A cannot update the notifications.type column'
);

-- ============================================================
-- Act as C: confirm the counterparty side of the A/C friendship
-- ============================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select is(
  (select count(*) from public.friendships
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and friend_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1::bigint,
  'C (the counterparty) can also read the A/C friendship row'
);

select * from finish();
rollback;
