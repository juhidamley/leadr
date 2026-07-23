import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import { mapProfile, type ProfileViewModel } from './mapProfile'

const AVATAR_SIGNED_URL_TTL_SECONDS = 3600

export function profileQueryKey(userId: string | undefined): readonly unknown[] {
  return ['users', userId, 'profile']
}

export function useProfile(userId: string | undefined): UseQueryResult<ProfileViewModel> {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId as string).single()

      if (error) {
        throw error
      }

      let avatarUrl: string | null = null

      if (data.avatar_url) {
        const { data: signed } = await supabase.storage
          .from('avatars')
          .createSignedUrl(data.avatar_url, AVATAR_SIGNED_URL_TTL_SECONDS)

        // A failed signing attempt (e.g. transient network issue) degrades
        // to the fallback/initials avatar rather than failing the whole
        // profile fetch.
        avatarUrl = signed?.signedUrl ?? null
      }

      return mapProfile(data, avatarUrl)
    },
    enabled: userId !== undefined,
  })
}
