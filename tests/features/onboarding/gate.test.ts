import { resolveAuthGate } from '@/features/onboarding/gate'

describe('resolveAuthGate', () => {
  it('is loading while auth is still resolving', () => {
    expect(
      resolveAuthGate({ authLoading: true, hasSession: false, onboardedLoading: false, onboarded: false }),
    ).toEqual({ status: 'loading' })
  })

  it('routes to signed-out when there is no session', () => {
    expect(
      resolveAuthGate({ authLoading: false, hasSession: false, onboardedLoading: false, onboarded: false }),
    ).toEqual({ status: 'signed-out' })
  })

  it('stays loading while the onboarded flag is still being fetched for a signed-in user', () => {
    expect(
      resolveAuthGate({ authLoading: false, hasSession: true, onboardedLoading: true, onboarded: false }),
    ).toEqual({ status: 'loading' })
  })

  it('routes to needs-onboarding when signed in and not yet onboarded', () => {
    expect(
      resolveAuthGate({ authLoading: false, hasSession: true, onboardedLoading: false, onboarded: false }),
    ).toEqual({ status: 'needs-onboarding' })
  })

  it('routes to ready when signed in and onboarded', () => {
    expect(
      resolveAuthGate({ authLoading: false, hasSession: true, onboardedLoading: false, onboarded: true }),
    ).toEqual({ status: 'ready' })
  })

  it('prioritizes auth loading over a stale hasSession=true from a previous render', () => {
    expect(
      resolveAuthGate({ authLoading: true, hasSession: true, onboardedLoading: false, onboarded: true }),
    ).toEqual({ status: 'loading' })
  })
})
