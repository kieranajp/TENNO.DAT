import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { starchartRoutes } from './starchart'
import { createMockContainer, createMockOnboardedMiddleware, mockAuth, mockSettings } from '../../test-utils'
import type { Container } from '../../infrastructure/bootstrap/container'

describe('Starchart Routes', () => {
  let container: Container
  let app: Hono

  beforeEach(() => {
    container = createMockContainer()
    app = new Hono()
    app.use('*', createMockOnboardedMiddleware(mockAuth, mockSettings))
    app.route('/starchart', starchartRoutes(container))
  })

  describe('GET /starchart/nodes', () => {
    it('returns star chart progress for normal mode by default', async () => {
      const mockProgress = {
        planets: [
          {
            name: 'Earth',
            completed: 8,
            total: 10,
            xpEarned: 800,
            xpTotal: 1000,
            nodes: [
              { id: 1, nodeKey: 'SolNode1', name: 'Cervantes', planet: 'Earth', nodeType: 'mission' as const, missionType: 'Spy', masteryXp: 100, completed: true },
              { id: 2, nodeKey: 'SolNode2', name: 'E Prime', planet: 'Earth', nodeType: 'mission' as const, missionType: 'Exterminate', masteryXp: 100, completed: true },
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

      vi.mocked(container.nodeRepo.getNodesWithCompletion).mockResolvedValue(mockProgress)

      const res = await app.request('/starchart/nodes')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual(mockProgress)
      expect(container.nodeRepo.getNodesWithCompletion).toHaveBeenCalledWith('test-player', false)
    })

    it('returns steel path progress when steelPath=true', async () => {
      const mockProgress = {
        planets: [],
        summary: {
          completedNodes: 0,
          totalNodes: 10,
          completedXP: 0,
          totalXP: 1000,
        },
      }

      vi.mocked(container.nodeRepo.getNodesWithCompletion).mockResolvedValue(mockProgress)

      const res = await app.request('/starchart/nodes?steelPath=true')

      expect(res.status).toBe(200)
      expect(container.nodeRepo.getNodesWithCompletion).toHaveBeenCalledWith('test-player', true)
    })

    it('treats steelPath=false explicitly as normal mode', async () => {
      vi.mocked(container.nodeRepo.getNodesWithCompletion).mockResolvedValue({
        planets: [],
        summary: { completedNodes: 0, totalNodes: 0, completedXP: 0, totalXP: 0 },
      })

      await app.request('/starchart/nodes?steelPath=false')

      expect(container.nodeRepo.getNodesWithCompletion).toHaveBeenCalledWith('test-player', false)
    })
  })
})
