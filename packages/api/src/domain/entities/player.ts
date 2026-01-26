export interface PlayerSettings {
  id: number
  playerId: string
  platform: string // Platform ID stored as string in database
  displayName: string | null
  lastSyncAt: Date | null
  railjackIntrinsics: number
  drifterIntrinsics: number
}
