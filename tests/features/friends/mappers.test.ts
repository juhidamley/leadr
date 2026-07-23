import { mapFriend, mapFriendRequest, mapSearchResult } from '@/features/friends/mappers'

describe('mapSearchResult', () => {
  it('maps a search_users row to the view model', () => {
    expect(
      mapSearchResult({ id: 'u1', handle: 'juhi', display_name: 'Juhi D', avatar_url: 'u1/avatar.jpg', relationship: 'none' }),
    ).toEqual({ id: 'u1', handle: 'juhi', displayName: 'Juhi D', avatarUrl: 'u1/avatar.jpg', relationship: 'none' })
  })

  it('falls back displayName to the handle when null', () => {
    const result = mapSearchResult({ id: 'u1', handle: 'juhi', display_name: null, avatar_url: null, relationship: 'friends' })

    expect(result.displayName).toBe('juhi')
  })
})

describe('mapFriend', () => {
  it('maps a list_friends row to the view model', () => {
    expect(
      mapFriend({
        id: 'u1',
        handle: 'juhi',
        display_name: 'Juhi D',
        avatar_url: null,
        total_xp: 401,
        current_level: 3,
        current_streak: 5,
      }),
    ).toEqual({
      id: 'u1',
      handle: 'juhi',
      displayName: 'Juhi D',
      avatarUrl: null,
      totalXp: 401,
      currentLevel: 3,
      currentStreak: 5,
    })
  })

  it('falls back displayName to the handle when null', () => {
    const result = mapFriend({
      id: 'u1',
      handle: 'juhi',
      display_name: null,
      avatar_url: null,
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
    })

    expect(result.displayName).toBe('juhi')
  })
})

describe('mapFriendRequest', () => {
  it('maps a list_friend_requests row to the view model', () => {
    expect(
      mapFriendRequest({
        direction: 'incoming',
        user_id: 'u1',
        handle: 'juhi',
        display_name: 'Juhi D',
        avatar_url: null,
        created_at: '2026-07-23T00:00:00.000Z',
      }),
    ).toEqual({
      userId: 'u1',
      handle: 'juhi',
      displayName: 'Juhi D',
      avatarUrl: null,
      direction: 'incoming',
      createdAt: '2026-07-23T00:00:00.000Z',
    })
  })

  it('falls back displayName to the handle when null', () => {
    const result = mapFriendRequest({
      direction: 'outgoing',
      user_id: 'u1',
      handle: 'juhi',
      display_name: null,
      avatar_url: null,
      created_at: '2026-07-23T00:00:00.000Z',
    })

    expect(result.displayName).toBe('juhi')
  })
})
