/**
 * Shared types used by both API and web packages.
 */

/**
 * Resource requirement for crafting an item.
 */
export interface ResourceRequirement {
  id: number
  name: string
  type: 'Resource' | 'Gem' | 'Plant'
  imageName: string | null
  quantity: number
}

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
    id: number
    name: string
    itemCount: number
    ducats?: number
    tradable?: boolean
    drops: Array<{
      location: string
      chance: number
      rarity?: string
    }>
  }>
  /** Crafting resources required (e.g., Plastids, Hexenon) */
  resources?: ResourceRequirement[]
  introduced?: {
    name: string | null
    date: string | null
  } | null
}
