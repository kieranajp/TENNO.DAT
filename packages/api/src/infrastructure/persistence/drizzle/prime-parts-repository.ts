import { eq, and, inArray, sql } from 'drizzle-orm'
import type { PrimePartsRepository } from '../../../domain/ports/prime-parts-repository'
import { playerPrimeParts, itemComponents } from './schema'
import type { DrizzleDb } from './connection'

export class DrizzlePrimePartsRepository implements PrimePartsRepository {
  constructor(private db: DrizzleDb) {}

  async getOwnedCounts(playerId: string): Promise<Map<number, number>> {
    const rows = await this.db
      .select({
        componentId: playerPrimeParts.componentId,
        ownedCount: playerPrimeParts.ownedCount,
      })
      .from(playerPrimeParts)
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        sql`${playerPrimeParts.ownedCount} > 0`
      ))
    return new Map(rows.map(r => [r.componentId, r.ownedCount]))
  }

  async getOwnedCountsForItem(playerId: string, itemId: number): Promise<Map<number, number>> {
    const rows = await this.db
      .select({
        componentId: playerPrimeParts.componentId,
        ownedCount: playerPrimeParts.ownedCount,
      })
      .from(playerPrimeParts)
      .innerJoin(itemComponents, eq(playerPrimeParts.componentId, itemComponents.id))
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        eq(itemComponents.itemId, itemId),
        sql`${playerPrimeParts.ownedCount} > 0`
      ))
    return new Map(rows.map(r => [r.componentId, r.ownedCount]))
  }

  async toggle(playerId: string, componentId: number): Promise<number> {
    // Get the component's itemCount to know the max
    const [comp] = await this.db
      .select({ itemCount: itemComponents.itemCount })
      .from(itemComponents)
      .where(eq(itemComponents.id, componentId))

    const maxCount = comp?.itemCount ?? 1

    const [existing] = await this.db
      .select({ ownedCount: playerPrimeParts.ownedCount })
      .from(playerPrimeParts)
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        eq(playerPrimeParts.componentId, componentId)
      ))

    const currentCount = existing?.ownedCount ?? 0
    const newCount = currentCount >= maxCount ? 0 : currentCount + 1

    if (existing) {
      await this.db
        .update(playerPrimeParts)
        .set({ ownedCount: newCount })
        .where(and(
          eq(playerPrimeParts.playerId, playerId),
          eq(playerPrimeParts.componentId, componentId)
        ))
    } else {
      await this.db
        .insert(playerPrimeParts)
        .values({ playerId, componentId, ownedCount: newCount })
    }

    return newCount
  }

  async markOwned(playerId: string, componentIds: number[]): Promise<void> {
    if (componentIds.length === 0) return
    // Set ownedCount to itemCount (fully owned) using a subquery
    const comps = await this.db
      .select({ id: itemComponents.id, itemCount: itemComponents.itemCount })
      .from(itemComponents)
      .where(inArray(itemComponents.id, componentIds))

    await this.db
      .insert(playerPrimeParts)
      .values(comps.map(c => ({ playerId, componentId: c.id, ownedCount: c.itemCount })))
      .onConflictDoUpdate({
        target: [playerPrimeParts.playerId, playerPrimeParts.componentId],
        set: { ownedCount: sql`EXCLUDED.owned_count` },
      })
  }

  async markUnowned(playerId: string, componentIds: number[]): Promise<void> {
    if (componentIds.length === 0) return
    await this.db
      .delete(playerPrimeParts)
      .where(and(
        eq(playerPrimeParts.playerId, playerId),
        inArray(playerPrimeParts.componentId, componentIds)
      ))
  }
}
