-- ============================================================
-- Schema additions
-- ============================================================

alter table public.users add column last_freeze_at date;

-- award_xp finds-or-creates the current friends leaderboard period; this
-- constraint makes that safe under concurrent first-of-the-week calls
-- (insert ... on conflict do nothing, then re-select).
alter table public.leaderboard_periods
  add constraint leaderboard_periods_scope_unique unique nulls not distinct (scope, scope_id, period_start);

-- ============================================================
-- Level curve (SQL parity with src/features/xp/levels.ts)
--
-- level n needs 100 * n^1.5 cumulative XP, level 1 free at 0 XP.
-- float8 arithmetic mirrors JS's IEEE754 doubles so xp_for_level/
-- level_for_xp agree with the TS helper bit-for-bit; a pgTAP parity
-- test samples both across a range of XP values to prove it.
-- ============================================================

create or replace function public.xp_for_level(p_level int)
returns int
language sql
immutable
as $$
  select case
    when p_level <= 1 then 0
    else round(100::float8 * power(p_level::float8, 1.5))::int
  end;
$$;

create or replace function public.level_for_xp(p_xp int)
returns int
language plpgsql
immutable
as $$
declare
  v_level int := 1;
begin
  while public.xp_for_level(v_level + 1) <= p_xp loop
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

-- ============================================================
-- award_xp — the only writer of activities / XP rollups.
--
-- SECURITY DEFINER so it can write rows the calling role (service_role,
-- via the award-xp edge function) has no direct table grants for.
-- Locks the user row (SELECT ... FOR UPDATE) for the whole transaction
-- so idempotency/caps/streaks are race-safe against concurrent calls
-- for the same user. XP values come only from activity_types.base_xp —
-- never from the caller.
-- ============================================================

