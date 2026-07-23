import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

const FRIENDS_QUERY_KEY_PREFIX = ['friends'] as const

type FriendshipStatus = Database['public']['Enums']['friendship_status']

/**
 * Every friend mutation changes at least one of search relationship /
 * friends list / requests list, and all three query keys share the
 * `['friends', ...]` prefix — a single broad invalidation is simpler and
 * cheap enough here (friend actions are infrequent, not a hot path).
 */
function useInvalidateFriends(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY_PREFIX })
}

export function useSendFriendRequest(): UseMutationResult<FriendshipStatus, Error, string> {
  const invalidate = useInvalidateFriends()

  return useMutation({
    mutationFn: async (target: string) => {
      const { data, error } = await supabase.rpc('send_friend_request', { target })
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: invalidate,
  })
}

export type RespondToRequestVars = { requester: string; accept: boolean }

export function useRespondToRequest(): UseMutationResult<void, Error, RespondToRequestVars> {
  const invalidate = useInvalidateFriends()

  return useMutation({
    mutationFn: async ({ requester, accept }: RespondToRequestVars) => {
      const { error } = await supabase.rpc('respond_to_request', { requester, accept })
      if (error) {
        throw error
      }
    },
    onSuccess: invalidate,
  })
}

export function useCancelFriendRequest(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateFriends()

  return useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase.rpc('cancel_friend_request', { target })
      if (error) {
        throw error
      }
    },
    onSuccess: invalidate,
  })
}

export function useBlockUser(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateFriends()

  return useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase.rpc('block_user', { target })
      if (error) {
        throw error
      }
    },
    onSuccess: invalidate,
  })
}

export function useUnblockUser(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateFriends()

  return useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase.rpc('unblock_user', { target })
      if (error) {
        throw error
      }
    },
    onSuccess: invalidate,
  })
}

export function useRemoveFriend(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateFriends()

  return useMutation({
    mutationFn: async (other: string) => {
      const { error } = await supabase.rpc('remove_friend', { other })
      if (error) {
        throw error
      }
    },
    onSuccess: invalidate,
  })
}
