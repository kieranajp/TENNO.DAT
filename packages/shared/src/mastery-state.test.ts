import { describe, it, expect } from 'vitest'
import { MasteryState } from './mastery-state'

describe('MasteryState', () => {
  describe('static instances', () => {
    it('defines all three states', () => {
      expect(MasteryState.Unmastered).toBeDefined()
      expect(MasteryState.Mastered30).toBeDefined()
      expect(MasteryState.Mastered40).toBeDefined()
    })

    it('has correct IDs', () => {
      expect(MasteryState.Unmastered.id).toBe('unmastered')
      expect(MasteryState.Mastered30.id).toBe('mastered_30')
      expect(MasteryState.Mastered40.id).toBe('mastered_40')
    })

    it('has correct labels', () => {
      expect(MasteryState.Unmastered.label).toBe('Unmastered')
      expect(MasteryState.Mastered30.label).toBe('Mastered')
      expect(MasteryState.Mastered40.label).toBe("Forma'd")
    })

    it('has correct isMastered flag', () => {
      expect(MasteryState.Unmastered.isMastered).toBe(false)
      expect(MasteryState.Mastered30.isMastered).toBe(true)
      expect(MasteryState.Mastered40.isMastered).toBe(true)
    })

    it('has correct CSS classes', () => {
      expect(MasteryState.Unmastered.cssClass).toBe('unmastered')
      expect(MasteryState.Mastered30.cssClass).toBe('mastered')
      expect(MasteryState.Mastered40.cssClass).toBe('mastered-full')
    })
  })

  describe('all', () => {
    it('returns all three states', () => {
      const states = MasteryState.all()
      expect(states).toHaveLength(3)
      expect(states).toContain(MasteryState.Unmastered)
      expect(states).toContain(MasteryState.Mastered30)
      expect(states).toContain(MasteryState.Mastered40)
    })
  })

  describe('fromId', () => {
    it.each([
      ['unmastered', MasteryState.Unmastered],
      ['mastered_30', MasteryState.Mastered30],
      ['mastered_40', MasteryState.Mastered40],
    ])('returns %s state for id "%s"', (id, expected) => {
      expect(MasteryState.fromId(id)).toBe(expected)
    })

    it('returns null for unknown id', () => {
      expect(MasteryState.fromId('unknown')).toBe(null)
      expect(MasteryState.fromId('')).toBe(null)
    })
  })

  describe('fromRank', () => {
    it('returns Unmastered for rank < 30', () => {
      expect(MasteryState.fromRank(0, 30)).toBe(MasteryState.Unmastered)
      expect(MasteryState.fromRank(15, 30)).toBe(MasteryState.Unmastered)
      expect(MasteryState.fromRank(29, 30)).toBe(MasteryState.Unmastered)
    })

    it('returns Mastered30 for rank >= 30 on standard items', () => {
      expect(MasteryState.fromRank(30, 30)).toBe(MasteryState.Mastered30)
      expect(MasteryState.fromRank(30, 40)).toBe(MasteryState.Mastered30)
      expect(MasteryState.fromRank(39, 40)).toBe(MasteryState.Mastered30)
    })

    it('returns Mastered40 for rank >= 40 on items with maxRank > 30', () => {
      expect(MasteryState.fromRank(40, 40)).toBe(MasteryState.Mastered40)
    })

    it('returns Mastered30 for rank 40 on standard maxRank 30 items', () => {
      // Edge case: rank 40 on maxRank 30 item (shouldn't happen but testing logic)
      expect(MasteryState.fromRank(40, 30)).toBe(MasteryState.Mastered30)
    })
  })

  describe('isFullyMastered', () => {
    describe('for maxRank 30 items', () => {
      it('returns false for Unmastered', () => {
        expect(MasteryState.Unmastered.isFullyMastered(30)).toBe(false)
      })

      it('returns true for Mastered30', () => {
        expect(MasteryState.Mastered30.isFullyMastered(30)).toBe(true)
      })

      it('returns true for Mastered40', () => {
        expect(MasteryState.Mastered40.isFullyMastered(30)).toBe(true)
      })
    })

    describe('for maxRank 40 items (Kuva/Tenet)', () => {
      it('returns false for Unmastered', () => {
        expect(MasteryState.Unmastered.isFullyMastered(40)).toBe(false)
      })

      it('returns false for Mastered30 (only rank 30, not 40)', () => {
        expect(MasteryState.Mastered30.isFullyMastered(40)).toBe(false)
      })

      it('returns true for Mastered40', () => {
        expect(MasteryState.Mastered40.isFullyMastered(40)).toBe(true)
      })
    })
  })

  describe('toJSON', () => {
    it('serializes to id string', () => {
      expect(MasteryState.Unmastered.toJSON()).toBe('unmastered')
      expect(MasteryState.Mastered30.toJSON()).toBe('mastered_30')
      expect(MasteryState.Mastered40.toJSON()).toBe('mastered_40')
    })
  })

  describe('toString', () => {
    it('returns id string', () => {
      expect(MasteryState.Unmastered.toString()).toBe('unmastered')
      expect(MasteryState.Mastered30.toString()).toBe('mastered_30')
      expect(MasteryState.Mastered40.toString()).toBe('mastered_40')
    })
  })
})
