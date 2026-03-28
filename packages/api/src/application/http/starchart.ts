import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import type { DbProbe } from '../../infrastructure/observability/db-probe'
import { createLogger } from '../../infrastructure/logger'
import { handleRouteError } from './errors'

const log = createLogger('Starchart')

export function starchartRoutes(container: Container, db: DbProbe) {
  const router = new Hono()

  // Get star chart nodes grouped by planet with completion status
  router.get('/nodes', async (c) => {
    const settings = c.get('playerSettings')

    try {
      const steelPath = c.req.query('steelPath') === 'true'
      const endQuery = db.startQuery('nodeRepo.getNodesWithCompletion')
      const progress = await container.nodeRepo.getNodesWithCompletion(settings.playerId!, steelPath)
      endQuery()

      return c.json(progress)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch star chart progress')
    }
  })

  return router
}
