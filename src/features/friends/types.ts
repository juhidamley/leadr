import type { Database } from '@/types/database'

export type FriendRelationship = Database['public']['Enums']['friend_relationship']
export type FriendRequestDirection = Database['public']['Enums']['friend_request_direction']

export type SearchResult = {
  id: string
  handle: string
  displayName: string
  avatarUrl: string | null
  relationship: FriendRelationship
}

export type Friend = {
  id: string
  handle: string
  displayName: string
  avatarUrl: string | null
  totalXp: number
  currentLevel: number
  currentStreak: number
}

export type FriendRequest = {
  userId: string
  handle: string
  displayName: string
  avatarUrl: string | null
  direction: FriendRequestDirection
  createdAt: string
}
