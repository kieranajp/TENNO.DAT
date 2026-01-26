/**
 * Shared types used by both API and web packages.
 * Single source of truth for API response/request types.
 */

/**
 * Three-state mastery for items that can go to rank 40.
 * - unmastered: Below rank 30 XP threshold
 * - mastered_30: At/above rank 30, below rank 40 (for maxRank=40 items)
 * - mastered_40: At/above full mastery threshold
 */
export type MasteryState = 'unmastered' | 'mastered_30' | 'mastered_40'

/**
 * Item acquisition data from WFCD items library.
 * Includes drop locations, components, and release info.
 */
export interface ItemAcquisitionData {
  drops: Array<{
    location: string
    chance: number
    rarity: string
  }>
  components: Array<{
    name: string
    drops: Array<{
      location: string
      chance: number
    }>
  }>
  introduced?: {
    name: string | null
    date: string | null
  } | null
}
