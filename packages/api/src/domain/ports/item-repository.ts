import type { Item } from '../entities/item'

export interface ItemRepository {
  findAll(category?: string): Promise<Item[]>
  findById(id: number): Promise<Item | null>
  findAllAsMap(): Promise<Map<string, Item>>  // keyed by uniqueName
  getCategories(): Promise<Array<{ category: string; count: number }>>
  upsertMany(items: Omit<Item, 'id'>[]): Promise<void>
}
