import { eq, sql, and } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerMastery, items } from './schema'
import { getMasteryState, type MasteryRecord } from '../../../domain/entities/mastery'
import type { MasteryRepository, MasterySummary, MasteryWithItem } from '../../../domain/ports/mastery-repository'

export class DrizzleMasteryRepository implements MasteryRepository {
  constructor(private db: DrizzleDb) {}

  async upsertMany(records: Omit<MasteryRecord, 'id' | 'syncedAt'>[]): Promise<void> {
    for (const record of records) {
      await this.db
        .insert(playerMastery)
        .values(record)
        .onConflictDoUpdate({
          target: [playerMastery.playerId, playerMastery.itemId],
          set: {
            xp: sql`excluded.xp`,
            isMastered: sql`excluded.is_mastered`,
            syncedAt: new Date(),
          },
        })
    }
  }

  async getSummary(playerId: string): Promise<MasterySummary[]> {
    return this.db
      .select({
        category: items.category,
        total: sql<number>`count(*)::int`,
        mastered: sql<number>`count(case when ${playerMastery.isMastered} then 1 end)::int`,
      })
      .from(items)
      .leftJoin(
        playerMastery,
        and(
          eq(items.id, playerMastery.itemId),
          eq(playerMastery.playerId, playerId)
        )
      )
      .groupBy(items.category)
      .orderBy(items.category)
  }

  async getItemsWithMastery(playerId: string, filters?: {
    category?: string
    masteredOnly?: boolean
    unmasteredOnly?: boolean
  }): Promise<MasteryWithItem[]> {
    let query = this.db
      .select({
        id: items.id,
        uniqueName: items.uniqueName,
        name: items.name,
        category: items.category,
        isPrime: items.isPrime,
        masteryReq: items.masteryReq,
        maxRank: items.maxRank,
        imageName: items.imageName,
        vaulted: items.vaulted,
        xp: playerMastery.xp,
        isMastered: playerMastery.isMastered,
      })
      .from(items)
      .leftJoin(
        playerMastery,
        and(
          eq(items.id, playerMastery.itemId),
          eq(playerMastery.playerId, playerId)
        )
      )

    const conditions = []
    if (filters?.category) {
      conditions.push(eq(items.category, filters.category))
    }
    if (filters?.masteredOnly) {
      conditions.push(eq(playerMastery.isMastered, true))
    }
    if (filters?.unmasteredOnly) {
      conditions.push(sql`${playerMastery.isMastered} IS NOT TRUE`)
    }

    if (conditions.length) {
      query = query.where(and(...conditions)) as typeof query
    }

    const results = await query.orderBy(items.name)

    // Compute masteryState for each item
    return results.map(row => ({
      ...row,
      masteryState: getMasteryState(row.xp ?? 0, row.category, row.maxRank),
    }))
  }
}
