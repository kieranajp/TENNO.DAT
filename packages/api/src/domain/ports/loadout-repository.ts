import type { MasteryState } from '../entities/mastery'

export interface LoadoutData {
  warframeId: number | null
  primaryId: number | null
  secondaryId: number | null
  meleeId: number | null
  focusSchool: string | null
}

export interface LoadoutItem {
  id: number
  name: string
  imageName: string | null
  category: string
  maxRank: number
  rank: number | null
  masteryState: MasteryState
}

export interface LoadoutWithItems {
  warframe: LoadoutItem | null
  primary: LoadoutItem | null
  secondary: LoadoutItem | null
  melee: LoadoutItem | null
  focusSchool: string | null
}

export interface LoadoutRepository {
  upsert(playerId: string, loadout: LoadoutData): Promise<void>
  getWithItems(playerId: string): Promise<LoadoutWithItems | null>
}
