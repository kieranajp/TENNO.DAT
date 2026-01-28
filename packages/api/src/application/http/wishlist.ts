import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { handleRouteError, noPlayerConfigured } from './errors'
import { createLogger } from '../../infrastructure/logger'

const log = createLogger('Wishlist')

export function wishlistRoutes(container: Container) {
  const router = new Hono()

  // Get all wishlisted item IDs
  router.get('/', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) {
        return noPlayerConfigured(c, log)
      }
      const itemIds = await container.wishlistRepo.getWishlistedItemIds(settings.playerId)
      return c.json({ itemIds })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get wishlist')
    }
  })

  // Toggle item wishlist status
  router.post('/:itemId/toggle', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) {
        return noPlayerConfigured(c, log)
      }
      const itemId = Number(c.req.param('itemId'))
      if (isNaN(itemId)) {
        return c.json({ error: 'Invalid item ID' }, 400)
      }
      const wishlisted = await container.wishlistRepo.toggle(settings.playerId, itemId)
      return c.json({ wishlisted })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to toggle wishlist')
    }
  })

  // Check if item is wishlisted (useful for item detail page)
  router.get('/:itemId', async (c) => {
    try {
      const auth = c.get('auth')
      const settings = await container.playerRepo.getSettings(auth.userId)
      if (!settings?.playerId) {
        return noPlayerConfigured(c, log)
      }
      const itemId = Number(c.req.param('itemId'))
      if (isNaN(itemId)) {
        return c.json({ error: 'Invalid item ID' }, 400)
      }
      const wishlisted = await container.wishlistRepo.isWishlisted(settings.playerId, itemId)
      return c.json({ wishlisted })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to check wishlist status')
    }
  })

  return router
}
