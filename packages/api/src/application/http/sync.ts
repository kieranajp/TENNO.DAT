import { Hono } from 'hono'
import { Platform } from '@warframe-tracker/shared'
import type { Container } from '../../infrastructure/bootstrap/container'
import { getRankFromXp } from '../../domain/entities/mastery'
import { createLogger } from '../../infrastructure/logger'

const log = createLogger('Sync')

export function syncRoutes(container: Container) {
  const router = new Hono()

  router.get('/settings', async (c) => {
    const settings = await container.playerRepo.getSettings()
    return c.json(settings)
  })

  router.post('/settings', async (c) => {
    const { playerId, platform: platformId } = await c.req.json<{
      playerId: string
      platform: string
    }>()

    const platform = Platform.fromId(platformId)
    if (!platform) {
      return c.json({ error: `Invalid platform: ${platformId}` }, 400)
    }

    await container.playerRepo.saveSettings(playerId, platform)
    return c.json({ success: true })
  })

  router.post('/profile', async (c) => {
    const settings = await container.playerRepo.getSettings()

    if (!settings) {
      return c.json({ error: 'No player settings configured' }, 400)
    }

    try {
      const platform = Platform.fromId(settings.platform)
      if (!platform) {
        return c.json({ error: `Invalid platform in settings: ${settings.platform}` }, 400)
      }

      log.info('Starting sync', { playerId: settings.playerId, platform: platform.id })

      const profile = await container.profileApi.fetch(settings.playerId, platform)

      if (profile.displayName) {
        await container.playerRepo.updateDisplayName(settings.playerId, profile.displayName)
      }

      const itemsMap = await container.itemRepo.findAllAsMap()

      // Build weapon stats lookup by uniqueName
      const weaponStatsMap = new Map(
        profile.weaponStats.map(ws => [ws.itemType, ws])
      )

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
          const stats = weaponStatsMap.get(xp.itemType)
          return {
            playerId: settings.playerId,
            itemId: item.id,
            xp: xp.xp,
            rank: getRankFromXp(xp.xp, item.category, item.maxRank),
            // Combat stats (null if not a weapon or no stats)
            fired: stats?.fired ?? null,
            hits: stats?.hits ?? null,
            kills: stats?.kills ?? null,
            headshots: stats?.headshots ?? null,
            equipTime: stats?.equipTime ?? null,
            assists: stats?.assists ?? null,
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

      // Auto-sync intrinsics from profile
      const { intrinsics } = profile
      await container.playerRepo.updateIntrinsics(
        settings.playerId,
        intrinsics.railjack.total,
        intrinsics.drifter.total
      )

      // Sync star chart node completions
      const nodesMap = await container.nodeRepo.findAllAsMap()
      const nodeCompletions = profile.missions
        .filter(m => nodesMap.has(m.tag))
        .flatMap(m => {
          const completions = []
          if (m.completes > 0) {
            completions.push({ nodeKey: m.tag, completes: m.completes, isSteelPath: false })
          }
          if (m.tier === 1) {
            completions.push({ nodeKey: m.tag, completes: m.completes, isSteelPath: true })
          }
          return completions
        })

      await container.nodeRepo.upsertCompletions(settings.playerId, nodeCompletions)

      const masteredCount = masteryRecords.filter(r => r.rank >= 30).length
      log.info('Sync complete', {
        synced: masteryRecords.length,
        mastered: masteredCount,
        nodesSynced: nodeCompletions.length,
        loadout: loadoutData,
        intrinsics: {
          railjack: intrinsics.railjack.total,
          drifter: intrinsics.drifter.total,
        },
      })

      return c.json({
        success: true,
        synced: masteryRecords.length,
        mastered: masteredCount,
        nodesSynced: nodeCompletions.length,
      })
    } catch (error) {
      log.error('Sync failed', error instanceof Error ? error : undefined)
      const message = error instanceof Error ? error.message : 'Failed to sync profile'
      return c.json({ error: message }, 500)
    }
  })

  return router
}
