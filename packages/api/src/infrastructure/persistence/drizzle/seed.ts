import Items from '@wfcd/items'
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

  const itemsToInsert = masterableItems.map((item: any) => ({
    uniqueName: item.uniqueName,
    name: item.name,
    category: item.category,
    isPrime: item.isPrime ?? false,
    masteryReq: item.masteryReq ?? 0,
    maxRank: getMaxRank(item),
    imageName: item.imageName ?? null,
    vaulted: item.vaulted ?? null,
  }))

  console.log('Inserting items into database...')

  const BATCH_SIZE = 100
  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE)
    await db.insert(schema.items).values(batch).onConflictDoUpdate({
      target: schema.items.uniqueName,
      set: {
        name: schema.items.name,
        category: schema.items.category,
        isPrime: schema.items.isPrime,
        masteryReq: schema.items.masteryReq,
        maxRank: schema.items.maxRank,
        imageName: schema.items.imageName,
        vaulted: schema.items.vaulted,
      },
    })
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, itemsToInsert.length)}/${itemsToInsert.length}`)
  }

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(console.error)
