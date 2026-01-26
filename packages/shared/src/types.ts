/**
 * Shared types used by both API and web packages.
 * Single source of truth for API response/request types.
 */

// Re-export MasteryState type alias for backwards compatibility
export type { MasteryStateId as MasteryState } from './mastery-state'

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
