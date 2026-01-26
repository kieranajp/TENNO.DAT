/**
 * Gaming platform value object.
 * Encapsulates platform ID, display name, and DE API base URL.
 */
export class Platform {
  private static readonly byId = new Map<string, Platform>()

  static readonly PC = new Platform('pc', 'PC', 'https://api.warframe.com/cdn')
  static readonly PlayStation = new Platform('ps', 'PlayStation', 'https://content-ps4.warframe.com/dynamic')
  static readonly Xbox = new Platform('xbox', 'Xbox', 'https://content-xb1.warframe.com/dynamic')
  static readonly Switch = new Platform('switch', 'Nintendo Switch', 'https://content-swi.warframe.com/dynamic')

  private constructor(
    /** Short identifier used in DB and URLs */
    readonly id: string,
    /** Human-readable display name */
    readonly displayName: string,
    /** DE profile API base URL for this platform */
    readonly apiBaseUrl: string
  ) {
    Platform.byId.set(id, this)
  }

  /** Get all platforms */
  static all(): Platform[] {
    return [Platform.PC, Platform.PlayStation, Platform.Xbox, Platform.Switch]
  }

  /** Look up by short ID (e.g., 'pc', 'ps', 'xbox', 'switch') */
  static fromId(id: string): Platform | null {
    return Platform.byId.get(id) ?? null
  }

  /** Build the profile API URL for a player on this platform */
  profileUrl(playerId: string): string {
    return `${this.apiBaseUrl}/getProfileViewingData.php?playerId=${playerId}`
  }

  /** Serialize for API responses */
  toJSON() {
    return { id: this.id, displayName: this.displayName }
  }
}

// Backwards-compatible type alias
export type PlatformId = 'pc' | 'ps' | 'xbox' | 'switch'
