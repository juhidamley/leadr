import type { Database } from '@/types/database'

import type { Friend, FriendRequest, SearchResult } from './types'

// Supabase's type generator can't infer per-column nullability for
// TABLE-returning functions the way it does for real table Rows, so it
// marks display_name/avatar_url non-null here even though users.
// display_name/avatar_url are genuinely nullable columns (and the RPCs
// select them straight through). These row types correct that, keeping
// the Args types imported from the generated Functions definitions —
// only the Returns shape needed the nullability fixed.
type SearchUsersRow = Omit<Database['public']['Functions']['search_users']['Returns'][number], 'display_name' | 'avatar_url'> & {
  display_name: string | null
  avatar_url: string | null
}
type ListFriendsRow = Omit<Database['public']['Functions']['list_friends']['Returns'][number], 'display_name' | 'avatar_url'> & {
  display_name: string | null
  avatar_url: string | null
}
type ListFriendRequestsRow = Omit<Database['public']['Functions']['list_friend_requests']['Returns'][number], 'display_name' | 'avatar_url'> & {
  display_name: string | null
  avatar_url: string | null
}

export function mapSearchResult(row: SearchUsersRow): SearchResult {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    avatarUrl: row.avatar_url,
    relationship: row.relationship,
  }
}

export function mapFriend(row: ListFriendsRow): Friend {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    avatarUrl: row.avatar_url,
    totalXp: row.total_xp,
    currentLevel: row.current_level,
    currentStreak: row.current_streak,
  }
}

export function mapFriendRequest(row: ListFriendRequestsRow): FriendRequest {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    avatarUrl: row.avatar_url,
    direction: row.direction,
    createdAt: row.created_at,
  }
}
