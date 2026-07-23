# CLAUDE.md — Leadr

This file is the standing context and rulebook for working on Leadr with Claude Code. Read it at the start of every session. When a request conflicts with a rule here, flag it instead of silently breaking the rule.

---

## 1. What Leadr is

Leadr gamifies career prep. Users earn **XP** for real job-search actions (coffee chats, applications, mock interviews, resume updates, etc.), build **streaks**, and compete on a **weekly friend leaderboard**. The social leaderboard is the core of the product, not a side feature. The core loop we optimize for: **log an action → get an instantly satisfying reward → see your rank move against friends.**

Target: iOS + Android, one codebase. Solo founder (Juhi) building with Claude Code.

---

## 2. Golden rules (do not violate)

- **All XP, streak, and leaderboard math happens server-side in Supabase Edge Functions — never on the client.** The client may show *optimistic* values, but the server is the sole source of truth. Points must not be computable or forgeable from the app.
- **XP economy values live in the `activity_types` DB config table**, not hardcoded. Edge functions read point values, daily caps, and multipliers from the DB so the economy can be tuned without a release.
- **Every piece of logic in `src/features/**` and every edge function gets unit tests**, especially XP caps, streak transitions, and ranking. These encode the product rules and are easy to get subtly wrong.
- **Row-Level Security (RLS) is mandatory on every table** before any feature ships. Default deny. A user can read/write only their own rows and the *public* stats of accepted friends. Never disable RLS "to make it work."
- **Keep diffs small and commit often.** One feature-loop per branch/PR. Explain non-obvious changes in the PR description.
- **TypeScript strict mode, no `any`.** Use the generated Supabase types as the source of truth for DB shapes.
- **Never commit secrets.** Supabase keys, service-role keys, and API keys go in env/EAS secrets, never in the repo. The service-role key is used **only** in edge functions, never in the app.

---

## 3. Tech stack

- **App:** Expo (React Native) + TypeScript, Expo Router (file-based).
- **Backend/DB:** Supabase — Postgres, Auth, Realtime, Storage, Edge Functions (Deno/TypeScript).
- **Server state / fetching:** TanStack Query. **Realtime** subscriptions for live leaderboard + feed.
- **Local UI state:** Zustand (sparingly).
- **Styling:** NativeWind (Tailwind for React Native). Use it everywhere; no ad-hoc StyleSheet unless a case truly needs it.
- **Auth:** Supabase Auth with **Apple + Google + Phone (SMS OTP)**.
- **Notifications:** Expo Notifications + Expo Push.
- **Analytics:** PostHog (React Native SDK) — instrument from the first build.
- **Payments (later):** RevenueCat for Leadr Pro subscriptions.
- **Testing:** Jest (unit) + Maestro (E2E mobile flows).
- **CI/Build:** GitHub Actions (typecheck + test on push), EAS Build for store binaries.

---

## 4. Architecture decisions (settled — don't relitigate without discussion)

| Area | Decision | Why |
|---|---|---|
| **Auth** | Apple + Google + Phone (SMS OTP), via Supabase Auth | Social = high conversion; phone = enables contact matching |
| **Friend discovery** | Username/@handle + invite deep links **and** phone-contact matching | Works day one for everyone; contacts add strong discovery for phone users |
| **Leaderboard freshness** | Live realtime via Supabase Realtime | Seeing a friend pass you live is the emotional core |
| **UI** | NativeWind | Fast, consistent, well-supported |
| **XP rules storage** | `activity_types` DB config table (source of truth) | Tune the economy without shipping a release |
| **Repo** | Single Expo app + `supabase/` folder | Simplest for solo + Claude Code |
| **Logging UX** | Optimistic + offline queue; server reconciles | Instant-feeling core loop; server stays authoritative |
| **Ranking** | Materialized `leaderboard_entries` table, updated on XP award | Fast reads, plays perfectly with Realtime |
| **Platform** | Expo + React Native (native iOS/Android) | Best native feel for the gamified loop; first-class push + contacts |

