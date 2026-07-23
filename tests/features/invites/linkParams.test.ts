import { buildInviteControlParams, extractInviteRef } from '@/features/invites/linkParams'

describe('buildInviteControlParams / extractInviteRef', () => {
  it('round-trips a handle through control params and back', () => {
    const params = buildInviteControlParams('juhi')

    expect(extractInviteRef(params)).toBe('juhi')
  })

  it('round-trips handles with underscores and digits', () => {
    const params = buildInviteControlParams('juhi_d_99')

    expect(extractInviteRef(params)).toBe('juhi_d_99')
  })
})

describe('extractInviteRef', () => {
  it('returns null for an organic open with no params at all', () => {
    expect(extractInviteRef(null)).toBeNull()
    expect(extractInviteRef(undefined)).toBeNull()
  })

  it('returns null when params exist but carry no ref (e.g. Branch-only keys)', () => {
    expect(extractInviteRef({ '+is_first_session': true, '+clicked_branch_link': false })).toBeNull()
  })

  it('returns null for a blank or whitespace-only ref', () => {
    expect(extractInviteRef({ ref: '' })).toBeNull()
    expect(extractInviteRef({ ref: '   ' })).toBeNull()
  })

  it('returns null when ref is present but not a string', () => {
    expect(extractInviteRef({ ref: 12345 })).toBeNull()
  })

  it('trims surrounding whitespace from a real ref', () => {
    expect(extractInviteRef({ ref: '  juhi  ' })).toBe('juhi')
  })
})
