import {
  getXpMultiplier,
  getXpPerRank,
  MasteryState,
  MASTERY_RANK_CONFIG,
  RANK_THRESHOLDS,
} from '@warframe-tracker/shared'

export { MasteryState }

const { xpPerMRSquared, xpPerLegendaryRank, mr30Threshold, xpPerIntrinsicLevel } = MASTERY_RANK_CONFIG

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
  return getXpMultiplier(category) * RANK_THRESHOLDS.standard * RANK_THRESHOLDS.standard
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
  // Combat stats
  fired?: number | null
  hits?: number | null
  kills?: number | null
  headshots?: number | null
  equipTime?: number | null
  assists?: number | null
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
 * MR 1-30: xpPerMRSquared × mr²
 * Legendary (31+): mr30Threshold + xpPerLegendaryRank × (mr - 30)
 */
export function getMRThreshold(mr: number): number {
  if (mr > RANK_THRESHOLDS.standard) {
    return mr30Threshold + xpPerLegendaryRank * (mr - RANK_THRESHOLDS.standard)
  }
  return xpPerMRSquared * mr * mr
}

export interface MasteryRankInfo {
  rank: number
  current: number
  next: number
  progress: number
}

/**
 * Calculate XP from intrinsics.
 * Each intrinsic level gives mastery XP.
 */
export function intrinsicsToXP(levels: number): number {
  return levels * xpPerIntrinsicLevel
}

/**
 * Calculate MR and progress from total mastery XP.
 */
export function calculateMR(totalMasteryXp: number): MasteryRankInfo {
  let rank: number
  if (totalMasteryXp >= mr30Threshold) {
    rank = RANK_THRESHOLDS.standard + Math.floor((totalMasteryXp - mr30Threshold) / xpPerLegendaryRank)
  } else {
    rank = Math.floor(Math.sqrt(totalMasteryXp / xpPerMRSquared))
  }
  const current = getMRThreshold(rank)
  const next = getMRThreshold(rank + 1)
  const progress = next > current ? ((totalMasteryXp - current) / (next - current)) * 100 : 0
  return { rank, current, next, progress }
}
