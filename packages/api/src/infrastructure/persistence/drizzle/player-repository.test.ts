import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzlePlayerRepository } from './player-repository'
import { users, playerSettings } from './schema'
import { Platform } from '@warframe-tracker/shared'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzlePlayerRepository
let userId: number

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzlePlayerRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)

  const [user] = await db.insert(users).values({
    steamId: '76561198000000001',
    steamDisplayName: 'PlayerTester',
  }).returning()
  userId = user.id
})

afterAll(async () => {
  await cleanup()
})

describe('DrizzlePlayerRepository', () => {
  describe('createSettings', () => {
    it('creates player settings for a user', async () => {
      await repo.createSettings(userId)
      const settings = await repo.getSettings(userId)
      expect(settings).not.toBeNull()
      expect(settings!.userId).toBe(userId)
      expect(settings!.playerId).toBeNull()
      expect(settings!.railjackIntrinsics).toBe(0)
      expect(settings!.drifterIntrinsics).toBe(0)
    })

    it('is idempotent (onConflictDoNothing)', async () => {
      await repo.createSettings(userId)
      await repo.createSettings(userId) // should not throw
      const settings = await repo.getSettings(userId)
      expect(settings).not.toBeNull()
    })
  })

  describe('getSettings', () => {
    it('returns null when no settings exist', async () => {
      expect(await repo.getSettings(userId)).toBeNull()
    })

    it('returns settings when they exist', async () => {
      await repo.createSettings(userId)
      const settings = await repo.getSettings(userId)
      expect(settings!.userId).toBe(userId)
    })
  })

  describe('getSettingsByPlayerId', () => {
    it('returns settings by player ID', async () => {
      await db.insert(playerSettings).values({
        userId,
        playerId: 'MyPlayer',
        platform: 'pc',
      })
      const settings = await repo.getSettingsByPlayerId('MyPlayer')
      expect(settings).not.toBeNull()
      expect(settings!.userId).toBe(userId)
    })

    it('returns null for unknown player ID', async () => {
      expect(await repo.getSettingsByPlayerId('NoSuchPlayer')).toBeNull()
    })
  })

  describe('saveSettings', () => {
    it('updates playerId and platform', async () => {
      await repo.createSettings(userId)
      await repo.saveSettings(userId, 'MyPlayer', Platform.PlayStation)
      const settings = await repo.getSettings(userId)
      expect(settings!.playerId).toBe('MyPlayer')
      expect(settings!.platform).toBe('ps')
    })
  })

  describe('updateDisplayName', () => {
    it('updates the display name', async () => {
      await repo.createSettings(userId)
      await repo.updateDisplayName(userId, 'CoolTenno')
      const settings = await repo.getSettings(userId)
      expect(settings!.displayName).toBe('CoolTenno')
    })
  })

  describe('updateLastSync', () => {
    it('updates the lastSyncAt timestamp', async () => {
      await repo.createSettings(userId)
      const before = new Date()
      await repo.updateLastSync(userId)
      const settings = await repo.getSettings(userId)
      expect(settings!.lastSyncAt).not.toBeNull()
      expect(settings!.lastSyncAt!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    })
  })

  describe('updateIntrinsics', () => {
    it('updates railjack and drifter intrinsics', async () => {
      await repo.createSettings(userId)
      await repo.updateIntrinsics(userId, 50, 40)
      const settings = await repo.getSettings(userId)
      expect(settings!.railjackIntrinsics).toBe(50)
      expect(settings!.drifterIntrinsics).toBe(40)
    })
  })
})
