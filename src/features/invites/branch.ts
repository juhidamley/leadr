import { Platform } from 'react-native'
import type BranchType from 'react-native-branch'

import { buildInviteControlParams, extractInviteRef } from './linkParams'

export type BranchOpenEvent = {
  ref: string | null
  error: string | null
}

// react-native-branch has no web implementation at all — unlike e.g.
// AsyncStorage's no-op web shim, its RNBranch.js *throws at module
// evaluation time* on any platform other than ios/android. A static
// `import` would therefore crash the web bundle (including the static
// web export) just by being on the module graph. Deferred deep linking
// is meaningless on web anyway (there's no "fresh install" to bridge
// through), so web never requires the module at all and every export
// below becomes an inert no-op there.
// A static `import` would run unconditionally at module-eval time,
// throwing on web before the Platform.OS check below ever gets a
// chance to run — this must stay a runtime-conditional require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const branch: typeof BranchType | null = Platform.OS === 'web' ? null : (require('react-native-branch').default as typeof BranchType)

/**
 * Subscribes to every link-open Branch reports for the life of the app:
 * a deferred deep link on a fresh install, a cold start via a universal
 * link, and a warm re-open while the app is already running. Fires once
 * with the cached initial-session data (if any) and then on every
 * subsequent open — this is what makes the fresh-install case work,
 * since the OS itself never hands a brand-new install the referring URL.
 */
export function subscribeToBranchOpens(onOpen: (event: BranchOpenEvent) => void): () => void {
  if (!branch) {
    return () => {}
  }

  return branch.subscribe({
    onOpenComplete: ({ params, error }) => {
      if (error) {
        onOpen({ ref: null, error })
        return
      }
      onOpen({ ref: extractInviteRef(params), error: null })
    },
  })
}

/** Builds a fresh Branch short link that resolves to this user's invite (deep-linkable, with a store fallback for a fresh install). */
export async function createInviteLink(handle: string): Promise<string> {
  if (!branch) {
    throw new Error('Invite links are not available on web.')
  }

  const universalObject = await branch.createBranchUniversalObject(`invite/${handle}`, {
    title: 'Join me on Leadr',
    contentDescription: `${handle} is using Leadr to track their job search — join their leaderboard.`,
  })

  const { url } = await universalObject.generateShortUrl({ feature: 'invite', channel: 'app' }, buildInviteControlParams(handle))

  return url
}
