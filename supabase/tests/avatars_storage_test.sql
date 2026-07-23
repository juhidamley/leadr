begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- ============================================================
-- Fixtures (as postgres, bypasses RLS)
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated');

insert into storage.objects (bucket_id, name, owner) values
  ('avatars', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatar.jpg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('avatars', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/avatar.jpg', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- ============================================================
-- Act as A (authenticated)
-- ============================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  (select count(*) from storage.objects where bucket_id = 'avatars' and name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatar.jpg'),
  1::bigint,
  'A can SELECT its own avatar object'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'avatars' and name = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/avatar.jpg'),
  0::bigint,
  'A cannot SELECT B''s avatar object'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('avatars', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/new.jpg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'A can INSERT into its own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('avatars', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/hijack.jpg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501',
  null,
  'A cannot INSERT into B''s folder'
);

with attempt as (
  update storage.objects set metadata = '{"hacked": true}'::jsonb
  where bucket_id = 'avatars' and name = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/avatar.jpg'
  returning 1
)
select is(count(*)::bigint, 0::bigint, 'A cannot UPDATE B''s avatar object') from attempt;

-- Note: DELETE isn't testable here — storage.protect_delete() rejects any
-- direct DELETE on storage.objects for every role, including postgres;
-- real deletes only happen through the Storage API, which handles this
-- separately from RLS.

select * from finish();
rollback;
