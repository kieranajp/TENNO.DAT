import { FRAME_CATEGORIES } from '@warframe-tracker/shared'

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
 * Calculate item rank from XP.
 * Formula: rank = floor(sqrt(xp / multiplier)), capped at maxRank
 */
export function getRankFromXp(xp: number, category: string, maxRank: number): number {
  const multiplier = FRAME_CATEGORIES.includes(category as any) ? 1000 : 500
  return Math.min(Math.floor(Math.sqrt(xp / multiplier)), maxRank)
}

/**
 * Derive mastery state from stored rank.
 * - unmastered: rank < 30
 * - mastered_30: rank >= 30 (fully mastered for maxRank=30 items, or base mastery for maxRank=40)
 * - mastered_40: rank >= 40 (only possible for maxRank=40 items)
 */
export function getMasteryStateFromRank(rank: number, maxRank: number): MasteryState {
  if (maxRank > 30 && rank >= 40) {
    return 'mastered_40'
  }
  if (rank >= 30) {
    return 'mastered_30'
  }
  return 'unmastered'
}

/**
 * Determine the three-state mastery level from XP.
 * For rank 40 items: distinguishes between "mastered at 30" and "fully mastered at 40"
 * For rank 30 items: mastered_30 means fully mastered
 * @deprecated Use getMasteryStateFromRank with stored rank instead
 */
export function getMasteryState(xp: number, category: string, maxRank: number): MasteryState {
  const rank = getRankFromXp(xp, category, maxRank)
  return getMasteryStateFromRank(rank, maxRank)
}

export interface MasteryRecord {
  id: number
  playerId: string
  itemId: number
  xp: number
  rank: number
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
 * Calculate XP from intrinsics.
 * Each intrinsic level gives 1500 mastery XP.
 */
export function intrinsicsToXP(levels: number): number {
  return levels * 1500
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
