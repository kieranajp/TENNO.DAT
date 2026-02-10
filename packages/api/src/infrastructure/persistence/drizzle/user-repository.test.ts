import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleUserRepository } from './user-repository'
import { playerSettings } from './schema'
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
})
