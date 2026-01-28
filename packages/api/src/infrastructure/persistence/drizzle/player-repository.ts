import { eq } from 'drizzle-orm'
import type { Platform } from '@warframe-tracker/shared'
import type { DrizzleDb } from './connection'
import { playerSettings } from './schema'
import type { PlayerSettings } from '../../../domain/entities/player'
import type { PlayerRepository } from '../../../domain/ports/player-repository'

export class DrizzlePlayerRepository implements PlayerRepository {
  constructor(private db: DrizzleDb) {}

  async getSettings(userId: number): Promise<PlayerSettings | null> {
    const result = await this.db
      .select()
      .from(playerSettings)
      .where(eq(playerSettings.userId, userId))
      .limit(1)
    return result[0] ?? null
  }

  async getSettingsByPlayerId(playerId: string): Promise<PlayerSettings | null> {
    const result = await this.db
      .select()
      .from(playerSettings)
      .where(eq(playerSettings.playerId, playerId))
      .limit(1)
    return result[0] ?? null
  }

  async createSettings(userId: number): Promise<void> {
    await this.db.insert(playerSettings).values({ userId }).onConflictDoNothing()
  }

  async saveSettings(userId: number, playerId: string, platform: Platform): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ playerId, platform: platform.id })
      .where(eq(playerSettings.userId, userId))
  }

  async updateDisplayName(userId: number, displayName: string): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ displayName })
      .where(eq(playerSettings.userId, userId))
  }

  async updateLastSync(userId: number): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ lastSyncAt: new Date() })
      .where(eq(playerSettings.userId, userId))
  }

  async updateIntrinsics(userId: number, railjack: number, drifter: number): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({
        railjackIntrinsics: railjack,
        drifterIntrinsics: drifter,
      })
      .where(eq(playerSettings.userId, userId))
  }
}
