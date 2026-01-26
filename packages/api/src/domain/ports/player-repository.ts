import type { Platform } from '@warframe-tracker/shared'
import type { PlayerSettings } from '../entities/player'

export interface PlayerRepository {
  getSettings(): Promise<PlayerSettings | null>
  saveSettings(playerId: string, platform: Platform): Promise<void>
  updateDisplayName(playerId: string, displayName: string): Promise<void>
  updateLastSync(playerId: string): Promise<void>
  updateIntrinsics(playerId: string, railjack: number, drifter: number): Promise<void>
}
