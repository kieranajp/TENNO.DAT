import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Platform } from '@warframe-tracker/shared'
import { DeProfileApi } from './de-profile-api'

/**
 * Tests for the DE Profile API extraction logic.
 * These tests verify that profile data is correctly parsed from DE's API response format.
 */
describe('DeProfileApi', () => {
  let api: DeProfileApi
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    api = new DeProfileApi()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetch', () => {
    it('uses correct URL for PC platform', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ LoadOutInventory: { XPInfo: [] } }] }),
      })

      await api.fetch('TestPlayer', Platform.PC)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.warframe.com/cdn/getProfileViewingData.php?playerId=TestPlayer'
      )
    })

    it('uses correct URL for PS platform', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ LoadOutInventory: { XPInfo: [] } }] }),
      })

      await api.fetch('TestPlayer', Platform.PlayStation)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://content-ps4.warframe.com/dynamic/getProfileViewingData.php?playerId=TestPlayer'
      )
    })

    it('uses correct URL for Xbox platform', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ LoadOutInventory: { XPInfo: [] } }] }),
      })

      await api.fetch('TestPlayer', Platform.Xbox)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://content-xb1.warframe.com/dynamic/getProfileViewingData.php?playerId=TestPlayer'
      )
    })

    it('uses correct URL for Switch platform', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ LoadOutInventory: { XPInfo: [] } }] }),
      })

      await api.fetch('TestPlayer', Platform.Switch)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://content-swi.warframe.com/dynamic/getProfileViewingData.php?playerId=TestPlayer'
      )
    })

    it('throws on 403 response with rate limit message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      })

      await expect(api.fetch('TestPlayer', Platform.PC)).rejects.toThrow('rate limited')
    })

    it('throws on 409 response with private profile message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: () => Promise.resolve('Conflict'),
      })

      await expect(api.fetch('TestPlayer', Platform.PC)).rejects.toThrow('Profile is private')
    })
  })

  describe('XP data extraction', () => {
    it('extracts XP components from LoadOutInventory.XPInfo', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: {
            XPInfo: [
              { ItemType: '/Lotus/Powersuits/Frost/Frost', XP: 900000 },
              { ItemType: '/Lotus/Weapons/Tenno/Rifle/Braton', XP: 450000 },
            ],
          },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.xpComponents).toHaveLength(2)
      expect(result.xpComponents[0]).toEqual({
        itemType: '/Lotus/Powersuits/Frost/Frost',
        xp: 900000,
      })
      expect(result.xpComponents[1]).toEqual({
        itemType: '/Lotus/Weapons/Tenno/Rifle/Braton',
        xp: 450000,
      })
    })

    it('handles empty XPInfo array', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.xpComponents).toEqual([])
    })

    it('handles missing XPInfo', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: {},
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.xpComponents).toEqual([])
    })
  })

  describe('Loadout extraction', () => {
    it('extracts loadout from LoadOutInventory', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: {
            XPInfo: [],
            Suits: [{ ItemType: '/Lotus/Powersuits/Frost/FrostPrime' }],
            LongGuns: [{ ItemType: '/Lotus/Weapons/Tenno/Rifle/Soma' }],
            Pistols: [{ ItemType: '/Lotus/Weapons/Tenno/Pistol/Lex' }],
            Melee: [{ ItemType: '/Lotus/Weapons/Tenno/Melee/Nikana' }],
          },
          LoadOutPreset: {
            FocusSchool: 'AP_POWER',
          },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.loadout.warframe).toBe('/Lotus/Powersuits/Frost/FrostPrime')
      expect(result.loadout.primary).toBe('/Lotus/Weapons/Tenno/Rifle/Soma')
      expect(result.loadout.secondary).toBe('/Lotus/Weapons/Tenno/Pistol/Lex')
      expect(result.loadout.melee).toBe('/Lotus/Weapons/Tenno/Melee/Nikana')
    })

    it('handles missing loadout slots', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: {
            XPInfo: [],
            Suits: [{ ItemType: '/Lotus/Powersuits/Frost/Frost' }],
            // No weapons equipped
          },
          LoadOutPreset: {},
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.loadout.warframe).toBe('/Lotus/Powersuits/Frost/Frost')
      expect(result.loadout.primary).toBeNull()
      expect(result.loadout.secondary).toBeNull()
      expect(result.loadout.melee).toBeNull()
    })
  })

  describe('Focus school mapping', () => {
    const focusSchoolTests = [
      { code: 'AP_ATTACK', name: 'Madurai' },
      { code: 'AP_DEFENSE', name: 'Vazarin' },
      { code: 'AP_TACTIC', name: 'Naramon' },
      { code: 'AP_POWER', name: 'Zenurik' },
      { code: 'AP_WARD', name: 'Unairu' },
    ]

    focusSchoolTests.forEach(({ code, name }) => {
      it(`maps ${code} to ${name}`, async () => {
        const mockResponse = {
          Results: [{
            LoadOutInventory: { XPInfo: [] },
            LoadOutPreset: { FocusSchool: code },
          }],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })

        const result = await api.fetch('TestPlayer', Platform.PC)
        expect(result.loadout.focusSchool).toBe(name)
      })
    })

    it('handles null focus school', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          LoadOutPreset: {},
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.loadout.focusSchool).toBeNull()
    })

    it('passes through unknown focus school codes', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          LoadOutPreset: { FocusSchool: 'UNKNOWN_SCHOOL' },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.loadout.focusSchool).toBe('UNKNOWN_SCHOOL')
    })
  })

  describe('Intrinsics extraction', () => {
    it('extracts Railjack intrinsics from PlayerSkills', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          PlayerSkills: {
            LPS_TACTICAL: 10,
            LPS_PILOTING: 10,
            LPS_GUNNERY: 10,
            LPS_ENGINEERING: 10,
            LPS_COMMAND: 10,
          },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.intrinsics.railjack).toEqual({
        tactical: 10,
        piloting: 10,
        gunnery: 10,
        engineering: 10,
        command: 10,
        total: 50,
      })
    })

    it('extracts Drifter intrinsics from PlayerSkills', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          PlayerSkills: {
            LPS_DRIFT_RIDING: 10,
            LPS_DRIFT_COMBAT: 10,
            LPS_DRIFT_OPPORTUNITY: 10,
            LPS_DRIFT_ENDURANCE: 10,
          },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.intrinsics.drifter).toEqual({
        riding: 10,
        combat: 10,
        opportunity: 10,
        endurance: 10,
        total: 40,
      })
    })

    it('handles missing PlayerSkills', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.intrinsics.railjack.total).toBe(0)
      expect(result.intrinsics.drifter.total).toBe(0)
    })

    it('handles partial intrinsics', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          PlayerSkills: {
            LPS_TACTICAL: 5,
            LPS_PILOTING: 3,
            // Other skills not set
          },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.intrinsics.railjack).toEqual({
        tactical: 5,
        piloting: 3,
        gunnery: 0,
        engineering: 0,
        command: 0,
        total: 8,
      })
    })
  })

  describe('Mission completions extraction', () => {
    it('extracts mission completions from Missions array', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          Missions: [
            { Tag: 'SolNode1', Completes: 5 },
            { Tag: 'SolNode2', Completes: 10 },
            { Tag: 'EarthToVenusJunction', Completes: 1 },
          ],
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.missions).toHaveLength(3)
      expect(result.missions[0]).toEqual({ tag: 'SolNode1', completes: 5, tier: undefined })
      expect(result.missions[1]).toEqual({ tag: 'SolNode2', completes: 10, tier: undefined })
    })

    it('extracts Steel Path tier from missions', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          Missions: [
            { Tag: 'SolNode1', Completes: 5, Tier: 1 },  // Steel Path
            { Tag: 'SolNode2', Completes: 10 },          // Normal
          ],
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.missions[0].tier).toBe(1)
      expect(result.missions[1].tier).toBeUndefined()
    })

    it('handles missing Missions array', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.missions).toEqual([])
    })

    it('defaults completes to 0 if missing', async () => {
      const mockResponse = {
        Results: [{
          LoadOutInventory: { XPInfo: [] },
          Missions: [
            { Tag: 'SolNode1' },  // No Completes field
          ],
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.missions[0].completes).toBe(0)
    })
  })

  describe('Player info extraction', () => {
    it('extracts display name and player level', async () => {
      const mockResponse = {
        Results: [{
          DisplayName: 'TennoMaster2000',
          PlayerLevel: 35,
          LoadOutInventory: { XPInfo: [] },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)

      expect(result.displayName).toBe('TennoMaster2000')
      expect(result.playerLevel).toBe(35)
    })

    it('handles missing display name', async () => {
      const mockResponse = {
        Results: [{
          PlayerLevel: 10,
          LoadOutInventory: { XPInfo: [] },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.displayName).toBeNull()
    })

    it('handles missing player level', async () => {
      const mockResponse = {
        Results: [{
          DisplayName: 'TestPlayer',
          LoadOutInventory: { XPInfo: [] },
        }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await api.fetch('TestPlayer', Platform.PC)
      expect(result.playerLevel).toBe(0)
    })
  })
})
