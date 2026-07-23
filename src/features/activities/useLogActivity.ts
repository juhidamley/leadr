import { useMutation, type UseMutationResult } from '@tanstack/react-query'

import { LOG_ACTIVITY_MUTATION_KEY } from './logActivityMutationDefaults'
import type { AwardXpResponse, LogActivityMutationVars } from './types'

/**
 * Thin handle onto the globally-registered `logActivity` mutation (see
 * logActivityMutationDefaults.ts) — deliberately has no `mutationFn` of
 * its own. TanStack Query resolves it from the defaults registered for
 * `LOG_ACTIVITY_MUTATION_KEY` at app boot, which is what lets a mutation
 * survive being paused offline, persisted, and resumed after an app
 * restart with no component (and so no locally-defined mutationFn)
 * around to drive it.
 *
 * A component calling `.mutate`/`.mutateAsync` still gets the normal
 * promise-based result for the common (online, foreground) case — this
 * hook exists so the Log screen has something to call and read
 * `isPending`/`error` from while it's mounted for the round trip.
 */
export function useLogActivity(): UseMutationResult<AwardXpResponse, Error, LogActivityMutationVars> {
  return useMutation<AwardXpResponse, Error, LogActivityMutationVars>({ mutationKey: LOG_ACTIVITY_MUTATION_KEY })
}
