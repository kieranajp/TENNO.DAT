import { eq, sql } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { items } from './schema'
import type { Item } from '../../../domain/entities/item'
import type { ItemRepository } from '../../../domain/ports/item-repository'

export class DrizzleItemRepository implements ItemRepository {
  constructor(private db: DrizzleDb) {}

  async findAll(category?: string): Promise<Item[]> {
    let query = this.db.select().from(items)
    if (category) {
      query = query.where(eq(items.category, category)) as typeof query
    }
    return query
  }

  async findById(id: number): Promise<Item | null> {
    const result = await this.db.select().from(items).where(eq(items.id, id))
    return result[0] ?? null
  }

  async findAllAsMap(): Promise<Map<string, Item>> {
    const allItems = await this.db.select().from(items)
    return new Map(allItems.map(item => [item.uniqueName, item]))
  }

  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    return this.db
      .select({
        category: items.category,
        count: sql<number>`count(*)::int`,
      })
      .from(items)
      .groupBy(items.category)
      .orderBy(items.category)
  }

  async upsertMany(itemsToInsert: Omit<Item, 'id'>[]): Promise<void> {
    const BATCH_SIZE = 100
    for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
      const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
      await this.db.insert(items).values(batch).onConflictDoUpdate({
        target: items.uniqueName,
        set: {
          name: items.name,
          category: items.category,
          isPrime: items.isPrime,
          masteryReq: items.masteryReq,
          maxRank: items.maxRank,
          imageName: items.imageName,
          vaulted: items.vaulted,
        },
      })
    }
  }
}
