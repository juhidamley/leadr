import { ensureUserRow } from '@/features/auth/ensureUserRow'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}))

const USER_ID = '11111111-2222-3333-4444-555555555555'

function mockSelectResult(existing: { id: string } | null): { insert: jest.Mock } {
  const maybeSingle = jest.fn().mockResolvedValue({ data: existing, error: null })
  const eq = jest.fn().mockReturnValue({ maybeSingle })
  const select = jest.fn().mockReturnValue({ eq })
  const insert = jest.fn().mockResolvedValue({ error: null })

  ;(supabase.from as jest.Mock).mockReturnValue({ select, insert })

  return { insert }
}

describe('ensureUserRow', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('does not insert when a row already exists', async () => {
    const { insert } = mockSelectResult({ id: USER_ID })

    await ensureUserRow(USER_ID)

    expect(insert).not.toHaveBeenCalled()
  })

  it('inserts a row with a generated handle when absent', async () => {
    const { insert } = mockSelectResult(null)

    await ensureUserRow(USER_ID)

    expect(insert).toHaveBeenCalledWith({ id: USER_ID, handle: 'user_11111111' })
  })

  it('is idempotent across repeated calls', async () => {
    const { insert } = mockSelectResult({ id: USER_ID })

    await ensureUserRow(USER_ID)
    await ensureUserRow(USER_ID)

    expect(insert).not.toHaveBeenCalled()
  })

  it('throws when the existence check fails', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    const eq = jest.fn().mockReturnValue({ maybeSingle })
    const select = jest.fn().mockReturnValue({ eq })
    const insert = jest.fn()
    ;(supabase.from as jest.Mock).mockReturnValue({ select, insert })

    await expect(ensureUserRow(USER_ID)).rejects.toThrow('boom')
    expect(insert).not.toHaveBeenCalled()
  })

  it('throws when the insert fails', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const eq = jest.fn().mockReturnValue({ maybeSingle })
    const select = jest.fn().mockReturnValue({ eq })
    const insert = jest.fn().mockResolvedValue({ error: new Error('insert failed') })
    ;(supabase.from as jest.Mock).mockReturnValue({ select, insert })

    await expect(ensureUserRow(USER_ID)).rejects.toThrow('insert failed')
  })
})
