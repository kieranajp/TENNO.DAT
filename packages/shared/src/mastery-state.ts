/**
 * Mastery state value object.
 * Represents the three-tier mastery progression for items.
 */
export class MasteryState {
  private static readonly byId = new Map<string, MasteryState>()

  static readonly Unmastered = new MasteryState('unmastered', 'Unmastered', false, 'unmastered')
  static readonly Mastered30 = new MasteryState('mastered_30', 'Mastered', true, 'mastered')
  static readonly Mastered40 = new MasteryState('mastered_40', 'Forma\'d', true, 'mastered-full')

  private constructor(
    readonly id: string,
    readonly label: string,
    readonly isMastered: boolean,
    readonly cssClass: string
  ) {
    MasteryState.byId.set(id, this)
  }

  static all(): MasteryState[] {
    return [MasteryState.Unmastered, MasteryState.Mastered30, MasteryState.Mastered40]
  }

  static fromId(id: string): MasteryState | null {
    return MasteryState.byId.get(id) ?? null
  }

  static fromRank(rank: number, maxRank: number): MasteryState {
    if (maxRank > 30 && rank >= 40) return MasteryState.Mastered40
    if (rank >= 30) return MasteryState.Mastered30
    return MasteryState.Unmastered
  }

  isFullyMastered(maxRank: number): boolean {
    if (maxRank > 30) return this === MasteryState.Mastered40
    return this.isMastered
  }

  toJSON() {
    return this.id
  }

  toString() {
    return this.id
  }
}
