import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function useOnboardedStatus(userId: string | undefined): UseQueryResult<boolean> {
  return useQuery({
    queryKey: ['users', userId, 'onboarded'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('onboarded').eq('id', userId as string).single()

      if (error) {
        throw error
      }

      return data.onboarded
    },
    enabled: userId !== undefined,
  })
}
