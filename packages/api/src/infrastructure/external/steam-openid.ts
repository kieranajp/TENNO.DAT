import openid from 'openid'

const { RelyingParty } = openid
import { createLogger } from '../logger'

const log = createLogger('SteamOpenID')

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid'

export interface SteamProfile {
  steamId: string
  displayName: string | null
  avatarUrl: string | null
}

export class SteamOpenIDService {
  private relyingParty: RelyingParty

  constructor(baseUrl: string) {
    const returnUrl = `${baseUrl}/auth/steam/callback`
    const realm = baseUrl

    this.relyingParty = new RelyingParty(returnUrl, realm, true, true, [])
  }

  async getAuthUrl(state?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.relyingParty.authenticate(STEAM_OPENID_URL, false, (err, authUrl) => {
        if (err || !authUrl) {
          log.error('Failed to generate auth URL', new Error(err?.message))
          reject(err ?? new Error('No auth URL returned'))
          return
        }
        // Append state parameter for CSRF protection if provided
        if (state) {
          const url = new URL(authUrl)
          url.searchParams.set('state', state)
          resolve(url.toString())
        } else {
          resolve(authUrl)
        }
      })
    })
  }

  async verifyAssertion(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.relyingParty.verifyAssertion(url, (err, result) => {
        if (err || !result?.authenticated) {
          log.error('Failed to verify assertion', new Error(err?.message))
          reject(err ?? new Error('Authentication failed'))
          return
        }

        // Extract SteamID from claimed_id
        // Format: https://steamcommunity.com/openid/id/76561198012345678
        const claimedId = result.claimedIdentifier
        const steamId = claimedId?.split('/').pop()

        if (!steamId) {
          reject(new Error('Could not extract Steam ID'))
          return
        }

        resolve(steamId)
      })
    })
  }

  async fetchProfile(steamId: string, apiKey: string): Promise<SteamProfile> {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`

    try {
      const response = await fetch(url)
      const data = await response.json() as {
        response: {
          players: Array<{
            steamid: string
            personaname?: string
            avatarmedium?: string
          }>
        }
      }

      const player = data.response.players[0]
      return {
        steamId,
        displayName: player?.personaname ?? null,
        avatarUrl: player?.avatarmedium ?? null,
      }
    } catch (error) {
      log.warn('Failed to fetch Steam profile', { steamId, error: String(error) })
      return { steamId, displayName: null, avatarUrl: null }
    }
  }
}
