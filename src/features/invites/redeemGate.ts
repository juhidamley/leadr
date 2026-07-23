export type RedeemGateInput = {
  pendingRef: string | null
  hasSession: boolean
  onboarded: boolean
  /** The current user's own handle — guards against redeeming a self-invite even if somehow captured (e.g. testing your own share link). */
  selfHandle: string | null
}

/**
 * Pure decision of whether now is the right moment to call redeem_invite.
 * A captured ref must survive the whole auth + onboarding flow (§9), so
 * this gate is checked on every relevant state change (session appears,
 * onboarding completes) rather than only once right after link capture.
 */
export function shouldRedeemInvite(input: RedeemGateInput): boolean {
  if (!input.pendingRef) {
    return false
  }
  if (!input.hasSession) {
    return false
  }
  if (!input.onboarded) {
    return false
  }
  if (input.selfHandle && input.pendingRef.toLowerCase() === input.selfHandle.toLowerCase()) {
    return false
  }
  return true
}
