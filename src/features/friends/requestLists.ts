import type { FriendRequest } from './types'

export type SplitFriendRequests = {
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  incomingCount: number
}

/**
 * Pure split of the flat, direction-tagged list_friend_requests rows into
 * the two lists the UI renders (incoming needs Accept/Decline, outgoing
 * needs Cancel) plus the badge count for pending incoming requests.
 */
export function splitFriendRequests(requests: readonly FriendRequest[]): SplitFriendRequests {
  const incoming = requests.filter((request) => request.direction === 'incoming')
  const outgoing = requests.filter((request) => request.direction === 'outgoing')

  return { incoming, outgoing, incomingCount: incoming.length }
}
