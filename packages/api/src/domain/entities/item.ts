import type { CategoryName, ItemAcquisitionData } from '@warframe-tracker/shared'

// Item categories - using shared configuration
export type ItemCategory = CategoryName

// Re-export ItemAcquisitionData for consumers that import from this module
export type { ItemAcquisitionData } from '@warframe-tracker/shared'

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
  // Introduced info (normalized from acquisitionData)
  introducedName: string | null
  introducedDate: string | null
}
