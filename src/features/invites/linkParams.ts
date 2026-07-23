export const INVITE_REF_PARAM = 'ref'

/** Control params sent when generating an invite link — carries the inviter's handle as `ref`. */
export function buildInviteControlParams(inviterHandle: string): Record<string, string> {
  return { [INVITE_REF_PARAM]: inviterHandle }
}

/**
 * Pulls the inviter's handle back out of Branch's resolved params on a
 * link-open. Returns null for an organic open (no link), a link with no
 * ref, or a blank/whitespace-only ref.
 */
export function extractInviteRef(params: Record<string, unknown> | null | undefined): string | null {
  if (!params) {
    return null
  }

  const value = params[INVITE_REF_PARAM]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}
