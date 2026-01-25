import { Hono } from 'hono'
import type { Container } from '../../infrastructure/bootstrap/container'
import type { Platform } from '../../domain/entities/player'
import { isMastered } from '../../domain/entities/mastery'
import { createLogger } from '../../infrastructure/logger'

const log = createLogger('Sync')

export function syncRoutes(container: Container) {
  const router = new Hono()

  router.get('/settings', async (c) => {
    const settings = await container.playerRepo.getSettings()
    return c.json(settings)
  })

  router.post('/settings', async (c) => {
    const { playerId, platform } = await c.req.json<{
      playerId: string
      platform: Platform
    }>()

    await container.playerRepo.saveSettings(playerId, platform)
    return c.json({ success: true })
  })

  router.post('/intrinsics', async (c) => {
    const settings = await container.playerRepo.getSettings()
    if (!settings) {
      return c.json({ error: 'No player configured' }, 400)
    }

    const { railjack, drifter } = await c.req.json<{
      railjack: number
      drifter: number
    }>()

    await container.playerRepo.updateIntrinsics(settings.playerId, railjack, drifter)
    return c.json({ success: true })
  })

  router.post('/profile', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player settings configured' }, 400)
    }

    try {
      log.info('Starting sync', { playerId: settings.playerId, platform: settings.platform })

      const profile = await container.profileApi.fetch(settings.playerId, settings.platform as Platform)

      if (profile.displayName) {
        await container.playerRepo.updateDisplayName(settings.playerId, profile.displayName)
      }

      const itemsMap = await container.itemRepo.findAllAsMap()
      const matchedCount = profile.xpComponents.filter(xp => itemsMap.has(xp.itemType)).length
      const unmatchedSample = profile.xpComponents
        .filter(xp => !itemsMap.has(xp.itemType))
        .slice(0, 5)
        .map(xp => xp.itemType)

      log.debug('Item matching', {
        dbItems: itemsMap.size,
        matched: matchedCount,
        total: profile.xpComponents.length,
        unmatchedSample,
      })

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

      // Resolve loadout uniqueNames to item IDs and persist
      const loadout = profile.loadout
      const loadoutData = {
        warframeId: loadout.warframe ? itemsMap.get(loadout.warframe)?.id ?? null : null,
        primaryId: loadout.primary ? itemsMap.get(loadout.primary)?.id ?? null : null,
        secondaryId: loadout.secondary ? itemsMap.get(loadout.secondary)?.id ?? null : null,
        meleeId: loadout.melee ? itemsMap.get(loadout.melee)?.id ?? null : null,
        focusSchool: loadout.focusSchool,
      }

      await container.loadoutRepo.upsert(settings.playerId, loadoutData)

      const masteredCount = masteryRecords.filter(r => r.isMastered).length
      log.info('Sync complete', {
        synced: masteryRecords.length,
        mastered: masteredCount,
        loadout: loadoutData,
      })

      return c.json({
        success: true,
        synced: masteryRecords.length,
        mastered: masteredCount,
      })
    } catch (error) {
      log.error('Sync failed', error instanceof Error ? error : undefined)
      const message = error instanceof Error ? error.message : 'Failed to sync profile'
      return c.json({ error: message }, 500)
    }
  })

  return router
}
