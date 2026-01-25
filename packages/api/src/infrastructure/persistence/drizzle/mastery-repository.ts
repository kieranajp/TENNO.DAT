import { eq, sql, and, gte, lt } from 'drizzle-orm'
import type { DrizzleDb } from './connection'
import { playerMastery, items } from './schema'
import { getMasteryStateFromRank, getMasteryContribution, type MasteryRecord } from '../../../domain/entities/mastery'
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
            rank: sql`excluded.rank`,
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
        mastered: sql<number>`count(case when ${playerMastery.rank} >= 30 then 1 end)::int`,
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
      conditions.push(gte(playerMastery.rank, 30))
    }
    if (filters?.unmasteredOnly) {
      // Not mastered = rank is null (no record) or rank < 30
      conditions.push(sql`(${playerMastery.rank} IS NULL OR ${playerMastery.rank} < 30)`)
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
