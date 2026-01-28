import { eq, and } from 'drizzle-orm'
import type { WishlistRepository } from '../../../domain/ports/wishlist-repository'
import { playerWishlist } from './schema'
import type { DrizzleDb } from './connection'

export class DrizzleWishlistRepository implements WishlistRepository {
  constructor(private db: DrizzleDb) {}

  async getWishlistedItemIds(playerId: string): Promise<number[]> {
    const rows = await this.db
      .select({ itemId: playerWishlist.itemId })
      .from(playerWishlist)
      .where(eq(playerWishlist.playerId, playerId))
    return rows.map(r => r.itemId)
  }

  async isWishlisted(playerId: string, itemId: number): Promise<boolean> {
    const row = await this.db
      .select({ id: playerWishlist.id })
      .from(playerWishlist)
      .where(and(
        eq(playerWishlist.playerId, playerId),
        eq(playerWishlist.itemId, itemId)
      ))
      .limit(1)
    return row.length > 0
  }

  async add(playerId: string, itemId: number): Promise<void> {
    await this.db
      .insert(playerWishlist)
      .values({ playerId, itemId })
      .onConflictDoNothing()
  }

  async remove(playerId: string, itemId: number): Promise<void> {
    await this.db
      .delete(playerWishlist)
      .where(and(
        eq(playerWishlist.playerId, playerId),
        eq(playerWishlist.itemId, itemId)
      ))
  }

  async toggle(playerId: string, itemId: number): Promise<boolean> {
    const isCurrentlyWishlisted = await this.isWishlisted(playerId, itemId)
    if (isCurrentlyWishlisted) {
      await this.remove(playerId, itemId)
      return false
    } else {
      await this.add(playerId, itemId)
      return true
    }
  }
}
