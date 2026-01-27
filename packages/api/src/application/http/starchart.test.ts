import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { starchartRoutes } from './starchart'
import type { Container } from '../../infrastructure/bootstrap/container'

function createMockContainer(): Container {
  return {
    playerRepo: {
      getSettings: vi.fn(),
      saveSettings: vi.fn(),
      updateDisplayName: vi.fn(),
      updateLastSync: vi.fn(),
      updateIntrinsics: vi.fn(),
    },
    masteryRepo: {
      getSummary: vi.fn(),
      getItemsWithMastery: vi.fn(),
      upsertMany: vi.fn(),
      getEquipmentMasteryXP: vi.fn(),
    },
    loadoutRepo: {
      upsert: vi.fn(),
      getWithItems: vi.fn(),
    },
    nodeRepo: {
      findAllAsMap: vi.fn(),
      upsertCompletions: vi.fn(),
      getStarChartMasteryXP: vi.fn(),
      getNodesWithCompletion: vi.fn(),
    },
    itemRepo: {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByIdWithAcquisitionData: vi.fn(),
      findAllAsMap: vi.fn(),
      getCategories: vi.fn(),
      upsertMany: vi.fn(),
    },
    profileApi: {
      fetch: vi.fn(),
    },
  }
}

describe('Starchart Routes', () => {
  let container: Container
  let app: Hono

  beforeEach(() => {
    container = createMockContainer()
    app = new Hono()
    app.route('/starchart', starchartRoutes(container))
  })

  describe('GET /starchart/nodes', () => {
    it('returns 400 when no player settings configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const res = await app.request('/starchart/nodes')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('No player configured')
    })

    it('returns star chart progress for normal mode by default', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      const mockProgress = {
        planets: [
          {
            name: 'Earth',
            completed: 8,
            total: 10,
            xpEarned: 800,
            xpTotal: 1000,
            nodes: [
              { key: 'Earth1', name: 'Cervantes', planet: 'Earth', missionType: 'Spy', masteryXP: 100, completed: true },
              { key: 'Earth2', name: 'E Prime', planet: 'Earth', missionType: 'Exterminate', masteryXP: 100, completed: true },
            ],
          },
        ],
        summary: {
          completedNodes: 8,
          totalNodes: 10,
          completedXP: 800,
          totalXP: 1000,
        },
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.nodeRepo.getNodesWithCompletion).mockResolvedValue(mockProgress)

      const res = await app.request('/starchart/nodes')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(mockProgress)
      expect(container.nodeRepo.getNodesWithCompletion).toHaveBeenCalledWith('test-player', false)
    })

    it('returns steel path progress when steelPath=true', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      const mockProgress = {
        planets: [],
        summary: {
          completedNodes: 0,
          totalNodes: 10,
          completedXP: 0,
          totalXP: 1000,
        },
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.nodeRepo.getNodesWithCompletion).mockResolvedValue(mockProgress)

      const res = await app.request('/starchart/nodes?steelPath=true')

      expect(res.status).toBe(200)
      expect(container.nodeRepo.getNodesWithCompletion).toHaveBeenCalledWith('test-player', true)
    })

    it('treats steelPath=false explicitly as normal mode', async () => {
      const mockSettings = {
        id: 1,
        playerId: 'test-player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      }

      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(mockSettings)
      vi.mocked(container.nodeRepo.getNodesWithCompletion).mockResolvedValue({
        planets: [],
        summary: { completedNodes: 0, totalNodes: 0, completedXP: 0, totalXP: 0 },
      })

      await app.request('/starchart/nodes?steelPath=false')

      expect(container.nodeRepo.getNodesWithCompletion).toHaveBeenCalledWith('test-player', false)
    })
  })
})
