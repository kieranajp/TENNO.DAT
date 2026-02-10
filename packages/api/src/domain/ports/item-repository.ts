import type { Item } from '../entities/item'
import type { ItemAcquisitionData } from '@warframe-tracker/shared'

export interface PersonalStats {
  fired: number | null
  hits: number | null
  kills: number
  headshots: number
  equipTime: number
  assists: number
}

export interface ItemRepository {
  findAll(category?: string): Promise<Item[]>
  findById(id: number): Promise<Item | null>
  findByIdWithAcquisitionData(
    id: number,
    playerId?: string
  ): Promise<(Item & { acquisitionData: ItemAcquisitionData; personalStats: PersonalStats | null }) | null>
  findAllAsMap(): Promise<Map<string, Item>>  // keyed by uniqueName
  getCategories(): Promise<Array<{ category: string; count: number }>>
  upsertMany(items: Omit<Item, 'id'>[]): Promise<void>
  findPrimesWithComponents(category?: string): Promise<Array<Item & {
    components: Array<{
      id: number
      name: string
      ducats: number | null
      drops: Array<{ location: string; chance: number; rarity: string | null }>
    }>
  }>>
  getComponentCountsByItem(itemIds: number[]): Promise<Map<number, { total: number; componentIds: number[] }>>
  getComponentIdsForItems(itemIds: number[]): Promise<number[]>
}
