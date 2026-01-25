import { eq, sql, and } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerLoadout, items, playerMastery } from './schema'
import { getMasteryStateFromRank } from '../../../domain/entities/mastery'
import type { LoadoutRepository, LoadoutData, LoadoutWithItems, LoadoutItem } from '../../../domain/ports/loadout-repository'

export class DrizzleLoadoutRepository implements LoadoutRepository {
  constructor(private db: DrizzleDb) {}

  async upsert(playerId: string, loadout: LoadoutData): Promise<void> {
    await this.db
      .insert(playerLoadout)
      .values({
        playerId,
        warframeId: loadout.warframeId,
        primaryId: loadout.primaryId,
        secondaryId: loadout.secondaryId,
        meleeId: loadout.meleeId,
        focusSchool: loadout.focusSchool,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: playerLoadout.playerId,
        set: {
          warframeId: sql`excluded.warframe_id`,
          primaryId: sql`excluded.primary_id`,
          secondaryId: sql`excluded.secondary_id`,
          meleeId: sql`excluded.melee_id`,
          focusSchool: sql`excluded.focus_school`,
          syncedAt: new Date(),
        },
      })
  }

  async getWithItems(playerId: string): Promise<LoadoutWithItems | null> {
    // Get the loadout record
    const [loadout] = await this.db
      .select()
      .from(playerLoadout)
      .where(eq(playerLoadout.playerId, playerId))
      .limit(1)

    if (!loadout) return null

    // Get items for each slot
    const itemIds = [
      loadout.warframeId,
      loadout.primaryId,
      loadout.secondaryId,
      loadout.meleeId,
    ].filter((id): id is number => id !== null)

    if (itemIds.length === 0) {
      return {
        warframe: null,
        primary: null,
        secondary: null,
        melee: null,
        focusSchool: loadout.focusSchool,
      }
    }

    // Fetch items with their mastery data
    const itemRecords = await this.db
      .select({
        id: items.id,
        name: items.name,
        imageName: items.imageName,
        category: items.category,
        maxRank: items.maxRank,
        rank: playerMastery.rank,
      })
      .from(items)
      .leftJoin(
        playerMastery,
        and(
          eq(items.id, playerMastery.itemId),
          eq(playerMastery.playerId, playerId)
        )
      )
      .where(sql`${items.id} IN ${itemIds}`)

    const itemsMap = new Map(itemRecords.map(item => [item.id, item]))

    const getItem = (id: number | null): LoadoutItem | null => {
      if (!id) return null
      const item = itemsMap.get(id)
      if (!item) return null
      return {
        id: item.id,
        name: item.name,
        imageName: item.imageName,
        category: item.category,
        maxRank: item.maxRank,
        rank: item.rank,
        masteryState: getMasteryStateFromRank(item.rank ?? 0, item.maxRank),
      }
    }

    return {
      warframe: getItem(loadout.warframeId),
      primary: getItem(loadout.primaryId),
      secondary: getItem(loadout.secondaryId),
      melee: getItem(loadout.meleeId),
      focusSchool: loadout.focusSchool,
    }
  }
}
