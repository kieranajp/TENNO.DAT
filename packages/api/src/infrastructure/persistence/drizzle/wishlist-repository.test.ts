import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleWishlistRepository } from './wishlist-repository'
import { users, items } from './schema'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzleWishlistRepository

let userId: number
let itemId1: number
let itemId2: number
const playerId = 'TestPlayer123'

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzleWishlistRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)

  // Seed prerequisite data
  const [user] = await db.insert(users).values({
    steamId: '76561198000000001',
    steamDisplayName: 'Tester',
  }).returning()
  userId = user.id

  const insertedItems = await db.insert(items).values([
    { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', category: 'Warframes', maxRank: 30 },
    { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton', category: 'Primary', maxRank: 30 },
  ]).returning()
  itemId1 = insertedItems[0].id
  itemId2 = insertedItems[1].id
})

afterAll(async () => {
  await cleanup()
})

describe('DrizzleWishlistRepository', () => {
  describe('add', () => {
    it('adds an item to the wishlist', async () => {
      await repo.add(playerId, itemId1)
      const ids = await repo.getWishlistedItemIds(playerId)
      expect(ids).toEqual([itemId1])
    })

    it('is idempotent (onConflictDoNothing)', async () => {
      await repo.add(playerId, itemId1)
      await repo.add(playerId, itemId1)
      const ids = await repo.getWishlistedItemIds(playerId)
      expect(ids).toEqual([itemId1])
    })
  })

  describe('remove', () => {
    it('removes an item from the wishlist', async () => {
      await repo.add(playerId, itemId1)
      await repo.remove(playerId, itemId1)
      const ids = await repo.getWishlistedItemIds(playerId)
      expect(ids).toEqual([])
    })

    it('is a no-op when item is not wishlisted', async () => {
      await repo.remove(playerId, itemId1) // should not throw
    })
  })

  describe('isWishlisted', () => {
    it('returns true when item is wishlisted', async () => {
      await repo.add(playerId, itemId1)
      expect(await repo.isWishlisted(playerId, itemId1)).toBe(true)
    })

    it('returns false when item is not wishlisted', async () => {
      expect(await repo.isWishlisted(playerId, itemId1)).toBe(false)
    })
  })

  describe('getWishlistedItemIds', () => {
    it('returns all wishlisted item IDs for a player', async () => {
      await repo.add(playerId, itemId1)
      await repo.add(playerId, itemId2)
      const ids = await repo.getWishlistedItemIds(playerId)
      expect(ids).toHaveLength(2)
      expect(ids).toContain(itemId1)
      expect(ids).toContain(itemId2)
    })

    it('returns empty array when nothing wishlisted', async () => {
      const ids = await repo.getWishlistedItemIds(playerId)
      expect(ids).toEqual([])
    })

    it('scopes to player (does not leak across players)', async () => {
      await repo.add('PlayerA', itemId1)
      await repo.add('PlayerB', itemId2)
      expect(await repo.getWishlistedItemIds('PlayerA')).toEqual([itemId1])
      expect(await repo.getWishlistedItemIds('PlayerB')).toEqual([itemId2])
    })
  })

  describe('toggle', () => {
    it('adds when not present, returns true', async () => {
      const result = await repo.toggle(playerId, itemId1)
      expect(result).toBe(true)
      expect(await repo.isWishlisted(playerId, itemId1)).toBe(true)
    })

    it('removes when already present, returns false', async () => {
      await repo.add(playerId, itemId1)
      const result = await repo.toggle(playerId, itemId1)
      expect(result).toBe(false)
      expect(await repo.isWishlisted(playerId, itemId1)).toBe(false)
    })
  })
})
