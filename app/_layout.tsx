import '../src/global.css'

import { Stack } from 'expo-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { resolveAuthGate } from '@/features/onboarding/gate'
import { useOnboardedStatus } from '@/features/onboarding/useOnboardedStatus'
import { AppQueryProvider } from '@/lib/queryClient'

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

  if (gate.status === 'loading') {
    return <LoadingScreen />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={gate.status === 'signed-out'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={gate.status === 'needs-onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={gate.status === 'ready'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
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
