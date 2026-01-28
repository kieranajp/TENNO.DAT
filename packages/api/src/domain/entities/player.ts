export interface PlayerSettings {
  id: number
  userId: number
  playerId: string | null // Nullable until onboarding complete
  platform: string | null // Platform ID stored as string in database
  displayName: string | null
  lastSyncAt: Date | null
  railjackIntrinsics: number
  drifterIntrinsics: number
}
