import type { MasteryRecord, MasteryState } from '../entities/mastery'

export interface MasteryWithItem {
  id: number
  uniqueName: string
  name: string
  category: string
  isPrime: boolean
  masteryReq: number
  maxRank: number
  imageName: string | null
  vaulted: boolean | null
  xp: number | null
  rank: number | null
  masteryState: MasteryState
}

export interface MasterySummary {
  category: string
  total: number
  mastered: number
}

export interface MasteryRepository {
  upsertMany(records: Omit<MasteryRecord, 'id' | 'syncedAt'>[]): Promise<void>
  getSummary(playerId: string): Promise<MasterySummary[]>
  getItemsWithMastery(playerId: string, filters?: {
    category?: string
    masteredOnly?: boolean
    unmasteredOnly?: boolean
  }): Promise<MasteryWithItem[]>
  getEquipmentMasteryXP(playerId: string): Promise<number>
  getMasteredItemIds(playerId: string): Promise<number[]>
}
