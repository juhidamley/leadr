begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- ============================================================
-- Fixtures (as postgres, bypasses RLS)
-- ============================================================

insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated');

insert into public.users (id, handle) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_aaaaaaaa'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'existing_handle');

-- ============================================================
-- Act as A (authenticated)
-- ============================================================

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  public.is_handle_available('existing_handle'),
  false,
  'is_handle_available returns false for another user''s taken handle'
);

select is(
  public.is_handle_available('EXISTING_HANDLE'),
  false,
  'is_handle_available normalizes case before comparing'
);

select is(
  public.is_handle_available('brand_new_handle'),
  true,
  'is_handle_available returns true for a free handle'
);

select is(
  public.is_handle_available('user_aaaaaaaa'),
  true,
  'is_handle_available excludes the caller''s own current handle'
);

-- Callable without leaking any row data: the return type is a bare
-- boolean, so there's no column to inspect for other users' data.
select isnt(
  pg_typeof(public.is_handle_available('anything')),
  null,
  'is_handle_available is callable by an authenticated user'
);

with attempt as (
  select public.is_handle_available('existing_handle') as available
)
select is(
  (select count(*) from attempt where available is not null),
  1::bigint,
  'is_handle_available returns exactly one scalar boolean, not row data'
);

select * from finish();
rollback;
