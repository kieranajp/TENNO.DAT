import Items from '@wfcd/items'
import { sql, eq } from 'drizzle-orm'
import { db, schema } from './connection'
import { WFCD_CATEGORIES, SeedingRules } from '@warframe-tracker/shared'
import { createLogger } from '../../logger'
import { seedResources, getResourceMaps } from './seed-resources'
import { isCraftedPart, getMasteryReq, extractComponents, extractDrops } from './seed-utils'

const log = createLogger('Seed')

// Categories to fetch from @wfcd/items
// The library filters by productCategory, not the 'category' field
const MASTERABLE_CATEGORIES = WFCD_CATEGORIES

interface RawItem {
  uniqueName: string
  name: string
  category: string
  isPrime: boolean
  masteryReq: number
  maxRank: number
  imageName: string | null
  vaulted: boolean | null
  marketCost: number | null
  bpCost: number | null
  buildPrice: number | null
  buildTime: number | null
  introducedName: string | null
  introducedDate: string | null
  // Legacy JSONB field (kept for rollback safety)
  acquisitionData: {
    drops: Array<{ location: string; chance: number; rarity: string }>
    components: Array<{ name: string; itemCount: number; ducats?: number; tradable?: boolean; drops: Array<{ location: string; chance: number; rarity?: string }> }>
    introduced: { name: string | null; date: string | null } | null
  }
  // Raw component data for relational tables
  rawComponents: Array<{
    name: string
    itemCount: number
    ducats?: number
    tradable?: boolean
    drops: Array<{ location: string; chance: number; rarity?: string }>
  }>
  // Raw drop data for relational tables
  rawDrops: Array<{ location: string; chance: number; rarity: string }>
}

