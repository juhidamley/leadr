import { buildAvatarPath } from '@/features/profile/avatarPath'

describe('buildAvatarPath', () => {
  it('nests the file under the user id folder', () => {
    expect(buildAvatarPath('11111111-2222-3333-4444-555555555555', 'jpg')).toBe(
      '11111111-2222-3333-4444-555555555555/avatar.jpg',
    )
  })

  it('uses the given extension', () => {
    expect(buildAvatarPath('abc', 'png')).toBe('abc/avatar.png')
  })
})
