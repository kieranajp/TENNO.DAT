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
      console.log(`[Sync] Starting sync for player: ${settings.playerId}, platform: ${settings.platform}`)

      const profile = await container.profileApi.fetch(settings.playerId, settings.platform as Platform)

      console.log(`[Sync] Profile fetched:`)
      console.log(`  - displayName: ${profile.displayName}`)
      console.log(`  - playerLevel: ${profile.playerLevel}`)
      console.log(`  - xpComponents count: ${profile.xpComponents.length}`)

      if (profile.xpComponents.length > 0) {
        console.log(`[Sync] Sample xpComponents (first 5):`)
        profile.xpComponents.slice(0, 5).forEach(xp => {
          console.log(`    - ${xp.itemType}: ${xp.xp} XP`)
        })
      }

      if (profile.displayName) {
        await container.playerRepo.updateDisplayName(settings.playerId, profile.displayName)
      }

      const itemsMap = await container.itemRepo.findAllAsMap()
      console.log(`[Sync] Items in database: ${itemsMap.size}`)

      // Log sample database uniqueNames for comparison
      const sampleDbItems = Array.from(itemsMap.keys()).slice(0, 3)
      console.log(`[Sync] Sample DB uniqueNames: ${sampleDbItems.join(', ')}`)

      // Check how many match
      const matchedCount = profile.xpComponents.filter(xp => itemsMap.has(xp.itemType)).length
      const unmatchedSample = profile.xpComponents
        .filter(xp => !itemsMap.has(xp.itemType))
        .slice(0, 5)
        .map(xp => xp.itemType)

      console.log(`[Sync] Matched items: ${matchedCount}/${profile.xpComponents.length}`)
      if (unmatchedSample.length > 0) {
        console.log(`[Sync] Sample unmatched itemTypes:`)
        unmatchedSample.forEach(it => console.log(`    - ${it}`))
      }

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

      console.log(`[Sync] Mastery records to upsert: ${masteryRecords.length}`)

      await container.masteryRepo.upsertMany(masteryRecords)
      await container.playerRepo.updateLastSync(settings.playerId)

      console.log(`[Sync] Sync complete - synced: ${masteryRecords.length}, mastered: ${masteryRecords.filter(r => r.isMastered).length}`)

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
