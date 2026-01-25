import type { Platform } from '../entities/player'

export interface ProfileXpComponent {
  itemType: string   // uniqueName, e.g. "/Lotus/Powersuits/Frost/Frost"
  xp: number
}

export interface Loadout {
  warframe: string | null      // uniqueName
  primary: string | null       // uniqueName
  secondary: string | null     // uniqueName
  melee: string | null         // uniqueName
  focusSchool: string | null   // friendly name (e.g., "Madurai")
}

export interface ProfileData {
  displayName: string | null
  playerLevel: number
  xpComponents: ProfileXpComponent[]
  loadout: Loadout
}

export interface ProfileApi {
  fetch(playerId: string, platform: Platform): Promise<ProfileData>
}