async function seed() {
  // First, seed resources table
  log.info('Seeding resources table...')
  await seedResources()

  log.info('Fetching items from @wfcd/items...')

  const allItems = new Items({ category: MASTERABLE_CATEGORIES as any })

  // Filter to masterable items using declarative rules
  const masterableItems = allItems.filter((item: any) => SeedingRules.shouldInclude(item))

  log.info(`Found ${masterableItems.length} masterable items`)

  const itemsToInsert: RawItem[] = masterableItems
    .map((item: any) => {
      // Detect category using declarative rules
      const category = SeedingRules.detectCategory(item)

      // Skip items with no valid category
      if (!category) {
        return null
      }

      const components = extractComponents(item)
      const drops = extractDrops(item)

      const mapped: RawItem = {
        uniqueName: String(item.uniqueName ?? ''),
        name: String(item.name ?? ''),
        category,
        isPrime: Boolean(item.isPrime ?? false),
        masteryReq: getMasteryReq(item),
        maxRank: SeedingRules.getMaxRank(item, category),
        imageName: item.imageName ? String(item.imageName) : null,
        vaulted: item.vaulted != null ? Boolean(item.vaulted) : null,
        // Acquisition data
        marketCost: typeof item.marketCost === 'number' ? item.marketCost : null,
        bpCost: typeof item.bpCost === 'number' ? item.bpCost : null,
        buildPrice: typeof item.buildPrice === 'number' ? item.buildPrice : null,
        buildTime: typeof item.buildTime === 'number' ? item.buildTime : null,
        // Introduced info (normalized)
        introducedName: item.introduced?.name ?? null,
        introducedDate: item.introduced?.date ?? null,
        // Legacy JSONB field (kept for rollback safety)
        acquisitionData: {
          drops,
          components,
          introduced: item.introduced ? {
            name: item.introduced.name ?? null,
            date: item.introduced.date ?? null,
          } : null,
        },
        // Raw data for relational tables
        rawComponents: components,
        rawDrops: drops,
      }
      // Validate all integer fields
      if (typeof mapped.masteryReq !== 'number' || isNaN(mapped.masteryReq)) {
        log.warn('Invalid masteryReq', { item: item.name, value: item.masteryReq })
        mapped.masteryReq = 0
      }
      if (typeof mapped.maxRank !== 'number' || isNaN(mapped.maxRank)) {
        log.warn('Invalid maxRank', { item: item.name, value: item.maxRank })
        mapped.maxRank = 30
      }
      return mapped
    })
    .filter((item): item is RawItem => item !== null)

  // Add Plexus manually (not in @wfcd/items library)
  // The Plexus is the Railjack mod configuration system introduced in Update 29.10.0
  itemsToInsert.push({
    uniqueName: '/Lotus/Types/Game/CrewShip/RailJack/DefaultHarness',
    name: 'Plexus',
    category: 'Vehicles',
    isPrime: false,
    masteryReq: 0,
    maxRank: 30,
    imageName: 'railjack-9d84497d87.png',
    vaulted: null,
    marketCost: null,
    bpCost: null,
    buildPrice: null,
    buildTime: null,
    introducedName: 'Update 29.10.0: Corpus Proxima & The New Railjack',
    introducedDate: '2021-03-19',
    acquisitionData: {
      drops: [],
      components: [],
      introduced: {
        name: 'Update 29.10.0: Corpus Proxima & The New Railjack',
        date: '2021-03-19',
      },
    },
    rawComponents: [],
    rawDrops: [],
  })

  log.info('Inserting items into database...')

  // First pass: Insert/update items
  const BATCH_SIZE = 100
  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
    await db.insert(schema.items).values(batch.map(item => ({
      uniqueName: item.uniqueName,
      name: item.name,
      category: item.category,
      isPrime: item.isPrime,
      masteryReq: item.masteryReq,
      maxRank: item.maxRank,
      imageName: item.imageName,
      vaulted: item.vaulted,
      marketCost: item.marketCost,
      bpCost: item.bpCost,
      buildPrice: item.buildPrice,
      buildTime: item.buildTime,
      introducedName: item.introducedName,
      introducedDate: item.introducedDate,
      acquisitionData: item.acquisitionData,
    }))).onConflictDoUpdate({
      target: schema.items.uniqueName,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        isPrime: sql`excluded.is_prime`,
        masteryReq: sql`excluded.mastery_req`,
        maxRank: sql`excluded.max_rank`,
        imageName: sql`excluded.image_name`,
        vaulted: sql`excluded.vaulted`,
        marketCost: sql`excluded.market_cost`,
        bpCost: sql`excluded.bp_cost`,
        buildPrice: sql`excluded.build_price`,
        buildTime: sql`excluded.build_time`,
        introducedName: sql`excluded.introduced_name`,
        introducedDate: sql`excluded.introduced_date`,
        acquisitionData: sql`excluded.acquisition_data`,
      },
    })
    log.debug(`Inserted items ${Math.min(i + BATCH_SIZE, itemsToInsert.length)}/${itemsToInsert.length}`)
  }

  // Build a map of uniqueName -> id for inserted items
  log.info('Building item ID map...')
  const allDbItems = await db.select({ id: schema.items.id, uniqueName: schema.items.uniqueName }).from(schema.items)
  const itemIdMap = new Map(allDbItems.map(item => [item.uniqueName, item.id]))

  // Clear existing relational data (for re-seeding)
  log.info('Clearing existing relational data...')
  await db.delete(schema.componentDrops)
  await db.delete(schema.itemDrops)
  await db.delete(schema.itemComponents)
  await db.delete(schema.itemResources)

  // Get resource maps for linking components to resources
  const { resourceIdByName } = await getResourceMaps()

  // Second pass: Insert components and drops
  log.info('Inserting components and drops...')

  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE)

    // Insert item drops
    const itemDropsToInsert = batch.flatMap(item => {
      const itemId = itemIdMap.get(item.uniqueName)
      if (!itemId) return []
      return item.rawDrops.map(drop => ({
        itemId,
        location: drop.location,
        chance: String(drop.chance),
        rarity: drop.rarity,
      }))
    })

    if (itemDropsToInsert.length > 0) {
      await db.insert(schema.itemDrops).values(itemDropsToInsert)
    }

    // Insert components (separating crafted parts from resources)
    for (const item of batch) {
      const itemId = itemIdMap.get(item.uniqueName)
      if (!itemId || item.rawComponents.length === 0) continue

      // Deduplicate components by name (some items have duplicate component entries)
      const seenNames = new Set<string>()
      const uniqueComponents = item.rawComponents.filter(comp => {
        if (seenNames.has(comp.name)) return false
        seenNames.add(comp.name)
        return true
      })

      // Separate crafted parts from resources
      const craftedParts = uniqueComponents.filter(comp => isCraftedPart(comp))
      const resourceComponents = uniqueComponents.filter(comp => !isCraftedPart(comp))

      // Insert crafted parts into item_components
      for (const comp of craftedParts) {
        const [insertedComponent] = await db.insert(schema.itemComponents).values({
          itemId,
          name: comp.name,
          itemCount: comp.itemCount,
          ducats: comp.ducats ?? null,
          tradable: comp.tradable ?? false,
        }).returning({ id: schema.itemComponents.id })

        // Insert component drops
        if (comp.drops.length > 0 && insertedComponent) {
          await db.insert(schema.componentDrops).values(
            comp.drops.map(drop => ({
              componentId: insertedComponent.id,
              location: drop.location,
              chance: String(drop.chance),
              rarity: drop.rarity ?? null,
            }))
          )
        }
      }

      // Insert resource requirements into item_resources
      for (const comp of resourceComponents) {
        const resourceId = resourceIdByName.get(comp.name.toLowerCase())
        if (resourceId) {
          await db.insert(schema.itemResources).values({
            itemId,
            resourceId,
            quantity: comp.itemCount,
          }).onConflictDoNothing()
        } else {
          // Resource not found in resources table - log and skip
          // This might be a crafted part we didn't recognize
          log.debug(`Unknown resource "${comp.name}" for item "${item.name}" - skipping`)
        }
      }
    }

    log.debug(`Processed relational data ${Math.min(i + BATCH_SIZE, itemsToInsert.length)}/${itemsToInsert.length}`)
  }

  log.info('Seed complete!')
  process.exit(0)
}

seed().catch((err) => {
  log.error('Seed failed', err)
  process.exit(1)
})
