import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { createTestDb, truncateAll } from './test-db'
import { DrizzleNodeRepository } from './node-repository'
import { nodes } from './schema'
import type { DrizzleDb } from './connection'

let db: DrizzleDb
let cleanup: () => Promise<void>
let repo: DrizzleNodeRepository

beforeAll(async () => {
  ;({ db, cleanup } = await createTestDb())
  repo = new DrizzleNodeRepository(db)
})

beforeEach(async () => {
  await truncateAll(db)
})

afterAll(async () => {
  await cleanup()
})

async function seedNodes() {
  return db.insert(nodes).values([
    { nodeKey: 'SolNode1', name: 'Terminus', planet: 'Mercury', nodeType: 'mission', missionType: 'Sabotage', masteryXp: 63 },
    { nodeKey: 'SolNode2', name: 'Caloris', planet: 'Mercury', nodeType: 'mission', missionType: 'Rescue', masteryXp: 63 },
    { nodeKey: 'SolNode3', name: 'Apollodorus', planet: 'Mercury', nodeType: 'mission', missionType: 'Survival', masteryXp: 63 },
    { nodeKey: 'SolNode100', name: 'Tessera', planet: 'Venus', nodeType: 'mission', missionType: 'Defense', masteryXp: 63 },
    { nodeKey: 'SolNode101', name: 'E Gate', planet: 'Venus', nodeType: 'mission', missionType: 'Exterminate', masteryXp: 63 },
    { nodeKey: 'Junction1', name: 'Venus Junction', planet: 'Mercury', nodeType: 'junction', missionType: null, masteryXp: 1000 },
  ]).returning()
}

