import AsyncStorage from '@react-native-async-storage/async-storage'

import { clearPendingInvite, getPendingInvite, setPendingInvite } from '@/features/invites/pendingInvite'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('pendingInvite', () => {
  afterEach(async () => {
    await AsyncStorage.clear()
  })

  it('returns null when nothing has been captured yet', async () => {
    expect(await getPendingInvite()).toBeNull()
  })

  it('persists a captured ref and reads it back', async () => {
    await setPendingInvite('juhi')

    expect(await getPendingInvite()).toBe('juhi')
  })

  it('survives being read multiple times (e.g. across the auth + onboarding flow)', async () => {
    await setPendingInvite('juhi')

    expect(await getPendingInvite()).toBe('juhi')
    expect(await getPendingInvite()).toBe('juhi')
  })

  it('overwrites a previously captured ref with the latest one', async () => {
    await setPendingInvite('first')
    await setPendingInvite('second')

    expect(await getPendingInvite()).toBe('second')
  })

  it('clears the persisted ref so a redeemed invite is not retried', async () => {
    await setPendingInvite('juhi')
    await clearPendingInvite()

    expect(await getPendingInvite()).toBeNull()
  })
})
