import { describe, it, expect } from 'vitest'
import { Platform } from './platform'

describe('Platform', () => {
  describe('static instances', () => {
    it('defines all four platforms', () => {
      expect(Platform.PC).toBeDefined()
      expect(Platform.PlayStation).toBeDefined()
      expect(Platform.Xbox).toBeDefined()
      expect(Platform.Switch).toBeDefined()
    })

    it('has correct IDs', () => {
      expect(Platform.PC.id).toBe('pc')
      expect(Platform.PlayStation.id).toBe('ps')
      expect(Platform.Xbox.id).toBe('xbox')
      expect(Platform.Switch.id).toBe('switch')
    })

    it('has correct display names', () => {
      expect(Platform.PC.displayName).toBe('PC')
      expect(Platform.PlayStation.displayName).toBe('PlayStation')
      expect(Platform.Xbox.displayName).toBe('Xbox')
      expect(Platform.Switch.displayName).toBe('Nintendo Switch')
    })

    it('has correct API base URLs', () => {
      expect(Platform.PC.apiBaseUrl).toBe('https://api.warframe.com/cdn')
      expect(Platform.PlayStation.apiBaseUrl).toBe('https://content-ps4.warframe.com/dynamic')
      expect(Platform.Xbox.apiBaseUrl).toBe('https://content-xb1.warframe.com/dynamic')
      expect(Platform.Switch.apiBaseUrl).toBe('https://content-swi.warframe.com/dynamic')
    })
  })

  describe('all', () => {
    it('returns all four platforms', () => {
      const platforms = Platform.all()
      expect(platforms).toHaveLength(4)
      expect(platforms).toContain(Platform.PC)
      expect(platforms).toContain(Platform.PlayStation)
      expect(platforms).toContain(Platform.Xbox)
      expect(platforms).toContain(Platform.Switch)
    })
  })

  describe('fromId', () => {
    it.each([
      ['pc', Platform.PC],
      ['ps', Platform.PlayStation],
      ['xbox', Platform.Xbox],
      ['switch', Platform.Switch],
    ])('returns %s platform for id "%s"', (id, expected) => {
      expect(Platform.fromId(id)).toBe(expected)
    })

    it('returns null for unknown id', () => {
      expect(Platform.fromId('unknown')).toBe(null)
      expect(Platform.fromId('')).toBe(null)
    })
  })

  describe('profileUrl', () => {
    it('builds correct URL for PC', () => {
      expect(Platform.PC.profileUrl('TestPlayer')).toBe(
        'https://api.warframe.com/cdn/getProfileViewingData.php?playerId=TestPlayer'
      )
    })

    it('builds correct URL for PlayStation', () => {
      expect(Platform.PlayStation.profileUrl('TestPlayer')).toBe(
        'https://content-ps4.warframe.com/dynamic/getProfileViewingData.php?playerId=TestPlayer'
      )
    })

    it('builds correct URL for Xbox', () => {
      expect(Platform.Xbox.profileUrl('TestPlayer')).toBe(
        'https://content-xb1.warframe.com/dynamic/getProfileViewingData.php?playerId=TestPlayer'
      )
    })

    it('builds correct URL for Switch', () => {
      expect(Platform.Switch.profileUrl('TestPlayer')).toBe(
        'https://content-swi.warframe.com/dynamic/getProfileViewingData.php?playerId=TestPlayer'
      )
    })
  })

  describe('toJSON', () => {
    it('serializes to id and displayName', () => {
      expect(Platform.PC.toJSON()).toEqual({ id: 'pc', displayName: 'PC' })
      expect(Platform.PlayStation.toJSON()).toEqual({ id: 'ps', displayName: 'PlayStation' })
      expect(Platform.Xbox.toJSON()).toEqual({ id: 'xbox', displayName: 'Xbox' })
      expect(Platform.Switch.toJSON()).toEqual({ id: 'switch', displayName: 'Nintendo Switch' })
    })
  })
})
