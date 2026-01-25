export type Platform = 'pc' | 'ps' | 'xbox' | 'switch'

export interface PlayerSettings {
  id: number
  playerId: string
  platform: Platform
  displayName: string | null
  lastSyncAt: Date | null
  railjackIntrinsics: number
  drifterIntrinsics: number
}
