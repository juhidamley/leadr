import type { AuthSession, AuthUser } from '@supabase/supabase-js'
import { createContext, type PropsWithChildren, use, useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  session: AuthSession | null
  user: AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    })

    return () => subscription.remove()
  }, [])

  return (
    <AuthContext value={{ session, user: session?.user ?? null, loading }}>{children}</AuthContext>
  )
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return value
}
