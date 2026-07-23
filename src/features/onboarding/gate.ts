export type AuthGateState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'needs-onboarding' }
  | { status: 'ready' }

type ResolveAuthGateParams = {
  authLoading: boolean
  hasSession: boolean
  onboardedLoading: boolean
  onboarded: boolean
}

/**
 * Pure routing decision for app/_layout.tsx's Stack.Protected guards.
 * Kept separate from the navigator component so the four states are
 * directly unit-testable without mounting navigation.
 */
export function resolveAuthGate({
  authLoading,
  hasSession,
  onboardedLoading,
  onboarded,
}: ResolveAuthGateParams): AuthGateState {
  if (authLoading) {
    return { status: 'loading' }
  }
  if (!hasSession) {
    return { status: 'signed-out' }
  }
  if (onboardedLoading) {
    return { status: 'loading' }
  }
  if (!onboarded) {
    return { status: 'needs-onboarding' }
  }
  return { status: 'ready' }
}
