import { FocusSchool, Platform } from '@warframe-tracker/shared'
import type { ProfileApi, ProfileData, Loadout, Intrinsics, MissionCompletion, WeaponStats } from '../../domain/ports/profile-api'
import { createLogger } from '../logger'

const log = createLogger('DeProfileApi')

export class DeProfileApi implements ProfileApi {
  async fetch(playerId: string, platform: Platform): Promise<ProfileData> {
    const url = platform.profileUrl(playerId)

    log.info('Fetching profile', { playerId, platform: platform.id, url })

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

    // XP data is in Results[0].LoadOutInventory.XPInfo, NOT top-level XpComponents
    const xpInfo = data.Results?.[0]?.LoadOutInventory?.XPInfo ?? []

    // Extract loadout from LoadOutInventory
    const loadOutInventory = data.Results?.[0]?.LoadOutInventory ?? {}
    const loadOutPreset = data.Results?.[0]?.LoadOutPreset ?? {}
    const loadout = this.extractLoadout(loadOutInventory, loadOutPreset)

    // Extract intrinsics from PlayerSkills
    const playerSkills = data.Results?.[0]?.PlayerSkills ?? {}
    const intrinsics = this.extractIntrinsics(playerSkills)

    // Extract mission completions for star chart tracking
    const rawMissions = data.Results?.[0]?.Missions ?? []
    const missions = this.extractMissions(rawMissions)

    // Extract weapon combat stats (at root level, not under Results[0])
    const rawWeaponStats = data.Stats?.Weapons ?? []
    const weaponStats = this.extractWeaponStats(rawWeaponStats)

    log.info('Profile fetched', {
      displayName: data.Results?.[0]?.DisplayName,
      playerLevel: data.Results?.[0]?.PlayerLevel,
      xpItemCount: xpInfo.length,
      weaponStatsCount: weaponStats.length,
      missionsCount: missions.length,
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
      weaponStats,
      loadout,
      intrinsics,
      missions,
    }
  }

  private extractLoadout(loadOutInventory: any, loadOutPreset: any): Loadout {
    const focusSchoolCode = loadOutPreset?.FocusSchool ?? null

    return {
      warframe: loadOutInventory?.Suits?.[0]?.ItemType ?? null,
      primary: loadOutInventory?.LongGuns?.[0]?.ItemType ?? null,
      secondary: loadOutInventory?.Pistols?.[0]?.ItemType ?? null,
      melee: loadOutInventory?.Melee?.[0]?.ItemType ?? null,
      focusSchool: focusSchoolCode ? (FocusSchool.fromCode(focusSchoolCode)?.name ?? focusSchoolCode) : null,
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

  private extractMissions(rawMissions: any[]): MissionCompletion[] {
    return rawMissions.map((m: any) => ({
      tag: m.Tag,
      completes: m.Completes ?? 0,
      tier: m.Tier,
    }))
  }

  private extractWeaponStats(rawStats: any[]): WeaponStats[] {
    return rawStats
      .filter((s: any) => s.type) // Must have type (uniqueName)
      .map((s: any) => ({
        itemType: s.type,
        fired: s.fired ?? null,
        hits: s.hits ?? null,
        kills: s.kills ?? 0,
        headshots: s.headshots ?? 0,
        equipTime: Math.round(s.equipTime ?? 0),
        assists: s.assists ?? 0,
      }))
  }
}
