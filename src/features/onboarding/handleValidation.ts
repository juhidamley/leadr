const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,19}$/

export type HandleValidationResult = { valid: true } | { valid: false; error: string }

export function normalizeHandle(rawHandle: string): string {
  return rawHandle.trim().toLowerCase()
}

/**
 * Client-side mirror of the users_handle_format DB constraint: 3–20 chars,
 * lowercase letters/digits/underscore, must start with a letter.
 */
export function validateHandleFormat(rawHandle: string): HandleValidationResult {
  const handle = normalizeHandle(rawHandle)

  if (handle.length === 0) {
    return { valid: false, error: 'Handle is required.' }
  }
  if (handle.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters.' }
  }
  if (handle.length > 20) {
    return { valid: false, error: 'Handle must be 20 characters or fewer.' }
  }
  if (!/^[a-z]/.test(handle)) {
    return { valid: false, error: 'Handle must start with a letter.' }
  }
  if (!HANDLE_REGEX.test(handle)) {
    return { valid: false, error: 'Handle can only contain lowercase letters, numbers, and underscores.' }
  }

  return { valid: true }
}
