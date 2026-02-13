import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createAuthMiddleware, createOnboardingMiddleware } from './auth'
import { createMockContainer } from '../../../test-utils'
import type { Container } from '../../../infrastructure/bootstrap/container'

describe('Auth Middleware', () => {
  let container: Container

  beforeEach(() => {
    container = createMockContainer()
  })

  describe('createAuthMiddleware', () => {
    it('returns 401 when no session cookie present', async () => {
      const app = new Hono()
      app.use('*', createAuthMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when session not found in database', async () => {
      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue(null)

      const app = new Hono()
      app.use('*', createAuthMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Cookie: 'tenno_session=invalid-session' },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Session expired')
    })

    it('deletes session and returns 401 when session is expired', async () => {
      const expiredSession = {
        session: {
          id: 'expired-session',
          userId: 1,
          rememberMe: false,
          expiresAt: new Date(Date.now() - 1000), // Expired
          createdAt: new Date(),
        },
        userId: 1,
      }
      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue(expiredSession)

      const app = new Hono()
      app.use('*', createAuthMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Cookie: 'tenno_session=expired-session' },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Session expired')
      expect(container.sessionRepo.delete).toHaveBeenCalledWith('expired-session')
    })

    it('returns 401 when user not found for valid session', async () => {
      const validSession = {
        session: {
          id: 'valid-session',
          userId: 1,
          rememberMe: false,
          expiresAt: new Date(Date.now() + 86400000), // Not expired
          createdAt: new Date(),
        },
        userId: 1,
      }
      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue(validSession)
      vi.mocked(container.userRepo.findById).mockResolvedValue(null)

      const app = new Hono()
      app.use('*', createAuthMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Cookie: 'tenno_session=valid-session' },
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('User not found')
      expect(container.sessionRepo.delete).toHaveBeenCalledWith('valid-session')
    })

    it('sets auth context and calls next for valid session', async () => {
      const validSession = {
        session: {
          id: 'valid-session',
          userId: 1,
          rememberMe: false,
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
        },
        userId: 1,
      }
      const mockUser = {
        id: 1,
        steamId: '76561198012345678',
        steamDisplayName: 'TestPlayer',
        steamAvatarUrl: null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      }

      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue(validSession)
      vi.mocked(container.userRepo.findById).mockResolvedValue(mockUser)

      const app = new Hono()
      app.use('*', createAuthMiddleware(container))
      app.get('/protected', (c) => {
        const auth = c.get('auth')
        return c.json({ userId: auth.userId, steamId: auth.steamId })
      })

      const res = await app.request('/protected', {
        headers: { Cookie: 'tenno_session=valid-session' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.userId).toBe(1)
      expect(body.steamId).toBe('76561198012345678')
    })

    it('clears cookie on expired session', async () => {
      const expiredSession = {
        session: {
          id: 'expired-session',
          userId: 1,
          rememberMe: false,
          expiresAt: new Date(Date.now() - 1000),
          createdAt: new Date(),
        },
        userId: 1,
      }
      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue(expiredSession)

      const app = new Hono()
      app.use('*', createAuthMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Cookie: 'tenno_session=expired-session' },
      })

      expect(res.status).toBe(401)
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('tenno_session=')
      expect(cookies).toContain('Max-Age=0')
    })
  })

  describe('createOnboardingMiddleware', () => {
    it('returns 401 when no auth context present', async () => {
      const app = new Hono()
      // Don't add auth middleware first - simulate missing auth
      app.use('*', createOnboardingMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 403 with ONBOARDING_REQUIRED when no player settings', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue(null)

      const app = new Hono()
      // Mock auth context directly
      app.use('*', async (c, next) => {
        c.set('auth', { userId: 1, steamId: '12345' })
        await next()
      })
      app.use('*', createOnboardingMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBe('Onboarding required')
      expect(body.code).toBe('ONBOARDING_REQUIRED')
    })

    it('returns 403 when settings exist but playerId is null', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue({
        id: 1,
        userId: 1,
        playerId: null,
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      })

      const app = new Hono()
      app.use('*', async (c, next) => {
        c.set('auth', { userId: 1, steamId: '12345' })
        await next()
      })
      app.use('*', createOnboardingMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.code).toBe('ONBOARDING_REQUIRED')
    })

    it('allows request and sets playerSettings when player is fully configured', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue({
        id: 1,
        userId: 1,
        playerId: 'configured-player',
        platform: 'pc',
        displayName: 'TestPlayer',
        lastSyncAt: new Date(),
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      })

      const app = new Hono()
      app.use('*', async (c, next) => {
        c.set('auth', { userId: 1, steamId: '12345' })
        await next()
      })
      app.use('*', createOnboardingMiddleware(container))
      app.get('/protected', (c) => {
        const settings = c.get('playerSettings')
        return c.json({ ok: true, playerId: settings.playerId })
      })

      const res = await app.request('/protected')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.playerId).toBe('configured-player')
    })

    it('queries player settings with correct userId', async () => {
      vi.mocked(container.playerRepo.getSettings).mockResolvedValue({
        id: 1,
        userId: 42,
        playerId: 'player',
        platform: 'pc',
        displayName: null,
        lastSyncAt: null,
        railjackIntrinsics: 0,
        drifterIntrinsics: 0,
      })

      const app = new Hono()
      app.use('*', async (c, next) => {
        c.set('auth', { userId: 42, steamId: '12345' })
        await next()
      })
      app.use('*', createOnboardingMiddleware(container))
      app.get('/protected', (c) => c.json({ ok: true }))

      await app.request('/protected')

      expect(container.playerRepo.getSettings).toHaveBeenCalledWith(42)
    })
  })
})
