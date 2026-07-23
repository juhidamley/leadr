import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import { mapSearchResult } from './mappers'
import type { SearchResult } from './types'

const SEARCH_RESULT_LIMIT = 20

export function searchUsersQueryKey(query: string): readonly unknown[] {
  return ['friends', 'search', query]
}

export function useSearchUsers(query: string): UseQueryResult<SearchResult[]> {
  const trimmed = query.trim()

  return useQuery({
    queryKey: searchUsersQueryKey(trimmed),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_users', { q: trimmed, lim: SEARCH_RESULT_LIMIT })

      if (error) {
        throw error
      }

      return data.map(mapSearchResult)
    },
    enabled: trimmed.length > 0,
  })
}
