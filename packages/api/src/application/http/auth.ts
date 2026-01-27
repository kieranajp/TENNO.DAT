import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Container } from '../../infrastructure/bootstrap/container'
import { SteamOpenIDService } from '../../infrastructure/external/steam-openid'
import { createLogger } from '../../infrastructure/logger'
import { handleRouteError } from './errors'

const log = createLogger('Auth')

const SESSION_COOKIE = 'tenno_session'
const REMEMBER_COOKIE = 'tenno_remember'
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const STEAM_API_KEY = process.env.STEAM_API_KEY ?? ''
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// Session durations
const AUTH_FLOW_TTL = 300 // 5 minutes for auth flow cookies
const SESSION_TTL_SHORT = 24 * 60 * 60 // 24 hours
const SESSION_TTL_LONG = 30 * 24 * 60 * 60 // 30 days with remember me

export function authRoutes(container: Container) {
  const router = new Hono()
  const steam = new SteamOpenIDService(BASE_URL)

  // GET /auth/steam - Redirect to Steam login
  router.get('/steam', async (c) => {
    try {
      const rememberMe = c.req.query('remember') === 'true'

      // Store remember preference in a temporary cookie
      setCookie(c, REMEMBER_COOKIE, rememberMe ? '1' : '0', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: AUTH_FLOW_TTL,
        path: '/',
      })

      const authUrl = await steam.getAuthUrl()
      return c.redirect(authUrl)
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to initiate Steam login')
    }
  })

  // GET /auth/steam/callback - Handle Steam callback
  router.get('/steam/callback', async (c) => {
    try {
      // Reconstruct full URL for OpenID verification
      const requestUrl = new URL(c.req.url)
      const fullUrl = `${BASE_URL}${requestUrl.pathname}${requestUrl.search}`
      const steamId = await steam.verifyAssertion(fullUrl)

      // Fetch Steam profile
      const profile = STEAM_API_KEY
        ? await steam.fetchProfile(steamId, STEAM_API_KEY)
        : { steamId, displayName: null, avatarUrl: null }

      // Find or create user
      let user = await container.userRepo.findBySteamId(steamId)

      if (user) {
        // Update profile and last login
        await container.userRepo.updateSteamProfile(user.id, profile.displayName, profile.avatarUrl)
        await container.userRepo.updateLastLogin(user.id)
      } else {
        // Create new user
        user = await container.userRepo.create(steamId, profile.displayName, profile.avatarUrl)
        // Create empty player settings row for onboarding
        await container.playerRepo.createSettings(user.id)
        log.info('New user created', { steamId, userId: user.id })
      }

      // Get remember preference
      const rememberMe = getCookie(c, REMEMBER_COOKIE) === '1'
      deleteCookie(c, REMEMBER_COOKIE, { path: '/' })

      // Create session
      const session = await container.sessionRepo.create(user.id, rememberMe)

      // Set session cookie
      const maxAge = rememberMe ? SESSION_TTL_LONG : SESSION_TTL_SHORT
      setCookie(c, SESSION_COOKIE, session.id, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge,
        path: '/',
      })

      log.info('User logged in', { userId: user.id, steamId, rememberMe })

      // Redirect to frontend
      return c.redirect(FRONTEND_URL)
    } catch (error) {
      log.error('Steam callback failed', error instanceof Error ? error : undefined)
      return c.redirect(`${FRONTEND_URL}/login?error=auth_failed`)
    }
  })

  // POST /auth/logout - Clear session
  router.post('/logout', async (c) => {
    try {
      const sessionId = getCookie(c, SESSION_COOKIE)

      if (sessionId) {
        await container.sessionRepo.delete(sessionId)
      }

      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      return c.json({ success: true })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to logout')
    }
  })

  // GET /auth/me - Get current user
  router.get('/me', async (c) => {
    try {
      const sessionId = getCookie(c, SESSION_COOKIE)

      if (!sessionId) {
        return c.json({ user: null })
      }

      const sessionData = await container.sessionRepo.findByIdWithUser(sessionId)

      if (!sessionData || sessionData.session.expiresAt < new Date()) {
        if (sessionData) {
          await container.sessionRepo.delete(sessionId)
        }
        deleteCookie(c, SESSION_COOKIE, { path: '/' })
        return c.json({ user: null })
      }

      const user = await container.userRepo.findByIdWithSettings(sessionData.userId)
      return c.json({ user })
    } catch (error) {
      return handleRouteError(c, log, error, 'Failed to get current user')
    }
  })

  return router
}
