// Frame-type categories (200 mastery points per rank, 1000 XP multiplier)
export const FRAME_CATEGORIES = [
  'Warframes', 'Companions', 'Archwing', 'KDrives', 'Sentinels', 'Pets', 'Necramechs'
] as const

/**
 * Three-state mastery for items that can go to rank 40.
 * - unmastered: Below rank 30 XP threshold
 * - mastered_30: At/above rank 30, below rank 40 (for maxRank=40 items)
 * - mastered_40: At/above full mastery threshold
 */
export type MasteryState = 'unmastered' | 'mastered_30' | 'mastered_40'

/**
 * Calculate XP required for mastery at a given max rank.
 * Formula: multiplier × rank²
 * - Frames: 1000 × rank² (e.g., rank 30 = 900,000 XP)
 * - Weapons: 500 × rank² (e.g., rank 30 = 450,000 XP)
 */
export function getMasteredXp(category: string, maxRank: number): number {
  const multiplier = FRAME_CATEGORIES.includes(category as any) ? 1000 : 500
  return multiplier * maxRank * maxRank
}

/**
 * Calculate XP threshold for rank 30 (base mastery).
 * Always uses rank 30 regardless of item's maxRank.
 */
export function getRank30Xp(category: string): number {
  const multiplier = FRAME_CATEGORIES.includes(category as any) ? 1000 : 500
  return multiplier * 30 * 30  // 900,000 for frames, 450,000 for weapons
}

/**
 * Determine the three-state mastery level.
 * For rank 40 items: distinguishes between "mastered at 30" and "fully mastered at 40"
 * For rank 30 items: mastered_30 means fully mastered
 */
export function getMasteryState(xp: number, category: string, maxRank: number): MasteryState {
  const rank30Xp = getRank30Xp(category)
  const fullXp = getMasteredXp(category, maxRank)

  if (maxRank > 30 && xp >= fullXp) {
    return 'mastered_40'
  }
  if (xp >= rank30Xp) {
    return 'mastered_30'
  }
  return 'unmastered'
}

/**
 * Legacy binary mastery check - returns true if mastered at rank 30 or above.
 */
export function isMastered(xp: number, category: string, maxRank: number): boolean {
  return getMasteryState(xp, category, maxRank) !== 'unmastered'
}

export interface MasteryRecord {
  id: number
  playerId: string
  itemId: number
  xp: number
  isMastered: boolean
  syncedAt: Date
}

/**
 * Get mastery XP contribution from stored XP.
 * Each level contributes mastery XP: 200/level for frames, 100/level for weapons.
 */
export function getMasteryContribution(xp: number, category: string, maxRank: number): number {
  const multiplier = FRAME_CATEGORIES.includes(category as any) ? 1000 : 500
  const masteryPerLevel = FRAME_CATEGORIES.includes(category as any) ? 200 : 100
  const currentRank = Math.min(Math.floor(Math.sqrt(xp / multiplier)), maxRank)
  return currentRank * masteryPerLevel
}

/**
 * Get cumulative XP threshold for a mastery rank.
 * MR 1-30: 2500 * mr²
 * Legendary (31+): 2,250,000 + 147,500 * (mr - 30)
 */
export function getMRThreshold(mr: number): number {
  if (mr > 30) {
    return 2250000 + 147500 * (mr - 30)
  }
  return 2500 * mr * mr
}

export interface MasteryRankInfo {
  rank: number
  current: number
  next: number
  progress: number
}

/**
 * Calculate MR and progress from total mastery XP.
 */
export function calculateMR(totalMasteryXp: number): MasteryRankInfo {
  let rank: number
  if (totalMasteryXp >= 2250000) {
    // Legendary ranks
    rank = 30 + Math.floor((totalMasteryXp - 2250000) / 147500)
  } else {
    rank = Math.floor(Math.sqrt(totalMasteryXp / 2500))
  }
  const current = getMRThreshold(rank)
  const next = getMRThreshold(rank + 1)
  const progress = next > current ? ((totalMasteryXp - current) / (next - current)) * 100 : 0
  return { rank, current, next, progress }
}
