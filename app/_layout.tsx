import '../src/global.css'

import { Stack } from 'expo-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { AppQueryProvider } from '@/lib/queryClient'

function RootNavigator(): React.JSX.Element {
  const { session, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
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
