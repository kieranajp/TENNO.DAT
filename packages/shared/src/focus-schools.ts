/**
 * Focus school value object - single source of truth.
 * Encapsulates DE's internal codes, friendly names, and UI metadata.
 */
export class FocusSchool {
  private static readonly byCode = new Map<string, FocusSchool>()
  private static readonly byName = new Map<string, FocusSchool>()

  static readonly Madurai = new FocusSchool('Madurai', 'AP_ATTACK', '#ff6b35', 'madurai-lens-e675bac31e.png')
  static readonly Vazarin = new FocusSchool('Vazarin', 'AP_DEFENSE', '#4ecdc4', 'vazarin-lens-ae790776d3.png')
  static readonly Naramon = new FocusSchool('Naramon', 'AP_TACTIC', '#f7dc6f', 'naramon-lens-7be3563b7d.png')
  static readonly Zenurik = new FocusSchool('Zenurik', 'AP_POWER', '#5dade2', 'zenurik-lens-0f0eb9c38b.png')
  static readonly Unairu = new FocusSchool('Unairu', 'AP_WARD', '#a569bd', 'unairu-lens-f251e69759.png')

  private constructor(
    readonly name: string,
    readonly code: string,
    readonly color: string,
    readonly imageName: string
  ) {
    FocusSchool.byCode.set(code, this)
    FocusSchool.byName.set(name, this)
  }

  /** Get all focus schools */
  static all(): FocusSchool[] {
    return [
      FocusSchool.Madurai,
      FocusSchool.Vazarin,
      FocusSchool.Naramon,
      FocusSchool.Zenurik,
      FocusSchool.Unairu,
    ]
  }

  /** Look up by DE's internal code (e.g., 'AP_ATTACK' → Madurai) */
  static fromCode(code: string): FocusSchool | null {
    return FocusSchool.byCode.get(code) ?? null
  }

  /** Look up by friendly name (e.g., 'Madurai') */
  static fromName(name: string): FocusSchool | null {
    return FocusSchool.byName.get(name) ?? null
  }

  /** Serialize for API responses */
  toJSON() {
    return { name: this.name, color: this.color, imageName: this.imageName }
  }
}

// Backwards-compatible exports
export type FocusSchoolName = 'Madurai' | 'Vazarin' | 'Naramon' | 'Zenurik' | 'Unairu'
export type FocusSchoolCode = 'AP_ATTACK' | 'AP_DEFENSE' | 'AP_TACTIC' | 'AP_POWER' | 'AP_WARD'

/** @deprecated Use FocusSchool.fromCode() */
export function getFocusSchoolFromCode(code: string): FocusSchoolName | null {
  return FocusSchool.fromCode(code)?.name as FocusSchoolName | null
}

/** @deprecated Use FocusSchool.fromName() */
export function getFocusSchoolInfo(
  name: string | null
): { name: string; color: string; imageName: string } | null {
  if (!name) return null
  const school = FocusSchool.fromName(name)
  return school ? school.toJSON() : null
}

/** @deprecated Use FocusSchool.Madurai etc. directly */
export const FOCUS_SCHOOLS = {
  Madurai: FocusSchool.Madurai.toJSON(),
  Vazarin: FocusSchool.Vazarin.toJSON(),
  Naramon: FocusSchool.Naramon.toJSON(),
  Zenurik: FocusSchool.Zenurik.toJSON(),
  Unairu: FocusSchool.Unairu.toJSON(),
} as const
