import { getXpMultiplier, getXpPerRank } from '@warframe-tracker/shared'
import { MasteryState } from '@warframe-tracker/shared'

export { MasteryState }

/**
 * Calculate XP required for mastery at a given max rank.
 * Formula: multiplier × rank²
 */
export function getMasteredXp(category: string, maxRank: number): number {
  return getXpMultiplier(category) * maxRank * maxRank
}

/**
 * Calculate XP threshold for rank 30 (base mastery).
 */
export function getRank30Xp(category: string): number {
  return getXpMultiplier(category) * 30 * 30
}

/**
 * Calculate item rank from XP.
 * Formula: rank = floor(sqrt(xp / multiplier)), capped at maxRank
 */
export function getRankFromXp(xp: number, category: string, maxRank: number): number {
  return Math.min(Math.floor(Math.sqrt(xp / getXpMultiplier(category))), maxRank)
}

/**
 * Derive mastery state from stored rank.
 */
export function getMasteryStateFromRank(rank: number, maxRank: number): MasteryState {
  return MasteryState.fromRank(rank, maxRank)
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
 */
export function getMasteryContribution(xp: number, category: string, maxRank: number): number {
  const currentRank = getRankFromXp(xp, category, maxRank)
  return currentRank * getXpPerRank(category)
}

/**
 * Get cumulative XP threshold for a mastery rank.
 * MR 1-30: 2500 × mr²
 * Legendary (31+): 2,250,000 + 147,500 × (mr - 30)
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
    rank = 30 + Math.floor((totalMasteryXp - 2250000) / 147500)
  } else {
    rank = Math.floor(Math.sqrt(totalMasteryXp / 2500))
  }
  const current = getMRThreshold(rank)
  const next = getMRThreshold(rank + 1)
  const progress = next > current ? ((totalMasteryXp - current) / (next - current)) * 100 : 0
  return { rank, current, next, progress }
}
