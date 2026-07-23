export type ActivityTypeViewModel = {
  id: string
  key: string
  label: string
  category: string
  icon: string | null
  baseXp: number
  dailyCap: number | null
}

/** Matches the award-xp edge function's response shape (Task 9). */
export type AwardXpResponse = {
  activity_id: string
  xp_awarded: number
  capped: boolean
  streak_freeze_used: boolean
  total_xp: number
  current_level: number
  current_streak: number
  longest_streak: number
  xp_in_period: number
}

/**
 * Variables for the `['logActivity']` mutation (Task 11). Must stay
 * plain/JSON-serializable — TanStack Query persists these to disk so a
 * tap survives an app restart, and replays them verbatim (same
 * `clientId`, same `occurredAt`) rather than re-deriving anything.
 */
export type LogActivityMutationVars = {
  userId: string
  clientId: string
  /** Captured at tap time, not send time, so an offline log still counts toward the correct local day. */
  occurredAt: string
  activityType: ActivityTypeViewModel
  note?: string
  /** Precomputed once at tap time so every consumer (burst, pending pill, toast) agrees on the same number. */
  estimatedXp: number
}
