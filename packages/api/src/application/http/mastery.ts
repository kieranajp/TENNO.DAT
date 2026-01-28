import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { calculateMR, intrinsicsToXP } from '../../domain/entities/mastery'
import { createLogger } from '../../infrastructure/logger'
import { handleRouteError, noPlayerConfigured } from './errors'

const log = createLogger('Mastery')

export function masteryRoutes(container: Container) {
  const router = new Hono()

  // Get mastery progress summary
  router.get('/summary', async (c) => {
    const auth = c.get('auth')
    const settings = await container.playerRepo.getSettings(auth.userId)

    if (!settings?.playerId) {
      return noPlayerConfigured(c, log)
    }

    try {
      const [categories, loadout, equipmentXP, starChartXP] = await Promise.all([
        container.masteryRepo.getSummary(settings.playerId),
        container.loadoutRepo.getWithItems(settings.playerId),
        container.masteryRepo.getEquipmentMasteryXP(settings.playerId),
        container.nodeRepo.getStarChartMasteryXP(settings.playerId),
      ])

      const totals = categories.reduce(
        (acc, cat) => ({
          total: acc.total + cat.total,
          mastered: acc.mastered + cat.mastered,
        }),
        { total: 0, mastered: 0 }
      )

      // Calculate total mastery XP including intrinsics and star chart
      const intrinsicsXP = intrinsicsToXP(settings.railjackIntrinsics + settings.drifterIntrinsics)
      const totalMasteryXP = equipmentXP + intrinsicsXP + starChartXP

      const mrInfo = calculateMR(totalMasteryXP)
      const masteryRank = {
        rank: mrInfo.rank,
        equipmentXP,
        intrinsicsXP,
        starChartXP,
        totalXP: totalMasteryXP,
        currentThreshold: mrInfo.current,
        nextThreshold: mrInfo.next,
        progress: mrInfo.progress,
      }

      return c.json({
        categories,
        totals,
        loadout,
        lastSyncAt: settings.lastSyncAt,
        displayName: settings.displayName,
        masteryRank,
      })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch mastery summary')
    }
  })

  // Get items with mastery status
  router.get('/items', async (c) => {
    const auth = c.get('auth')
    const settings = await container.playerRepo.getSettings(auth.userId)

    if (!settings?.playerId) {
      return noPlayerConfigured(c, log)
    }

    try {
      const [items, wishlistedIds] = await Promise.all([
        container.masteryRepo.getItemsWithMastery(settings.playerId, {
          category: c.req.query('category') || undefined,
          masteredOnly: c.req.query('mastered') === 'true',
          unmasteredOnly: c.req.query('unmastered') === 'true',
        }),
        container.wishlistRepo.getWishlistedItemIds(settings.playerId),
      ])

      const wishlistedSet = new Set(wishlistedIds)

      // Add wishlisted flag and sort: wishlisted first, then by name
      const itemsWithWishlist = items
        .map(item => ({
          ...item,
          wishlisted: wishlistedSet.has(item.id),
        }))
        .sort((a, b) => {
          if (a.wishlisted && !b.wishlisted) return -1
          if (!a.wishlisted && b.wishlisted) return 1
          return a.name.localeCompare(b.name)
        })

      return c.json(itemsWithWishlist)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to fetch mastery items')
    }
  })

  return router
}
