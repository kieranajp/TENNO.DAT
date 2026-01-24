import Items from '@wfcd/items'
import { sql } from 'drizzle-orm'
import { db, schema } from './connection'

const MASTERABLE_CATEGORIES = [
  'Warframes',
  'Primary',
  'Secondary',
  'Melee',
  'Pets',
  'Sentinels',
  'SentinelWeapons',
  'Archwing',
  'ArchGun',
  'ArchMelee',
]

async function seed() {
  console.log('Fetching items from @wfcd/items...')

  const allItems = new Items({ category: MASTERABLE_CATEGORIES })
  const masterableItems = allItems.filter((item: any) => item.masterable !== false)

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

  const itemsToInsert = masterableItems.map((item: any) => {
    const mapped = {
      uniqueName: String(item.uniqueName ?? ''),
      name: String(item.name ?? ''),
      category: String(item.category ?? ''),
      isPrime: Boolean(item.isPrime ?? false),
      masteryReq: getMasteryReq(item),
      maxRank: getMaxRank(item),
      imageName: item.imageName ? String(item.imageName) : null,
      vaulted: item.vaulted != null ? Boolean(item.vaulted) : null,
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
      },
    })
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, itemsToInsert.length)}/${itemsToInsert.length}`)
  }

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(console.error)