> **Platform note:** React web + Capacitor was considered and rejected — for an animation-heavy, push/contacts-driven social app, native feel and first-class native APIs matter more than the web ecosystem, and Expo already gives us React + Tailwind (NativeWind) with a low learning curve. **A web version is available from this same codebase via React Native Web** when we want one; treat native iOS/Android as primary and keep components web-compatible where it's cheap to do so.

---

## 5. Repository structure

```
leadr/
  app/                      # Expo Router screens
    (auth)/                 # sign-in, phone verify, onboarding
    (tabs)/                 # leaderboard (home), log, feed, profile
    _layout.tsx
  src/
    components/             # reusable UI (NativeWind)
    features/               # domain logic, one folder per feature
      activities/           # logging, optimistic queue
      xp/                    # client-side XP display helpers (NOT authoritative math)
      streaks/
      leaderboard/
      friends/
      notifications/
    lib/                    # supabase client, query client, analytics, push, deep links
    types/                  # generated Supabase types + shared app types
    hooks/
  supabase/
    migrations/             # versioned SQL schema
    functions/              # edge functions (see §7)
      award-xp/
      roll-leaderboard/
      weekly-cron/
    seed.sql                # activity_types config + dev/test data
  tests/
  CLAUDE.md
  .env.example
```

---

## 6. Data model (authoritative reference)

Core tables (Postgres). Generate TS types after every migration: `supabase gen types typescript`.

- **`users`** — `id`, `handle` (unique), `display_name`, `avatar_url`, `phone`, `career_goal`, `target_role`, `total_xp`, `current_level`, `current_streak`, `longest_streak`, `last_active_date`, `timezone`, `push_token`, `created_at`
- **`activity_types`** (CONFIG) — `id`, `key`, `label`, `base_xp`, `daily_cap`, `category`, `requires_proof`, `icon`, `is_active`
- **`activities`** (the log) — `id`, `user_id`, `activity_type_id`, `xp_awarded` (computed server-side at write), `note`, `proof_url`, `verified` (`self`|`proof`|`auto`), `source` (`manual`|`gmail`|`calendar`|`linkedin`), `client_id` (for offline-queue idempotency), `occurred_at`, `created_at`
- **`friendships`** — `id`, `user_id`, `friend_id`, `status` (`pending`|`accepted`|`blocked`), `created_at`
- **`groups`** / **`group_members`** — pods/cohorts with `join_code`, roles
- **`leaderboard_periods`** — `id`, `period_start`, `period_end`, `scope` (`friends`|`group`|`league`), `scope_id`
- **`leaderboard_entries`** (MATERIALIZED) — `id`, `period_id`, `user_id`, `xp_in_period`, `rank`, `rank_change`, `league_division`
- **`achievements`** / **`user_achievements`**
- **`notifications`** — `id`, `user_id`, `type`, `payload`, `sent_at`, `read_at`

---

## 7. Server-side logic (edge functions — the heart of integrity)

