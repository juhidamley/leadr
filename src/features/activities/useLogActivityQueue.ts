import { useMutationState, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { profileQueryKey } from '@/features/profile/useProfile'

import { LOG_ACTIVITY_MUTATION_KEY } from './logActivityMutationDefaults'
import { derivePendingLogs, sumQueuedXp, type LogActivityMutationSnapshot, type PendingLogEntry } from './pendingLogs'
import type { LogActivityMutationVars } from './types'

export type LogActivityQueue = {
  entries: PendingLogEntry[]
  queuedXp: number
  queuedCount: number
  failedCount: number
}

/**
 * Live view of the logActivity mutation queue, keyed by client_id —
 * reflects taps still in flight, paused offline, or resumed from a prior
 * app session (all report as "queued"), plus any that failed after
 * retries. Backed by TanStack's own mutation cache via `useMutationState`
 * rather than component state, so it's correct immediately after a cold
 * start once persisted mutations rehydrate, with no screen having had to
 * witness the original tap.
 */
export function useLogActivityQueue(userId: string | undefined): LogActivityQueue {
  const queryClient = useQueryClient()

  const snapshots = useMutationState<LogActivityMutationSnapshot>({
    filters: { mutationKey: LOG_ACTIVITY_MUTATION_KEY },
    select: (mutation) => {
      const vars = mutation.state.variables as LogActivityMutationVars | undefined
      const status = mutation.state.status === 'success' || mutation.state.status === 'error' ? mutation.state.status : 'pending'

      return {
        clientId: vars?.clientId ?? String(mutation.mutationId),
        activityTypeId: vars?.activityType.id ?? '',
        label: vars?.activityType.label ?? '',
        estimatedXp: vars?.estimatedXp ?? 0,
        status,
      }
    },
  })

  const entries = derivePendingLogs(snapshots)
  const queuedCount = entries.filter((entry) => entry.status === 'queued').length

  const wasQueued = useRef(false)
  useEffect(() => {
    if (wasQueued.current && queuedCount === 0 && userId) {
      queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) })
    }
    wasQueued.current = queuedCount > 0
  }, [queuedCount, userId, queryClient])

  return {
    entries,
    queuedXp: sumQueuedXp(entries),
    queuedCount,
    failedCount: entries.filter((entry) => entry.status === 'failed').length,
  }
}
