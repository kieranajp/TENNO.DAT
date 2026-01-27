import type { Platform } from '@warframe-tracker/shared'
import type { PlayerSettings } from '../entities/player'

export interface PlayerRepository {
  getSettings(userId: number): Promise<PlayerSettings | null>
  getSettingsByPlayerId(playerId: string): Promise<PlayerSettings | null>
  createSettings(userId: number): Promise<void>
  saveSettings(userId: number, playerId: string, platform: Platform): Promise<void>
  updateDisplayName(userId: number, displayName: string): Promise<void>
  updateLastSync(userId: number): Promise<void>
  updateIntrinsics(userId: number, railjack: number, drifter: number): Promise<void>
}
