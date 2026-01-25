import type { CategoryName } from '@warframe-tracker/shared'

// Item categories - using shared configuration
export type ItemCategory = CategoryName

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

export interface Item {
  id: number
  uniqueName: string
  name: string
  category: ItemCategory
  isPrime: boolean
  masteryReq: number
  maxRank: number
  imageName: string | null
  vaulted: boolean | null
  // Acquisition data
  marketCost: number | null
  bpCost: number | null
  buildPrice: number | null
  buildTime: number | null
  acquisitionData: ItemAcquisitionData | null
}
