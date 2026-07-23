export type ActivityTypeViewModel = {
  id: string
  key: string
  label: string
  category: string
  icon: string | null
  baseXp: number
  dailyCap: number | null
}

/** Matches the award-xp edge function's response shape (Task 9). */
export type AwardXpResponse = {
  activity_id: string
  xp_awarded: number
  capped: boolean
  streak_freeze_used: boolean
  total_xp: number
  current_level: number
  current_streak: number
  longest_streak: number
  xp_in_period: number
}