describe('DrizzleNodeRepository', () => {
  describe('findAllAsMap', () => {
    it('returns a Map keyed by nodeKey', async () => {
      await seedNodes()
      const map = await repo.findAllAsMap()
      expect(map.size).toBe(6)
      const terminus = map.get('SolNode1')!
      expect(terminus.name).toBe('Terminus')
      expect(terminus.planet).toBe('Mercury')
      expect(terminus.nodeType).toBe('mission')
    })

    it('returns empty map when no nodes exist', async () => {
      const map = await repo.findAllAsMap()
      expect(map.size).toBe(0)
    })
  })

  describe('upsertCompletions', () => {
    it('inserts new completions by resolving nodeKey to id', async () => {
      await seedNodes()
      const playerId = 'TestPlayer'

      await repo.upsertCompletions(playerId, [
        { nodeKey: 'SolNode1', completes: 5, isSteelPath: false },
        { nodeKey: 'SolNode2', completes: 3, isSteelPath: false },
      ])

      const progress = await repo.getNodesWithCompletion(playerId, false)
      const mercury = progress.planets.find(p => p.name === 'Mercury')!
      expect(mercury.completed).toBe(2)
    })

    it('updates on conflict (playerId + nodeId + isSteelPath)', async () => {
      await seedNodes()
      const playerId = 'TestPlayer'

      await repo.upsertCompletions(playerId, [
        { nodeKey: 'SolNode1', completes: 5, isSteelPath: false },
      ])
      await repo.upsertCompletions(playerId, [
        { nodeKey: 'SolNode1', completes: 10, isSteelPath: false },
      ])

      const progress = await repo.getNodesWithCompletion(playerId, false)
      const mercury = progress.planets.find(p => p.name === 'Mercury')!
      const terminus = mercury.nodes.find(n => n.nodeKey === 'SolNode1')!
      expect(terminus.completed).toBe(true) // just checking it's still marked complete
    })

    it('filters out unknown node keys', async () => {
      await seedNodes()
      // Should not throw even with unknown keys
      await repo.upsertCompletions('TestPlayer', [
        { nodeKey: 'UnknownNode', completes: 1, isSteelPath: false },
      ])
    })

    it('handles empty completions', async () => {
      await repo.upsertCompletions('TestPlayer', [])
      // Should not throw
    })

    it('tracks steel path separately', async () => {
      await seedNodes()
      const playerId = 'TestPlayer'

      await repo.upsertCompletions(playerId, [
        { nodeKey: 'SolNode1', completes: 5, isSteelPath: false },
        { nodeKey: 'SolNode1', completes: 2, isSteelPath: true },
      ])

      const normal = await repo.getNodesWithCompletion(playerId, false)
      const steelPath = await repo.getNodesWithCompletion(playerId, true)

      const mercNormal = normal.planets.find(p => p.name === 'Mercury')!
      const mercSteel = steelPath.planets.find(p => p.name === 'Mercury')!

      expect(mercNormal.completed).toBe(1)
      expect(mercSteel.completed).toBe(1)
    })
  })

  describe('getStarChartMasteryXP', () => {
    it('sums mastery XP for completed nodes', async () => {
      await seedNodes()
      const playerId = 'TestPlayer'

      await repo.upsertCompletions(playerId, [
        { nodeKey: 'SolNode1', completes: 5, isSteelPath: false },
        { nodeKey: 'SolNode2', completes: 3, isSteelPath: false },
        { nodeKey: 'Junction1', completes: 1, isSteelPath: false },
      ])

      const xp = await repo.getStarChartMasteryXP(playerId)
      expect(xp).toBe(63 + 63 + 1000)
    })

    it('returns 0 when no completions exist', async () => {
      expect(await repo.getStarChartMasteryXP('NoSuchPlayer')).toBe(0)
    })

    it('excludes nodes with 0 completes', async () => {
      await seedNodes()
      // Direct insert with completes = 0 (shouldn't normally happen but tests the filter)
      const map = await repo.findAllAsMap()
      const { sql } = await import('drizzle-orm')
      const { playerNodes } = await import('./schema')
      await db.insert(playerNodes).values({
        playerId: 'TestPlayer',
        nodeId: map.get('SolNode1')!.id,
        completes: 0,
        isSteelPath: false,
      })

      expect(await repo.getStarChartMasteryXP('TestPlayer')).toBe(0)
    })
  })

  describe('getNodesWithCompletion', () => {
    it('groups nodes by planet with completion status', async () => {
      await seedNodes()
      const playerId = 'TestPlayer'

      await repo.upsertCompletions(playerId, [
        { nodeKey: 'SolNode1', completes: 5, isSteelPath: false },
      ])

      const progress = await repo.getNodesWithCompletion(playerId, false)

      // Mercury has 4 nodes (3 missions + 1 junction)
      const mercury = progress.planets.find(p => p.name === 'Mercury')!
      expect(mercury.total).toBe(4)
      expect(mercury.completed).toBe(1)
      expect(mercury.xpEarned).toBe(63) // Just Terminus
      expect(mercury.xpTotal).toBe(63 * 3 + 1000) // 3 missions + junction

      // Venus has 2 nodes
      const venus = progress.planets.find(p => p.name === 'Venus')!
      expect(venus.total).toBe(2)
      expect(venus.completed).toBe(0)
    })

    it('provides correct summary totals', async () => {
      await seedNodes()
      const playerId = 'TestPlayer'

      await repo.upsertCompletions(playerId, [
        { nodeKey: 'SolNode1', completes: 1, isSteelPath: false },
        { nodeKey: 'SolNode100', completes: 1, isSteelPath: false },
      ])

      const progress = await repo.getNodesWithCompletion(playerId, false)
      expect(progress.summary.totalNodes).toBe(6)
      expect(progress.summary.completedNodes).toBe(2)
      expect(progress.summary.completedXP).toBe(63 + 63)
      expect(progress.summary.totalXP).toBe(63 * 5 + 1000)
    })

    it('returns all nodes as uncompleted when player has no data', async () => {
      await seedNodes()
      const progress = await repo.getNodesWithCompletion('NoSuchPlayer', false)
      expect(progress.summary.completedNodes).toBe(0)
      expect(progress.summary.totalNodes).toBe(6)
    })
  })
})
