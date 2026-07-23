import { derivePendingLogs, sumQueuedXp, type LogActivityMutationSnapshot } from '@/features/activities/pendingLogs'

function snapshot(overrides: Partial<LogActivityMutationSnapshot> = {}): LogActivityMutationSnapshot {
  return {
    clientId: 'client-1',
    activityTypeId: 'type-1',
    label: 'Submit a job application',
    estimatedXp: 30,
    status: 'pending',
    ...overrides,
  }
}

describe('derivePendingLogs', () => {
  it('shows an in-flight or paused-offline mutation as queued', () => {
    const entries = derivePendingLogs([snapshot({ status: 'pending' })])

    expect(entries).toEqual([{ clientId: 'client-1', activityTypeId: 'type-1', label: 'Submit a job application', estimatedXp: 30, status: 'queued' }])
  })

  it('drops a confirmed (server-acked) mutation entirely — nothing left to show as pending', () => {
    const entries = derivePendingLogs([snapshot({ status: 'success' })])

    expect(entries).toEqual([])
  })

  it('shows a mutation that failed after retries as failed', () => {
    const entries = derivePendingLogs([snapshot({ status: 'error' })])

    expect(entries[0]?.status).toBe('failed')
  })

  it('tracks a pending → confirmed transition keyed by client_id (the item disappears)', () => {
    const whileQueued = derivePendingLogs([snapshot({ clientId: 'client-1', status: 'pending' })])
    expect(whileQueued.map((e) => e.clientId)).toEqual(['client-1'])

    const afterConfirmed = derivePendingLogs([snapshot({ clientId: 'client-1', status: 'success' })])
    expect(afterConfirmed).toEqual([])
  })

  it('tracks a pending → failed transition keyed by client_id', () => {
    const whileQueued = derivePendingLogs([snapshot({ clientId: 'client-1', status: 'pending' })])
    expect(whileQueued[0]?.status).toBe('queued')

    const afterFailed = derivePendingLogs([snapshot({ clientId: 'client-1', status: 'error' })])
    expect(afterFailed[0]?.status).toBe('failed')
  })

  it('keeps independent entries for concurrently queued taps of different activities', () => {
    const entries = derivePendingLogs([
      snapshot({ clientId: 'a', activityTypeId: 'type-a', status: 'pending' }),
      snapshot({ clientId: 'b', activityTypeId: 'type-b', status: 'pending' }),
      snapshot({ clientId: 'c', activityTypeId: 'type-a', status: 'success' }),
    ])

    expect(entries.map((e) => e.clientId).sort()).toEqual(['a', 'b'])
  })
})

describe('sumQueuedXp', () => {
  it('sums only queued entries, excluding failed ones', () => {
    const entries = derivePendingLogs([
      snapshot({ clientId: 'a', estimatedXp: 30, status: 'pending' }),
      snapshot({ clientId: 'b', estimatedXp: 40, status: 'pending' }),
      snapshot({ clientId: 'c', estimatedXp: 60, status: 'error' }),
    ])

    expect(sumQueuedXp(entries)).toBe(70)
  })

  it('is 0 when nothing is queued', () => {
    expect(sumQueuedXp([])).toBe(0)
  })
})
