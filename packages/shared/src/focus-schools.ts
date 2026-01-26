/**
 * Focus school value object.
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

  static all(): FocusSchool[] {
    return [
      FocusSchool.Madurai,
      FocusSchool.Vazarin,
      FocusSchool.Naramon,
      FocusSchool.Zenurik,
      FocusSchool.Unairu,
    ]
  }

  static fromCode(code: string): FocusSchool | null {
    return FocusSchool.byCode.get(code) ?? null
  }

  static fromName(name: string): FocusSchool | null {
    return FocusSchool.byName.get(name) ?? null
  }

  toJSON() {
    return { name: this.name, color: this.color, imageName: this.imageName }
  }
}
