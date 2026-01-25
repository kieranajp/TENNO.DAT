import Items from '@wfcd/items'
import { sql } from 'drizzle-orm'
import { db, schema } from './connection'
import { WFCD_CATEGORIES, SeedingRules } from '@warframe-tracker/shared'

// Categories to fetch from @wfcd/items
// The library filters by productCategory, not the 'category' field
const MASTERABLE_CATEGORIES = WFCD_CATEGORIES

async function seed() {
  console.log('Fetching items from @wfcd/items...')

  const allItems = new Items({ category: MASTERABLE_CATEGORIES as any })

  // Filter to masterable items using declarative rules
  const masterableItems = allItems.filter((item: any) => SeedingRules.shouldInclude(item))

  console.log(`Found ${masterableItems.length} masterable items`)

  const getMasteryReq = (item: any): number => {
    const mr = item.masteryReq
    if (typeof mr === 'number') return mr
    if (typeof mr === 'object' && mr !== null) return Number(mr.value ?? mr.mr ?? 0)
    return 0
  }

  /**
   * Extract acquisition data from an item.
   * Includes drops, components, and introduction info.
   */
  const getAcquisitionData = (item: any) => {
    const drops = (item.drops ?? []).map((d: any) => ({
      location: d.location ?? d.place ?? 'Unknown',
      chance: typeof d.chance === 'number' ? d.chance : 0,
      rarity: d.rarity ?? 'Common',
    }))

    const components = (item.components ?? []).map((c: any) => ({
      name: c.name ?? 'Component',
      drops: (c.drops ?? []).slice(0, 5).map((d: any) => ({
        location: d.location ?? d.place ?? 'Unknown',
        chance: typeof d.chance === 'number' ? d.chance : 0,
      })),
    }))

    return {
      drops: drops.slice(0, 10),  // Limit to prevent huge JSON
      components: components.slice(0, 10),
      introduced: item.introduced ? {
        name: item.introduced.name ?? null,
        date: item.introduced.date ?? null,
      } : null,
    }
  }

  const itemsToInsert = masterableItems
    .map((item: any) => {
      // Detect category using declarative rules
      const category = SeedingRules.detectCategory(item)

      // Skip items with no valid category
      if (!category) {
        return null
      }

      const mapped = {
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
        acquisitionData: getAcquisitionData(item),
      }
      // Validate all integer fields
      if (typeof mapped.masteryReq !== 'number' || isNaN(mapped.masteryReq)) {
        console.error('Invalid masteryReq for', item.name, ':', item.masteryReq)
        mapped.masteryReq = 0
      }
      if (typeof mapped.maxRank !== 'number' || isNaN(mapped.maxRank)) {
        console.error('Invalid maxRank for', item.name, ':', item.maxRank)
        mapped.maxRank = 30
      }
      return mapped
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

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
    acquisitionData: {
      drops: [],
      components: [],
      introduced: {
        name: 'Update 29.10.0: Corpus Proxima & The New Railjack',
        date: '2021-03-19',
      },
    },
  })

  console.log('Inserting items into database...')

  const BATCH_SIZE = 100
  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
    await db.insert(schema.items).values(batch).onConflictDoUpdate({
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
        acquisitionData: sql`excluded.acquisition_data`,
      },
    })
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, itemsToInsert.length)}/${itemsToInsert.length}`)
  }

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(console.error)
