import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleUserRepository } from './user-repository'
import { playerSettings, playerMastery, playerLoadout, playerNodes, playerWishlist, playerPrimeParts, items, nodes, itemComponents } from './schema'
import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzleUserRepository

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzleUserRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)
})

afterAll(async () => {
  await cleanup()
})

describe('DrizzleUserRepository', () => {
  describe('create', () => {
    it('creates a user and returns it', async () => {
      const user = await repo.create('76561198000000001', 'Tenno', 'https://avatar.url/pic.jpg')
      expect(user.id).toBeDefined()
      expect(user.steamId).toBe('76561198000000001')
      expect(user.steamDisplayName).toBe('Tenno')
      expect(user.steamAvatarUrl).toBe('https://avatar.url/pic.jpg')
      expect(user.lastLoginAt).toBeInstanceOf(Date)
      expect(user.createdAt).toBeInstanceOf(Date)
    })

    it('creates a user with null display name and avatar', async () => {
      const user = await repo.create('76561198000000002', null, null)
      expect(user.steamDisplayName).toBeNull()
      expect(user.steamAvatarUrl).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns user when found', async () => {
      const created = await repo.create('76561198000000001', 'Tenno', null)
      const found = await repo.findById(created.id)
      expect(found).not.toBeNull()
      expect(found!.steamId).toBe('76561198000000001')
    })

    it('returns null when not found', async () => {
      expect(await repo.findById(99999)).toBeNull()
    })
  })

  describe('findBySteamId', () => {
    it('returns user when found', async () => {
      await repo.create('76561198000000001', 'Tenno', null)
      const found = await repo.findBySteamId('76561198000000001')
      expect(found).not.toBeNull()
      expect(found!.steamDisplayName).toBe('Tenno')
    })

    it('returns null when not found', async () => {
      expect(await repo.findBySteamId('nonexistent')).toBeNull()
    })
  })

  describe('findByIdWithSettings', () => {
    it('returns user with null playerId when no settings exist', async () => {
      const created = await repo.create('76561198000000001', 'Tenno', null)
      const result = await repo.findByIdWithSettings(created.id)
      expect(result).not.toBeNull()
      expect(result!.steamId).toBe('76561198000000001')
      expect(result!.playerId).toBeNull()
      expect(result!.platform).toBe('pc')
      expect(result!.onboardingComplete).toBe(false)
    })

    it('returns user with settings when settings exist (no playerId yet)', async () => {
      const created = await repo.create('76561198000000001', 'Tenno', null)
      await db.insert(playerSettings).values({ userId: created.id })
      const result = await repo.findByIdWithSettings(created.id)
      expect(result!.playerId).toBeNull()
      expect(result!.onboardingComplete).toBe(false)
    })

    it('returns user with settings when fully onboarded', async () => {
      const created = await repo.create('76561198000000001', 'Tenno', null)
      await db.insert(playerSettings).values({
        userId: created.id,
        playerId: 'MyPlayer',
        platform: 'ps',
      })
      const result = await repo.findByIdWithSettings(created.id)
      expect(result!.playerId).toBe('MyPlayer')
      expect(result!.platform).toBe('ps')
      expect(result!.onboardingComplete).toBe(true)
    })

    it('returns null when user not found', async () => {
      expect(await repo.findByIdWithSettings(99999)).toBeNull()
    })
  })

  describe('updateSteamProfile', () => {
    it('updates display name and avatar', async () => {
      const created = await repo.create('76561198000000001', 'OldName', 'https://old.url')
      await repo.updateSteamProfile(created.id, 'NewName', 'https://new.url')
      const found = await repo.findById(created.id)
      expect(found!.steamDisplayName).toBe('NewName')
      expect(found!.steamAvatarUrl).toBe('https://new.url')
    })
  })

  describe('updateLastLogin', () => {
    it('updates last login timestamp', async () => {
      const created = await repo.create('76561198000000001', 'Tenno', null)
      const beforeUpdate = new Date()
      await repo.updateLastLogin(created.id)
      const found = await repo.findById(created.id)
      expect(found!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000)
    })
  })

  describe('delete', () => {
    it('deletes user and all associated player data', async () => {
      const user = await repo.create('76561198000000001', 'Tenno', null)
      const playerId = 'test-player-delete'

      // Set up player settings with playerId
      await db.insert(playerSettings).values({ userId: user.id, playerId, platform: 'pc' })

      // Create an item + node to reference
      const [item] = await db.insert(items).values({
        uniqueName: '/Test/DeleteItem',
        name: 'Delete Test',
        category: 'Rifle',
        maxRank: 30,
      }).returning()
      const [component] = await db.insert(itemComponents).values({
        itemId: item.id,
        name: 'Barrel',
      }).returning()
      const [node] = await db.insert(nodes).values({
        nodeKey: 'SolNode999',
        name: 'Test Node',
        planet: 'Earth',
        nodeType: 'mission',
        masteryXp: 63,
      }).returning()

      // Insert player data across all tables
      await db.insert(playerMastery).values({ playerId, itemId: item.id, xp: 500, rank: 1 })
      await db.insert(playerLoadout).values({ playerId })
      await db.insert(playerNodes).values({ playerId, nodeId: node.id, completes: 1 })
      await db.insert(playerWishlist).values({ playerId, itemId: item.id })
      await db.insert(playerPrimeParts).values({ playerId, componentId: component.id, ownedCount: 1 })

      await repo.delete(user.id)

      // User gone
      expect(await repo.findById(user.id)).toBeNull()

      // Player data gone
      const mastery = await db.select().from(playerMastery).where(eq(playerMastery.playerId, playerId))
      expect(mastery).toHaveLength(0)
      const loadout = await db.select().from(playerLoadout).where(eq(playerLoadout.playerId, playerId))
      expect(loadout).toHaveLength(0)
      const nodeRows = await db.select().from(playerNodes).where(eq(playerNodes.playerId, playerId))
      expect(nodeRows).toHaveLength(0)
      const wishlist = await db.select().from(playerWishlist).where(eq(playerWishlist.playerId, playerId))
      expect(wishlist).toHaveLength(0)
      const primeParts = await db.select().from(playerPrimeParts).where(eq(playerPrimeParts.playerId, playerId))
      expect(primeParts).toHaveLength(0)

      // Settings cascaded
      const settings = await db.select().from(playerSettings).where(eq(playerSettings.userId, user.id))
      expect(settings).toHaveLength(0)
    })

    it('handles user with no playerId (onboarding incomplete)', async () => {
      const user = await repo.create('76561198000000001', 'Tenno', null)
      await db.insert(playerSettings).values({ userId: user.id }) // no playerId

      await repo.delete(user.id)

      expect(await repo.findById(user.id)).toBeNull()
    })

    it('handles user with no settings at all', async () => {
      const user = await repo.create('76561198000000001', 'Tenno', null)

      await repo.delete(user.id)

      expect(await repo.findById(user.id)).toBeNull()
    })
  })
})
