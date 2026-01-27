import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { createLogger } from '../../infrastructure/logger'
import { handleRouteError, noPlayerConfigured } from './errors'

const log = createLogger('Starchart')

export function starchartRoutes(container: Container) {
  const router = new Hono()

  // Get star chart nodes grouped by planet with completion status
  router.get('/nodes', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return noPlayerConfigured(c, log)
    }

    try {
      const steelPath = c.req.query('steelPath') === 'true'
      const progress = await container.nodeRepo.getNodesWithCompletion(settings.playerId, steelPath)

      return c.json(progress)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch star chart progress')
    }
  })

  return router
}
