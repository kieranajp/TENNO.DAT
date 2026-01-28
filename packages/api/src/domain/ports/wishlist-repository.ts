export interface WishlistRepository {
  /** Get all wishlisted item IDs for a player */
  getWishlistedItemIds(playerId: string): Promise<number[]>

  /** Check if a specific item is wishlisted */
  isWishlisted(playerId: string, itemId: number): Promise<boolean>

  /** Add item to wishlist (idempotent) */
  add(playerId: string, itemId: number): Promise<void>

  /** Remove item from wishlist */
  remove(playerId: string, itemId: number): Promise<void>

  /** Toggle wishlist status, returns new state */
  toggle(playerId: string, itemId: number): Promise<boolean>
}
