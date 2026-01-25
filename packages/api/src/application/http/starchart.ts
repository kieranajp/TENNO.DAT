import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'

export function starchartRoutes(container: Container) {
  const router = new Hono()

  // Get star chart nodes grouped by planet with completion status
  router.get('/nodes', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player configured' }, 400)
    }

    const steelPath = c.req.query('steelPath') === 'true'
    const progress = await container.nodeRepo.getNodesWithCompletion(settings.playerId, steelPath)

    return c.json(progress)
  })

  return router
}
