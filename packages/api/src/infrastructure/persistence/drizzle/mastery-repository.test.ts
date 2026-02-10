import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleMasteryRepository } from './mastery-repository'
import { MasteryState } from '../../../domain/entities/mastery'
import { items } from './schema'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzleMasteryRepository

const playerId = 'TestPlayer123'

// Item IDs populated in beforeEach
let frostId: number
let bratonId: number
let kuvaZarrId: number // maxRank 40

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzleMasteryRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)

  const insertedItems = await db.insert(items).values([
    { uniqueName: '/Lotus/Powersuits/Frost/Frost', name: 'Frost', category: 'Warframes', maxRank: 30 },
    { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton', name: 'Braton', category: 'Primary', maxRank: 30 },
    { uniqueName: '/Lotus/Weapons/Grineer/KuvaZarr', name: 'Kuva Zarr', category: 'Primary', maxRank: 40 },
  ]).returning()
  frostId = insertedItems[0].id
  bratonId = insertedItems[1].id
  kuvaZarrId = insertedItems[2].id
})

afterAll(async () => {
  await cleanup()
})

describe('DrizzleMasteryRepository', () => {
  describe('upsertMany', () => {
    it('inserts new mastery records', async () => {
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30 },
        { playerId, itemId: bratonId, xp: 450000, rank: 21 },
      ])

      const result = await repo.getItemsWithMastery(playerId)
      expect(result).toHaveLength(3) // All items, including ones with no mastery
      const frost = result.find(r => r.id === frostId)!
      expect(frost.xp).toBe(900000)
      expect(frost.rank).toBe(30)
    })

    it('updates on conflict (playerId + itemId)', async () => {
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 100, rank: 1 },
      ])
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30, kills: 500, headshots: 100 },
      ])

      const result = await repo.getItemsWithMastery(playerId)
      const frost = result.find(r => r.id === frostId)!
      expect(frost.xp).toBe(900000)
      expect(frost.rank).toBe(30)
    })
  })

  describe('getSummary', () => {
    it('returns category summary with total and mastered counts', async () => {
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30 },
        { playerId, itemId: bratonId, xp: 450000, rank: 21 },
      ])

      const summary = await repo.getSummary(playerId)
      const warframes = summary.find(s => s.category === 'Warframes')!
      expect(warframes.total).toBe(1)
      expect(warframes.mastered).toBe(1)

      const primary = summary.find(s => s.category === 'Primary')!
      expect(primary.total).toBe(2) // Braton + Kuva Zarr
      expect(primary.mastered).toBe(0) // Neither fully mastered
    })

    it('counts rank 40 items as mastered only at rank >= 40', async () => {
      // Kuva Zarr at rank 30 should NOT count as mastered
      await repo.upsertMany([
        { playerId, itemId: kuvaZarrId, xp: 900000, rank: 30 },
      ])
      let summary = await repo.getSummary(playerId)
      let primary = summary.find(s => s.category === 'Primary')!
      expect(primary.mastered).toBe(0)

      // Now at rank 40 it should count
      await repo.upsertMany([
        { playerId, itemId: kuvaZarrId, xp: 1600000, rank: 40 },
      ])
      summary = await repo.getSummary(playerId)
      primary = summary.find(s => s.category === 'Primary')!
      expect(primary.mastered).toBe(1)
    })

    it('includes categories with no mastery data', async () => {
      const summary = await repo.getSummary(playerId)
      expect(summary.length).toBeGreaterThan(0)
      // All items still counted even without mastery records
      const warframes = summary.find(s => s.category === 'Warframes')
      expect(warframes).toBeDefined()
      expect(warframes!.total).toBe(1)
      expect(warframes!.mastered).toBe(0)
    })
  })

  describe('getItemsWithMastery', () => {
    it('returns all items with mastery data LEFT JOIN', async () => {
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30 },
      ])

      const result = await repo.getItemsWithMastery(playerId)
      expect(result).toHaveLength(3)

      const frost = result.find(r => r.id === frostId)!
      expect(frost.xp).toBe(900000)
      expect(frost.masteryState).toBe(MasteryState.Mastered30)

      const braton = result.find(r => r.id === bratonId)!
      expect(braton.xp).toBeNull()
      expect(braton.masteryState).toBe(MasteryState.Unmastered)
    })

    it('filters by category', async () => {
      const result = await repo.getItemsWithMastery(playerId, { category: 'Warframes' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Frost')
    })

    it('filters masteredOnly', async () => {
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30 },
        { playerId, itemId: bratonId, xp: 100, rank: 1 },
      ])

      const result = await repo.getItemsWithMastery(playerId, { masteredOnly: true })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(frostId)
    })

    it('filters unmasteredOnly', async () => {
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30 },
        { playerId, itemId: bratonId, xp: 100, rank: 1 },
      ])

      const result = await repo.getItemsWithMastery(playerId, { unmasteredOnly: true })
      // Braton (rank 1) and Kuva Zarr (no mastery) should be unmastered
      expect(result).toHaveLength(2)
      expect(result.map(r => r.id)).toContain(bratonId)
      expect(result.map(r => r.id)).toContain(kuvaZarrId)
    })

    it('rank40 item at rank 30 is unmastered for filter purposes', async () => {
      await repo.upsertMany([
        { playerId, itemId: kuvaZarrId, xp: 900000, rank: 30 },
      ])

      const mastered = await repo.getItemsWithMastery(playerId, { masteredOnly: true })
      expect(mastered.map(r => r.id)).not.toContain(kuvaZarrId)

      const unmastered = await repo.getItemsWithMastery(playerId, { unmasteredOnly: true })
      expect(unmastered.map(r => r.id)).toContain(kuvaZarrId)
    })
  })

  describe('getMasteredItemIds', () => {
    it('returns item IDs with rank >= 30', async () => {
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30 },
        { playerId, itemId: bratonId, xp: 100, rank: 1 },
      ])

      const ids = await repo.getMasteredItemIds(playerId)
      expect(ids).toEqual([frostId])
    })
  })

  describe('getEquipmentMasteryXP', () => {
    it('computes total equipment mastery XP across items', async () => {
      // Braton: multiplier=500, rank=sqrt(220500/500)=sqrt(441)=21
      await repo.upsertMany([
        { playerId, itemId: frostId, xp: 900000, rank: 30 },
        { playerId, itemId: bratonId, xp: 220500, rank: 21 },
      ])

      const xp = await repo.getEquipmentMasteryXP(playerId)
      // Frost: rank=30, Warframes → 200 XP/rank → 6000
      // Braton: rank=21, Primary → 100 XP/rank → 2100
      expect(xp).toBe(6000 + 2100)
    })

    it('returns 0 when no mastery data exists', async () => {
      expect(await repo.getEquipmentMasteryXP(playerId)).toBe(0)
    })
  })
})
