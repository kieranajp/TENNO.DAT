import Items from '@wfcd/items'
import { sql } from 'drizzle-orm'
import { db, schema } from './connection'

// Categories to fetch from @wfcd/items
// The library filters by productCategory, not the 'category' field
const MASTERABLE_CATEGORIES = [
  'Warframes',
  'Primary',
  'Secondary',
  'Melee',
  'Pets',
  'Sentinels',
  'SentinelWeapons',  // Library filters by productCategory
  'Archwing',
  'Arch-Gun',         // Library uses hyphenated name
  'Arch-Melee',       // Library uses hyphenated name
  'Misc',             // For Amps (will filter to prisms only)
]

/**
 * Normalize category names from @wfcd/items to our internal format.
 * - Arch-Gun and Arch-Melee use hyphens in the library but we want ArchGun/ArchMelee
 * - SentinelWeapons items have category: "Primary" but we want them as SentinelWeapons
 * - Modular weapons (Zaws, Kitguns, Amps) need special categorization based on uniqueName
 * - Necramechs separated from Warframes
 * - K-Drives as Vehicles instead of Misc
 */
function normalizeCategory(item: any): string {
  // Skip PvP variants
  if (item.uniqueName?.includes('PvPVariant')) {
    return 'PvPVariant' // Will be filtered out
  }

  // Necramechs (Bonewidow, Voidrig)
  if (item.name === 'Bonewidow' || item.name === 'Voidrig') {
    return 'Necramech'
  }

  // K-Drives (hoverboards) - only the board decks count for mastery
  if (item.uniqueName?.includes('/Vehicles/Hoverboard/') && item.uniqueName?.includes('Deck')) {
    return 'Vehicles'
  }

  // Zaw strikes (primary parts only - Tip in path means it's the strike)
  if (item.uniqueName?.includes('ModularMelee') && item.uniqueName?.includes('/Tip/')) {
    return 'Zaw'
  }

  // Kitgun chambers (primary parts only - Barrel in path means it's the chamber)
  if (item.uniqueName?.includes('SUModularSecondary') && item.uniqueName?.includes('/Barrel/')) {
    return 'Kitgun'
  }
  if (item.uniqueName?.includes('SUModularPrimary') && item.uniqueName?.includes('/Barrel/')) {
    return 'Kitgun'
  }

  // Amp prisms (primary parts only - Barrel in path means it's the prism)
  // Includes the Mote Amp (training amp) and Sirocco (Drifter amp)
  if (item.uniqueName?.includes('OperatorAmplifiers') && item.uniqueName?.includes('Barrel')) {
    return 'Amp'
  }
  if (item.uniqueName === '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon') {
    return 'Amp' // Sirocco (Drifter's amp)
  }

  // Skip non-primary modular parts (grips, links, braces, loaders, etc)
  if (item.uniqueName?.includes('ModularMelee') ||
      item.uniqueName?.includes('OperatorAmplifiers') ||
      item.uniqueName?.includes('SUModular')) {
    return 'ModularPart' // Will be filtered out
  }

  // SentinelWeapons items have productCategory set correctly but category says "Primary"
  if (item.productCategory === 'SentinelWeapons') {
    return 'SentinelWeapons'
  }

  // Normalize hyphenated categories to our internal names
  const categoryMap: Record<string, string> = {
    'Arch-Gun': 'ArchGun',
    'Arch-Melee': 'ArchMelee',
  }
  return categoryMap[item.category] ?? item.category
}

async function seed() {
  console.log('Fetching items from @wfcd/items...')

  const allItems = new Items({ category: MASTERABLE_CATEGORIES as any })

  // Include items marked as masterable, plus modular weapon primary parts
  // (The library incorrectly marks amp/zaw/kitgun parts as non-masterable)
  const masterableItems = allItems.filter((item: any) => {
    const isModularPrimary =
      (item.uniqueName?.includes('ModularMelee') && item.uniqueName?.includes('/Tip/')) ||
      (item.uniqueName?.includes('SUModular') && item.uniqueName?.includes('/Barrel/')) ||
      (item.uniqueName?.includes('OperatorAmplifiers') && item.uniqueName?.includes('Barrel')) ||
      item.uniqueName === '/Lotus/Weapons/Operator/Pistols/DrifterPistol/DrifterPistolPlayerWeapon' // Sirocco

    return item.masterable !== false || isModularPrimary
  })

  console.log(`Found ${masterableItems.length} masterable items`)

  const getMaxRank = (item: any): number => {
    if (item.category === 'Necramechs') return 40
    if (item.name?.includes('Kuva ') || item.name?.includes('Tenet ')) return 40
    if (item.name === 'Paracesis') return 40
    return 30
  }

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
      const mapped = {
        uniqueName: String(item.uniqueName ?? ''),
        name: String(item.name ?? ''),
        category: normalizeCategory(item),  // Normalize category names
        isPrime: Boolean(item.isPrime ?? false),
        masteryReq: getMasteryReq(item),
        maxRank: getMaxRank(item),
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
    .filter(item => item.category !== 'ModularPart' && item.category !== 'PvPVariant')  // Exclude non-primary modular parts and PvP variants

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
