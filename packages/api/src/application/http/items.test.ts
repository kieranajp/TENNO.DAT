import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { itemsRoutes } from './items'
import { createMockContainer } from '../../test-utils'
import type { Container } from '../../infrastructure/bootstrap/container'

describe('Items Routes', () => {
  let container: Container
  let app: Hono

  beforeEach(() => {
    container = createMockContainer()
    app = new Hono()
    app.route('/items', itemsRoutes(container))
  })

  describe('GET /items', () => {
    it('returns all items when no category filter', async () => {
      const mockItems = [
        { id: 1, uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', category: 'Warframes' },
        { id: 2, uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton', category: 'Primary' },
      ]

      vi.mocked(container.itemRepo.findAll).mockResolvedValue(mockItems as any)

      const res = await app.request('/items')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(mockItems)
      expect(container.itemRepo.findAll).toHaveBeenCalledWith(undefined)
    })

    it('passes category filter to repository', async () => {
      vi.mocked(container.itemRepo.findAll).mockResolvedValue([])

      await app.request('/items?category=Warframes')

      expect(container.itemRepo.findAll).toHaveBeenCalledWith('Warframes')
    })
  })

  describe('GET /items/categories', () => {
    it('returns category counts', async () => {
      const mockCategories = [
        { category: 'Warframes', count: 50 },
        { category: 'Primary', count: 100 },
        { category: 'Secondary', count: 80 },
      ]

      vi.mocked(container.itemRepo.getCategories).mockResolvedValue(mockCategories)

      const res = await app.request('/items/categories')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(mockCategories)
    })
  })

  describe('GET /items/:id', () => {
    it('returns 404 when item not found', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)
      vi.mocked(container.itemRepo.findByIdWithAcquisitionData).mockResolvedValue(null)

      const res = await app.request('/items/999')

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Item not found')
    })

    it('returns item with acquisition data when found', async () => {
      const mockItem = {
        id: 1,
        uniqueName: '/Lotus/Powersuits/Frost/Frost',
        name: 'Frost',
        category: 'Warframes',
        isPrime: false,
        masteryReq: 0,
        maxRank: 30,
        imageName: 'frost.png',
        vaulted: null,
        acquisitionData: {
          drops: [{ location: 'Void Relics', chance: 0.1 }],
          components: [],
        },
        personalStats: null,
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)
      vi.mocked(container.itemRepo.findByIdWithAcquisitionData).mockResolvedValue(mockItem as any)

      const res = await app.request('/items/1')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(mockItem)
    })

    it('includes personal stats when player is configured', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      const mockItem = {
        id: 1,
        uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton',
        name: 'Braton',
        category: 'Primary',
        isPrime: false,
        masteryReq: 0,
        maxRank: 30,
        imageName: 'braton.png',
        vaulted: null,
        acquisitionData: { drops: [], components: [] },
        personalStats: {
          fired: 10000,
          hits: 8500,
          kills: 5000,
          headshots: 1200,
          equipTime: 3600,
          assists: 500,
        },
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.itemRepo.findByIdWithAcquisitionData).mockResolvedValue(mockItem as any)

      const res = await app.request('/items/1')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.personalStats).toEqual(mockItem.personalStats)

      // Verify playerId was passed to repository
      expect(container.itemRepo.findByIdWithAcquisitionData).toHaveBeenCalledWith(1, 'test-player')
    })

    it('works without player settings (playerId undefined)', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)
      vi.mocked(container.itemRepo.findByIdWithAcquisitionData).mockResolvedValue({
        id: 1,
        name: 'Frost',
        acquisitionData: { drops: [], components: [] },
        personalStats: null,
      } as any)

      await app.request('/items/1')

      expect(container.itemRepo.findByIdWithAcquisitionData).toHaveBeenCalledWith(1, undefined)
    })

    it('handles non-numeric id gracefully', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)
      vi.mocked(container.itemRepo.findByIdWithAcquisitionData).mockResolvedValue(null)

      const res = await app.request('/items/invalid')

      // Number('invalid') = NaN, which will likely return null from DB
      expect(res.status).toBe(404)
    })
  })
})
