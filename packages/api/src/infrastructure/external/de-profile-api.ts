import type { Platform } from '../../domain/entities/player'
import type { ProfileApi, ProfileData } from '../../domain/ports/profile-api'

const PLATFORM_URLS: Record<Platform, string> = {
  pc: 'https://content.warframe.com',
  ps: 'https://content-ps4.warframe.com',
  xbox: 'https://content-xb1.warframe.com',
  switch: 'https://content-swi.warframe.com',
}

export class DeProfileApi implements ProfileApi {
  async fetch(playerId: string, platform: Platform): Promise<ProfileData> {
    const baseUrl = PLATFORM_URLS[platform]
    const url = `${baseUrl}/dynamic/getProfileViewingData.php?playerId=${playerId}`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'WarframeMasteryTracker/1.0' },
    })

    if (!response.ok) {
      throw new Error(`Profile API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      displayName: data.Results?.[0]?.DisplayName ?? null,
      playerLevel: data.Results?.[0]?.PlayerLevel ?? 0,
      xpComponents: (data.XpComponents ?? []).map((xp: any) => ({
        itemType: xp.ItemType,
        xp: xp.XP,
      })),
    }
  }
}
