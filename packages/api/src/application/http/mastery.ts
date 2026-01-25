import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import { calculateMR, intrinsicsToXP } from '../../domain/entities/mastery'

export function masteryRoutes(container: Container) {
  const router = new Hono()

  // Get mastery progress summary
  router.get('/summary', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player configured' }, 400)
    }

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
  })

  // Get items with mastery status
  router.get('/items', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player configured' }, 400)
    }

    const items = await container.masteryRepo.getItemsWithMastery(settings.playerId, {
      category: c.req.query('category') || undefined,
      masteredOnly: c.req.query('mastered') === 'true',
      unmasteredOnly: c.req.query('unmastered') === 'true',
    })

    return c.json(items)
  })

  return router
}
