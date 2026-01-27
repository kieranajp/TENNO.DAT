import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { createLogger } from '../../infrastructure/logger'
import { handleRouteError } from './errors'

const log = createLogger('Items')

export function itemsRoutes(container: Container) {
  const router = new Hono()

  // Get all items with optional category filter
  router.get('/', async (c) => {
    try {
      const category = c.req.query('category') || undefined
      const items = await container.itemRepo.findAll(category)
      return c.json(items)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch items')
    }
  })

  // Get item categories with counts
  router.get('/categories', async (c) => {
    try {
      const categories = await container.itemRepo.getCategories()
      return c.json(categories)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch categories')
    }
  })

  // Get single item with full acquisition data from relational tables
  router.get('/:id', async (c) => {
    try {
      const id = Number(c.req.param('id'))

      // Get current player settings to include personal stats (optional)
      const settings = await container.playerRepo.getSettings()
      const playerId = settings?.playerId

      const item = await container.itemRepo.findByIdWithAcquisitionData(id, playerId)

      if (!item) {
        return c.json({ error: 'Item not found' }, 404)
      }

      return c.json(item)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch item')
    }
  })

  return router
}
