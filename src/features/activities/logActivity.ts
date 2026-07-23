import * as Crypto from 'expo-crypto'

import { supabase } from '@/lib/supabase'

import type { AwardXpResponse } from './types'

export type LogActivityInput = {
  activityTypeKey: string
  note?: string
}

/**
 * The single entry point that mints a client_id and calls award-xp.
 * Deliberately minimal and framework-light — no query cache, no React —
 * so Task 11 can slot an offline queue in front of it (queue offline,
 * flush by calling this exact function per queued item, same idempotent
 * client_id contract) without a rewrite. Optimistic UI and reconciliation
 * live in useLogActivity, one layer up.
 */
export async function logActivity(input: LogActivityInput): Promise<AwardXpResponse> {
  const clientId = Crypto.randomUUID()

  const { data, error } = await supabase.functions.invoke<AwardXpResponse>('award-xp', {
    body: {
      client_id: clientId,
      activity_type_key: input.activityTypeKey,
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
