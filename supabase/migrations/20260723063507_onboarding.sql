-- ============================================================
-- onboarded flag + phone become client-writable
-- ============================================================

alter table public.users add column onboarded boolean not null default false;

-- Task 6's temp handles (user_<8 hex chars>) already satisfy this format,
-- so no backfill is needed before adding the constraint.
alter table public.users
  add constraint users_handle_format check (handle ~ '^[a-z][a-z0-9_]{2,19}$');

grant update (onboarded, phone) on public.users to authenticated;

-- ============================================================
-- is_handle_available — SECURITY DEFINER so the client can check
-- uniqueness without a base-table read policy that would otherwise
-- have to expose other users' rows. Returns a bare boolean only, so
-- it can't be used to enumerate handles/rows. Excludes the caller's
-- own current row: re-checking your own existing handle (e.g. an
-- admin-reset onboarding revisit) must report "available", matching
-- what the unique constraint actually allows on a same-row update.
-- ============================================================

create or replace function public.is_handle_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.users
    where handle = lower(candidate)
      and id is distinct from auth.uid()
  );
$$;

grant execute on function public.is_handle_available(text) to authenticated;
revoke execute on function public.is_handle_available(text) from public;
revoke execute on function public.is_handle_available(text) from anon;
