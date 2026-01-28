import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { users, playerSettings } from './schema'
import type { User, UserWithSettings } from '../../../domain/entities/user'
import type { UserRepository } from '../../../domain/ports/user-repository'

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: DrizzleDb) {}

  async findById(id: number): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return result[0] ?? null
  }

  async findBySteamId(steamId: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.steamId, steamId)).limit(1)
    return result[0] ?? null
  }

  async findByIdWithSettings(id: number): Promise<UserWithSettings | null> {
    const result = await this.db
      .select({
        id: users.id,
        steamId: users.steamId,
        steamDisplayName: users.steamDisplayName,
        steamAvatarUrl: users.steamAvatarUrl,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        playerId: playerSettings.playerId,
        platform: playerSettings.platform,
      })
      .from(users)
      .leftJoin(playerSettings, eq(users.id, playerSettings.userId))
      .where(eq(users.id, id))
      .limit(1)

    if (!result[0]) return null

    const row = result[0]
    return {
      ...row,
      platform: row.platform ?? 'pc',
      onboardingComplete: row.playerId !== null,
    }
  }

  async create(steamId: string, displayName: string | null, avatarUrl: string | null): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({
        steamId,
        steamDisplayName: displayName,
        steamAvatarUrl: avatarUrl,
        lastLoginAt: new Date(),
      })
      .returning()
    return result[0]
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id))
  }

  async updateSteamProfile(id: number, displayName: string | null, avatarUrl: string | null): Promise<void> {
    await this.db
      .update(users)
      .set({ steamDisplayName: displayName, steamAvatarUrl: avatarUrl })
      .where(eq(users.id, id))
  }
}
