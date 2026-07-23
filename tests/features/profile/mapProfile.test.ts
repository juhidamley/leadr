import { mapProfile } from '@/features/profile/mapProfile'
import type { Database } from '@/types/database'

type UsersRow = Database['public']['Tables']['users']['Row']

const baseRow: UsersRow = {
  id: '11111111-2222-3333-4444-555555555555',
  handle: 'juhi',
  display_name: null,
  avatar_url: null,
  phone: null,
  career_goal: 'Break into PM',
  target_role: 'Product Manager',
  total_xp: 401,
  current_level: 2,
  current_streak: 3,
  longest_streak: 7,
  last_active_date: null,
  onboarded: true,
  timezone: 'America/Los_Angeles',
  push_token: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('mapProfile', () => {
  it('maps DB fields to the view model', () => {
    expect(mapProfile({ ...baseRow, display_name: 'Juhi D' }, null)).toEqual({
      handle: 'juhi',
      displayName: 'Juhi D',
      avatarUrl: null,
      totalXp: 401,
      currentLevel: 2,
      currentStreak: 3,
      longestStreak: 7,
    })
  })

  it('falls back display name to the handle when unset', () => {
    const result = mapProfile(baseRow, null)

    expect(result.displayName).toBe('juhi')
  })

  it('passes through a resolved signed avatar URL', () => {
    const result = mapProfile(baseRow, 'https://example.com/signed?token=abc')

    expect(result.avatarUrl).toBe('https://example.com/signed?token=abc')
  })

  it('reports a missing avatar as null, not an empty string', () => {
    const result = mapProfile(baseRow, null)

    expect(result.avatarUrl).toBeNull()
  })
})
