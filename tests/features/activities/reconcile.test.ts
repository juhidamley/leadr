import { reconcileAward, reconcileFailure, type ReconcileSnapshot } from '@/features/activities/reconcile'
import type { AwardXpResponse } from '@/features/activities/types'

const before: ReconcileSnapshot = {
  totalXp: 400,
  currentLevel: 3,
  currentStreak: 4,
  longestStreak: 7,
}

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
  it('converges to the server totals when the optimistic estimate matched', () => {
    const outcome = reconcileAward({ optimisticXpDelta: 22, before }, serverResponse({ xp_awarded: 22 }))

    expect(outcome.rolledBack).toBe(false)
    expect(outcome.corrected).toBe(false)
    expect(outcome.cappedMessage).toBeNull()
    expect(outcome.finalXpDelta).toBe(22)
    expect(outcome.after).toEqual({
      totalXp: 422,
      currentLevel: 3,
      currentStreak: 5,
      longestStreak: 7,
    })
  })

  it('corrects the displayed value down and explains it when the daily cap was hit', () => {
    const server = serverResponse({ xp_awarded: 0, capped: true, total_xp: 400, current_streak: 5 })
    const outcome = reconcileAward({ optimisticXpDelta: 22, before }, server)

    expect(outcome.rolledBack).toBe(false)
    expect(outcome.corrected).toBe(true)
    expect(outcome.cappedMessage).toMatch(/daily cap/i)
    expect(outcome.finalXpDelta).toBe(0)
    expect(outcome.after.totalXp).toBe(400)
  })

  it('flags a correction whenever the server value differs from the optimistic estimate, even without a cap', () => {
    const server = serverResponse({ xp_awarded: 18 })
    const outcome = reconcileAward({ optimisticXpDelta: 22, before }, server)

    expect(outcome.corrected).toBe(true)
    expect(outcome.cappedMessage).toBeNull()
  })

  it('always uses the server snapshot for the settled totals, never the optimistic guess', () => {
    const server = serverResponse({ total_xp: 999, current_level: 9, current_streak: 40, longest_streak: 40 })
    const outcome = reconcileAward({ optimisticXpDelta: 22, before }, server)

    expect(outcome.after).toEqual({
      totalXp: 999,
      currentLevel: 9,
      currentStreak: 40,
      longestStreak: 40,
    })
  })
})

describe('reconcileFailure', () => {
  it('rolls back fully to the pre-optimistic snapshot, leaving no phantom XP', () => {
    const outcome = reconcileFailure({ optimisticXpDelta: 22, before })

    expect(outcome.rolledBack).toBe(true)
    expect(outcome.finalXpDelta).toBe(0)
    expect(outcome.cappedMessage).toBeNull()
    expect(outcome.after).toEqual(before)
  })
})
