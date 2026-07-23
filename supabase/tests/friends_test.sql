begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

-- ============================================================
-- Fixtures (as postgres, bypasses RLS)
-- a/b: send -> accept happy path + list_friends both sides
-- c/d: decline + re-request
-- e/f: reciprocal auto-accept
-- g/h: block
-- i:   search target; j searches for it
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'e@test.local', 'authenticated', 'authenticated'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'f@test.local', 'authenticated', 'authenticated'),
  ('11111111-1111-1111-1111-111111111111', 'g@test.local', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'h@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'i@test.local', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'j@test.local', 'authenticated', 'authenticated');

insert into public.users (id, handle, display_name, phone, push_token, total_xp, current_level, current_streak) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'friend_a', 'A', '+15550000001', 'push-a', 100, 2, 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'friend_b', 'B', '+15550000002', 'push-b', 200, 3, 5),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'friend_c', 'C', '+15550000003', 'push-c', 0, 1, 0),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'friend_d', 'D', '+15550000004', 'push-d', 0, 1, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'friend_e', 'E', '+15550000005', 'push-e', 0, 1, 0),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'friend_f', 'F', '+15550000006', 'push-f', 0, 1, 0),
  ('11111111-1111-1111-1111-111111111111', 'friend_g', 'G', '+15550000007', 'push-g', 0, 1, 0),
  ('22222222-2222-2222-2222-222222222222', 'friend_h', 'H', '+15550000008', 'push-h', 0, 1, 0),
  ('33333333-3333-3333-3333-333333333333', 'search_target', 'I', '+15550000009', 'push-i', 0, 1, 0),
  ('44444444-4444-4444-4444-444444444444', 'friend_j', 'J', '+15550000010', 'push-j', 0, 1, 0);

-- ============================================================
-- send -> pending -> recipient accepts -> both see each other as
-- accepted friends via list_friends, with public stats.
-- ============================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  public.send_friend_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'pending'::public.friendship_status,
  'A sending B a request creates a pending friendship'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and friend_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and status = 'pending'),
  1::bigint,
  'exactly one pending row exists for A -> B'
);

select throws_ok(
  $$ select public.send_friend_request('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'P0001',
  'Cannot send a friend request to yourself',
  'A cannot send a friend request to themselves'
);

-- Duplicate send is a no-op, not a new row (never violates the unique constraint) --

select is(
  public.send_friend_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'pending'::public.friendship_status,
  'sending the same request again does not error'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and friend_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1::bigint,
  'duplicate send does not create a second row'
);

-- The sender cannot accept their own outgoing request ------------------------

select throws_ok(
  $$ select public.respond_to_request('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true) $$,
  'P0001',
  'No pending request from this user',
  'A (the sender) cannot accept their own outgoing request'
);

set local request.jwt.claims to '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select lives_ok(
  $$ select public.respond_to_request('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) $$,
  'B (the recipient) can accept A''s request'
);

select is(
  (select status from public.friendships
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and friend_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'accepted'::public.friendship_status,
  'the friendship row is now accepted'
);

select set_eq(
  $$ select handle from public.list_friends() $$,
  $$ values ('friend_a') $$,
  'B''s list_friends includes A'
);

select is(
  (select current_streak from public.list_friends() where handle = 'friend_a'),
  3,
  'list_friends surfaces the friend''s public streak stat'
);

set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select set_eq(
  $$ select handle from public.list_friends() $$,
  $$ values ('friend_b') $$,
  'A''s list_friends includes B (symmetric)'
);

-- ============================================================
-- decline deletes the row; a fresh request can be sent afterward.
-- ============================================================

set local request.jwt.claims to '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select lives_ok(
  $$ select public.send_friend_request('dddddddd-dddd-dddd-dddd-dddddddddddd') $$,
  'C sends D a request'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and friend_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  1::bigint,
  'C -> D pending row exists before decline'
);

set local request.jwt.claims to '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select lives_ok(
  $$ select public.respond_to_request('cccccccc-cccc-cccc-cccc-cccccccccccc', false) $$,
  'D declines C''s request'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and friend_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  0::bigint,
  'decline deletes the row entirely (no declined status)'
);

set local request.jwt.claims to '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select lives_ok(
  $$ select public.send_friend_request('dddddddd-dddd-dddd-dddd-dddddddddddd') $$,
  'C can send D a fresh request after the decline'
);

