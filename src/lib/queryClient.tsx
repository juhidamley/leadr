import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { type PropsWithChildren, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { LOG_ACTIVITY_MUTATION_KEY, registerLogActivityMutationDefaults } from '@/features/activities/logActivityMutationDefaults'

import { wireOnlineManager } from './onlineManager'

wireOnlineManager()

// Generous enough to cover a phone left offline overnight (the late-night
// log → next-morning sync case) without replaying a mutation so stale
// it's no longer meaningful.
const PERSISTED_MUTATION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

const LOG_ACTIVITY_MUTATION_KEY_JSON = JSON.stringify(LOG_ACTIVITY_MUTATION_KEY)

function useAppQueryClient(): QueryClient {
  const [queryClient] = useState(() => {
    const client = new QueryClient()
    // Must happen before any resume attempt — a mutation restored from
    // storage has no function attached (functions aren't serializable),
    // so resuming it looks up a mutationFn here by mutationKey.
    registerLogActivityMutationDefaults(client)
    return client
  })

  // Resume whatever was paused when connectivity returns, for the
  // still-running-app case (a restart is covered by the persist-client
  // onSuccess hook in AppQueryProvider below).
  useEffect(() => {
    return onlineManager.subscribe(() => {
      if (onlineManager.isOnline()) {
        queryClient.resumePausedMutations()
      }
    })
  }, [queryClient])

  return queryClient
}

export function AppQueryProvider({ children }: PropsWithChildren): React.JSX.Element {
  const queryClient = useAppQueryClient()
  const hasResumedOnHydrate = useRef(false)

  // AsyncStorage's web implementation touches `window` directly, which
  // breaks Expo Router's static SSR export for web (see src/lib/supabase.ts
  // for the same guard) — offline persistence is a native-first concern
  // anyway, so web just gets a plain, unpersisted query client.
  if (Platform.OS === 'web') {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      onSuccess={() => {
        if (hasResumedOnHydrate.current) {
          return
        }
        hasResumedOnHydrate.current = true
        queryClient.resumePausedMutations()
      }}
      persistOptions={{
        persister: createAsyncStoragePersister({ storage: AsyncStorage, key: 'leadr-query-cache' }),
        maxAge: PERSISTED_MUTATION_MAX_AGE_MS,
        dehydrateOptions: {
          // Queries refetch fine on boot — only the log-activity queue
          // needs to survive a restart, so that's all we write to disk.
          shouldDehydrateQuery: () => false,
          shouldDehydrateMutation: (mutation) => JSON.stringify(mutation.options.mutationKey) === LOG_ACTIVITY_MUTATION_KEY_JSON,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
