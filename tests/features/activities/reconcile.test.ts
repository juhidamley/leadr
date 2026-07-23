import { reconcileAward } from '@/features/activities/reconcile'
import type { AwardXpResponse } from '@/features/activities/types'

function serverResponse(overrides: Partial<AwardXpResponse> = {}): AwardXpResponse {
  return {
    activity_id: 'activity-1',
    xp_awarded: 22,
    capped: false,
    streak_freeze_used: false,
    total_xp: 422,
    current_level: 3,
    current_streak: 5,
    longest_streak: 7,
    xp_in_period: 22,
    ...overrides,
  }
}

describe('reconcileAward', () => {
  it('reports no correction when the estimate matched the server exactly', () => {
    const outcome = reconcileAward(22, serverResponse({ xp_awarded: 22 }))

    expect(outcome.corrected).toBe(false)
    expect(outcome.cappedMessage).toBeNull()
    expect(outcome.finalXpDelta).toBe(22)
  })

  it('flags a correction and explains it when the daily cap was hit', () => {
    const server = serverResponse({ xp_awarded: 0, capped: true })
    const outcome = reconcileAward(22, server)

    expect(outcome.corrected).toBe(true)
    expect(outcome.cappedMessage).toMatch(/daily cap/i)
    expect(outcome.finalXpDelta).toBe(0)
  })

  it('flags a correction whenever the server value differs from the estimate, even without a cap', () => {
    const server = serverResponse({ xp_awarded: 18 })
    const outcome = reconcileAward(22, server)

    expect(outcome.corrected).toBe(true)
    expect(outcome.cappedMessage).toBeNull()
  })

  it('a known-capped tap (estimate of 0) matching a capped server response reports no correction', () => {
    const server = serverResponse({ xp_awarded: 0, capped: true })
    const outcome = reconcileAward(0, server)

    expect(outcome.corrected).toBe(false)
    expect(outcome.cappedMessage).toMatch(/daily cap/i)
  })
})
