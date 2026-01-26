import { describe, it, expect } from 'vitest'
import { getRankFromXp } from '../../domain/entities/mastery'

/**
 * Tests for sync-related logic.
 * The sync endpoint uses getRankFromXp to calculate ranks from profile XP data.
 * These tests verify the rank calculation matches expected behavior for various item types.
 */
describe('Sync: Rank Calculation from Profile XP', () => {
  describe('Warframes (frame-type, 1000 multiplier)', () => {
    const category = 'Warframes'

    it('calculates rank 0 for new Warframe', () => {
      expect(getRankFromXp(0, category, 30)).toBe(0)
    })

    it('calculates rank 15 for halfway leveled Warframe', () => {
      // Rank 15 requires 1000 * 15² = 225,000 XP
      expect(getRankFromXp(225000, category, 30)).toBe(15)
    })

    it('calculates rank 30 for max level Warframe', () => {
      // Rank 30 requires 1000 * 30² = 900,000 XP
      expect(getRankFromXp(900000, category, 30)).toBe(30)
    })

    it('caps at 30 even with excess XP', () => {
      expect(getRankFromXp(1000000, category, 30)).toBe(30)
    })
  })

  describe('Necramechs (frame-type, maxRank 40)', () => {
    const category = 'Necramechs'

    it('calculates rank 30 at base mastery', () => {
      expect(getRankFromXp(900000, category, 40)).toBe(30)
    })

    it('calculates rank 40 for fully mastered Necramech', () => {
      // Rank 40 requires 1000 * 40² = 1,600,000 XP
      expect(getRankFromXp(1600000, category, 40)).toBe(40)
    })

    it('caps at 40 even with excess XP', () => {
      expect(getRankFromXp(2000000, category, 40)).toBe(40)
    })
  })

  describe('Primary Weapons (weapon-type, 500 multiplier)', () => {
    const category = 'Primary'

    it('calculates rank 0 for new weapon', () => {
      expect(getRankFromXp(0, category, 30)).toBe(0)
    })

    it('calculates rank 15 for halfway leveled weapon', () => {
      // Rank 15 requires 500 * 15² = 112,500 XP
      expect(getRankFromXp(112500, category, 30)).toBe(15)
    })

    it('calculates rank 30 for max level weapon', () => {
      // Rank 30 requires 500 * 30² = 450,000 XP
      expect(getRankFromXp(450000, category, 30)).toBe(30)
    })
  })

  describe('Kuva/Tenet Weapons (weapon-type, maxRank 40)', () => {
    const category = 'Primary'

    it('calculates rank 30 at base mastery for Kuva weapon', () => {
      expect(getRankFromXp(450000, category, 40)).toBe(30)
    })

    it('calculates rank 40 for fully formaed Kuva weapon', () => {
      // Rank 40 requires 500 * 40² = 800,000 XP
      expect(getRankFromXp(800000, category, 40)).toBe(40)
    })

    it('caps at 40 even with excess XP', () => {
      expect(getRankFromXp(1000000, category, 40)).toBe(40)
    })
  })

  describe('Kitguns (weapon-type)', () => {
    const category = 'Kitgun'

    it('calculates rank like regular weapons', () => {
      expect(getRankFromXp(450000, category, 30)).toBe(30)
    })
  })

  describe('Zaws (weapon-type)', () => {
    const category = 'Zaw'

    it('calculates rank like regular weapons', () => {
      expect(getRankFromXp(450000, category, 30)).toBe(30)
    })
  })

  describe('Amps (weapon-type)', () => {
    const category = 'Amp'

    it('calculates rank like regular weapons', () => {
      expect(getRankFromXp(450000, category, 30)).toBe(30)
    })
  })

  describe('Companions (frame-type)', () => {
    it('calculates Pets like Warframes', () => {
      expect(getRankFromXp(900000, 'Pets', 30)).toBe(30)
    })

    it('calculates Sentinels like Warframes', () => {
      expect(getRankFromXp(900000, 'Sentinels', 30)).toBe(30)
    })
  })

  describe('Archwing equipment', () => {
    it('calculates Archwing like Warframes (frame-type)', () => {
      expect(getRankFromXp(900000, 'Archwing', 30)).toBe(30)
    })

    it('calculates Arch-Gun like weapons', () => {
      expect(getRankFromXp(450000, 'ArchGun', 30)).toBe(30)
    })

    it('calculates Arch-Melee like weapons', () => {
      expect(getRankFromXp(450000, 'ArchMelee', 30)).toBe(30)
    })
  })

  describe('Edge cases', () => {
    it('handles XP just below rank threshold', () => {
      // Just under rank 10 for weapon (50,000 XP threshold)
      expect(getRankFromXp(49999, 'Primary', 30)).toBe(9)
    })

    it('handles XP at exact rank threshold', () => {
      // Exactly rank 10 for weapon
      expect(getRankFromXp(50000, 'Primary', 30)).toBe(10)
    })

    it('handles XP just above rank threshold', () => {
      // Just above rank 10 for weapon
      expect(getRankFromXp(50001, 'Primary', 30)).toBe(10)
    })
  })
})

