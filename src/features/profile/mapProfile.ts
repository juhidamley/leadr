import type { Database } from '@/types/database'

export type ProfileViewModel = {
  handle: string
  displayName: string
  avatarUrl: string | null
  totalXp: number
  currentLevel: number
  currentStreak: number
  longestStreak: number
}

type UsersRow = Database['public']['Tables']['users']['Row']

export function mapProfile(row: UsersRow, avatarUrl: string | null): ProfileViewModel {
  return {
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    avatarUrl,
    totalXp: row.total_xp,
    currentLevel: row.current_level,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
  }
}
