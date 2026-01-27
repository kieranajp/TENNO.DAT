import { describe, it, expect } from 'vitest'
import { MasteryState } from '@warframe-tracker/shared'
import {
  getMasteredXp,
  getRank30Xp,
  getRankFromXp,
  getMasteryStateFromRank,
  getMasteryContribution,
  getMRThreshold,
  calculateMR,
  intrinsicsToXP,
} from './mastery'

describe('getMasteredXp', () => {
  it.each([
    // Frame-type (1000 multiplier)
    ['Warframes', 30, 900000],
    ['Warframes', 40, 1600000],
    ['Pets', 30, 900000],
    ['Necramechs', 40, 1600000],
    ['Vehicles', 30, 900000], // K-Drives, Plexus
    // Weapon-type (500 multiplier)
    ['Primary', 30, 450000],
    ['Primary', 40, 800000], // Kuva/Tenet
    ['Melee', 30, 450000],
    ['Secondary', 30, 450000],
  ])('%s at rank %d = %d XP', (category, rank, expectedXp) => {
    expect(getMasteredXp(category, rank)).toBe(expectedXp)
  })
})

describe('getRank30Xp', () => {
  it.each([
    // Frame-type: 900,000
    ['Warframes', 900000],
    ['Pets', 900000],
    ['Sentinels', 900000],
    ['Vehicles', 900000],
    // Weapon-type: 450,000
    ['Primary', 450000],
    ['Secondary', 450000],
    ['Melee', 450000],
  ])('%s = %d XP', (category, expected) => {
    expect(getRank30Xp(category)).toBe(expected)
  })
})

describe('getRankFromXp', () => {
  describe('frame-type categories', () => {
    // rank = floor(sqrt(xp / 1000))
    it.each([
      [0, 30, 0],
      [10000, 30, 3],   // sqrt(10) = 3.16
      [100000, 30, 10], // sqrt(100) = 10
      [250000, 30, 15], // sqrt(250) = 15.8
      [900000, 30, 30],
      [1000000, 30, 30], // Capped
      [1600000, 40, 40],
      [2000000, 40, 40], // Capped
    ])('Warframes: %d XP (max %d) = rank %d', (xp, maxRank, expectedRank) => {
      expect(getRankFromXp(xp, 'Warframes', maxRank)).toBe(expectedRank)
    })
  })

  describe('weapon-type categories', () => {
    // rank = floor(sqrt(xp / 500))
    it.each([
      [5000, 30, 3],    // sqrt(10) = 3.16
      [50000, 30, 10],  // sqrt(100) = 10
      [450000, 30, 30],
      [500000, 30, 30], // Capped
      [800000, 40, 40],
      [1000000, 40, 40], // Capped
    ])('Primary: %d XP (max %d) = rank %d', (xp, maxRank, expectedRank) => {
      expect(getRankFromXp(xp, 'Primary', maxRank)).toBe(expectedRank)
    })
  })
})

describe('getMasteryStateFromRank', () => {
  it.each([
    // maxRank 30 items
    [0, 30, MasteryState.Unmastered],
    [15, 30, MasteryState.Unmastered],
    [29, 30, MasteryState.Unmastered],
    [30, 30, MasteryState.Mastered30],
    // maxRank 40 items
    [0, 40, MasteryState.Unmastered],
    [29, 40, MasteryState.Unmastered],
    [30, 40, MasteryState.Mastered30],
    [35, 40, MasteryState.Mastered30],
    [39, 40, MasteryState.Mastered30],
    [40, 40, MasteryState.Mastered40],
  ])('rank %d (max %d) = %s', (rank, maxRank, expectedState) => {
    expect(getMasteryStateFromRank(rank, maxRank)).toBe(expectedState)
  })
})

describe('getMasteryContribution', () => {
  it.each([
    // Frame-type (200 per rank)
    [0, 'Warframes', 30, 0],
    [900000, 'Warframes', 30, 6000],    // 30 × 200
    [1600000, 'Warframes', 40, 8000],   // 40 × 200
    [2000000, 'Warframes', 30, 6000],   // Capped at 30
    [900000, 'Vehicles', 30, 6000],     // K-Drives: 30 × 200
    // Weapon-type (100 per rank)
    [450000, 'Primary', 30, 3000],      // 30 × 100
    [800000, 'Primary', 40, 4000],      // 40 × 100
  ])('%d XP in %s (max %d) = %d contribution', (xp, category, maxRank, expected) => {
    expect(getMasteryContribution(xp, category, maxRank)).toBe(expected)
  })
})

describe('getMRThreshold', () => {
  it.each([
    // MR 1-30: 2500 × mr²
    [0, 0],
    [1, 2500],
    [10, 250000],
    [30, 2250000],
    // Legendary ranks (31+): base + (mr - 30) × 147,500
    [31, 2397500],
    [32, 2545000],
    [35, 2987500],
  ])('MR %d = %d XP threshold', (mr, expected) => {
    expect(getMRThreshold(mr)).toBe(expected)
  })
})

describe('intrinsicsToXP', () => {
  it.each([
    [0, 0],
    [1, 1500],
    [10, 15000],
    [100, 150000],
  ])('%d levels = %d XP', (levels, expected) => {
    expect(intrinsicsToXP(levels)).toBe(expected)
  })
})

describe('calculateMR', () => {
  it('returns MR 0 for 0 XP', () => {
    const result = calculateMR(0)
    expect(result).toMatchObject({ rank: 0, current: 0, next: 2500 })
  })

  it('returns correct MR and progress at midpoint', () => {
    // Midpoint between MR 10 (250,000) and MR 11 (302,500)
    const midpoint = 250000 + (302500 - 250000) / 2
    const result = calculateMR(midpoint)
    expect(result.rank).toBe(10)
    expect(result.current).toBe(250000)
    expect(result.next).toBe(302500)
    expect(result.progress).toBeCloseTo(50, 0)
  })

  it('handles MR 30 threshold', () => {
    expect(calculateMR(2250000).rank).toBe(30)
  })

  it('handles legendary ranks', () => {
    expect(calculateMR(2300000).rank).toBe(30) // Still 30 until 2,397,500
    expect(calculateMR(2397500).rank).toBe(31) // L1

    // Midpoint between L1 and L2
    const midpoint = 2397500 + 147500 / 2
    const result = calculateMR(midpoint)
    expect(result.rank).toBe(31)
    expect(result.progress).toBeCloseTo(50, 0)
  })

  it('handles very large XP values', () => {
    expect(calculateMR(10000000).rank).toBeGreaterThan(50)
  })
})
