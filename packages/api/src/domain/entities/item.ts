// Item categories from @wfcd/items
export type ItemCategory =
  | 'Warframes'
  | 'Primary'
  | 'Secondary'
  | 'Melee'
  | 'Companions'
  | 'Sentinels'
  | 'SentinelWeapons'
  | 'Archwing'
  | 'ArchGun'
  | 'ArchMelee'
  | 'Necramechs'
  | 'KDrives'
  | 'Amps'

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
}
