export interface PrimePartsRepository {
  /** Get owned counts per component for a player: Map<componentId, ownedCount> */
  getOwnedCounts(playerId: string): Promise<Map<number, number>>

  /** Get owned counts for components of a specific item */
  getOwnedCountsForItem(playerId: string, itemId: number): Promise<Map<number, number>>

  /** Cycle ownership: 0 → 1 → ... → itemCount → 0. Returns new count. */
  toggle(playerId: string, componentId: number): Promise<number>

  /** Bulk mark components as fully owned (for auto-completing mastered Primes) */
  markOwned(playerId: string, componentIds: number[]): Promise<void>

  /** Bulk mark components as unowned */
  markUnowned(playerId: string, componentIds: number[]): Promise<void>
}
