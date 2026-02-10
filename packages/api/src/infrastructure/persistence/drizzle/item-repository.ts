import { eq, sql, inArray, and } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { items, itemComponents, itemDrops, componentDrops, itemResources, resources, playerMastery } from './schema'
import type { Item } from '../../../domain/entities/item'
import type { ItemRepository, PersonalStats } from '../../../domain/ports/item-repository'
import type { ItemAcquisitionData } from '@warframe-tracker/shared'

export class DrizzleItemRepository implements ItemRepository {
  constructor(private db: DrizzleDb) {}

  async findAll(category?: string): Promise<Item[]> {
    let query = this.db.select().from(items)
    if (category) {
      query = query.where(eq(items.category, category)) as typeof query
    }
    const result = await query
    return result.map(item => ({
      ...item,
      acquisitionData: item.acquisitionData as ItemAcquisitionData | null,
    }))
  }

  async findById(id: number): Promise<Item | null> {
    const result = await this.db.select().from(items).where(eq(items.id, id))
    const item = result[0]
    if (!item) return null
    return {
      ...item,
      acquisitionData: item.acquisitionData as ItemAcquisitionData | null,
    }
  }

  /**
   * Find an item by ID with full acquisition data from relational tables.
   * Returns the item with components and drops properly joined.
   * If playerId is provided, also includes personal combat stats.
   */
  async findByIdWithAcquisitionData(
    id: number,
    playerId?: string
  ): Promise<(Item & { acquisitionData: ItemAcquisitionData; personalStats: PersonalStats | null }) | null> {
    // Get the base item
    const [item] = await this.db.select().from(items).where(eq(items.id, id))
    if (!item) return null

    // Get personal stats if player specified
    let personalStats: PersonalStats | null = null
    if (playerId) {
      const [mastery] = await this.db
        .select({
          fired: playerMastery.fired,
          hits: playerMastery.hits,
          kills: playerMastery.kills,
          headshots: playerMastery.headshots,
          equipTime: playerMastery.equipTime,
          assists: playerMastery.assists,
        })
        .from(playerMastery)
        .where(and(
          eq(playerMastery.itemId, id),
          eq(playerMastery.playerId, playerId)
        ))

      if (mastery && mastery.kills !== null) {
        personalStats = {
          fired: mastery.fired,
          hits: mastery.hits,
          kills: mastery.kills ?? 0,
          headshots: mastery.headshots ?? 0,
          equipTime: mastery.equipTime ?? 0,
          assists: mastery.assists ?? 0,
        }
      }
    }

    // Get item drops
    const drops = await this.db
      .select()
      .from(itemDrops)
      .where(eq(itemDrops.itemId, id))

    // Get components with their drops
    const components = await this.db
      .select()
      .from(itemComponents)
      .where(eq(itemComponents.itemId, id))

    // Get component drops for each component
    const componentIds = components.map(c => c.id)
    const allComponentDrops = componentIds.length > 0
      ? await this.db
          .select()
          .from(componentDrops)
          .where(inArray(componentDrops.componentId, componentIds))
      : []

    // Group component drops by component ID
    const componentDropsMap = new Map<number, typeof allComponentDrops>()
    for (const drop of allComponentDrops) {
      const existing = componentDropsMap.get(drop.componentId) ?? []
      existing.push(drop)
      componentDropsMap.set(drop.componentId, existing)
    }

    // Get required resources with quantities
    const resourceRequirements = await this.db
      .select({
        id: resources.id,
        name: resources.name,
        type: resources.type,
        imageName: resources.imageName,
        quantity: itemResources.quantity,
      })
      .from(itemResources)
      .innerJoin(resources, eq(itemResources.resourceId, resources.id))
      .where(eq(itemResources.itemId, id))

    // Build acquisition data from relational tables
    const acquisitionData: ItemAcquisitionData = {
      drops: drops.map(d => ({
        location: d.location,
        chance: Number(d.chance),
        rarity: d.rarity ?? 'Common',
      })),
      components: components.map(c => ({
        id: c.id,
        name: c.name,
        itemCount: c.itemCount,
        ducats: c.ducats ?? undefined,
        tradable: c.tradable ?? undefined,
        drops: (componentDropsMap.get(c.id) ?? []).map(d => ({
          location: d.location,
          chance: Number(d.chance),
          rarity: d.rarity ?? undefined,
        })),
      })),
      resources: resourceRequirements.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type as 'Resource' | 'Gem' | 'Plant',
        imageName: r.imageName,
        quantity: r.quantity,
      })),
      introduced: item.introducedName || item.introducedDate ? {
        name: item.introducedName,
        date: item.introducedDate,
      } : null,
    }

    return {
      ...item,
      acquisitionData,
      personalStats,
    }
  }

  async findAllAsMap(): Promise<Map<string, Item>> {
    const allItems = await this.db.select().from(items)
    return new Map(allItems.map(item => [item.uniqueName, {
      ...item,
      acquisitionData: item.acquisitionData as ItemAcquisitionData | null,
    }]))
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

  async findPrimesWithComponents(category?: string): Promise<Array<Item & {
    components: Array<{
      id: number
      name: string
      ducats: number | null
      drops: Array<{ location: string; chance: number; rarity: string | null }>
    }>
  }>> {
    const conditions = [eq(items.isPrime, true)]
    if (category) conditions.push(eq(items.category, category))

    const primeItems = await this.db
      .select()
      .from(items)
      .where(and(...conditions))
      .orderBy(items.name)

    if (primeItems.length === 0) return []

    const primeIds = primeItems.map(p => p.id)

    // Get tradeable components (ducats IS NOT NULL = Prime parts)
    const comps = await this.db
      .select()
      .from(itemComponents)
      .where(inArray(itemComponents.itemId, primeIds))

    const compIds = comps.map(c => c.id)
    const drops = compIds.length > 0
      ? await this.db
          .select()
          .from(componentDrops)
          .where(inArray(componentDrops.componentId, compIds))
      : []

    const dropsMap = new Map<number, typeof drops>()
    for (const d of drops) {
      const arr = dropsMap.get(d.componentId) ?? []
      arr.push(d)
      dropsMap.set(d.componentId, arr)
    }

    const compsMap = new Map<number, typeof comps>()
    for (const c of comps) {
      const arr = compsMap.get(c.itemId) ?? []
      arr.push(c)
      compsMap.set(c.itemId, arr)
    }

    return primeItems.map(item => ({
      ...item,
      acquisitionData: item.acquisitionData as ItemAcquisitionData | null,
      components: (compsMap.get(item.id) ?? []).map(c => ({
        id: c.id,
        name: c.name,
        itemCount: c.itemCount,
        ducats: c.ducats,
        drops: (dropsMap.get(c.id) ?? []).map(d => ({
          location: d.location,
          chance: Number(d.chance),
          rarity: d.rarity,
        })),
      })),
    }))
  }

  async getComponentCountsByItem(itemIds: number[]): Promise<Map<number, { total: number; componentIds: number[] }>> {
    if (itemIds.length === 0) return new Map()
    const rows = await this.db
      .select({ id: itemComponents.id, itemId: itemComponents.itemId })
      .from(itemComponents)
      .where(inArray(itemComponents.itemId, itemIds))

    const result = new Map<number, { total: number; componentIds: number[] }>()
    for (const row of rows) {
      const entry = result.get(row.itemId) ?? { total: 0, componentIds: [] }
      entry.total++
      entry.componentIds.push(row.id)
      result.set(row.itemId, entry)
    }
    return result
  }

  async getComponentIdsForItems(itemIds: number[]): Promise<number[]> {
    if (itemIds.length === 0) return []
    const rows = await this.db
      .select({ id: itemComponents.id })
      .from(itemComponents)
      .where(inArray(itemComponents.itemId, itemIds))
    return rows.map(r => r.id)
  }

  async upsertMany(itemsToInsert: Omit<Item, 'id'>[]): Promise<void> {
    const BATCH_SIZE = 100
    for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
      const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
      await this.db.insert(items).values(batch).onConflictDoUpdate({
        target: items.uniqueName,
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          isPrime: sql`excluded.is_prime`,
          masteryReq: sql`excluded.mastery_req`,
          maxRank: sql`excluded.max_rank`,
          imageName: sql`excluded.image_name`,
          vaulted: sql`excluded.vaulted`,
        },
      })
    }
  }
}
