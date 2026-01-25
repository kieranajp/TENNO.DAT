import { writeFileSync } from 'node:fs'
import type { Platform } from '../../domain/entities/player'
import type { ProfileApi, ProfileData, Loadout, Intrinsics } from '../../domain/ports/profile-api'
import { createLogger } from '../logger'

const log = createLogger('DeProfileApi')

// PC redirects to api.warframe.com/cdn, others still use content-*.warframe.com/dynamic
const PLATFORM_URLS: Record<Platform, string> = {
  pc: 'https://api.warframe.com/cdn',
  ps: 'https://content-ps4.warframe.com/dynamic',
  xbox: 'https://content-xb1.warframe.com/dynamic',
  switch: 'https://content-swi.warframe.com/dynamic',
}

const FOCUS_SCHOOLS: Record<string, string> = {
  'AP_ATTACK': 'Madurai',
  'AP_DEFENSE': 'Vazarin',
  'AP_TACTIC': 'Naramon',
  'AP_POWER': 'Zenurik',
  'AP_WARD': 'Unairu',
}

export class DeProfileApi implements ProfileApi {
  async fetch(playerId: string, platform: Platform): Promise<ProfileData> {
    const baseUrl = PLATFORM_URLS[platform]
    const url = `${baseUrl}/getProfileViewingData.php?playerId=${playerId}`

    log.info('Fetching profile', { playerId, platform, url })

    const response = await fetch(url)

    if (!response.ok) {
      const body = await response.text()
      log.error('Profile fetch failed', { status: response.status, body })

      if (response.status === 403) {
        throw new Error('Access denied - you may be rate limited. Try again in a few minutes.')
      }
      if (response.status === 409) {
        throw new Error('Profile is private. Enable public profile in Warframe settings.')
      }
      throw new Error(`Profile API error: ${response.status}${body ? ` - ${body}` : ''}`)
    }

    const data = await response.json()

    // Dump full response to file for debugging
    const dumpPath = '/tmp/claude/de-profile-response.json'
    writeFileSync(dumpPath, JSON.stringify(data, null, 2))
    log.debug('Response dumped', { path: dumpPath })

    // XP data is in Results[0].LoadOutInventory.XPInfo, NOT top-level XpComponents
    const xpInfo = data.Results?.[0]?.LoadOutInventory?.XPInfo ?? []

    // Extract loadout from LoadOutInventory
    const loadOutInventory = data.Results?.[0]?.LoadOutInventory ?? {}
    const loadOutPreset = data.Results?.[0]?.LoadOutPreset ?? {}
    const loadout = this.extractLoadout(loadOutInventory, loadOutPreset)

    // Extract intrinsics from PlayerSkills
    const playerSkills = data.Results?.[0]?.PlayerSkills ?? {}
    const intrinsics = this.extractIntrinsics(playerSkills)

    log.info('Profile fetched', {
      displayName: data.Results?.[0]?.DisplayName,
      playerLevel: data.Results?.[0]?.PlayerLevel,
      xpItemCount: xpInfo.length,
      loadout,
      intrinsics,
    })

    return {
      displayName: data.Results?.[0]?.DisplayName ?? null,
      playerLevel: data.Results?.[0]?.PlayerLevel ?? 0,
      xpComponents: xpInfo.map((xp: any) => ({
        itemType: xp.ItemType,
        xp: xp.XP,
      })),
      loadout,
      intrinsics,
    }
  }

  private extractLoadout(loadOutInventory: any, loadOutPreset: any): Loadout {
    const focusSchoolCode = loadOutPreset?.FocusSchool ?? null

    return {
      warframe: loadOutInventory?.Suits?.[0]?.ItemType ?? null,
      primary: loadOutInventory?.LongGuns?.[0]?.ItemType ?? null,
      secondary: loadOutInventory?.Pistols?.[0]?.ItemType ?? null,
      melee: loadOutInventory?.Melee?.[0]?.ItemType ?? null,
      focusSchool: focusSchoolCode ? (FOCUS_SCHOOLS[focusSchoolCode] ?? focusSchoolCode) : null,
    }
  }

  private extractIntrinsics(playerSkills: any): Intrinsics {
    // Railjack intrinsics (5 skills, max 10 each = 50 total)
    const tactical = playerSkills?.LPS_TACTICAL ?? 0
    const piloting = playerSkills?.LPS_PILOTING ?? 0
    const gunnery = playerSkills?.LPS_GUNNERY ?? 0
    const engineering = playerSkills?.LPS_ENGINEERING ?? 0
    const command = playerSkills?.LPS_COMMAND ?? 0

    // Drifter intrinsics (4 skills, max 10 each = 40 total)
    const riding = playerSkills?.LPS_DRIFT_RIDING ?? 0
    const combat = playerSkills?.LPS_DRIFT_COMBAT ?? 0
    const opportunity = playerSkills?.LPS_DRIFT_OPPORTUNITY ?? 0
    const endurance = playerSkills?.LPS_DRIFT_ENDURANCE ?? 0

    return {
      railjack: {
        tactical,
        piloting,
        gunnery,
        engineering,
        command,
        total: tactical + piloting + gunnery + engineering + command,
      },
      drifter: {
        riding,
        combat,
        opportunity,
        endurance,
        total: riding + combat + opportunity + endurance,
      },
    }
  }
}
