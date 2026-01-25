import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerSettings } from './schema'
import type { PlayerSettings, Platform } from '../../../domain/entities/player'
import type { PlayerRepository } from '../../../domain/ports/player-repository'

export class DrizzlePlayerRepository implements PlayerRepository {
  constructor(private db: DrizzleDb) {}

  async getSettings(): Promise<PlayerSettings | null> {
    const result = await this.db.select().from(playerSettings).limit(1)
    return result[0] ?? null
  }

  async saveSettings(playerId: string, platform: Platform): Promise<void> {
    const existing = await this.getSettings()

    if (existing) {
      await this.db
        .update(playerSettings)
        .set({ playerId, platform })
        .where(eq(playerSettings.id, existing.id))
    } else {
      await this.db.insert(playerSettings).values({ playerId, platform })
    }
  }

  async updateDisplayName(playerId: string, displayName: string): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ displayName })
      .where(eq(playerSettings.playerId, playerId))
  }

  async updateLastSync(playerId: string): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({ lastSyncAt: new Date() })
      .where(eq(playerSettings.playerId, playerId))
  }

  async updateIntrinsics(playerId: string, railjack: number, drifter: number): Promise<void> {
    await this.db
      .update(playerSettings)
      .set({
        railjackIntrinsics: railjack,
        drifterIntrinsics: drifter,
      })
      .where(eq(playerSettings.playerId, playerId))
  }
}
