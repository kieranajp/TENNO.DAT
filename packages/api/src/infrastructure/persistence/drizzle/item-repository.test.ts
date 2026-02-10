import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleItemRepository } from './item-repository'
import { items, itemComponents, itemDrops, componentDrops, itemResources, resources, playerMastery } from './schema'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzleItemRepository

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzleItemRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)
})

afterAll(async () => {
  await cleanup()
})

async function seedItem(overrides: Partial<typeof items.$inferInsert> & { uniqueName: string; name: string; category: string }) {
  const [item] = await db.insert(items).values({
    maxRank: 30,
    ...overrides,
  }).returning()
  return item
}

describe('DrizzleItemRepository', () => {
  describe('upsertMany', () => {
    it('inserts new items', async () => {
      await repo.upsertMany([
        { uniqueName: '/Frost', name: 'Frost', category: 'Warframes', isPrime: false, masteryReq: 0, maxRank: 30, imageName: null, vaulted: null, marketCost: null, bpCost: null, buildPrice: null, buildTime: null, acquisitionData: null, introducedName: null, introducedDate: null },
      ])
      const all = await repo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].name).toBe('Frost')
    })

    it('updates existing items on conflict (by uniqueName)', async () => {
      await repo.upsertMany([
        { uniqueName: '/Frost', name: 'Frost', category: 'Warframes', isPrime: false, masteryReq: 0, maxRank: 30, imageName: null, vaulted: null, marketCost: null, bpCost: null, buildPrice: null, buildTime: null, acquisitionData: null, introducedName: null, introducedDate: null },
      ])
      await repo.upsertMany([
        { uniqueName: '/Frost', name: 'Frost Prime', category: 'Warframes', isPrime: true, masteryReq: 0, maxRank: 30, imageName: 'frost-prime.png', vaulted: true, marketCost: null, bpCost: null, buildPrice: null, buildTime: null, acquisitionData: null, introducedName: null, introducedDate: null },
      ])
      const all = await repo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].name).toBe('Frost Prime')
      expect(all[0].isPrime).toBe(true)
      expect(all[0].imageName).toBe('frost-prime.png')
      expect(all[0].vaulted).toBe(true)
    })

    it('handles batch sizes > 100', async () => {
      const batch = Array.from({ length: 150 }, (_, i) => ({
        uniqueName: `/Item${i}`, name: `Item ${i}`, category: 'Primary', isPrime: false,
        masteryReq: 0, maxRank: 30, imageName: null, vaulted: null,
        marketCost: null, bpCost: null, buildPrice: null, buildTime: null,
        acquisitionData: null, introducedName: null, introducedDate: null,
      }))
      await repo.upsertMany(batch)
      const all = await repo.findAll()
      expect(all).toHaveLength(150)
    })
  })

  describe('findAll', () => {
    it('returns all items', async () => {
      await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes' })
      await seedItem({ uniqueName: '/Braton', name: 'Braton', category: 'Primary' })
      const all = await repo.findAll()
      expect(all).toHaveLength(2)
    })

    it('filters by category', async () => {
      await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes' })
      await seedItem({ uniqueName: '/Braton', name: 'Braton', category: 'Primary' })
      const result = await repo.findAll('Warframes')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Frost')
    })
  })

  describe('findById', () => {
    it('returns item when found', async () => {
      const frost = await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes' })
      const found = await repo.findById(frost.id)
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Frost')
    })

    it('returns null when not found', async () => {
      expect(await repo.findById(99999)).toBeNull()
    })
  })

  describe('findAllAsMap', () => {
    it('returns Map keyed by uniqueName', async () => {
      await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes' })
      await seedItem({ uniqueName: '/Braton', name: 'Braton', category: 'Primary' })
      const map = await repo.findAllAsMap()
      expect(map.size).toBe(2)
      expect(map.get('/Frost')!.name).toBe('Frost')
      expect(map.get('/Braton')!.name).toBe('Braton')
    })
  })

  describe('getCategories', () => {
    it('returns GROUP BY category with counts', async () => {
      await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes' })
      await seedItem({ uniqueName: '/Ember', name: 'Ember', category: 'Warframes' })
      await seedItem({ uniqueName: '/Braton', name: 'Braton', category: 'Primary' })

      const cats = await repo.getCategories()
      expect(cats).toHaveLength(2)
      const warframes = cats.find(c => c.category === 'Warframes')!
      expect(warframes.count).toBe(2)
      const primary = cats.find(c => c.category === 'Primary')!
      expect(primary.count).toBe(1)
    })
  })

  describe('findByIdWithAcquisitionData', () => {
    it('returns item with drops, components, component drops, and resources', async () => {
      const frost = await seedItem({
        uniqueName: '/Frost', name: 'Frost', category: 'Warframes',
        introducedName: 'Update 7', introducedDate: '2013-03-18',
      })

      // Item drops
      await db.insert(itemDrops).values({
        itemId: frost.id, location: 'Ceres/Exta', chance: '0.2586', rarity: 'Uncommon',
      })

      // Components with drops
      const [chassis] = await db.insert(itemComponents).values({
        itemId: frost.id, name: 'Frost Chassis', itemCount: 1, ducats: 15, tradable: true,
      }).returning()

      await db.insert(componentDrops).values({
        componentId: chassis.id, location: 'Ceres/Exta', chance: '0.3866', rarity: 'Common',
      })

      // Resources
      const [plastids] = await db.insert(resources).values({
        uniqueName: '/Lotus/Types/Items/MiscItems/Plastids', name: 'Plastids', type: 'Resource',
      }).returning()
      await db.insert(itemResources).values({
        itemId: frost.id, resourceId: plastids.id, quantity: 500,
      })

      const result = await repo.findByIdWithAcquisitionData(frost.id)
      expect(result).not.toBeNull()

      // Drops
      expect(result!.acquisitionData.drops).toHaveLength(1)
      expect(result!.acquisitionData.drops[0].location).toBe('Ceres/Exta')
      expect(result!.acquisitionData.drops[0].chance).toBeCloseTo(0.2586)

      // Components
      expect(result!.acquisitionData.components).toHaveLength(1)
      expect(result!.acquisitionData.components[0].name).toBe('Frost Chassis')
      expect(result!.acquisitionData.components[0].ducats).toBe(15)
      expect(result!.acquisitionData.components[0].drops).toHaveLength(1)

      // Resources
      expect(result!.acquisitionData.resources).toHaveLength(1)
      expect(result!.acquisitionData.resources![0].name).toBe('Plastids')
      expect(result!.acquisitionData.resources![0].quantity).toBe(500)

      // Introduced
      expect(result!.acquisitionData.introduced).toEqual({
        name: 'Update 7',
        date: '2013-03-18',
      })

      // No personal stats
      expect(result!.personalStats).toBeNull()
    })

    it('includes personal stats when playerId is provided', async () => {
      const frost = await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes' })

      await db.insert(playerMastery).values({
        playerId: 'TestPlayer', itemId: frost.id, xp: 900000, rank: 30,
        kills: 1500, headshots: 300, fired: 5000, hits: 4000, equipTime: 86400, assists: 50,
      })

      const result = await repo.findByIdWithAcquisitionData(frost.id, 'TestPlayer')
      expect(result!.personalStats).not.toBeNull()
      expect(result!.personalStats!.kills).toBe(1500)
      expect(result!.personalStats!.headshots).toBe(300)
      expect(result!.personalStats!.equipTime).toBe(86400)
    })

    it('returns null for non-existent item', async () => {
      expect(await repo.findByIdWithAcquisitionData(99999)).toBeNull()
    })
  })

  describe('findPrimesWithComponents', () => {
    it('returns prime items with their components and drops', async () => {
      const frostPrime = await seedItem({
        uniqueName: '/FrostPrime', name: 'Frost Prime', category: 'Warframes', isPrime: true,
      })
      // Non-prime should not be included
      await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes', isPrime: false })

      const [chassis] = await db.insert(itemComponents).values({
        itemId: frostPrime.id, name: 'Frost Prime Chassis', itemCount: 1, ducats: 15,
      }).returning()

      await db.insert(componentDrops).values({
        componentId: chassis.id, location: 'Lith F1', chance: '0.11', rarity: 'Uncommon',
      })

      const result = await repo.findPrimesWithComponents()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Frost Prime')
      expect(result[0].components).toHaveLength(1)
      expect(result[0].components[0].name).toBe('Frost Prime Chassis')
      expect(result[0].components[0].drops).toHaveLength(1)
    })

    it('filters by category', async () => {
      await seedItem({ uniqueName: '/FrostPrime', name: 'Frost Prime', category: 'Warframes', isPrime: true })
      await seedItem({ uniqueName: '/BratonPrime', name: 'Braton Prime', category: 'Primary', isPrime: true })

      const result = await repo.findPrimesWithComponents('Primary')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Braton Prime')
    })
  })

  describe('getComponentIdsForItems', () => {
    it('returns component IDs for given item IDs', async () => {
      const frost = await seedItem({ uniqueName: '/Frost', name: 'Frost', category: 'Warframes' })
      const [comp1] = await db.insert(itemComponents).values({ itemId: frost.id, name: 'Chassis' }).returning()
      const [comp2] = await db.insert(itemComponents).values({ itemId: frost.id, name: 'Systems' }).returning()

      const ids = await repo.getComponentIdsForItems([frost.id])
      expect(ids).toHaveLength(2)
      expect(ids).toContain(comp1.id)
      expect(ids).toContain(comp2.id)
    })

    it('returns empty array for empty input', async () => {
      expect(await repo.getComponentIdsForItems([])).toEqual([])
    })
  })
})
