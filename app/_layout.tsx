import '../src/global.css'

import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { Text, View } from 'react-native'

import { LoadingScreen } from '@/components/LoadingScreen'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { useInviteRedemptionFlow } from '@/features/invites/useInviteRedemptionFlow'
import { resolveAuthGate } from '@/features/onboarding/gate'
import { useOnboardedStatus } from '@/features/onboarding/useOnboardedStatus'
import { AppQueryProvider } from '@/lib/queryClient'

const REDEEM_CONFIRMATION_DISMISS_MS = 4000

function RedeemConfirmationToast({ handle, onDismiss }: { handle: string; onDismiss: () => void }): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onDismiss, REDEEM_CONFIRMATION_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="absolute inset-x-6 bottom-10 rounded-lg bg-gray-900 px-4 py-3 dark:bg-gray-100"
      onTouchEnd={onDismiss}
    >
      <Text className="text-center text-sm font-medium text-white dark:text-black">You&apos;re now friends with @{handle}</Text>
    </View>
  )
}

function RootNavigator(): React.JSX.Element {
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user.id
  const { data: onboarded, isLoading: onboardedQueryLoading } = useOnboardedStatus(userId)

  const gate = resolveAuthGate({
    authLoading,
    hasSession: !!session,
    onboardedLoading: userId !== undefined && onboardedQueryLoading,
    onboarded: onboarded ?? false,
  })

  // Mounted unconditionally (not just once "ready") so a link tapped
  // mid-onboarding is captured immediately, even though redemption
  // itself only fires once onboarded flips true (see shouldRedeemInvite).
  const { justRedeemedHandle, clearJustRedeemed } = useInviteRedemptionFlow({
    hasSession: !!session,
    onboarded: onboarded ?? false,
    selfHandle: null,
  })

  if (gate.status === 'loading') {
    return <LoadingScreen />
  }

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={gate.status === 'signed-out'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={gate.status === 'needs-onboarding'}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={gate.status === 'ready'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="friends" options={{ presentation: 'card' }} />
        </Stack.Protected>
      </Stack>

      {justRedeemedHandle ? <RedeemConfirmationToast handle={justRedeemedHandle} onDismiss={clearJustRedeemed} /> : null}
    </View>
  )
}

export default function RootLayout(): React.JSX.Element {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </AppQueryProvider>
  )
}
