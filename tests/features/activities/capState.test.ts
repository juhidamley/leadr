import { deriveCapStates } from '@/features/activities/capState'

describe('deriveCapStates', () => {
  it('reports not capped when today\'s count is under the daily cap', () => {
    const result = deriveCapStates([{ id: 'a', dailyCap: 3 }], { a: 2 })

    expect(result.a).toEqual({ activityTypeId: 'a', usedToday: 2, dailyCap: 3, isCapped: false })
  })

  it('reports capped once today\'s count meets the daily cap', () => {
    const result = deriveCapStates([{ id: 'a', dailyCap: 3 }], { a: 3 })

    expect(result.a?.isCapped).toBe(true)
  })

  it('reports capped when today\'s count exceeds the daily cap', () => {
    const result = deriveCapStates([{ id: 'a', dailyCap: 1 }], { a: 5 })

    expect(result.a?.isCapped).toBe(true)
  })

  it('treats a null daily cap as uncapped regardless of usage', () => {
    const result = deriveCapStates([{ id: 'a', dailyCap: null }], { a: 999 })

    expect(result.a).toEqual({ activityTypeId: 'a', usedToday: 999, dailyCap: null, isCapped: false })
  })

  it('defaults usedToday to 0 for an activity type with no logs today', () => {
    const result = deriveCapStates([{ id: 'a', dailyCap: 2 }], {})

    expect(result.a).toEqual({ activityTypeId: 'a', usedToday: 0, dailyCap: 2, isCapped: false })
  })

  it('derives independent cap states per activity type', () => {
    const result = deriveCapStates(
      [
        { id: 'a', dailyCap: 1 },
        { id: 'b', dailyCap: 3 },
      ],
      { a: 1, b: 1 },
    )

    expect(result.a?.isCapped).toBe(true)
    expect(result.b?.isCapped).toBe(false)
  })
})
