import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import type { Platform } from '../../domain/entities/player'
import { isMastered } from '../../domain/entities/mastery'

export function syncRoutes(container: Container) {
  const router = new Hono()

  // Get player settings
  router.get('/settings', async (c) => {
    const settings = await container.playerRepo.getSettings()
    return c.json(settings)
  })

  // Save player settings
  router.post('/settings', async (c) => {
    const { playerId, platform } = await c.req.json<{
      playerId: string
      platform: Platform
    }>()

    await container.playerRepo.saveSettings(playerId, platform)
    return c.json({ success: true })
  })

  // Trigger profile sync
  router.post('/profile', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player settings configured' }, 400)
    }

    try {
      const profile = await container.profileApi.fetch(settings.playerId, settings.platform as Platform)

      if (profile.displayName) {
        await container.playerRepo.updateDisplayName(settings.playerId, profile.displayName)
      }

      const itemsMap = await container.itemRepo.findAllAsMap()

      const masteryRecords = profile.xpComponents
        .filter(xp => itemsMap.has(xp.itemType))
        .map(xp => {
          const item = itemsMap.get(xp.itemType)!
          return {
            playerId: settings.playerId,
            itemId: item.id,
            xp: xp.xp,
            isMastered: isMastered(xp.xp, item.category, item.maxRank),
          }
        })

      await container.masteryRepo.upsertMany(masteryRecords)
      await container.playerRepo.updateLastSync(settings.playerId)

      return c.json({
        success: true,
        synced: masteryRecords.length,
        mastered: masteryRecords.filter(r => r.isMastered).length,
      })
    } catch (error) {
      console.error('Sync error:', error)
      return c.json({ error: 'Failed to sync profile' }, 500)
    }
  })

  return router
}
