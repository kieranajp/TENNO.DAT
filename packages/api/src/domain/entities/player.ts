// Re-export from shared for backwards compatibility
export type { PlatformId as Platform } from '@warframe-tracker/shared'

export interface PlayerSettings {
  id: number
  playerId: string
  platform: Platform
  displayName: string | null
  lastSyncAt: Date | null
  railjackIntrinsics: number
  drifterIntrinsics: number
}
