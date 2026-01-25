import { describe, it, expect } from 'vitest'
import {
  getMasteredXp,
  getRank30Xp,
  getRankFromXp,
  getMasteryStateFromRank,
  getMasteryState,
  getMasteryContribution,
  getMRThreshold,
  calculateMR,
  intrinsicsToXP,
} from './mastery'

describe('getMasteredXp', () => {
  describe('for frame-type categories (1000 multiplier)', () => {
    it('calculates rank 30 Warframe XP', () => {
      expect(getMasteredXp('Warframes', 30)).toBe(900000) // 1000 × 30²
    })

    it('calculates rank 40 Warframe XP', () => {
      expect(getMasteredXp('Warframes', 40)).toBe(1600000) // 1000 × 40²
    })

    it('calculates Pets XP (frame-type)', () => {
      expect(getMasteredXp('Pets', 30)).toBe(900000)
    })

    it('calculates Necramechs XP (frame-type)', () => {
      expect(getMasteredXp('Necramechs', 40)).toBe(1600000)
    })
  })

  describe('for weapon-type categories (500 multiplier)', () => {
    it('calculates rank 30 Primary XP', () => {
      expect(getMasteredXp('Primary', 30)).toBe(450000) // 500 × 30²
    })

    it('calculates rank 40 Primary XP (Kuva/Tenet)', () => {
      expect(getMasteredXp('Primary', 40)).toBe(800000) // 500 × 40²
    })

    it('calculates Melee XP', () => {
      expect(getMasteredXp('Melee', 30)).toBe(450000)
    })

    it('calculates Secondary XP', () => {
      expect(getMasteredXp('Secondary', 30)).toBe(450000)
    })
  })
})

describe('getRank30Xp', () => {
  it('returns 900,000 for frame-type categories', () => {
    expect(getRank30Xp('Warframes')).toBe(900000)
    expect(getRank30Xp('Pets')).toBe(900000)
    expect(getRank30Xp('Sentinels')).toBe(900000)
  })

  it('returns 450,000 for weapon-type categories', () => {
    expect(getRank30Xp('Primary')).toBe(450000)
    expect(getRank30Xp('Secondary')).toBe(450000)
    expect(getRank30Xp('Melee')).toBe(450000)
  })
})

describe('getRankFromXp', () => {
  describe('for frame-type categories', () => {
    it('returns 0 for 0 XP', () => {
      expect(getRankFromXp(0, 'Warframes', 30)).toBe(0)
    })

    it('returns correct rank for partial XP', () => {
      // rank = floor(sqrt(xp / 1000))
      expect(getRankFromXp(10000, 'Warframes', 30)).toBe(3) // sqrt(10) = 3.16
      expect(getRankFromXp(100000, 'Warframes', 30)).toBe(10) // sqrt(100) = 10
      expect(getRankFromXp(250000, 'Warframes', 30)).toBe(15) // sqrt(250) = 15.8
    })

    it('caps at maxRank 30', () => {
      expect(getRankFromXp(900000, 'Warframes', 30)).toBe(30)
      expect(getRankFromXp(1000000, 'Warframes', 30)).toBe(30)
    })

    it('caps at maxRank 40', () => {
      expect(getRankFromXp(1600000, 'Warframes', 40)).toBe(40)
      expect(getRankFromXp(2000000, 'Warframes', 40)).toBe(40)
    })
  })

  describe('for weapon-type categories', () => {
    it('returns correct rank for partial XP', () => {
      // rank = floor(sqrt(xp / 500))
      expect(getRankFromXp(5000, 'Primary', 30)).toBe(3) // sqrt(10) = 3.16
      expect(getRankFromXp(50000, 'Primary', 30)).toBe(10) // sqrt(100) = 10
    })

    it('caps at maxRank 30', () => {
      expect(getRankFromXp(450000, 'Primary', 30)).toBe(30)
      expect(getRankFromXp(500000, 'Primary', 30)).toBe(30)
    })

    it('caps at maxRank 40', () => {
      expect(getRankFromXp(800000, 'Primary', 40)).toBe(40)
      expect(getRankFromXp(1000000, 'Primary', 40)).toBe(40)
    })
  })
})

describe('getMasteryStateFromRank', () => {
  describe('for maxRank 30 items', () => {
    it('returns unmastered for rank < 30', () => {
      expect(getMasteryStateFromRank(0, 30)).toBe('unmastered')
      expect(getMasteryStateFromRank(15, 30)).toBe('unmastered')
      expect(getMasteryStateFromRank(29, 30)).toBe('unmastered')
    })

    it('returns mastered_30 for rank >= 30', () => {
      expect(getMasteryStateFromRank(30, 30)).toBe('mastered_30')
    })
  })

  describe('for maxRank 40 items', () => {
    it('returns unmastered for rank < 30', () => {
      expect(getMasteryStateFromRank(0, 40)).toBe('unmastered')
      expect(getMasteryStateFromRank(29, 40)).toBe('unmastered')
    })

    it('returns mastered_30 for rank 30-39', () => {
      expect(getMasteryStateFromRank(30, 40)).toBe('mastered_30')
      expect(getMasteryStateFromRank(35, 40)).toBe('mastered_30')
      expect(getMasteryStateFromRank(39, 40)).toBe('mastered_30')
    })

    it('returns mastered_40 for rank >= 40', () => {
      expect(getMasteryStateFromRank(40, 40)).toBe('mastered_40')
    })
  })
})

