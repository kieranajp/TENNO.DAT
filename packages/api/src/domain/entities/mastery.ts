// Frame-type categories (200 mastery points per rank, 1000 XP multiplier)
const FRAME_CATEGORIES = [
  'Warframes', 'Companions', 'Archwing', 'KDrives', 'Sentinels', 'Pets', 'Necramechs'
] as const

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

export function isMastered(xp: number, category: string, maxRank: number): boolean {
  return xp >= getMasteredXp(category, maxRank)
}

export interface MasteryRecord {
  id: number
  playerId: string
  itemId: number
  xp: number
  isMastered: boolean
  syncedAt: Date
}
