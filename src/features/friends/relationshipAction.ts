import type { FriendRelationship } from './types'

export type RelationshipActionKind = 'add' | 'requested' | 'respond' | 'friends' | 'blocked'

export type RelationshipAction = {
  kind: RelationshipActionKind
  label: string
  /** True when the action button shouldn't be tappable (a settled state, not a call to action). */
  disabled: boolean
}

/**
 * Pure mapping from a search result's relationship to what its action
 * button should say and do. Kept separate from the search screen so the
 * five-state logic (none/outgoing/incoming/friends/blocked) is testable
 * without rendering anything.
 */
export function describeRelationshipAction(relationship: FriendRelationship): RelationshipAction {
  switch (relationship) {
    case 'none':
      return { kind: 'add', label: 'Add', disabled: false }
    case 'outgoing':
      return { kind: 'requested', label: 'Requested', disabled: true }
    case 'incoming':
      return { kind: 'respond', label: 'Respond', disabled: false }
    case 'friends':
      return { kind: 'friends', label: 'Friends', disabled: true }
    case 'blocked':
      return { kind: 'blocked', label: 'Blocked', disabled: true }
  }
}
