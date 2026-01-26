import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'

export function itemsRoutes(container: Container) {
  const router = new Hono()

  // Get all items with optional category filter
  router.get('/', async (c) => {
    const category = c.req.query('category') || undefined
    const items = await container.itemRepo.findAll(category)
    return c.json(items)
  })

  // Get item categories with counts
  router.get('/categories', async (c) => {
    const categories = await container.itemRepo.getCategories()
    return c.json(categories)
  })

  // Get single item with full acquisition data from relational tables
  router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))

    // Get current player settings to include personal stats
    const settings = await container.playerRepo.getSettings()
    const playerId = settings?.playerId

    const item = await container.itemRepo.findByIdWithAcquisitionData(id, playerId)

    if (!item) {
      return c.json({ error: 'Item not found' }, 404)
    }

    return c.json(item)
  })

  return router
}
