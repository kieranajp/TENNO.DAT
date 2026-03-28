export interface WishlistRepository {
  /** Get all wishlisted item IDs for a player */
  getWishlistedItemIds(playerId: string): Promise<number[]>

  /** Check if a specific item is wishlisted */
  isWishlisted(playerId: string, itemId: number): Promise<boolean>

  /** Toggle wishlist status, returns new state */
  toggle(playerId: string, itemId: number): Promise<boolean>
}