**`award-xp`** — called when a user logs an activity. Must:
1. Look up the `activity_type` from the DB (never trust client-sent XP).
2. Enforce the **daily cap** for that activity type for that user/day (in the user's timezone).
3. Apply the **streak multiplier** (e.g., +10%/consecutive day, capped +50%).
4. Be **idempotent** on `client_id` so the offline queue can safely retry without double-awarding.
5. Write the `activities` row with the computed `xp_awarded`, update `users` rollups (`total_xp`, `current_level`, streak fields), and **upsert the current `leaderboard_entries`** for the user.
6. Return the authoritative XP + new totals so the client can reconcile its optimistic value.

**`roll-leaderboard`** / **`weekly-cron`** — scheduled weekly job: close the current `leaderboard_periods`, assign league promotions/demotions, send "weekly results" notifications, open the next period.

Rules the tests must cover: missed day resets streak (respect one streak-freeze/week), double-log same activity same day hits the cap, week-boundary rollover in the user's timezone, streak multiplier math, level curve (`level n needs 100 × n^1.5` cumulative XP), idempotent retry does not double-award.

---

## 8. Client behavior

- **Optimistic logging:** on tap, immediately show XP gain + animation and enqueue the write. Reconcile with the server's authoritative response; if the server awards less (cap hit) or the action fails, correct the UI gracefully — never leave a phantom gain.
- **Offline queue:** persist pending logs locally, retry on reconnect, dedupe by `client_id`. Client XP is provisional until confirmed.
- **Realtime:** subscribe to `leaderboard_entries` for the active period to animate rank changes live; subscribe to the friend feed for reactions.
- **Empty states matter:** a user with no friends yet must still see a compelling home screen (personal progress + a prominent "invite friends" CTA). This is a first-class screen, not an afterthought.

---

## 9. Auth & friend graph specifics

- Supabase Auth handles Apple, Google, and Phone. Apple sign-in must be offered on iOS since we offer other social logins.
- On first run: authenticate → set unique `@handle` → optional phone verify → optional contacts permission for matching → onboarding goal.
- **Contact matching:** hash phone numbers client-side and match against hashed numbers server-side; never store raw contact lists. Ask permission explicitly and explain why. Respect denial gracefully (fall back to handle/invite).
- **Invite deep links:** generate per-user invite links that pre-fill a friend request on signup. Inviting friends is a step in first-run onboarding — the app needs competitors to be fun.

---

## 10. Coding conventions

- TypeScript strict; no `any`; prefer explicit return types on exported functions.
- Data access goes through TanStack Query hooks in `src/features/*`, never raw Supabase calls scattered in components.
- Components are presentational; logic lives in feature hooks.
- NativeWind classes for all styling; centralize theme tokens (colors, spacing) so light/dark stay consistent.
- Handle loading, empty, and error states for every screen that fetches data.
- Accessibility: label interactive elements, respect reduced-motion for XP animations.

---

## 11. Testing & definition of done

A feature is done when:
- It compiles, typechecks, and runs on a real device (not just simulator).
- Logic in `features/` and edge functions has unit tests, including the edge cases in §7.
- RLS policies exist and are verified (a user cannot read/write another user's private data).
- Loading/empty/error states are handled.
- Analytics events for the relevant §12-metrics are fired.
- Diff is small, reviewed, and committed with a clear message.

Run before every commit: `typecheck`, `lint`, `test`.

---

## 12. Metrics to instrument (PostHog)

Activation (first activity logged, first friend added), activities/user/week, D1/D7/D30 retention, streak length distribution, invites sent + invite→signup conversion, pod survival. Wire events as features land, not later.

---

## 13. Security

- RLS default-deny on all tables; explicit policies per table.
- Service-role key only in edge functions.
- Validate and rate-limit `award-xp` server-side (caps double as anti-cheat).
- Store proof images in a private Storage bucket with signed URLs.
- Never log PII (phone numbers, tokens) to analytics or console.

---

## 14. How to work in this repo

- **Build vertically, one loop at a time.** Order: (1) auth + profile/handle, (2) log activity → `award-xp` + tests, (3) streaks, (4) friends (handle/invite, then contacts), (5) leaderboard + realtime, (6) notifications. Each loop must run end-to-end before the next.
- Start data work by writing the SQL migration, then regenerate types, then build against them.
- Prefer editing existing files over adding new ones; keep the structure in §5.
- When a decision in §4 seems wrong for a task, raise it — don't quietly diverge.
- Ask for the smallest reproduction/test before fixing a bug.

---

## 15. Commands

```bash
# App
npx expo start                       # dev server
npx expo run:ios / run:android       # native dev build
npm run typecheck                    # tsc --noEmit
npm run lint
npm run test                         # jest

# Supabase
supabase start                       # local stack
supabase db reset                    # apply migrations + seed
supabase migration new <name>
supabase gen types typescript --local > src/types/database.ts
supabase functions serve             # run edge functions locally
supabase functions deploy award-xp

# Build
eas build --platform ios
eas build --platform android
```

---

## 16. Explicitly out of scope for MVP (don't build yet)

Leagues/divisions, groups/pods UI, Gmail/Calendar/LinkedIn auto-logging, AI interview practice, RevenueCat/Pro, seasons/quests. These are fast-follows — note them if relevant but don't scope-creep the MVP. MVP = auth, log activity + XP, streaks, friends, weekly friend leaderboard (realtime), push notifications.
