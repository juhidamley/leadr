import { estimateAward } from '@/features/xp/estimateAward'

// Mirrors the server's award_xp formula (supabase/migrations/..._award_xp.sql):
// round(base_xp * (1 + least(0.5, 0.10 * (streak - 1))))
function serverAward(baseXp: number, streak: number): number {
  const multiplier = 1 + Math.min(0.5, 0.1 * (streak - 1))
  return Math.round(baseXp * multiplier)
}

describe('estimateAward', () => {
  it('awards exactly base_xp on a streak of 1 (no bonus)', () => {
    expect(estimateAward({ baseXp: 20, streakAfter: 1 })).toBe(20)
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 30, 50, 100])('matches the server multiplier at streak %i', (streak) => {
    const baseXp = 20
    expect(estimateAward({ baseXp, streakAfter: streak })).toBe(serverAward(baseXp, streak))
  })

  it('caps the bonus multiplier at +50% for long streaks', () => {
    expect(estimateAward({ baseXp: 100, streakAfter: 6 })).toBe(serverAward(100, 6))
    expect(estimateAward({ baseXp: 100, streakAfter: 50 })).toBe(150)
    expect(estimateAward({ baseXp: 100, streakAfter: 500 })).toBe(150)
  })

  it('matches the server across a range of base XP values', () => {
    for (const baseXp of [5, 10, 15, 20, 25, 30, 50]) {
      for (const streak of [1, 2, 3, 4, 5, 6, 7, 12]) {
        expect(estimateAward({ baseXp, streakAfter: streak })).toBe(serverAward(baseXp, streak))
      }
    }
  })
})
