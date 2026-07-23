import { normalizeHandle, validateHandleFormat } from '@/features/onboarding/handleValidation'

describe('validateHandleFormat', () => {
  it.each(['abc', 'juhi', 'juhi_d', 'a12345678901234567', 'a1_2b3c'])(
    'accepts a valid handle: %s',
    (handle) => {
      expect(validateHandleFormat(handle)).toEqual({ valid: true })
    },
  )

  it('rejects an empty handle', () => {
    expect(validateHandleFormat('')).toEqual({ valid: false, error: 'Handle is required.' })
  })

  it('rejects a handle shorter than 3 characters', () => {
    expect(validateHandleFormat('ab')).toEqual({
      valid: false,
      error: 'Handle must be at least 3 characters.',
    })
  })

  it('rejects a handle longer than 20 characters', () => {
    expect(validateHandleFormat('a'.repeat(21))).toEqual({
      valid: false,
      error: 'Handle must be 20 characters or fewer.',
    })
  })

  it('rejects a handle starting with a digit', () => {
    expect(validateHandleFormat('1abc')).toEqual({
      valid: false,
      error: 'Handle must start with a letter.',
    })
  })

  it('rejects a handle starting with an underscore', () => {
    expect(validateHandleFormat('_abc')).toEqual({
      valid: false,
      error: 'Handle must start with a letter.',
    })
  })

  it('rejects characters outside [a-z0-9_]', () => {
    expect(validateHandleFormat('abc-def')).toEqual({
      valid: false,
      error: 'Handle can only contain lowercase letters, numbers, and underscores.',
    })
  })

  it('rejects a handle with a space', () => {
    expect(validateHandleFormat('abc def')).toEqual({
      valid: false,
      error: 'Handle can only contain lowercase letters, numbers, and underscores.',
    })
  })

  it('accepts uppercase input by normalizing before validating', () => {
    expect(validateHandleFormat('JUHI')).toEqual({ valid: true })
  })
})

describe('normalizeHandle', () => {
  it('lowercases and trims', () => {
    expect(normalizeHandle('  Juhi_D  ')).toBe('juhi_d')
  })
})
