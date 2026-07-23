import { levelForXp, levelProgress, xpForLevel } from '@/features/xp/levels'

describe('xpForLevel', () => {
  it('is 0 for level 1 (free starting level)', () => {
    expect(xpForLevel(1)).toBe(0)
  })

  it('matches 100 * n^1.5 (rounded) for level 2', () => {
    expect(xpForLevel(2)).toBe(283)
  })

  it('matches 100 * n^1.5 (rounded) for level 3', () => {
    expect(xpForLevel(3)).toBe(520)
  })

  it('matches 100 * n^1.5 exactly for level 4 (perfect square boundary)', () => {
    expect(xpForLevel(4)).toBe(800)
  })

  it('treats level 0 and negative levels as the level-1 floor', () => {
    expect(xpForLevel(0)).toBe(0)
    expect(xpForLevel(-5)).toBe(0)
  })
})

describe('levelForXp', () => {
  it('is level 1 at 0 xp', () => {
    expect(levelForXp(0)).toBe(1)
  })

  it('stays level 1 just below the level-2 threshold', () => {
    expect(levelForXp(282)).toBe(1)
  })

  it('reaches level 2 exactly at the threshold', () => {
    expect(levelForXp(283)).toBe(2)
  })

  it('stays level 2 just below the level-3 threshold', () => {
    expect(levelForXp(519)).toBe(2)
  })

  it('reaches level 3 exactly at the threshold', () => {
    expect(levelForXp(520)).toBe(3)
  })

  it('reaches level 4 exactly at the threshold', () => {
    expect(levelForXp(800)).toBe(4)
  })
})

describe('levelProgress', () => {
  it('is 0% right at the start of a level', () => {
    expect(levelProgress(0)).toEqual({
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 283,
      progress: 0,
    })
  })

  it('computes fractional progress mid-level', () => {
    const result = levelProgress(401)

    expect(result.level).toBe(2)
    expect(result.xpIntoLevel).toBe(118)
    expect(result.xpForNextLevel).toBe(237)
    expect(result.progress).toBeCloseTo(118 / 237, 5)
  })

  it('is close to 100% just before leveling up', () => {
    const result = levelProgress(519)

    expect(result.level).toBe(2)
    expect(result.progress).toBeCloseTo(236 / 237, 5)
  })

  it('resets to 0% right after leveling up', () => {
    const result = levelProgress(520)

    expect(result.level).toBe(3)
    expect(result.xpIntoLevel).toBe(0)
    expect(result.progress).toBe(0)
  })
})
