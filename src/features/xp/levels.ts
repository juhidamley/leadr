/**
 * Shared level curve: level n needs 100 * n^1.5 cumulative XP (per
 * CLAUDE.md §7). Level 1 is the free starting point (0 XP) — everyone
 * signs up at level 1 regardless of XP.
 *
 * This is the single source of truth for the curve. Task 9's award-xp
 * edge function must use this exact formula (or duplicate it exactly)
 * to compute users.current_level server-side, so the client and server
 * never drift. The client only ever displays users.current_level as
 * shown (server-set); these helpers are for the progress-to-next-level
 * bar only.
 */

export function xpForLevel(level: number): number {
  if (level <= 1) {
    return 0
  }
  return Math.round(100 * level ** 1.5)
}

export function levelForXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) {
    level += 1
  }
  return level
}

export type LevelProgress = {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  progress: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp)
  const currentThreshold = xpForLevel(level)
  const nextThreshold = xpForLevel(level + 1)
  const xpIntoLevel = xp - currentThreshold
  const xpForNextLevel = nextThreshold - currentThreshold

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progress: xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 1,
  }
}
