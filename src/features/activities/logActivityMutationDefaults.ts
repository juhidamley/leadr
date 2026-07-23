import type { QueryClient } from '@tanstack/react-query'

import type { ProfileViewModel } from '@/features/profile/mapProfile'
import { profileQueryKey } from '@/features/profile/useProfile'

import { logActivity } from './logActivity'
import type { LogActivityMutationVars } from './types'

export const LOG_ACTIVITY_MUTATION_KEY = ['logActivity'] as const

/**
 * Registers the real network call + authoritative cache write as
 * TanStack Query "mutation defaults" for `LOG_ACTIVITY_MUTATION_KEY`.
 *
 * This must run once on every app boot, before `resumePausedMutations()`
 * — a paused mutation restored from persisted storage has no function
 * attached (functions aren't JSON-serializable), so on resume TanStack
 * Query looks up a `mutationFn` for its key here. Because these
 * callbacks live at the QueryClient level rather than inside a
 * component's `useMutation` call, they still run for a mutation resumed
 * after an app restart even if no screen that cares about it is mounted
 * — the profile cache is always the thing that ends up correct, not
 * something a particular screen has to be alive to reconcile.
 */
export function registerLogActivityMutationDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(LOG_ACTIVITY_MUTATION_KEY, {
    mutationFn: (vars: LogActivityMutationVars) =>
      logActivity({
        clientId: vars.clientId,
        activityTypeKey: vars.activityType.key,
        occurredAt: vars.occurredAt,
        note: vars.note,
      }),
    onSuccess: (server, vars) => {
      queryClient.setQueryData<ProfileViewModel>(profileQueryKey(vars.userId), (old) =>
        old
          ? {
              ...old,
              totalXp: server.total_xp,
              currentLevel: server.current_level,
              currentStreak: server.current_streak,
              longestStreak: server.longest_streak,
            }
          : old,
      )
    },
    // Transient-failure retries while online. Being offline doesn't
    // reach here at all — `networkMode: 'online'` (the default) pauses
    // the mutation before an attempt instead of erroring.
    retry: 2,
  })
}
