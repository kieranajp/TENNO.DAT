import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { syncRoutes } from './sync'
import { createMockContainer, createMockAuthMiddleware, mockAuth } from '../../test-utils'
import type { Container } from '../../infrastructure/bootstrap/container'
import type { ProfileData } from '../../domain/ports/profile-api'

describe('Sync Routes', () => {
  let container: Container
  let app: Hono

  beforeEach(() => {
    container = createMockContainer()
    app = new Hono()
    app.use('*', createMockAuthMiddleware(mockAuth))
    app.route('/sync', syncRoutes(container))
  })

  describe('GET /sync/settings', () => {
    it('returns player settings', async () => {
      const mockSettings = {
        id: 1,
        userId: 1,
        playerId: 'test-player-id',
        platform: 'pc',
        displayName: 'TestPlayer',
        lastSyncAt: new Date('2024-01-15'),
        railjackIntrinsics: 50,
        drifterIntrinsics: 30,
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)

      const res = await app.request('/sync/settings')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.playerId).toBe('test-player-id')
      expect(body.platform).toBe('pc')
    })

    it('returns null when no settings configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/sync/settings')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toBeNull()
    })
  })

  describe('POST /sync/settings', () => {
    it('saves player settings with valid platform', async () => {
      const res = await app.request('/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'new-player', platform: 'pc' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(container.playerRepo.saveSettings).toHaveBeenCalledWith(
        mockAuth.userId,
        'new-player',
        expect.objectContaining({ id: 'pc' })
      )
    })

    it('saves settings for PlayStation platform', async () => {
      const res = await app.request('/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'ps-player', platform: 'ps' }),
      })

      expect(res.status).toBe(200)
      expect(container.playerRepo.saveSettings).toHaveBeenCalledWith(
        mockAuth.userId,
        'ps-player',
        expect.objectContaining({ id: 'ps' })
      )
    })

    it('returns 400 for invalid platform', async () => {
      const res = await app.request('/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: 'player', platform: 'invalid-platform' }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('Invalid platform')
    })
  })

  describe('POST /sync/profile', () => {
    const mockSettings = {
      id: 1,
      userId: 1,
      playerId: 'test-player',
      platform: 'pc',
      displayName: null,
      lastSyncAt: null,
      railjackIntrinsics: 0,
      drifterIntrinsics: 0,
    }

    const createMockProfile = (overrides: Partial<ProfileData> = {}): ProfileData => ({
      displayName: 'TestPlayer',
      playerLevel: 30,
      xpComponents: [],
      weaponStats: [],
      loadout: {
        warframe: null,
        primary: null,
        secondary: null,
        melee: null,
        focusSchool: null,
      },
      intrinsics: {
        railjack: { tactical: 0, piloting: 0, gunnery: 0, engineering: 0, command: 0, total: 0 },
        drifter: { riding: 0, combat: 0, opportunity: 0, endurance: 0, total: 0 },
      },
      missions: [],
      ...overrides,
    })

    beforeEach(() => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.itemRepo.findAllAsMap).mockResolvedValue(new Map())
      vi.mocked(container.nodeRepo.findAllAsMap).mockResolvedValue(new Map())
    })

    it('returns 400 when no player configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/sync/profile', { method: 'POST' })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('No player configured')
    })

    it('returns 400 when playerId is missing', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue({
        ...mockSettings,
        playerId: null,
      })

      const res = await app.request('/sync/profile', { method: 'POST' })

      expect(res.status).toBe(400)
    })

    it('fetches profile from DE API with correct platform', async () => {
      vi.mocked(container.profileApi.fetch).mockResolvedValue(createMockProfile())

      await app.request('/sync/profile', { method: 'POST' })

      expect(container.profileApi.fetch).toHaveBeenCalledWith(
        'test-player',
        expect.objectContaining({ id: 'pc' })
      )
    })

    it('updates display name from profile', async () => {
      vi.mocked(container.profileApi.fetch).mockResolvedValue(
        createMockProfile({ displayName: 'NewDisplayName' })
      )

      await app.request('/sync/profile', { method: 'POST' })

      expect(container.playerRepo.updateDisplayName).toHaveBeenCalledWith(
        mockAuth.userId,
        'NewDisplayName'
      )
    })

    it('syncs XP data and creates mastery records', async () => {
      const itemsMap = new Map([
        ['/Lotus/Powersuits/Frost/Frost', { id: 1, category: 'Warframes', maxRank: 30 }],
        ['/Lotus/Weapons/Tenno/Rifle/Braton', { id: 2, category: 'Primary', maxRank: 30 }],
      ])
      vi.mocked(container.itemRepo.findAllAsMap).mockResolvedValue(itemsMap as any)

      // XP formula: rank = sqrt(xp / multiplier)
      // Warframes (multiplier 1000): 900000 XP → rank 30
      // Weapons (multiplier 500): 112500 XP → rank 15 (sqrt(112500/500) = sqrt(225) = 15)
      vi.mocked(container.profileApi.fetch).mockResolvedValue(
        createMockProfile({
          xpComponents: [
            { itemType: '/Lotus/Powersuits/Frost/Frost', xp: 900000 },
            { itemType: '/Lotus/Weapons/Tenno/Rifle/Braton', xp: 112500 },
            { itemType: '/Lotus/Unknown/Item', xp: 100000 }, // Should be filtered out
          ],
        })
      )

      const res = await app.request('/sync/profile', { method: 'POST' })

      expect(res.status).toBe(200)
      expect(container.masteryRepo.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            playerId: 'test-player',
            itemId: 1,
            xp: 900000,
            rank: 30,
          }),
          expect.objectContaining({
            playerId: 'test-player',
            itemId: 2,
            xp: 112500,
            rank: 15,
          }),
        ])
      )
    })

    it('includes weapon stats in mastery records', async () => {
      const itemsMap = new Map([
        ['/Lotus/Weapons/Tenno/Rifle/Braton', { id: 1, category: 'Primary', maxRank: 30 }],
      ])
      vi.mocked(container.itemRepo.findAllAsMap).mockResolvedValue(itemsMap as any)

      vi.mocked(container.profileApi.fetch).mockResolvedValue(
        createMockProfile({
          xpComponents: [{ itemType: '/Lotus/Weapons/Tenno/Rifle/Braton', xp: 900000 }],
          weaponStats: [{
            itemType: '/Lotus/Weapons/Tenno/Rifle/Braton',
            fired: 10000,
            hits: 8000,
            kills: 5000,
            headshots: 1000,
            equipTime: 3600,
            assists: 200,
          }],
        })
      )

      await app.request('/sync/profile', { method: 'POST' })

      expect(container.masteryRepo.upsertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          fired: 10000,
          hits: 8000,
          kills: 5000,
          headshots: 1000,
          equipTime: 3600,
          assists: 200,
        }),
      ])
    })

    it('updates last sync timestamp', async () => {
      vi.mocked(container.profileApi.fetch).mockResolvedValue(createMockProfile())

      await app.request('/sync/profile', { method: 'POST' })

      expect(container.playerRepo.updateLastSync).toHaveBeenCalledWith(mockAuth.userId)
    })

    it('persists loadout with resolved item IDs', async () => {
      const itemsMap = new Map([
        ['/Lotus/Powersuits/Frost/Frost', { id: 1 }],
        ['/Lotus/Weapons/Tenno/Rifle/Soma', { id: 2 }],
        ['/Lotus/Weapons/Tenno/Pistol/Lex', { id: 3 }],
      ])
      vi.mocked(container.itemRepo.findAllAsMap).mockResolvedValue(itemsMap as any)

      vi.mocked(container.profileApi.fetch).mockResolvedValue(
        createMockProfile({
          loadout: {
            warframe: '/Lotus/Powersuits/Frost/Frost',
            primary: '/Lotus/Weapons/Tenno/Rifle/Soma',
            secondary: '/Lotus/Weapons/Tenno/Pistol/Lex',
            melee: '/Lotus/Unknown/Melee', // Not in map
            focusSchool: 'Zenurik',
          },
        })
      )

      await app.request('/sync/profile', { method: 'POST' })

      expect(container.loadoutRepo.upsert).toHaveBeenCalledWith('test-player', {
        warframeId: 1,
        primaryId: 2,
        secondaryId: 3,
        meleeId: null, // Not found
        focusSchool: 'Zenurik',
      })
    })

    it('updates intrinsics from profile', async () => {
      vi.mocked(container.profileApi.fetch).mockResolvedValue(
        createMockProfile({
          intrinsics: {
            railjack: { tactical: 10, piloting: 10, gunnery: 10, engineering: 10, command: 10, total: 50 },
            drifter: { riding: 10, combat: 10, opportunity: 10, endurance: 10, total: 40 },
          },
        })
      )

      await app.request('/sync/profile', { method: 'POST' })

      expect(container.playerRepo.updateIntrinsics).toHaveBeenCalledWith(
        mockAuth.userId,
        50,
        40
      )
    })

    it('syncs star chart completions', async () => {
      const nodesMap = new Map([
        ['SolNode1', { id: 1 }],
        ['SolNode2', { id: 2 }],
      ])
      vi.mocked(container.nodeRepo.findAllAsMap).mockResolvedValue(nodesMap as any)

      vi.mocked(container.profileApi.fetch).mockResolvedValue(
        createMockProfile({
          missions: [
            { tag: 'SolNode1', completes: 5 },
            { tag: 'SolNode2', completes: 10, tier: 1 }, // Steel Path
            { tag: 'UnknownNode', completes: 1 }, // Should be filtered
          ],
        })
      )

      await app.request('/sync/profile', { method: 'POST' })

      expect(container.nodeRepo.upsertCompletions).toHaveBeenCalledWith(
        'test-player',
        expect.arrayContaining([
          { nodeKey: 'SolNode1', completes: 5, isSteelPath: false },
          { nodeKey: 'SolNode2', completes: 10, isSteelPath: false },
          { nodeKey: 'SolNode2', completes: 10, isSteelPath: true },
        ])
      )
    })

    it('returns sync summary', async () => {
      const itemsMap = new Map([
        ['/Lotus/Powersuits/Frost/Frost', { id: 1, category: 'Warframes', maxRank: 30 }],
      ])
      vi.mocked(container.itemRepo.findAllAsMap).mockResolvedValue(itemsMap as any)

      const nodesMap = new Map([['SolNode1', { id: 1 }]])
      vi.mocked(container.nodeRepo.findAllAsMap).mockResolvedValue(nodesMap as any)

      vi.mocked(container.profileApi.fetch).mockResolvedValue(
        createMockProfile({
          xpComponents: [{ itemType: '/Lotus/Powersuits/Frost/Frost', xp: 900000 }],
          missions: [{ tag: 'SolNode1', completes: 5 }],
        })
      )

      const res = await app.request('/sync/profile', { method: 'POST' })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.synced).toBe(1)
      expect(body.mastered).toBe(1)
      expect(body.nodesSynced).toBe(1)
    })

    it('handles profile API errors gracefully', async () => {
      vi.mocked(container.profileApi.fetch).mockRejectedValue(
        new Error('Profile is private')
      )

      const res = await app.request('/sync/profile', { method: 'POST' })

      expect(res.status).toBe(500)
      const body = await res.json()
      // Error handler returns actual error message for Error instances
      expect(body.error).toBe('Profile is private')
    })
  })
})
