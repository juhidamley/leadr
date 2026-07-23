import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import { getLocalDateString } from './localDay'

const LOOKBACK_HOURS = 48

export function todayActivityCountsQueryKey(userId: string | undefined, timezone: string | undefined): readonly unknown[] {
  return ['activities', userId, 'today-counts', timezone]
}

/**
 * Counts today's (user-local-day) activities per activity_type_id, for
 * the cap-state UI hint. Looks back 48h (not just "today" in UTC) so the
 * client-side local-day filter below is correct regardless of the user's
 * timezone offset from UTC.
 */
export function useTodayActivityCounts(
  userId: string | undefined,
  timezone: string | undefined,
): UseQueryResult<Record<string, number>> {
  return useQuery({
    queryKey: todayActivityCountsQueryKey(userId, timezone),
    queryFn: async () => {
      const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('activities')
        .select('activity_type_id, occurred_at')
        .eq('user_id', userId as string)
        .gte('occurred_at', since)

      if (error) {
        throw error
      }

      const tz = timezone as string
      const today = getLocalDateString(new Date(), tz)
      const counts: Record<string, number> = {}

      for (const row of data) {
        if (getLocalDateString(new Date(row.occurred_at), tz) === today) {
          counts[row.activity_type_id] = (counts[row.activity_type_id] ?? 0) + 1
        }
      }

      return counts
    },
    enabled: userId !== undefined && timezone !== undefined,
  })
}
