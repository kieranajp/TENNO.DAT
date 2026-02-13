import type { Context, Next } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import type { Container } from '../../../infrastructure/bootstrap/container'
import type { PlayerSettings } from '../../../domain/entities/player'
import { SESSION_COOKIE } from '../constants'

export interface AuthContext {
  userId: number
  steamId: string
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext
    playerSettings: PlayerSettings
  }
}

export function createAuthMiddleware(container: Container) {
  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, SESSION_COOKIE)

    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const sessionData = await container.sessionRepo.findByIdWithUser(sessionId)

    if (!sessionData || sessionData.session.expiresAt < new Date()) {
      if (sessionData) {
        await container.sessionRepo.delete(sessionId)
      }
      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      return c.json({ error: 'Session expired' }, 401)
    }

    const user = await container.userRepo.findById(sessionData.userId)

    if (!user) {
      await container.sessionRepo.delete(sessionId)
      deleteCookie(c, SESSION_COOKIE, { path: '/' })
      return c.json({ error: 'User not found' }, 401)
    }

    c.set('auth', { userId: user.id, steamId: user.steamId })
    await next()
  }
}

export function createOnboardingMiddleware(container: Container) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth')

    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const settings = await container.playerRepo.getSettings(auth.userId)

    if (!settings?.playerId) {
      return c.json({ error: 'Onboarding required', code: 'ONBOARDING_REQUIRED' }, 403)
    }

    c.set('playerSettings', settings)
    await next()
  }
}
