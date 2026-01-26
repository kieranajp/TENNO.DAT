/**
 * Shared types used by both API and web packages.
 */

/**
 * Item acquisition data from WFCD items library.
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
