begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

-- ============================================================
-- Fixtures
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated');

insert into public.users (id, handle, timezone) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cap_user', 'UTC'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak_user', 'UTC'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'tz_user', 'America/Los_Angeles');

insert into public.activity_types (key, label, base_xp, daily_cap, category, is_active) values
  ('inactive_type', 'Inactive', 999, null, 'test', false);

-- ============================================================
-- Cap hit
-- ============================================================

select is(
  (select xp_awarded from public.award_xp('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cap-1', 'daily_checkin', '2026-01-01T12:00:00Z')),
  5,
  'first daily_checkin of the day awards base_xp (5)'
);

select is(
  (select capped from public.award_xp('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cap-2', 'daily_checkin', '2026-01-01T18:00:00Z')),
  true,
  'second same-day daily_checkin (daily_cap=1) is capped'
);

select is(
  (select xp_awarded from public.award_xp('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cap-2', 'daily_checkin', '2026-01-01T18:00:00Z')),
  0,
  'a capped log awards 0 xp'
);

select is(
  (select total_xp from public.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  5,
  'total_xp is unaffected by the capped call'
);

-- ============================================================
-- Streak multiplier math (coffee_chat_sent, base_xp = 40)
-- days 1..6, consecutive — multiplier caps at +50% (day 6+)
-- ============================================================

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak-d1', 'coffee_chat_sent', '2026-02-02T12:00:00Z')),
  40,
  'streak day 1: mult 1.00 -> 40'
);

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak-d2', 'coffee_chat_sent', '2026-02-03T12:00:00Z')),
  44,
  'streak day 2: mult 1.10 -> 44'
);

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak-d3', 'coffee_chat_sent', '2026-02-04T12:00:00Z')),
  48,
  'streak day 3: mult 1.20 -> 48'
);

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak-d4', 'coffee_chat_sent', '2026-02-05T12:00:00Z')),
  52,
  'streak day 4: mult 1.30 -> 52'
);

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak-d5', 'coffee_chat_sent', '2026-02-06T12:00:00Z')),
  56,
  'streak day 5: mult 1.40 -> 56'
);

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak-d6', 'coffee_chat_sent', '2026-02-07T12:00:00Z')),
  60,
  'streak day 6: mult caps at 1.50 -> 60'
);

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'streak-d7', 'coffee_chat_sent', '2026-02-08T12:00:00Z')),
  60,
  'streak day 7: multiplier stays capped at 1.50 -> 60'
);

-- Rounding example from the spec: base 75, streak 2 -> 82.5 rounds to 83.
-- The gap since the last coffee_chat_sent log (streak lives on the user,
-- not per activity type) resets the streak, so day 1 here is streak 1.
select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'round-check-1', 'coffee_chat_completed', '2026-03-01T12:00:00Z')),
  75,
  'rounding fixture day 1 (streak reset by the gap): 75 * 1.00 = 75'
);

select is(
  (select xp_awarded from public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'round-check-2', 'coffee_chat_completed', '2026-03-02T12:00:00Z')),
  83,
  'rounding: base 75, streak 2 -> 75 * 1.10 = 82.5, rounds to 83'
);

-- ============================================================
-- Missed-day reset vs freeze (fresh user, base_xp = 40)
-- ============================================================

select is(
  (select current_streak from public.award_xp('cccccccc-cccc-cccc-cccc-cccccccccccc', 'freeze-d1', 'coffee_chat_sent', '2026-01-05T20:00:00Z')),
  1,
  'freeze fixture day 1: streak 1'
);

select is(
  (select current_streak from public.award_xp('cccccccc-cccc-cccc-cccc-cccccccccccc', 'freeze-d2', 'coffee_chat_sent', '2026-01-06T20:00:00Z')),
  2,
  'freeze fixture day 2 (consecutive): streak 2'
);

-- Skip 01-07, log 01-08: exactly one missed day, freeze available this week.
select is(
  (select streak_freeze_used from public.award_xp('cccccccc-cccc-cccc-cccc-cccccccccccc', 'freeze-d4', 'coffee_chat_sent', '2026-01-08T20:00:00Z')),
  true,
  'single missed day with an available freeze: freeze is consumed'
);

select is(
  (select current_streak from public.users where handle = 'tz_user'),
  3,
  'streak continues (+1) through the consumed freeze'
);

-- Skip 01-09, log 01-10: another single-day miss, SAME week as the freeze
-- already used on 01-08 -> no freeze available -> reset.
select is(
  (select streak_freeze_used from public.award_xp('cccccccc-cccc-cccc-cccc-cccccccccccc', 'freeze-d6', 'coffee_chat_sent', '2026-01-10T20:00:00Z')),
  false,
  'a second single-day miss in the same week gets no freeze'
);

select is(
  (select current_streak from public.users where handle = 'tz_user'),
  1,
  'streak resets to 1 when no freeze is available'
);

-- A 2+ day gap always resets, freeze or not (log 01-13, three days after 01-10).
select is(
  (select current_streak from public.award_xp('cccccccc-cccc-cccc-cccc-cccccccccccc', 'freeze-d9', 'coffee_chat_sent', '2026-01-13T20:00:00Z')),
  1,
  'a 2+ day gap resets the streak regardless of freeze availability'
);