describe('getMasteryState', () => {
  it('derives state from XP via rank calculation', () => {
    // Frame at rank 30 XP
    expect(getMasteryState(900000, 'Warframes', 30)).toBe('mastered_30')
    // Frame below rank 30 XP
    expect(getMasteryState(800000, 'Warframes', 30)).toBe('unmastered')
    // Weapon at rank 40 XP
    expect(getMasteryState(800000, 'Primary', 40)).toBe('mastered_40')
  })
})

describe('getMasteryContribution', () => {
  describe('for frame-type categories (200 per rank)', () => {
    it('returns 0 for 0 XP', () => {
      expect(getMasteryContribution(0, 'Warframes', 30)).toBe(0)
    })

    it('returns correct contribution for rank 30', () => {
      expect(getMasteryContribution(900000, 'Warframes', 30)).toBe(6000) // 30 × 200
    })

    it('returns correct contribution for rank 40', () => {
      expect(getMasteryContribution(1600000, 'Warframes', 40)).toBe(8000) // 40 × 200
    })

    it('returns contribution capped at maxRank', () => {
      expect(getMasteryContribution(2000000, 'Warframes', 30)).toBe(6000) // capped at 30
    })
  })

  describe('for weapon-type categories (100 per rank)', () => {
    it('returns correct contribution for rank 30', () => {
      expect(getMasteryContribution(450000, 'Primary', 30)).toBe(3000) // 30 × 100
    })

    it('returns correct contribution for rank 40', () => {
      expect(getMasteryContribution(800000, 'Primary', 40)).toBe(4000) // 40 × 100
    })
  })
})

describe('getMRThreshold', () => {
  describe('for MR 1-30 (2500 × mr²)', () => {
    it('returns 0 for MR 0', () => {
      expect(getMRThreshold(0)).toBe(0)
    })

    it('returns correct threshold for MR 1', () => {
      expect(getMRThreshold(1)).toBe(2500)
    })

    it('returns correct threshold for MR 10', () => {
      expect(getMRThreshold(10)).toBe(250000) // 2500 × 100
    })

    it('returns correct threshold for MR 30', () => {
      expect(getMRThreshold(30)).toBe(2250000) // 2500 × 900
    })
  })

  describe('for Legendary ranks (31+)', () => {
    it('returns correct threshold for L1 (MR 31)', () => {
      expect(getMRThreshold(31)).toBe(2397500) // 2,250,000 + 147,500
    })

    it('returns correct threshold for L2 (MR 32)', () => {
      expect(getMRThreshold(32)).toBe(2545000) // 2,250,000 + 2 × 147,500
    })

    it('returns correct threshold for L5 (MR 35)', () => {
      expect(getMRThreshold(35)).toBe(2987500) // 2,250,000 + 5 × 147,500
    })
  })
})

describe('intrinsicsToXP', () => {
  it('returns 0 for 0 levels', () => {
    expect(intrinsicsToXP(0)).toBe(0)
  })

  it('returns 1500 per level', () => {
    expect(intrinsicsToXP(1)).toBe(1500)
    expect(intrinsicsToXP(10)).toBe(15000)
    expect(intrinsicsToXP(100)).toBe(150000)
  })
})

describe('calculateMR', () => {
  describe('for regular ranks (0-30)', () => {
    it('returns MR 0 for 0 XP', () => {
      const result = calculateMR(0)
      expect(result.rank).toBe(0)
      expect(result.current).toBe(0)
      expect(result.next).toBe(2500)
    })

    it('returns correct MR and progress', () => {
      // XP at halfway between MR 10 and MR 11
      // MR 10 threshold: 250,000
      // MR 11 threshold: 302,500
      const midpoint = 250000 + (302500 - 250000) / 2 // 276,250
      const result = calculateMR(midpoint)
      expect(result.rank).toBe(10)
      expect(result.current).toBe(250000)
      expect(result.next).toBe(302500)
      expect(result.progress).toBeCloseTo(50, 0)
    })

    it('returns MR 30 at threshold', () => {
      const result = calculateMR(2250000)
      expect(result.rank).toBe(30)
    })
  })

  describe('for legendary ranks (31+)', () => {
    it('returns L1 (MR 31) for XP above MR 30', () => {
      const result = calculateMR(2300000)
      expect(result.rank).toBe(30) // Still 30 until 2,397,500
    })

    it('returns L1 (MR 31) at threshold', () => {
      const result = calculateMR(2397500)
      expect(result.rank).toBe(31)
    })

    it('returns correct progress for legendary ranks', () => {
      // Midpoint between L1 and L2
      const midpoint = 2397500 + 147500 / 2 // 2,471,250
      const result = calculateMR(midpoint)
      expect(result.rank).toBe(31)
      expect(result.progress).toBeCloseTo(50, 0)
    })
  })

  it('handles very large XP values', () => {
    // Very high legendary rank
    const result = calculateMR(10000000)
    expect(result.rank).toBeGreaterThan(50)
  })
})
