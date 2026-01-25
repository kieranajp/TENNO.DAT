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

export interface Intrinsics {
  railjack: {
    tactical: number
    piloting: number
    gunnery: number
    engineering: number
    command: number
    total: number  // sum of all ranks (0-50)
  }
  drifter: {
    riding: number
    combat: number
    opportunity: number
    endurance: number
    total: number  // sum of all ranks (0-40)
  }
}

export interface MissionCompletion {
  tag: string       // e.g., "SolNode63" or "EarthToVenusJunction"
  completes: number
  tier?: number     // 1 = Steel Path
}

export interface ProfileData {
  displayName: string | null
  playerLevel: number
  xpComponents: ProfileXpComponent[]
  loadout: Loadout
  intrinsics: Intrinsics
  missions: MissionCompletion[]
}

export interface ProfileApi {
  fetch(playerId: string, platform: Platform): Promise<ProfileData>
}
