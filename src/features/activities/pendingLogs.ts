export type LogActivityMutationSnapshot = {
  clientId: string
  activityTypeId: string
  label: string
  estimatedXp: number
  status: 'pending' | 'success' | 'error'
}

export type PendingLogEntry = {
  clientId: string
  activityTypeId: string
  label: string
  estimatedXp: number
  status: 'queued' | 'failed'
}

/**
 * Pure projection from the mutation cache's live snapshots to what the
 * Log screen shows: still-unsettled taps ("queued" — in flight or paused
 * offline, both report TanStack status `pending`) and ones that failed
 * after retries were exhausted. Confirmed (`success`) mutations drop out
 * entirely — their XP is already folded into the authoritative profile
 * total by the mutation defaults' `onSuccess`, so there's nothing left
 * for the UI to show as "pending" once that's happened.
 */
export function derivePendingLogs(mutations: readonly LogActivityMutationSnapshot[]): PendingLogEntry[] {
  return mutations
    .filter((mutation) => mutation.status !== 'success')
    .map((mutation) => ({
      clientId: mutation.clientId,
      activityTypeId: mutation.activityTypeId,
      label: mutation.label,
      estimatedXp: mutation.estimatedXp,
      status: mutation.status === 'error' ? 'failed' : 'queued',
    }))
}

export function sumQueuedXp(entries: readonly PendingLogEntry[]): number {
  return entries.filter((entry) => entry.status === 'queued').reduce((sum, entry) => sum + entry.estimatedXp, 0)
}
