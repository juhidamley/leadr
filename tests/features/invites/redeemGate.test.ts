import { shouldRedeemInvite } from '@/features/invites/redeemGate'

function baseInput(overrides: Partial<Parameters<typeof shouldRedeemInvite>[0]> = {}) {
  return {
    pendingRef: 'inviter_handle',
    hasSession: true,
    onboarded: true,
    selfHandle: null,
    ...overrides,
  }
}

describe('shouldRedeemInvite', () => {
  it('redeems once a session exists and onboarding is complete', () => {
    expect(shouldRedeemInvite(baseInput())).toBe(true)
  })

  it('does not redeem with no pending ref', () => {
    expect(shouldRedeemInvite(baseInput({ pendingRef: null }))).toBe(false)
  })

  it('does not redeem before a session exists (mid auth flow)', () => {
    expect(shouldRedeemInvite(baseInput({ hasSession: false }))).toBe(false)
  })

  it('does not redeem before onboarding is complete — the ref must survive the whole auth + onboarding flow', () => {
    expect(shouldRedeemInvite(baseInput({ hasSession: true, onboarded: false }))).toBe(false)
  })

  it('redeems immediately for an already-signed-in, already-onboarded user tapping a link', () => {
    expect(shouldRedeemInvite(baseInput({ hasSession: true, onboarded: true, pendingRef: 'someone' }))).toBe(true)
  })

  it('does not redeem a self-invite (case-insensitive match against the caller\'s own handle)', () => {
    expect(shouldRedeemInvite(baseInput({ pendingRef: 'Juhi', selfHandle: 'juhi' }))).toBe(false)
  })

  it('redeems normally when selfHandle is unknown (server still enforces the self-invite rule)', () => {
    expect(shouldRedeemInvite(baseInput({ pendingRef: 'juhi', selfHandle: null }))).toBe(true)
  })
})
