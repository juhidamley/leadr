import AsyncStorage from '@react-native-async-storage/async-storage'

const PENDING_INVITE_KEY = 'leadr.pendingInvite'

/** Persists a captured invite ref across the auth + onboarding flow (and app restarts) until it's redeemed. */
export async function getPendingInvite(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_INVITE_KEY)
}

export async function setPendingInvite(ref: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, ref)
}

export async function clearPendingInvite(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY)
}
