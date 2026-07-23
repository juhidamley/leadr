import type { AwardXpResponse } from './types'

export type ReconcileSnapshot = {
  totalXp: number
  currentLevel: number
  currentStreak: number
  longestStreak: number
}

export type ReconcileInput = {
  optimisticXpDelta: number
  before: ReconcileSnapshot
}

export type ReconcileOutcome =
  | {
      rolledBack: false
      corrected: boolean
      cappedMessage: string | null
      finalXpDelta: number
      after: ReconcileSnapshot
    }
  | {
      rolledBack: true
      corrected: true
      cappedMessage: null
      finalXpDelta: 0
      after: ReconcileSnapshot
    }

const CAPPED_MESSAGE = "Daily cap reached for this activity — it's still logged, but no XP today."

/**
 * Pure reducer: given the optimistic estimate that was already applied to
 * the UI and either the server's authoritative response or a failure,
 * decides what the UI should settle on. The server always wins — this
 * never trusts the optimistic value once a real outcome is known.
 */
export function reconcileAward(input: ReconcileInput, server: AwardXpResponse): ReconcileOutcome {
  const after: ReconcileSnapshot = {
    totalXp: server.total_xp,
    currentLevel: server.current_level,
    currentStreak: server.current_streak,
    longestStreak: server.longest_streak,
  }

  return {
    rolledBack: false,
    corrected: server.xp_awarded !== input.optimisticXpDelta,
    cappedMessage: server.capped ? CAPPED_MESSAGE : null,
    finalXpDelta: server.xp_awarded,
    after,
  }
}

export function reconcileFailure(input: ReconcileInput): ReconcileOutcome {
  return {
    rolledBack: true,
    corrected: true,
    cappedMessage: null,
    finalXpDelta: 0,
    after: input.before,
  }
}
