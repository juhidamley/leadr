import {
  buildOnboardingPatch,
  checkHandleAvailability,
  finishOnboarding,
  HandleTakenError,
  linkPhone,
  verifyPhoneChangeOtp,
} from '@/features/onboarding/api'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: { updateUser: jest.fn(), verifyOtp: jest.fn() },
    from: jest.fn(),
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('checkHandleAvailability', () => {
  it('calls the is_handle_available RPC and returns its result', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: true, error: null })

    const result = await checkHandleAvailability('juhi')

    expect(supabase.rpc).toHaveBeenCalledWith('is_handle_available', { candidate: 'juhi' })
    expect(result).toBe(true)
  })

  it('maps a taken handle to false', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: false, error: null })

    await expect(checkHandleAvailability('taken')).resolves.toBe(false)
  })

  it('throws on an RPC error', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('network error') })

    await expect(checkHandleAvailability('juhi')).rejects.toThrow('network error')
  })
})

describe('buildOnboardingPatch', () => {
  it('builds the patch with onboarded true and a normalized handle', () => {
    const patch = buildOnboardingPatch({
      handle: '  Juhi_D  ',
      careerGoal: 'Break into PM',
      targetRole: 'Product Manager',
      phone: null,
    })

    expect(patch).toMatchObject({
      handle: 'juhi_d',
      career_goal: 'Break into PM',
      target_role: 'Product Manager',
      onboarded: true,
    })
    expect(typeof patch.timezone).toBe('string')
    expect(patch.phone).toBeUndefined()
  })

  it('includes phone in the patch only when provided', () => {
    const patch = buildOnboardingPatch({
      handle: 'juhi',
      careerGoal: 'Break into PM',
      targetRole: 'Product Manager',
      phone: '+15551234567',
    })

    expect(patch.phone).toBe('+15551234567')
  })
})

describe('finishOnboarding', () => {
  function mockUpdateResult(error: { code: string } | null) {
    const eq = jest.fn().mockResolvedValue({ error })
    const update = jest.fn().mockReturnValue({ eq })
    ;(supabase.from as jest.Mock).mockReturnValue({ update })
    return { update, eq }
  }

  const input = { handle: 'juhi', careerGoal: 'Break into PM', targetRole: 'Product Manager', phone: null }

  it('updates the users row for the given id with onboarded: true', async () => {
    const { update, eq } = mockUpdateResult(null)

    await finishOnboarding('user-1', input)

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ handle: 'juhi', onboarded: true }))
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('throws HandleTakenError on a unique-violation', async () => {
    mockUpdateResult({ code: '23505' })

    await expect(finishOnboarding('user-1', input)).rejects.toBeInstanceOf(HandleTakenError)
  })

  it('rethrows other errors as-is', async () => {
    mockUpdateResult({ code: '22P02' })

    await expect(finishOnboarding('user-1', input)).rejects.not.toBeInstanceOf(HandleTakenError)
  })
})

describe('linkPhone', () => {
  it('calls auth.updateUser with the phone number', async () => {
    ;(supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null })

    await linkPhone('+15551234567')

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ phone: '+15551234567' })
  })

  it('throws on failure', async () => {
    ;(supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: new Error('invalid phone') })

    await expect(linkPhone('bad')).rejects.toThrow('invalid phone')
  })
})

describe('verifyPhoneChangeOtp', () => {
  it('calls verifyOtp with type phone_change', async () => {
    ;(supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({ error: null })

    await verifyPhoneChangeOtp('+15551234567', '123456')

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+15551234567',
      token: '123456',
      type: 'phone_change',
    })
  })

  it('throws on an invalid code', async () => {
    ;(supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({ error: new Error('invalid code') })

    await expect(verifyPhoneChangeOtp('+15551234567', '000000')).rejects.toThrow('invalid code')
  })
})
