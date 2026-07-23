import { useEffect, useState } from 'react'
import { Text } from 'react-native'

import { PlaceholderScreen } from '@/components/PlaceholderScreen'
import { supabase } from '@/lib/supabase'

type ConnectivityStatus = 'checking' | 'connected' | 'error'

/**
 * TEMPORARY (Task 2 connectivity proof): confirms the Supabase client can
 * reach the configured project. Replaced by real profile data in Task 3.
 */
function SupabaseConnectivityCheck(): React.JSX.Element {
  const [status, setStatus] = useState<ConnectivityStatus>('checking')

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ error }) => setStatus(error ? 'error' : 'connected'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <Text className="text-xs text-gray-500 dark:text-gray-400">
      Supabase (temporary check): {status}
    </Text>
  )
}

export default function ProfileScreen(): React.JSX.Element {
  return (
    <PlaceholderScreen label="Profile">
      <SupabaseConnectivityCheck />
    </PlaceholderScreen>
  )
}
