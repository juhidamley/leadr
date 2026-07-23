import type { AwardXpResponse } from './types'

export type ReconcileOutcome = {
  corrected: boolean
  cappedMessage: string | null
  finalXpDelta: number
}

const CAPPED_MESSAGE = "Daily cap reached for this activity — it's still logged, but no XP today."

/**
 * Pure, foreground-only decision: given the estimate that was shown at
 * tap time and the server's authoritative response, does the currently
 * mounted screen owe the user an explanation? (e.g. a "daily cap
 * reached" note when the estimate didn't match.) This is purely for UI
 * messaging — the profile cache write itself happens unconditionally in
 * the mutation defaults (logActivityMutationDefaults.ts), which runs
 * whether or not any screen is around to show a toast, so a cap hit on a
 * mutation resumed after an app restart still lands on the right total
 * even though nobody sees this message for it.
 */
export function reconcileAward(estimatedXp: number, server: AwardXpResponse): ReconcileOutcome {
  return {
    corrected: server.xp_awarded !== estimatedXp,
    cappedMessage: server.capped ? CAPPED_MESSAGE : null,
    finalXpDelta: server.xp_awarded,
  }
}
