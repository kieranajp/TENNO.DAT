import type { Platform } from '../entities/player'

export interface ProfileXpComponent {
  itemType: string   // uniqueName, e.g. "/Lotus/Powersuits/Frost/Frost"
  xp: number
}

export interface ProfileData {
  displayName: string | null
  playerLevel: number
  xpComponents: ProfileXpComponent[]
}

export interface ProfileApi {
  fetch(playerId: string, platform: Platform): Promise<ProfileData>
}