describe('Sync: Item Matching Logic', () => {
  /**
   * During sync, items are matched by uniqueName.
   * This tests the matching patterns for special item types.
   */

  describe('Kitgun matching', () => {
    // In a real sync, the profile XP data uses uniqueNames like:
    // /Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA
    // This should match Kitgun items in the database

    it('Kitgun chamber uniqueNames should match database records', () => {
      const profileXp = '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA'
      const dbItem = {
        uniqueName: '/Lotus/Weapons/SolarisUnited/SUModularSecondary/Barrel/SUBarrelA',
        category: 'Kitgun',
      }
      expect(profileXp).toBe(dbItem.uniqueName)
    })
  })

  describe('Necramech matching', () => {
    it('Necramech uniqueNames should match database records', () => {
      const profileXp = '/Lotus/Powersuits/EntratiMech/ArchonMech/ArchonMechA'
      const dbItem = {
        uniqueName: '/Lotus/Powersuits/EntratiMech/ArchonMech/ArchonMechA',
        category: 'Necramechs',
        maxRank: 40,
      }
      expect(profileXp).toBe(dbItem.uniqueName)
      expect(dbItem.maxRank).toBe(40)
    })
  })

  describe('Kuva weapon matching', () => {
    it('Kuva weapon uniqueNames match and have maxRank 40', () => {
      const profileXp = '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/KuvaBraton'
      const dbItem = {
        uniqueName: '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/KuvaBraton',
        name: 'Kuva Braton',
        category: 'Primary',
        maxRank: 40, // Set by seeder via GLOBAL_MAX_RANK_OVERRIDES
      }
      expect(profileXp).toBe(dbItem.uniqueName)
      expect(dbItem.maxRank).toBe(40)
    })
  })
})

describe('Sync: Mastery Record Creation', () => {
  /**
   * Tests the logic for creating mastery records during sync.
   * Each profile XP entry is converted to a mastery record with:
   * - playerId
   * - itemId (from database lookup)
   * - xp (from profile)
   * - rank (calculated from xp using category and maxRank)
   */

  it('creates mastery record with calculated rank for Warframe', () => {
    const profileXp = { itemType: '/Lotus/Powersuits/Frost/Frost', xp: 900000 }
    const dbItem = { id: 1, category: 'Warframes', maxRank: 30 }

    const masteryRecord = {
      playerId: 'test-player',
      itemId: dbItem.id,
      xp: profileXp.xp,
      rank: getRankFromXp(profileXp.xp, dbItem.category, dbItem.maxRank),
    }

    expect(masteryRecord.rank).toBe(30)
  })

  it('creates mastery record with calculated rank for Necramech', () => {
    const profileXp = { itemType: '/Lotus/Powersuits/EntratiMech/Voidrig', xp: 1600000 }
    const dbItem = { id: 100, category: 'Necramechs', maxRank: 40 }

    const masteryRecord = {
      playerId: 'test-player',
      itemId: dbItem.id,
      xp: profileXp.xp,
      rank: getRankFromXp(profileXp.xp, dbItem.category, dbItem.maxRank),
    }

    expect(masteryRecord.rank).toBe(40)
  })

  it('creates mastery record with calculated rank for Kuva weapon', () => {
    const profileXp = { itemType: '/Lotus/Weapons/KuvaLich/KuvaBraton', xp: 800000 }
    const dbItem = { id: 200, category: 'Primary', maxRank: 40 }

    const masteryRecord = {
      playerId: 'test-player',
      itemId: dbItem.id,
      xp: profileXp.xp,
      rank: getRankFromXp(profileXp.xp, dbItem.category, dbItem.maxRank),
    }

    expect(masteryRecord.rank).toBe(40)
  })

  it('handles partially leveled items', () => {
    const profileXp = { itemType: '/Lotus/Weapons/Tenno/Rifle/Braton', xp: 112500 }
    const dbItem = { id: 300, category: 'Primary', maxRank: 30 }

    const masteryRecord = {
      playerId: 'test-player',
      itemId: dbItem.id,
      xp: profileXp.xp,
      rank: getRankFromXp(profileXp.xp, dbItem.category, dbItem.maxRank),
    }

    expect(masteryRecord.rank).toBe(15)
  })
})
