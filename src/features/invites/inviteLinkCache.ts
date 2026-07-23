import AsyncStorage from '@react-native-async-storage/async-storage'

type CachedInviteLink = { handle: string; url: string }

const INVITE_LINK_CACHE_KEY = 'leadr.inviteLink'

/**
 * A generated Branch link is cheap to reuse and not free to create, so
 * it's cached per-handle — if the user later renames their handle
 * (Task 8's editable handle), the cache naturally misses and a fresh
 * link is generated for the new one.
 */
export async function getCachedInviteLink(handle: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(INVITE_LINK_CACHE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as CachedInviteLink
    return parsed.handle === handle ? parsed.url : null
  } catch {
    return null
  }
}

export async function setCachedInviteLink(handle: string, url: string): Promise<void> {
  const cached: CachedInviteLink = { handle, url }
  await AsyncStorage.setItem(INVITE_LINK_CACHE_KEY, JSON.stringify(cached))
}
