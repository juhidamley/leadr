import { splitFriendRequests } from '@/features/friends/requestLists'
import type { FriendRequest } from '@/features/friends/types'

function request(overrides: Partial<FriendRequest> = {}): FriendRequest {
  return {
    userId: 'user-1',
    handle: 'someone',
    displayName: 'Someone',
    avatarUrl: null,
    direction: 'incoming',
    createdAt: '2026-07-23T00:00:00.000Z',
    ...overrides,
  }
}

describe('splitFriendRequests', () => {
  it('splits incoming and outgoing requests into separate lists', () => {
    const result = splitFriendRequests([
      request({ userId: 'a', direction: 'incoming' }),
      request({ userId: 'b', direction: 'outgoing' }),
      request({ userId: 'c', direction: 'incoming' }),
    ])

    expect(result.incoming.map((r) => r.userId).sort()).toEqual(['a', 'c'])
    expect(result.outgoing.map((r) => r.userId)).toEqual(['b'])
  })

  it('counts only incoming requests for the badge', () => {
    const result = splitFriendRequests([
      request({ userId: 'a', direction: 'incoming' }),
      request({ userId: 'b', direction: 'incoming' }),
      request({ userId: 'c', direction: 'outgoing' }),
    ])

    expect(result.incomingCount).toBe(2)
  })

  it('returns empty lists and a zero count for no requests', () => {
    const result = splitFriendRequests([])

    expect(result).toEqual({ incoming: [], outgoing: [], incomingCount: 0 })
  })

  it('handles an all-outgoing set with a zero incoming badge count', () => {
    const result = splitFriendRequests([request({ userId: 'a', direction: 'outgoing' })])

    expect(result.incomingCount).toBe(0)
    expect(result.outgoing).toHaveLength(1)
  })
})
