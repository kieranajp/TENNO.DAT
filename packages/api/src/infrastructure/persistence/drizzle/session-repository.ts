import { eq, lt } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import type { DrizzleDb } from './connection'
import { sessions } from './schema'
import type { Session } from '../../../domain/entities/user'
import type { SessionRepository } from '../../../domain/ports/session-repository'
import { SESSION_TTL_SHORT, SESSION_TTL_LONG } from '../../../application/http/constants'

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private db: DrizzleDb) {}

  async findById(id: string): Promise<Session | null> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    return result[0] ?? null
  }

  async findByIdWithUser(id: string): Promise<{ session: Session; userId: number } | null> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    if (!result[0]) return null
    return { session: result[0], userId: result[0].userId }
  }

  async create(userId: number, rememberMe: boolean): Promise<Session> {
    const id = randomBytes(32).toString('hex')
    const expiresAt = rememberMe
      ? new Date(Date.now() + SESSION_TTL_LONG * 1000)
      : new Date(Date.now() + SESSION_TTL_SHORT * 1000)

    const result = await this.db
      .insert(sessions)
      .values({ id, userId, rememberMe, expiresAt })
      .returning()
    return result[0]
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id))
  }

  async deleteExpired(): Promise<number> {
    const deleted = await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id })
    return deleted.length
  }

  async deleteAllForUser(userId: number): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId))
  }
}
