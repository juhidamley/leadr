import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import { mapFriend } from './mappers'
import type { Friend } from './types'

export function friendsQueryKey(userId: string | undefined): readonly unknown[] {
  return ['friends', 'list', userId]
}

export function useFriends(userId: string | undefined): UseQueryResult<Friend[]> {
  return useQuery({
    queryKey: friendsQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_friends')

      if (error) {
        throw error
      }

      return data.map(mapFriend)
    },
    enabled: userId !== undefined,
  })
}
