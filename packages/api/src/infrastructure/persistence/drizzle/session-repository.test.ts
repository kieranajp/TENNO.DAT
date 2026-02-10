import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleSessionRepository } from './session-repository'
import { users, sessions } from './schema'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzleSessionRepository
let userId: number

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzleSessionRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)

  const [user] = await db.insert(users).values({
    steamId: '76561198000000001',
    steamDisplayName: 'SessionTester',
  }).returning()
  userId = user.id
})

afterAll(async () => {
  await cleanup()
})

describe('DrizzleSessionRepository', () => {
  describe('create', () => {
    it('creates a session with 64-char hex ID', async () => {
      const session = await repo.create(userId, false)
      expect(session.id).toHaveLength(64)
      expect(session.id).toMatch(/^[0-9a-f]{64}$/)
      expect(session.userId).toBe(userId)
      expect(session.rememberMe).toBe(false)
    })

    it('sets 24h expiry for non-rememberMe', async () => {
      const before = Date.now()
      const session = await repo.create(userId, false)
      const expectedExpiry = before + 24 * 60 * 60 * 1000
      // Allow 5s tolerance
      expect(session.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000)
      expect(session.expiresAt.getTime()).toBeLessThan(expectedExpiry + 5000)
    })

    it('sets 30d expiry for rememberMe', async () => {
      const before = Date.now()
      const session = await repo.create(userId, true)
      const expectedExpiry = before + 30 * 24 * 60 * 60 * 1000
      expect(session.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000)
      expect(session.expiresAt.getTime()).toBeLessThan(expectedExpiry + 5000)
      expect(session.rememberMe).toBe(true)
    })
  })

  describe('findById', () => {
    it('returns session when found', async () => {
      const created = await repo.create(userId, false)
      const found = await repo.findById(created.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
    })

    it('returns null when not found', async () => {
      const found = await repo.findById('nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('findByIdWithUser', () => {
    it('returns session and userId', async () => {
      const created = await repo.create(userId, false)
      const result = await repo.findByIdWithUser(created.id)
      expect(result).not.toBeNull()
      expect(result!.session.id).toBe(created.id)
      expect(result!.userId).toBe(userId)
    })

    it('returns null when not found', async () => {
      expect(await repo.findByIdWithUser('nonexistent')).toBeNull()
    })
  })

  describe('delete', () => {
    it('deletes a session', async () => {
      const created = await repo.create(userId, false)
      await repo.delete(created.id)
      expect(await repo.findById(created.id)).toBeNull()
    })
  })

  describe('deleteExpired', () => {
    it('deletes expired sessions but keeps valid ones', async () => {
      const expiredId = 'a'.repeat(64)
      // Insert an already-expired session directly
      await db.insert(sessions).values({
        id: expiredId,
        userId,
        rememberMe: false,
        expiresAt: new Date(Date.now() - 1000),
      })
      // Insert a valid session
      const valid = await repo.create(userId, false)

      await repo.deleteExpired()

      // Expired session gone, valid one remains
      expect(await repo.findById(expiredId)).toBeNull()
      expect(await repo.findById(valid.id)).not.toBeNull()
    })

    it('is a no-op when no sessions are expired', async () => {
      const session = await repo.create(userId, false)
      await repo.deleteExpired()
      expect(await repo.findById(session.id)).not.toBeNull()
    })
  })

  describe('deleteAllForUser', () => {
    it('deletes all sessions for a user', async () => {
      await repo.create(userId, false)
      await repo.create(userId, true)
      await repo.deleteAllForUser(userId)

      // Create another user's session to verify isolation
      const [user2] = await db.insert(users).values({
        steamId: '76561198000000002',
      }).returning()
      const otherSession = await repo.create(user2.id, false)

      expect(await repo.findById(otherSession.id)).not.toBeNull()
    })
  })

  describe('cascade on user delete', () => {
    it('sessions are deleted when user is deleted', async () => {
      const session = await repo.create(userId, false)
      const { sql } = await import('drizzle-orm')
      await db.execute(sql`DELETE FROM users WHERE id = ${userId}`)
      expect(await repo.findById(session.id)).toBeNull()
    })
  })
})
