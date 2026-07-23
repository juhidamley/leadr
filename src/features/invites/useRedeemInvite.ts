import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function useRedeemInvite(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviterHandle: string) => {
      const { error } = await supabase.rpc('redeem_invite', { inviter_handle: inviterHandle })
      if (error) {
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  })
}
