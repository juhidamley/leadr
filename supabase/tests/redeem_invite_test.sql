begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- ============================================================
-- Fixtures
-- a: the inviter, invited by b
-- c/d: a blocked pair, to confirm redeem respects blocks
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated');

insert into public.users (id, handle, display_name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'invite_a', 'A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'invite_b', 'B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'invite_c', 'C'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'invite_d', 'D');

-- C blocked D before D ever tries to redeem D's own... actually: D blocks
-- C, so C (holding a link to D) cannot redeem it.
insert into public.friendships (user_id, friend_id, status) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'blocked');

-- ============================================================
-- B redeems A's invite -> accepted friendship immediately (no pending
-- step), visible to both sides via list_friends.
-- ============================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select lives_ok(
  $$ select public.redeem_invite('invite_a') $$,
  'B redeems A''s invite link without error'
);

select is(
  (select status from public.friendships
   where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and friend_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'accepted'::public.friendship_status,
  'redeeming an invite creates an ACCEPTED friendship directly, not pending'
);

select set_eq(
  $$ select handle from public.list_friends() $$,
  $$ values ('invite_a') $$,
  'B''s list_friends includes A right after redeeming'
);

set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select set_eq(
  $$ select handle from public.list_friends() $$,
  $$ values ('invite_b') $$,
  'A (the inviter) sees B as a friend too, symmetrically'
);

-- Idempotent: redeeming again is a silent no-op --------------------------

set local request.jwt.claims to '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select lives_ok(
  $$ select public.redeem_invite('invite_a') $$,
  'redeeming the same invite a second time does not error'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and friend_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'the second redeem does not create a duplicate row'
);

-- Self-redeem is rejected ------------------------------------------------

select throws_ok(
  $$ select public.redeem_invite('invite_b') $$,
  'P0001',
  'Cannot redeem your own invite',
  'B cannot redeem their own invite link'
);

-- Unknown handle is handled gracefully (a clear error, not a crash) ------

select throws_ok(
  $$ select public.redeem_invite('no_such_handle_at_all') $$,
  'P0001',
  'Invite not found',
  'redeeming an invite for a handle that does not exist raises a clear error'
);

-- Blocks are respected: D blocked C, so C cannot redeem D's invite -------

set local request.jwt.claims to '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select throws_ok(
  $$ select public.redeem_invite('invite_d') $$,
  'P0001',
  'Cannot redeem this invite',
  'C cannot redeem D''s invite — D previously blocked C'
);

select is(
  (select count(*) from public.friendships
   where (user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and friend_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and status = 'accepted')
      or (user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and friend_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and status = 'accepted')),
  0::bigint,
  'no accepted friendship was created despite the redeem attempt'
);

select is(
  (select status from public.friendships
   where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and friend_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'blocked'::public.friendship_status,
  'the original block row is untouched'
);

select * from finish();
rollback;
