import type { ActivityTypeViewModel } from './types'

export type ActivityCapState = {
  activityTypeId: string
  usedToday: number
  dailyCap: number | null
  isCapped: boolean
}

/**
 * Pure derivation of today's cap state per activity type — a UI hint only
 * ("capped for today"), not authoritative. The server (award_xp) is the
 * real enforcement; this just avoids surprising the user with a 0-XP tap.
 */
export function deriveCapStates(
  activityTypes: readonly Pick<ActivityTypeViewModel, 'id' | 'dailyCap'>[],
  countsByTypeId: Readonly<Record<string, number>>,
): Record<string, ActivityCapState> {
  const result: Record<string, ActivityCapState> = {}

  for (const type of activityTypes) {
    const usedToday = countsByTypeId[type.id] ?? 0
    result[type.id] = {
      activityTypeId: type.id,
      usedToday,
      dailyCap: type.dailyCap,
      isCapped: type.dailyCap !== null && usedToday >= type.dailyCap,
    }
  }

  return result
}
