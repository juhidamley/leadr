import '../src/global.css'

import { Stack } from 'expo-router'

import { AppQueryProvider } from '@/lib/queryClient'

export default function RootLayout(): React.JSX.Element {
  return (
    <AppQueryProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppQueryProvider>
  )
}