create or replace function public.award_xp(
  p_user_id uuid,
  p_client_id text,
  p_activity_type_key text,
  p_occurred_at timestamptz default now(),
  p_note text default null,
  p_source public.activity_source default 'manual',
  p_proof_url text default null
)
returns table (
  activity_id uuid,
  xp_awarded int,
  capped boolean,
  streak_freeze_used boolean,
  total_xp int,
  current_level int,
  current_streak int,
  longest_streak int,
  xp_in_period int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.users%rowtype;
  v_activity_type public.activity_types%rowtype;
  v_existing public.activities%rowtype;
  v_local_day date;
  v_used_count int;
  v_capped boolean := false;
  v_xp int := 0;
  v_new_streak int;
  v_freeze_used boolean := false;
  v_week_start date;
  v_activity_id uuid;
  v_period_id uuid;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_xp_in_period int;
  v_app_timezone constant text := 'America/Los_Angeles';
begin
  -- Lock the user row for the whole transaction.
  select * into v_user from public.users where id = p_user_id for update;
  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  -- Idempotency: a prior call with this client_id already wrote the
  -- activity — return the existing result without re-awarding. (Deriving
  -- `capped` from xp_awarded = 0 is safe here since every seeded
  -- activity_type has base_xp > 0, so a genuine award is never 0 XP.)
  select * into v_existing from public.activities
    where user_id = p_user_id and client_id = p_client_id;

  if found then
    v_period_start := date_trunc('week', v_existing.occurred_at at time zone v_app_timezone) at time zone v_app_timezone;

    select lbe.xp_in_period into v_xp_in_period
    from public.leaderboard_entries lbe
    join public.leaderboard_periods lbp on lbp.id = lbe.period_id
    where lbe.user_id = p_user_id
      and lbp.scope = 'friends'
      and lbp.scope_id is null
      and lbp.period_start = v_period_start;

    return query select
      v_existing.id,
      v_existing.xp_awarded,
      (v_existing.xp_awarded = 0),
      false,
      v_user.total_xp,
      v_user.current_level,
      v_user.current_streak,
      v_user.longest_streak,
      coalesce(v_xp_in_period, 0);
    return;
  end if;

  -- Load + validate the activity type. XP always comes from here, never
  -- from the caller.
  select * into v_activity_type from public.activity_types
    where key = p_activity_type_key and is_active = true;
  if not found then
    raise exception 'Unknown or inactive activity type: %', p_activity_type_key using errcode = 'P0002';
  end if;

  -- User-local day drives caps and streaks.
  v_local_day := (p_occurred_at at time zone v_user.timezone)::date;

  select count(*) into v_used_count
  from public.activities a
  where a.user_id = p_user_id
    and a.activity_type_id = v_activity_type.id
    and (a.occurred_at at time zone v_user.timezone)::date = v_local_day;

  if v_activity_type.daily_cap is not null and v_used_count >= v_activity_type.daily_cap then
    v_capped := true;
  end if;

  if not v_capped then
    if v_user.last_active_date = v_local_day then
      v_new_streak := v_user.current_streak;
    elsif v_user.last_active_date = v_local_day - 1 then
      v_new_streak := v_user.current_streak + 1;
    elsif v_user.last_active_date is null then
      v_new_streak := 1;
    elsif v_user.last_active_date = v_local_day - 2 then
      -- Exactly one missed day: consume a freeze if one hasn't been used
      -- this week yet (Monday-start, in the *user's* timezone — distinct
      -- from APP_TIMEZONE, which only governs leaderboard week
      -- boundaries).
      v_week_start := date_trunc('week', v_local_day::timestamp)::date;
      if v_user.last_freeze_at is null or v_user.last_freeze_at < v_week_start then
        v_new_streak := v_user.current_streak + 1;
        v_freeze_used := true;
      else
        v_new_streak := 1;
      end if;
    else
      v_new_streak := 1;
    end if;

    v_xp := round(
      v_activity_type.base_xp::numeric * (1 + least(0.5::numeric, 0.10::numeric * (v_new_streak - 1)))
    )::int;
  end if;

  insert into public.activities (user_id, activity_type_id, xp_awarded, note, proof_url, verified, source, client_id, occurred_at)
  values (p_user_id, v_activity_type.id, v_xp, p_note, p_proof_url, 'self', p_source, p_client_id, p_occurred_at)
  returning id into v_activity_id;

  -- Table alias avoids ambiguity between the update target's columns and
  -- this function's own RETURNS TABLE output parameters, which share the
  -- same names (total_xp, current_level, ...) as implicit OUT variables.
  update public.users u
  set
    total_xp = v_user.total_xp + v_xp,
    current_level = public.level_for_xp(v_user.total_xp + v_xp),
    current_streak = case when v_capped then v_user.current_streak else v_new_streak end,
    longest_streak = case when v_capped then v_user.longest_streak else greatest(v_user.longest_streak, v_new_streak) end,
    last_active_date = case when v_capped then v_user.last_active_date else v_local_day end,
    last_freeze_at = case when v_freeze_used then v_local_day else v_user.last_freeze_at end
  where u.id = p_user_id
  returning u.total_xp, u.current_level, u.current_streak, u.longest_streak
    into v_user.total_xp, v_user.current_level, v_user.current_streak, v_user.longest_streak;

  -- Find-or-create the current global friends period (APP_TIMEZONE week
  -- boundaries — separate from the user-timezone day/streak logic above)
  -- so this works standalone before the Task 18 cron exists.
  v_period_start := date_trunc('week', p_occurred_at at time zone v_app_timezone) at time zone v_app_timezone;
  v_period_end := v_period_start + interval '7 days';

  insert into public.leaderboard_periods (period_start, period_end, scope, scope_id)
  values (v_period_start, v_period_end, 'friends', null)
  on conflict (scope, scope_id, period_start) do nothing
  returning id into v_period_id;

  if v_period_id is null then
    select id into v_period_id from public.leaderboard_periods
    where scope = 'friends' and scope_id is null and period_start = v_period_start;
  end if;

  insert into public.leaderboard_entries (period_id, user_id, xp_in_period)
  values (v_period_id, p_user_id, v_xp)
  on conflict (period_id, user_id) do update
    set xp_in_period = leaderboard_entries.xp_in_period + excluded.xp_in_period
  returning leaderboard_entries.xp_in_period into v_xp_in_period;

  return query select
    v_activity_id,
    v_xp,
    v_capped,
    v_freeze_used,
    v_user.total_xp,
    v_user.current_level,
    v_user.current_streak,
    v_user.longest_streak,
    v_xp_in_period;
end;
$$;

-- Only the award-xp edge function (service-role client) may call this —
-- never the client directly. No client insert policy exists on
-- activities/leaderboard_entries either (Task 4/3); this is the only
-- writer.
revoke execute on function public.award_xp(uuid, text, text, timestamptz, text, public.activity_source, text) from public;
grant execute on function public.award_xp(uuid, text, text, timestamptz, text, public.activity_source, text) to service_role;
