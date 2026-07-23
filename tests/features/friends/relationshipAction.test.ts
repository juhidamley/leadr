import { describeRelationshipAction } from '@/features/friends/relationshipAction'

describe('describeRelationshipAction', () => {
  it('maps "none" to an actionable Add button', () => {
    expect(describeRelationshipAction('none')).toEqual({ kind: 'add', label: 'Add', disabled: false })
  })

  it('maps "outgoing" to a disabled Requested state', () => {
    expect(describeRelationshipAction('outgoing')).toEqual({ kind: 'requested', label: 'Requested', disabled: true })
  })

  it('maps "incoming" to an actionable Respond button', () => {
    expect(describeRelationshipAction('incoming')).toEqual({ kind: 'respond', label: 'Respond', disabled: false })
  })

  it('maps "friends" to a disabled Friends state', () => {
    expect(describeRelationshipAction('friends')).toEqual({ kind: 'friends', label: 'Friends', disabled: true })
  })

  it('maps "blocked" to a disabled Blocked state', () => {
    expect(describeRelationshipAction('blocked')).toEqual({ kind: 'blocked', label: 'Blocked', disabled: true })
  })

  it('only "none" and "incoming" are actionable — every other relationship is a settled, disabled state', () => {
    const relationships = ['none', 'outgoing', 'incoming', 'friends', 'blocked'] as const
    const actionable = relationships.filter((relationship) => !describeRelationshipAction(relationship).disabled)

    expect(actionable.sort()).toEqual(['incoming', 'none'])
  })
})