select is(
  (select streak_freeze_used from public.award_xp('cccccccc-cccc-cccc-cccc-cccccccccccc', 'freeze-d9-check', 'skill_practice', '2026-01-13T20:05:00Z')),
  false,
  'no freeze is consumed on a 2+ day gap'
);

-- ============================================================
-- Level thresholds
-- ============================================================

select is(
  (select current_level from public.users where handle = 'streak_user'),
  public.level_for_xp((select total_xp from public.users where handle = 'streak_user')),
  'current_level after several awards matches level_for_xp(total_xp)'
);

-- Dedicated fixture, seeded (as postgres, bypassing award_xp) to sit just
-- below the level-2 threshold (283), then pushed over it by one call.
insert into auth.users (id, email, aud, role) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated');
insert into public.users (id, handle, timezone, total_xp, current_level) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'level_user', 'UTC', 270, 1);

select public.award_xp('dddddddd-dddd-dddd-dddd-dddddddddddd', 'level-bump', 'real_interview', '2026-05-01T12:00:00Z');

select is(
  (select total_xp from public.users where handle = 'level_user'),
  370,
  'level-bump fixture: 270 + 100 (streak 1, real_interview base_xp) = 370'
);
select is(
  (select current_level from public.users where handle = 'level_user'),
  2,
  'crossing the 283 threshold sets current_level to 2'
);
select is(
  (select current_level from public.users where handle = 'level_user'),
  public.level_for_xp((select total_xp from public.users where handle = 'level_user')),
  'current_level after crossing a threshold matches level_for_xp(total_xp)'
);

-- Parity: SQL level_for_xp must agree with the TS helper
-- (src/features/xp/levels.ts) at these sampled XP values.
select is(public.level_for_xp(0), 1, 'level_for_xp parity: xp=0 -> level 1');
select is(public.level_for_xp(282), 1, 'level_for_xp parity: xp=282 -> level 1');
select is(public.level_for_xp(283), 2, 'level_for_xp parity: xp=283 -> level 2');
select is(public.level_for_xp(519), 2, 'level_for_xp parity: xp=519 -> level 2');
select is(public.level_for_xp(520), 3, 'level_for_xp parity: xp=520 -> level 3');
select is(public.level_for_xp(800), 4, 'level_for_xp parity: xp=800 -> level 4');
select is(public.level_for_xp(5000), 13, 'level_for_xp parity: xp=5000 -> level 13');

-- ============================================================
-- Timezone / day boundary
--
-- Fresh America/Los_Angeles (PST, UTC-8 in January) user. Two instants
-- that fall on DIFFERENT UTC calendar dates but the SAME local calendar
-- date (2026-01-01) must be treated as the same local day for caps:
--   2025-12-31T23:00:00Z -> 2025-12-31T15:00 local (2025-12-31)
--   2026-01-01T05:00:00Z -> 2025-12-31T21:00 local (2025-12-31)
-- resume_update has daily_cap = 1, so the second call must be capped.
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'e@test.local', 'authenticated', 'authenticated');
insert into public.users (id, handle, timezone) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tz_boundary_user', 'America/Los_Angeles');

select is(
  (select xp_awarded from public.award_xp('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tz-1', 'resume_update', '2025-12-31T23:00:00Z')),
  20,
  'tz boundary: first log (UTC date 2025-12-31) awards base_xp'
);

select is(
  (select last_active_date from public.users where handle = 'tz_boundary_user'),
  '2025-12-31'::date,
  'tz boundary: last_active_date is the LOCAL date, not the UTC date'
);

select is(
  (select capped from public.award_xp('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'tz-2', 'resume_update', '2026-01-01T05:00:00Z')),
  true,
  'tz boundary: a later call on a different UTC date but the SAME local date (2025-12-31) is capped'
);

-- ============================================================
-- Idempotent retry
-- ============================================================

select is(
  (select count(*)::int from public.activities where client_id = 'idem-1'),
  0,
  'idempotency fixture: no activity yet'
);
select public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'idem-1', 'skill_practice', '2026-04-01T12:00:00Z');
select public.award_xp('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'idem-1', 'skill_practice', '2026-04-01T12:00:00Z');
select is(
  (select count(*)::int from public.activities where client_id = 'idem-1'),
  1,
  'retried client_id produces exactly one activities row'
);

-- ============================================================
-- Rejections
-- ============================================================

select throws_ok(
  $$ select public.award_xp('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bad-type', 'not_a_real_key', now()) $$,
  'P0002',
  null,
  'an unknown activity_type_key is rejected'
);

select throws_ok(
  $$ select public.award_xp('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bad-type-2', 'inactive_type', now()) $$,
  'P0002',
  null,
  'an inactive activity_type is rejected'
);

-- ============================================================
-- Anti-forgery: only service_role (never the client) can call award_xp
-- ============================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select throws_ok(
  $$ select public.award_xp('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forged', 'daily_checkin', now()) $$,
  '42501',
  null,
  'authenticated cannot call award_xp directly — only service_role can'
);

reset role;

select * from finish();
rollback;
