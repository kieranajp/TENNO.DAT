import { writeFileSync } from 'node:fs'
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

    console.log(`[DE API] Fetching: ${url}`)

    const response = await fetch(url, {
      headers: { 'User-Agent': 'WarframeMasteryTracker/1.0' },
    })

    console.log(`[DE API] Response status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`Profile API error: ${response.status}`)
    }

    const data = await response.json()

    // Dump full response to file for debugging
    const dumpPath = '/tmp/claude/de-profile-response.json'
    writeFileSync(dumpPath, JSON.stringify(data, null, 2))
    console.log(`[DE API] Full response dumped to: ${dumpPath}`)

    if (data.XpComponents?.length > 0) {
      console.log(`[DE API] Sample XpComponent:`, JSON.stringify(data.XpComponents[0]))
    }

    // XP data is in Results[0].LoadOutInventory.XPInfo, NOT top-level XpComponents
    const xpInfo = data.Results?.[0]?.LoadOutInventory?.XPInfo ?? []
    console.log(`[DE API] Found ${xpInfo.length} items in XPInfo`)

    return {
      displayName: data.Results?.[0]?.DisplayName ?? null,
      playerLevel: data.Results?.[0]?.PlayerLevel ?? 0,
      xpComponents: xpInfo.map((xp: any) => ({
        itemType: xp.ItemType,
        xp: xp.XP,
      })),
    }
  }
}
