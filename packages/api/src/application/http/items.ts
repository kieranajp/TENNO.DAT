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

  // Get single item
  router.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const item = await container.itemRepo.findById(id)

    if (!item) {
      return c.json({ error: 'Item not found' }, 404)
    }

    return c.json(item)
  })

  return router
}
