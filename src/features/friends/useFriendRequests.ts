import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import { mapFriendRequest } from './mappers'
import type { FriendRequest } from './types'

export function friendRequestsQueryKey(userId: string | undefined): readonly unknown[] {
  return ['friends', 'requests', userId]
}

export function useFriendRequests(userId: string | undefined): UseQueryResult<FriendRequest[]> {
  return useQuery({
    queryKey: friendRequestsQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_friend_requests')

      if (error) {
        throw error
      }

      return data.map(mapFriendRequest)
    },
    enabled: userId !== undefined,
  })
}
