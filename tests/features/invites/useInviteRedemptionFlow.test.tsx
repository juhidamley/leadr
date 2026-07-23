import AsyncStorage from '@react-native-async-storage/async-storage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'

import { useInviteRedemptionFlow } from '@/features/invites/useInviteRedemptionFlow'
import { supabase } from '@/lib/supabase'

type BranchOpenEvent = { ref: string | null; error: string | null }
type BranchOpenCallback = (event: BranchOpenEvent) => void

let branchCallback: BranchOpenCallback | null = null
const mockUnsubscribe = jest.fn()

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('@/features/invites/branch', () => ({
  subscribeToBranchOpens: jest.fn((callback: BranchOpenCallback) => {
    branchCallback = callback
    return mockUnsubscribe
  }),
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}))

function Probe({ hasSession, onboarded }: { hasSession: boolean; onboarded: boolean }): React.JSX.Element {
  const { justRedeemedHandle } = useInviteRedemptionFlow({ hasSession, onboarded, selfHandle: null })
  return <Text>{JSON.stringify({ justRedeemedHandle })}</Text>
}

function renderProbe(props: { hasSession: boolean; onboarded: boolean }, client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <Probe {...props} />
    </QueryClientProvider>,
  )
}

describe('useInviteRedemptionFlow', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    branchCallback = null
    await AsyncStorage.clear()
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ error: null })
  })

  it('redeems immediately when an already signed-in, already onboarded user taps a link', async () => {
    const queryClient = new QueryClient()
    await render(<QueryClientProvider client={queryClient}><Probe hasSession onboarded /></QueryClientProvider>)

    await act(async () => {
      branchCallback?.({ ref: 'alice', error: null })
    })

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('redeem_invite', { inviter_handle: 'alice' })
    })

    expect(await screen.findByText(JSON.stringify({ justRedeemedHandle: 'alice' }))).toBeTruthy()
  })

  it('waits until onboarding completes before redeeming a ref captured mid-onboarding', async () => {
    const queryClient = new QueryClient()
    const view = await renderProbe({ hasSession: true, onboarded: false }, queryClient)

    await act(async () => {
      branchCallback?.({ ref: 'bob', error: null })
    })

    expect(supabase.rpc).not.toHaveBeenCalled()

    await act(async () => {
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <Probe hasSession onboarded />
        </QueryClientProvider>,
      )
    })

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('redeem_invite', { inviter_handle: 'bob' })
    })
  })

  it('does not redeem before a session exists at all', async () => {
    const queryClient = new QueryClient()
    await renderProbe({ hasSession: false, onboarded: false }, queryClient)

    await act(async () => {
      branchCallback?.({ ref: 'carol', error: null })
    })

    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('unsubscribes from Branch opens on unmount', async () => {
    const queryClient = new QueryClient()
    const view = await renderProbe({ hasSession: true, onboarded: true }, queryClient)

    await view.unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