select is(
  (select status from public.friendships
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and friend_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'pending'::public.friendship_status,
  'the re-request is pending again'
);

-- cancel_friend_request: only the sender can withdraw their own pending
-- outgoing request -----------------------------------------------------

set local request.jwt.claims to '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select lives_ok(
  $$ select public.cancel_friend_request('cccccccc-cccc-cccc-cccc-cccccccccccc') $$,
  'D (not the sender) calling cancel on the C->D row is a no-op, not an error'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and friend_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  1::bigint,
  'D calling cancel does not remove C''s outgoing request (D is not the sender)'
);

set local request.jwt.claims to '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select lives_ok(
  $$ select public.cancel_friend_request('dddddddd-dddd-dddd-dddd-dddddddddddd') $$,
  'C (the sender) cancels their own outgoing request'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and friend_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  0::bigint,
  'the cancelled row is gone'
);

-- ============================================================
-- reciprocal request auto-accepts (E requests F, then F requests E
-- back before responding — no second row, straight to accepted).
-- ============================================================

set local request.jwt.claims to '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select lives_ok(
  $$ select public.send_friend_request('ffffffff-ffff-ffff-ffff-ffffffffffff') $$,
  'E sends F a request'
);

set local request.jwt.claims to '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","role":"authenticated"}';

select is(
  public.send_friend_request('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  'accepted'::public.friendship_status,
  'F requesting E back auto-accepts the reverse pending row'
);

select is(
  (select count(*) from public.friendships
   where (user_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and friend_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff')
      or (user_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' and friend_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')),
  1::bigint,
  'the reciprocal auto-accept still leaves exactly one row for the pair'
);

select is(
  (select status from public.friendships
   where user_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and friend_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  'accepted'::public.friendship_status,
  'the original row is now accepted'
);

-- ============================================================
-- block: removes friendship, prevents new requests, hides both parties
-- from search_users. G blocks H.
-- ============================================================

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ select public.send_friend_request('22222222-2222-2222-2222-222222222222') $$,
  'G sends H a request (pre-block)'
);

select lives_ok(
  $$ select public.block_user('22222222-2222-2222-2222-222222222222') $$,
  'G blocks H'
);

select is(
  (select status from public.friendships
   where user_id = '11111111-1111-1111-1111-111111111111' and friend_id = '22222222-2222-2222-2222-222222222222'),
  'blocked'::public.friendship_status,
  'the row is now blocked, with G (the blocker) as user_id'
);

select throws_ok(
  $$ select public.send_friend_request('22222222-2222-2222-2222-222222222222') $$,
  'P0001',
  'Cannot send a friend request to this user',
  'G cannot re-request H after blocking'
);

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select throws_ok(
  $$ select public.send_friend_request('11111111-1111-1111-1111-111111111111') $$,
  'P0001',
  'Cannot send a friend request to this user',
  'H (the blocked party) also cannot request G'
);

select is(
  (select count(*) from public.search_users('friend_g')),
  0::bigint,
  'H searching for G is hidden by the block'
);

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.search_users('friend_h')),
  0::bigint,
  'G searching for H is hidden by the block (symmetric)'
);

-- unblock removes the block, only for the blocker ----------------------------

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is(
  (select count(*) from public.friendships
   where user_id = '11111111-1111-1111-1111-111111111111' and friend_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'H can still read the block row (a party), but is not the blocker'
);

with attempt as (
  select public.unblock_user('11111111-1111-1111-1111-111111111111')
)
select is(
  (select count(*) from public.friendships
   where user_id = '11111111-1111-1111-1111-111111111111' and friend_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'H (not the blocker) calling unblock_user does not remove the block'
) from attempt;

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ select public.unblock_user('22222222-2222-2222-2222-222222222222') $$,
  'G (the blocker) can unblock H'
);

select is(
  (select count(*) from public.friendships
   where user_id = '11111111-1111-1111-1111-111111111111' and friend_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'the block row is gone after unblock'
);

-- ============================================================
-- search_users: prefix match, case-insensitive, excludes self, and a
-- non-party cannot read or modify someone else's friendship row.
-- ============================================================

set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select set_eq(
  $$ select handle from public.search_users('search_target') $$,
  $$ values ('search_target') $$,
  'J finds I via an exact handle search'
);

select set_eq(
  $$ select handle from public.search_users('SEARCH_TAR') $$,
  $$ values ('search_target') $$,
  'search_users is case-insensitive on the prefix'
);

select is(
  (select count(*) from public.search_users('friend_j')),
  0::bigint,
  'search_users excludes the caller''s own row'
);

select is(
  (select count(*) from public.friendships
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and friend_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'J (a non-party) cannot read the A/B friendship row directly'
);

select throws_ok(
  $$ select public.respond_to_request('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) $$,
  'P0001',
  'No pending request from this user',
  'J (a non-party) cannot respond to a request that isn''t addressed to them'
);

select * from finish();
rollback;
