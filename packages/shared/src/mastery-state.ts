/**
 * Mastery state value object.
 * Represents the three-tier mastery progression for items.
 */
export class MasteryState {
  private static readonly byId = new Map<string, MasteryState>()

  /** Item has not reached rank 30 */
  static readonly Unmastered = new MasteryState(
    'unmastered',
    'Unmastered',
    false,
    'unmastered'
  )

  /** Item reached rank 30 (full mastery for standard items, partial for rank-40 items) */
  static readonly Mastered30 = new MasteryState(
    'mastered_30',
    'Mastered',
    true,
    'mastered'
  )

  /** Item reached rank 40 (only possible for Kuva/Tenet weapons, Paracesis, Necramechs) */
  static readonly Mastered40 = new MasteryState(
    'mastered_40',
    'Forma\'d',
    true,
    'mastered-full'
  )

  private constructor(
    /** Identifier used in DB and API */
    readonly id: string,
    /** Human-readable label for UI */
    readonly label: string,
    /** Whether this counts as "mastered" for filtering/counting */
    readonly isMastered: boolean,
    /** CSS class name for styling */
    readonly cssClass: string
  ) {
    MasteryState.byId.set(id, this)
  }

  /** Get all mastery states */
  static all(): MasteryState[] {
    return [MasteryState.Unmastered, MasteryState.Mastered30, MasteryState.Mastered40]
  }

  /** Look up by ID (e.g., 'unmastered', 'mastered_30', 'mastered_40') */
  static fromId(id: string): MasteryState | null {
    return MasteryState.byId.get(id) ?? null
  }

  /**
   * Determine mastery state from current rank and item's max rank.
   * - rank < 30 → Unmastered
   * - rank >= 40 && maxRank > 30 → Mastered40
   * - rank >= 30 → Mastered30
   */
  static fromRank(rank: number, maxRank: number): MasteryState {
    if (maxRank > 30 && rank >= 40) {
      return MasteryState.Mastered40
    }
    if (rank >= 30) {
      return MasteryState.Mastered30
    }
    return MasteryState.Unmastered
  }

  /** Check if this is the fully mastered state for a given max rank */
  isFullyMastered(maxRank: number): boolean {
    if (maxRank > 30) {
      return this === MasteryState.Mastered40
    }
    return this.isMastered
  }

  /** Serialize for API responses */
  toJSON() {
    return this.id
  }

  toString() {
    return this.id
  }
}

// Backwards-compatible type alias
export type MasteryStateId = 'unmastered' | 'mastered_30' | 'mastered_40'
