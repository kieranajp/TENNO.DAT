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
    readonly id: string,
    readonly displayName: string,
    readonly apiBaseUrl: string
  ) {
    Platform.byId.set(id, this)
  }

  static all(): Platform[] {
    return [Platform.PC, Platform.PlayStation, Platform.Xbox, Platform.Switch]
  }

  static fromId(id: string): Platform | null {
    return Platform.byId.get(id) ?? null
  }

  profileUrl(playerId: string): string {
    return `${this.apiBaseUrl}/getProfileViewingData.php?playerId=${playerId}`
  }

  toJSON() {
    return { id: this.id, displayName: this.displayName }
  }
}
