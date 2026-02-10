import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleLoadoutRepository } from './loadout-repository'
import { MasteryState } from '../../../domain/entities/mastery'
import { items, playerMastery } from './schema'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzleLoadoutRepository

const playerId = 'TestPlayer123'
let frostId: number
let bratonId: number
let lexId: number
let skanaId: number

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzleLoadoutRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)

  const insertedItems = await db.insert(items).values([
    { uniqueName: '/Frost', name: 'Frost', category: 'Warframes', maxRank: 30, imageName: 'frost.png' },
    { uniqueName: '/Braton', name: 'Braton', category: 'Primary', maxRank: 30, imageName: 'braton.png' },
    { uniqueName: '/Lex', name: 'Lex', category: 'Secondary', maxRank: 30, imageName: 'lex.png' },
    { uniqueName: '/Skana', name: 'Skana', category: 'Melee', maxRank: 30, imageName: 'skana.png' },
  ]).returning()
  frostId = insertedItems[0].id
  bratonId = insertedItems[1].id
  lexId = insertedItems[2].id
  skanaId = insertedItems[3].id
})

afterAll(async () => {
  await cleanup()
})

describe('DrizzleLoadoutRepository', () => {
  describe('upsert', () => {
    it('inserts a new loadout', async () => {
      await repo.upsert(playerId, {
        warframeId: frostId,
        primaryId: bratonId,
        secondaryId: lexId,
        meleeId: skanaId,
        focusSchool: 'Madurai',
      })

      const result = await repo.getWithItems(playerId)
      expect(result).not.toBeNull()
      expect(result!.warframe!.name).toBe('Frost')
      expect(result!.primary!.name).toBe('Braton')
      expect(result!.secondary!.name).toBe('Lex')
      expect(result!.melee!.name).toBe('Skana')
      expect(result!.focusSchool).toBe('Madurai')
    })

    it('updates on conflict (same playerId)', async () => {
      await repo.upsert(playerId, {
        warframeId: frostId,
        primaryId: bratonId,
        secondaryId: null,
        meleeId: null,
        focusSchool: 'Madurai',
      })
      await repo.upsert(playerId, {
        warframeId: frostId,
        primaryId: null,
        secondaryId: lexId,
        meleeId: skanaId,
        focusSchool: 'Zenurik',
      })

      const result = await repo.getWithItems(playerId)
      expect(result!.primary).toBeNull()
      expect(result!.secondary!.name).toBe('Lex')
      expect(result!.melee!.name).toBe('Skana')
      expect(result!.focusSchool).toBe('Zenurik')
    })
  })

  describe('getWithItems', () => {
    it('returns null when no loadout exists', async () => {
      expect(await repo.getWithItems(playerId)).toBeNull()
    })

    it('resolves item FKs with mastery state', async () => {
      // Add mastery data for Frost
      await db.insert(playerMastery).values({
        playerId, itemId: frostId, xp: 900000, rank: 30,
      })

      await repo.upsert(playerId, {
        warframeId: frostId,
        primaryId: bratonId,
        secondaryId: null,
        meleeId: null,
        focusSchool: null,
      })

      const result = await repo.getWithItems(playerId)
      expect(result!.warframe!.masteryState).toBe(MasteryState.Mastered30)
      expect(result!.primary!.masteryState).toBe(MasteryState.Unmastered)
    })

    it('handles all-null slots', async () => {
      await repo.upsert(playerId, {
        warframeId: null,
        primaryId: null,
        secondaryId: null,
        meleeId: null,
        focusSchool: 'Vazarin',
      })

      const result = await repo.getWithItems(playerId)
      expect(result!.warframe).toBeNull()
      expect(result!.primary).toBeNull()
      expect(result!.secondary).toBeNull()
      expect(result!.melee).toBeNull()
      expect(result!.focusSchool).toBe('Vazarin')
    })
  })
})
