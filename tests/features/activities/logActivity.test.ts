import { logActivity } from '@/features/activities/logActivity'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}))

describe('logActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends the caller-supplied client_id and occurred_at verbatim, never minting its own', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { activity_id: 'a1', xp_awarded: 30, capped: false, streak_freeze_used: false, total_xp: 30, current_level: 1, current_streak: 1, longest_streak: 1, xp_in_period: 30 },
      error: null,
    })

    await logActivity({
      clientId: 'fixed-client-id',
      activityTypeKey: 'job_application',
      occurredAt: '2026-07-23T05:00:00.000Z',
      note: 'applied',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('award-xp', {
      body: {
        client_id: 'fixed-client-id',
        activity_type_key: 'job_application',
        occurred_at: '2026-07-23T05:00:00.000Z',
        note: 'applied',
      },
    })
  })

  it('a replay with the same input sends the exact same client_id and occurred_at (idempotent retry)', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { activity_id: 'a1', xp_awarded: 30, capped: false, streak_freeze_used: false, total_xp: 30, current_level: 1, current_streak: 1, longest_streak: 1, xp_in_period: 30 },
      error: null,
    })

    const input = {
      clientId: 'stable-id-across-retries',
      activityTypeKey: 'daily_checkin',
      occurredAt: '2026-07-22T23:30:00.000Z',
    }

    await logActivity(input)
    await logActivity(input)

    const calls = (supabase.functions.invoke as jest.Mock).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][1].body.client_id).toBe('stable-id-across-retries')
    expect(calls[1][1].body.client_id).toBe('stable-id-across-retries')
    expect(calls[0][1].body.occurred_at).toBe(calls[1][1].body.occurred_at)
  })

  it('throws when the edge function returns an error', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: null, error: new Error('boom') })

    await expect(
      logActivity({ clientId: 'c1', activityTypeKey: 'job_application', occurredAt: '2026-07-23T00:00:00.000Z' }),
    ).rejects.toThrow('boom')
  })
})
