import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { decode } from 'base64-arraybuffer'

import { supabase } from '@/lib/supabase'

import { buildAvatarPath } from './avatarPath'
import { type ProfileViewModel } from './mapProfile'
import { profileQueryKey } from './useProfile'

export function useUpdateDisplayName(userId: string | undefined): UseMutationResult<void, Error, string, { previous: ProfileViewModel | undefined }> {
  const queryClient = useQueryClient()
  const queryKey = profileQueryKey(userId)

  return useMutation({
    mutationFn: async (displayName: string) => {
      if (!userId) {
        throw new Error('Not signed in.')
      }

      const { error } = await supabase.from('users').update({ display_name: displayName }).eq('id', userId)

      if (error) {
        throw error
      }
    },
    onMutate: async (displayName) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ProfileViewModel>(queryKey)

      if (previous) {
        queryClient.setQueryData<ProfileViewModel>(queryKey, { ...previous, displayName })
      }

      return { previous }
    },
    onError: (_error, _displayName, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

export type PickedAvatar = {
  base64: string
  extension: string
  contentType: string
}

export function useUploadAvatar(userId: string | undefined): UseMutationResult<void, Error, PickedAvatar> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ base64, extension, contentType }: PickedAvatar) => {
      if (!userId) {
        throw new Error('Not signed in.')
      }

      const path = buildAvatarPath(userId, extension)

      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, decode(base64), {
        contentType,
        upsert: true,
      })

      if (uploadError) {
        throw uploadError
      }

      const { error: updateError } = await supabase.from('users').update({ avatar_url: path }).eq('id', userId)

      if (updateError) {
        throw updateError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) })
    },
  })
}
