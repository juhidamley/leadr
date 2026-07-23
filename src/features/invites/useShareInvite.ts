import { useState } from 'react'
import { Share } from 'react-native'

import { createInviteLink } from './branch'
import { getCachedInviteLink, setCachedInviteLink } from './inviteLinkCache'

export type UseShareInviteResult = {
  share: () => Promise<void>
  isPending: boolean
  error: string | null
}

/** Generates (or reuses the cached) invite link for `handle` and opens the native share sheet with it. */
export function useShareInvite(handle: string | undefined): UseShareInviteResult {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function share(): Promise<void> {
    if (!handle) {
      return
    }

    setError(null)
    setIsPending(true)
    try {
      const cached = await getCachedInviteLink(handle)
      const url = cached ?? (await createInviteLink(handle))
      if (!cached) {
        await setCachedInviteLink(handle, url)
      }

      await Share.share({
        message: `Join me on Leadr — track your job search and compete on the leaderboard: ${url}`,
        url,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your invite link.')
    } finally {
      setIsPending(false)
    }
  }

  return { share, isPending, error }
}
