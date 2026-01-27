import { eq, sql, and, gte, lt } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerMastery, items } from './schema'
import { getMasteryStateFromRank, getMasteryContribution, type MasteryRecord } from '../../../domain/entities/mastery'
import type { MasteryRepository, MasterySummary, MasteryWithItem } from '../../../domain/ports/mastery-repository'

export class DrizzleMasteryRepository implements MasteryRepository {
  constructor(private db: DrizzleDb) {}

  async upsertMany(records: Omit<MasteryRecord, 'id' | 'syncedAt'>[]): Promise<void> {
    if (records.length === 0) return

    // Batch upsert - single query instead of N queries
    await this.db
      .insert(playerMastery)
      .values(records)
      .onConflictDoUpdate({
        target: [playerMastery.playerId, playerMastery.itemId],
        set: {
          xp: sql`excluded.xp`,
          rank: sql`excluded.rank`,
          syncedAt: new Date(),
          fired: sql`excluded.fired`,
          hits: sql`excluded.hits`,
          kills: sql`excluded.kills`,
          headshots: sql`excluded.headshots`,
          equipTime: sql`excluded.equip_time`,
          assists: sql`excluded.assists`,
        },
      })
  }

  async getSummary(playerId: string): Promise<MasterySummary[]> {
    return this.db
      .select({
        category: items.category,
        total: sql<number>`count(*)::int`,
        mastered: sql<number>`count(
          case
            when ${items.maxRank} = 40 and ${playerMastery.rank} >= 40 then 1
            when ${items.maxRank} = 30 and ${playerMastery.rank} >= 30 then 1
          end
        )::int`,
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
        rank: playerMastery.rank,
        masteryState: sql<'unmastered' | 'mastered_30' | 'mastered_40'>`
          case
            when ${playerMastery.rank} IS NULL then 'unmastered'
            when ${items.maxRank} > 30 and ${playerMastery.rank} >= 40 then 'mastered_40'
            when ${playerMastery.rank} >= 30 then 'mastered_30'
            else 'unmastered'
          end
        `,
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
      // Fully mastered = rank >= 30 AND (maxRank = 30 OR rank >= 40)
      // This means: R30 items at rank 30+, or R40 items at rank 40
      conditions.push(sql`(
        ${playerMastery.rank} >= 30
        AND (${items.maxRank} = 30 OR ${playerMastery.rank} >= 40)
      )`)
    }
    if (filters?.unmasteredOnly) {
      // Not fully mastered = rank is null, rank < 30, or (maxRank > 30 AND rank < 40)
      conditions.push(sql`(
        ${playerMastery.rank} IS NULL
        OR ${playerMastery.rank} < 30
        OR (${items.maxRank} > 30 AND ${playerMastery.rank} < 40)
      )`)
    }

    if (conditions.length) {
      query = query.where(and(...conditions)) as typeof query
    }

    const results = await query.orderBy(items.name)

    // Derive masteryState from stored rank
    return results.map(row => ({
      ...row,
      masteryState: getMasteryStateFromRank(row.rank ?? 0, row.maxRank),
    }))
  }

  async getEquipmentMasteryXP(playerId: string): Promise<number> {
    const records = await this.db
      .select({
        xp: playerMastery.xp,
        category: items.category,
        maxRank: items.maxRank,
      })
      .from(playerMastery)
      .innerJoin(items, eq(playerMastery.itemId, items.id))
      .where(eq(playerMastery.playerId, playerId))

    return records.reduce((total, r) => {
      return total + getMasteryContribution(r.xp ?? 0, r.category, r.maxRank)
    }, 0)
  }
}
