import { useEffect, useRef, useState } from 'react'

import { subscribeToBranchOpens } from './branch'
import { clearPendingInvite, getPendingInvite, setPendingInvite } from './pendingInvite'
import { shouldRedeemInvite } from './redeemGate'
import { useRedeemInvite } from './useRedeemInvite'

export type InviteRedemptionState = {
  /** Set right after a successful redeem, for a one-shot "You're now friends with @handle" confirmation. Caller clears it once shown. */
  justRedeemedHandle: string | null
  clearJustRedeemed: () => void
}

export type UseInviteRedemptionFlowParams = {
  hasSession: boolean
  onboarded: boolean
  /** The caller's own handle, when known — guards against redeeming a self-invite. Server also enforces this; passing null just skips the client-side short-circuit. */
  selfHandle: string | null
}

/**
 * Mounted once near the app root. Captures every Branch link-open (cold
 * start / deferred fresh-install / warm re-open) into persisted storage
 * so the ref survives the whole auth + onboarding flow, then redeems it
 * the moment the gate opens — right after onboarding completes for a new
 * user, or immediately for an already-signed-in user tapping a link.
 */
export function useInviteRedemptionFlow(params: UseInviteRedemptionFlowParams): InviteRedemptionState {
  const { hasSession, onboarded, selfHandle } = params
  const redeemInvite = useRedeemInvite()
  const [capturedRef, setCapturedRef] = useState<string | null>(null)
  const [justRedeemedHandle, setJustRedeemedHandle] = useState<string | null>(null)
  const redeemingRef = useRef(false)

  useEffect(() => {
    return subscribeToBranchOpens((event) => {
      if (event.ref) {
        void setPendingInvite(event.ref)
        setCapturedRef(event.ref)
      }
    })
  }, [])

  // Also pick up a ref persisted from a previous session (e.g. the app
  // was killed mid-onboarding before it could be redeemed).
  useEffect(() => {
    getPendingInvite().then((ref) => {
      if (ref) {
        setCapturedRef(ref)
      }
    })
  }, [])

  useEffect(() => {
    if (redeemingRef.current) {
      return
    }

    async function tryRedeem(): Promise<void> {
      const pendingRef = capturedRef ?? (await getPendingInvite())

      if (!shouldRedeemInvite({ pendingRef, hasSession, onboarded, selfHandle })) {
        return
      }

      redeemingRef.current = true
      try {
        await redeemInvite.mutateAsync(pendingRef as string)
        setJustRedeemedHandle(pendingRef)
      } catch {
        // Unknown handle, a block, or a self-invite that slipped past the
        // client-side guard — nothing to retry, so drop it rather than
        // trying forever on a ref that will never succeed.
      } finally {
        await clearPendingInvite()
        setCapturedRef(null)
        redeemingRef.current = false
      }
    }

    void tryRedeem()
    // redeemInvite is a fresh object every render (useMutation); depending
    // on it would re-fire this effect constantly for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedRef, hasSession, onboarded, selfHandle])

  return {
    justRedeemedHandle,
    clearJustRedeemed: () => setJustRedeemedHandle(null),
  }
}
