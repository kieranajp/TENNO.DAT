import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { handleRouteError } from './errors'
import { createLogger } from '../../infrastructure/logger'

const log = createLogger('PrimeParts')

export function primePartsRoutes(container: Container) {
  const router = new Hono()

  // Toggle component ownership (cycles 0 → 1 → ... → itemCount → 0)
  router.post('/components/:componentId/toggle', async (c) => {
    try {
      const settings = c.get('playerSettings')

      const componentId = Number(c.req.param('componentId'))
      if (isNaN(componentId)) return c.json({ error: 'Invalid component ID' }, 400)

      const ownedCount = await container.primePartsRepo.toggle(settings.playerId!, componentId)
      return c.json({ ownedCount })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to toggle component ownership')
    }
  })

  // Get owned counts for a specific item's components
  router.get('/items/:itemId/components', async (c) => {
    try {
      const settings = c.get('playerSettings')

      const itemId = Number(c.req.param('itemId'))
      if (isNaN(itemId)) return c.json({ error: 'Invalid item ID' }, 400)

      const counts = await container.primePartsRepo.getOwnedCountsForItem(
        settings.playerId!, itemId
      )
      return c.json({ ownedCounts: Object.fromEntries(counts) })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get component ownership')
    }
  })

  // Get all Primes with part progress
  router.get('/', async (c) => {
    try {
      const settings = c.get('playerSettings')

      const category = c.req.query('category') || undefined
      const showVaulted = c.req.query('vaulted') !== 'false'
      const showComplete = c.req.query('complete') !== 'false'

      const primes = await container.itemRepo.findPrimesWithComponents(category)
      const ownedCounts = await container.primePartsRepo.getOwnedCounts(settings.playerId!)
      const masteredItemIds = new Set(
        await container.masteryRepo.getMasteredItemIds(settings.playerId!)
      )

      const result = primes
        .filter(prime => prime.components.length > 0)
        .filter(prime => showVaulted || !prime.vaulted)
        .map(prime => {
          const isMastered = masteredItemIds.has(prime.id)
          const components = prime.components.map(comp => ({
            id: comp.id,
            name: comp.name,
            itemCount: comp.itemCount,
            ducats: comp.ducats,
            ownedCount: isMastered ? comp.itemCount : (ownedCounts.get(comp.id) ?? 0),
            drops: comp.drops,
          }))

          const ownedTotal = components.reduce((sum, c) => sum + c.ownedCount, 0)
          const totalCount = components.reduce((sum, c) => sum + c.itemCount, 0)
          return {
            id: prime.id,
            name: prime.name,
            category: prime.category,
            imageName: prime.imageName,
            vaulted: prime.vaulted,
            mastered: isMastered,
            components,
            ownedCount: ownedTotal,
            totalCount,
            complete: ownedTotal === totalCount,
          }
        })
        .filter(prime => showComplete || !prime.complete)
        .sort((a, b) => {
          if (a.complete !== b.complete) return a.complete ? 1 : -1
          const aProgress = a.ownedCount / a.totalCount
          const bProgress = b.ownedCount / b.totalCount
          if (aProgress !== bProgress) return bProgress - aProgress
          return a.name.localeCompare(b.name)
        })

      return c.json(result)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get Primes')
    }
  })

  return router
}
