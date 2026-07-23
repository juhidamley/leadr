import { act, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

type AuthChangeCallback = (event: string, session: { user: { id: string } } | null) => void

let authChangeCallback: AuthChangeCallback | null = null
const unsubscribe = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}))

function Probe(): React.JSX.Element {
  const { session, user, loading } = useAuth()

  return (
    <Text>
      {JSON.stringify({ loading, hasSession: session !== null, userId: user?.id ?? null })}
    </Text>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  authChangeCallback = null

  ;(supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback: AuthChangeCallback) => {
    authChangeCallback = callback
    return { data: { subscription: { unsubscribe } } }
  })
})

describe('AuthProvider', () => {
  it('starts loading, then reflects no session once getSession resolves', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(screen.getByText(JSON.stringify({ loading: false, hasSession: false, userId: null }))).toBeTruthy()
  })

  it('reflects the session once getSession resolves with a signed-in user', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(
      screen.getByText(JSON.stringify({ loading: false, hasSession: true, userId: 'user-1' })),
    ).toBeTruthy()
  })

  it('transitions from signed-out to signed-in when auth state changes', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(screen.getByText(JSON.stringify({ loading: false, hasSession: false, userId: null }))).toBeTruthy()

    await act(() => {
      authChangeCallback?.('SIGNED_IN', { user: { id: 'user-2' } })
    })

    expect(
      screen.getByText(JSON.stringify({ loading: false, hasSession: true, userId: 'user-2' })),
    ).toBeTruthy()
  })

  it('unsubscribes from auth state changes on unmount', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })

    const result = await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await result.unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
