import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { wishlistRoutes } from './wishlist'
import { createMockContainer, createMockAuthMiddleware, mockAuth } from '../../test-utils'
import type { Container } from '../../infrastructure/bootstrap/container'

describe('Wishlist Routes', () => {
  let container: Container
  let app: Hono

  beforeEach(() => {
    container = createMockContainer()
    app = new Hono()
    app.use('*', createMockAuthMiddleware(mockAuth))
    app.route('/wishlist', wishlistRoutes(container))
  })

  describe('GET /wishlist', () => {
    it('returns 400 when no player settings configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/wishlist')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('No player configured')
    })

    it('returns wishlisted item IDs', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.wishlistRepo.getWishlistedItemIds).mockResolvedValue([1, 5, 10])

      const res = await app.request('/wishlist')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.itemIds).toEqual([1, 5, 10])
      expect(container.wishlistRepo.getWishlistedItemIds).toHaveBeenCalledWith('test-player')
    })

    it('returns empty array when no items wishlisted', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.wishlistRepo.getWishlistedItemIds).mockResolvedValue([])

      const res = await app.request('/wishlist')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.itemIds).toEqual([])
    })
  })

  describe('POST /wishlist/:itemId/toggle', () => {
    it('returns 400 when no player settings configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/wishlist/123/toggle', { method: 'POST' })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('No player configured')
    })

    it('returns 400 for invalid item ID', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)

      const res = await app.request('/wishlist/invalid/toggle', { method: 'POST' })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid item ID')
    })

    it('toggles wishlist status and returns new state (adding)', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.wishlistRepo.toggle).mockResolvedValue(true)

      const res = await app.request('/wishlist/123/toggle', { method: 'POST' })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.wishlisted).toBe(true)
      expect(container.wishlistRepo.toggle).toHaveBeenCalledWith('test-player', 123)
    })

    it('toggles wishlist status and returns new state (removing)', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.wishlistRepo.toggle).mockResolvedValue(false)

      const res = await app.request('/wishlist/456/toggle', { method: 'POST' })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.wishlisted).toBe(false)
      expect(container.wishlistRepo.toggle).toHaveBeenCalledWith('test-player', 456)
    })
  })

  describe('GET /wishlist/:itemId', () => {
    it('returns 400 when no player settings configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/wishlist/123')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('No player configured')
    })

    it('returns 400 for invalid item ID', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)

      const res = await app.request('/wishlist/invalid')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid item ID')
    })

    it('returns true when item is wishlisted', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.wishlistRepo.isWishlisted).mockResolvedValue(true)

      const res = await app.request('/wishlist/123')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.wishlisted).toBe(true)
      expect(container.wishlistRepo.isWishlisted).toHaveBeenCalledWith('test-player', 123)
    })

    it('returns false when item is not wishlisted', async () => {
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

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.wishlistRepo.isWishlisted).mockResolvedValue(false)

      const res = await app.request('/wishlist/456')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.wishlisted).toBe(false)
      expect(container.wishlistRepo.isWishlisted).toHaveBeenCalledWith('test-player', 456)
    })
  })
})
