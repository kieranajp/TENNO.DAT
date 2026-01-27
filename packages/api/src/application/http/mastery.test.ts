import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { masteryRoutes } from './mastery'
import { createMockContainer } from '../../test-utils'
import type { Container } from '../../infrastructure/bootstrap/container'
import { MasteryState } from '@warframe-tracker/shared'

describe('Mastery Routes', () => {
  let container: Container
  let app: Hono

  beforeEach(() => {
    container = createMockContainer()
    app = new Hono()
    app.route('/mastery', masteryRoutes(container))
  })

  describe('GET /mastery/summary', () => {
    it('returns 400 when no player settings configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/mastery/summary')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('No player configured')
    })

    it('returns mastery summary with categories and totals', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: 'TestUser',
        lastSyncAt: new Date('2024-01-15'),
        railjackIntrinsics: 50,
        drifterIntrinsics: 30,
      }

      const mockCategories = [
        { category: 'Warframes', total: 50, mastered: 45 },
        { category: 'Primary', total: 100, mastered: 80 },
      ]

      const mockLoadout = {
        warframe: { id: 1, name: 'Frost', imageName: 'frost.png', category: 'Warframes', maxRank: 30, rank: 30, masteryState: MasteryState.MASTERED_30 },
        primary: null,
        secondary: null,
        melee: null,
        focusSchool: 'Zenurik',
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.masteryRepo.getSummary).mockResolvedValue(mockCategories)
      vi.mocked(container.loadoutRepo.getWithItems).mockResolvedValue(mockLoadout)
      vi.mocked(container.masteryRepo.getEquipmentMasteryXP).mockResolvedValue(500000)
      vi.mocked(container.nodeRepo.getStarChartMasteryXP).mockResolvedValue(50000)

      const res = await app.request('/mastery/summary')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.categories).toEqual(mockCategories)
      expect(body.totals).toEqual({ total: 150, mastered: 125 })
      expect(body.loadout).toEqual(mockLoadout)
      expect(body.displayName).toBe('TestUser')
      expect(body.masteryRank).toBeDefined()
      expect(body.masteryRank.equipmentXP).toBe(500000)
      expect(body.masteryRank.starChartXP).toBe(50000)
      expect(body.masteryRank.intrinsicsXP).toBe(120000) // (50 + 30) * 1500
    })

    it('calculates correct mastery rank from total XP', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.masteryRepo.getSummary).mockResolvedValue([])
      vi.mocked(container.loadoutRepo.getWithItems).mockResolvedValue(null)
      vi.mocked(container.masteryRepo.getEquipmentMasteryXP).mockResolvedValue(225000) // MR ~9
      vi.mocked(container.nodeRepo.getStarChartMasteryXP).mockResolvedValue(0)

      const res = await app.request('/mastery/summary')

      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.masteryRank.rank).toBe(9)
    })
  })

  describe('GET /mastery/items', () => {
    it('returns 400 when no player settings configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/mastery/items')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('No player configured')
    })

    it('returns items with mastery status', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      const mockItems = [
        {
          id: 1,
          uniqueName: '/Lotus/Powersuits/Frost/Frost',
          name: 'Frost',
          category: 'Warframes',
          isPrime: false,
          masteryReq: 0,
          maxRank: 30,
          imageName: 'frost.png',
          vaulted: null,
          xp: 900000,
          rank: 30,
          masteryState: MasteryState.MASTERED_30,
        },
      ]

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.masteryRepo.getItemsWithMastery).mockResolvedValue(mockItems)

      const res = await app.request('/mastery/items')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(mockItems)
    })

    it('passes category filter to repository', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.masteryRepo.getItemsWithMastery).mockResolvedValue([])

      await app.request('/mastery/items?category=Warframes')

      expect(container.masteryRepo.getItemsWithMastery).toHaveBeenCalledWith(
        'test-player',
        expect.objectContaining({ category: 'Warframes' })
      )
    })

    it('passes mastered filter to repository', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.masteryRepo.getItemsWithMastery).mockResolvedValue([])

      await app.request('/mastery/items?mastered=true')

      expect(container.masteryRepo.getItemsWithMastery).toHaveBeenCalledWith(
        'test-player',
        expect.objectContaining({ masteredOnly: true })
      )
    })

    it('passes unmastered filter to repository', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.masteryRepo.getItemsWithMastery).mockResolvedValue([])

      await app.request('/mastery/items?unmastered=true')

      expect(container.masteryRepo.getItemsWithMastery).toHaveBeenCalledWith(
        'test-player',
        expect.objectContaining({ unmasteredOnly: true })
      )
    })
  })
})
