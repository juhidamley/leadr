import { supabase } from '@/lib/supabase'

import type { AwardXpResponse } from './types'

export type LogActivityInput = {
  clientId: string
  activityTypeKey: string
  occurredAt: string
  note?: string
}

/**
 * The single entry point that calls award-xp. Deliberately minimal and
 * framework-light — no query cache, no React. `clientId` and
 * `occurredAt` are supplied by the caller (minted once, at tap time) so
 * that a retried/resumed call (Task 11's offline queue) reuses the exact
 * same idempotency key and local-day timestamp instead of re-deriving
 * them on every attempt. Optimistic UI and reconciliation live one layer
 * up, in the `logActivity` mutation (see logActivityMutationDefaults.ts).
 */
export async function logActivity(input: LogActivityInput): Promise<AwardXpResponse> {
  const { data, error } = await supabase.functions.invoke<AwardXpResponse>('award-xp', {
    body: {
      client_id: input.clientId,
      activity_type_key: input.activityTypeKey,
      occurred_at: input.occurredAt,
      note: input.note,
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('award-xp returned no data')
  }

  return data
}
