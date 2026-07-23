-- ============================================================
-- Enums
-- ============================================================

create type friendship_status as enum ('pending', 'accepted', 'blocked');
create type activity_verified as enum ('self', 'proof', 'auto');
create type activity_source as enum ('manual', 'gmail', 'calendar', 'linkedin');
create type leaderboard_scope as enum ('friends', 'group', 'league');
create type group_type as enum ('friends', 'cohort', 'class');
create type member_role as enum ('member', 'admin');
create type notification_type as enum ('streak_reminder', 'passed_by_friend', 'weekly_result', 'achievement');

-- ============================================================
-- Tables
-- ============================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null,
  display_name text,
  avatar_url text,
  phone text,
  career_goal text,
  target_role text,
  total_xp int not null default 0,
  current_level int not null default 1,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  timezone text not null default 'UTC',
  push_token text,
  created_at timestamptz not null default now()
);

create table public.activity_types (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  base_xp int not null,
  daily_cap int,
  category text not null,
  requires_proof boolean not null default false,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  activity_type_id uuid not null references public.activity_types (id),
  xp_awarded int not null default 0,
  note text,
  proof_url text,
  verified activity_verified not null default 'self',
  source activity_source not null default 'manual',
  client_id text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  friend_id uuid not null references public.users (id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type group_type not null default 'friends',
  owner_id uuid not null references public.users (id) on delete cascade,
  join_code text unique not null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.leaderboard_periods (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  scope leaderboard_scope not null,
  scope_id uuid
);

create table public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.leaderboard_periods (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  xp_in_period int not null default 0,
  rank int,
  rank_change int not null default 0,
  league_division text,
  unique (period_id, user_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text,
  criteria jsonb,
  icon text,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type notification_type not null,
  payload jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
-- (unique constraints above already index users.handle, activities(user_id,
-- client_id), friendships(user_id, friend_id), leaderboard_entries(period_id,
-- user_id), user_achievements(user_id, achievement_id), activity_types.key,
-- achievements.key, groups.join_code)

create index idx_activities_user_occurred_at on public.activities (user_id, occurred_at desc);
create index idx_friendships_user_id on public.friendships (user_id);
create index idx_friendships_friend_id on public.friendships (friend_id);
create index idx_leaderboard_periods_scope on public.leaderboard_periods (scope, scope_id, period_start);
create index idx_leaderboard_entries_period_rank on public.leaderboard_entries (period_id, rank);
create index idx_notifications_user_created_at on public.notifications (user_id, created_at desc);

-- ============================================================
-- Row-level security: default deny on every table.
-- Policies land in Task 4.
-- ============================================================

alter table public.users enable row level security;
alter table public.activity_types enable row level security;
alter table public.activities enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.leaderboard_periods enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.notifications enable row level security;
