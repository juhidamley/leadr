/**
 * Client-side mirror of award_xp's multiplier formula (Task 9):
 * xp = round(base_xp * (1 + min(0.5, 0.10 * (streak-1)))), round half
 * away from zero. Math.round matches Postgres's numeric rounding for
 * this positive-only domain (see levels.ts for the same convention).
 *
 * This is a BEST-EFFORT ESTIMATE for optimistic UI only — the server
 * computes the real streak transition (same-day / consecutive / freeze
 * / reset) and is always authoritative. `streakAfter` is whatever the
 * caller's best guess is for the post-award streak; when the guess is
 * wrong (cap hit, a freeze/reset the client couldn't predict), the
 * reconcile step in src/features/activities corrects the displayed
 * value to the server's real answer.
 */
export function estimateAward({ baseXp, streakAfter }: { baseXp: number; streakAfter: number }): number {
  const multiplier = 1 + Math.min(0.5, 0.1 * (streakAfter - 1))
  return Math.round(baseXp * multiplier)
}
