import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { authRoutes } from './auth'
import { createMockContainer } from '../../test-utils'
import type { Container } from '../../infrastructure/bootstrap/container'

// Mock the SteamOpenIDService
vi.mock('../../infrastructure/external/steam-openid', () => ({
  SteamOpenIDService: vi.fn().mockImplementation(() => ({
    getAuthUrl: vi.fn().mockResolvedValue('https://steamcommunity.com/openid/login?mock=true'),
    verifyAssertion: vi.fn().mockResolvedValue('76561198012345678'),
    fetchProfile: vi.fn().mockResolvedValue({
      steamId: '76561198012345678',
      displayName: 'TestPlayer',
      avatarUrl: 'https://example.com/avatar.jpg',
    }),
  })),
}))

describe('Auth Routes', () => {
  let container: Container
  let app: Hono

  beforeEach(() => {
    container = createMockContainer()
    app = new Hono()
    app.route('/auth', authRoutes(container))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /auth/steam', () => {
    it('redirects to Steam login URL', async () => {
      const res = await app.request('/auth/steam')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('https://steamcommunity.com/openid/login?mock=true')
    })

    it('sets remember cookie when remember=true', async () => {
      const res = await app.request('/auth/steam?remember=true')

      expect(res.status).toBe(302)
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('tenno_remember=1')
    })

    it('sets remember cookie to 0 when remember is not true', async () => {
      const res = await app.request('/auth/steam')

      expect(res.status).toBe(302)
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('tenno_remember=0')
    })
  })

  describe('GET /auth/steam/callback', () => {
    const mockUser = {
      id: 1,
      steamId: '76561198012345678',
      steamDisplayName: 'TestPlayer',
      steamAvatarUrl: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }

    const mockSession = {
      id: 'session-token-123',
      userId: 1,
      rememberMe: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    }

    it('creates new user on first login', async () => {
      vi.mocked(container.userRepo.findBySteamId).mockResolvedValue(null)
      vi.mocked(container.userRepo.create).mockResolvedValue(mockUser)
      vi.mocked(container.sessionRepo.create).mockResolvedValue(mockSession)

      const res = await app.request('/auth/steam/callback?openid.claimed_id=mock')

      expect(res.status).toBe(302)
      expect(container.userRepo.create).toHaveBeenCalledWith(
        '76561198012345678',
        null, // no STEAM_API_KEY in tests
        null
      )
      expect(container.playerRepo.createSettings).toHaveBeenCalledWith(1)
    })

    it('updates existing user on login', async () => {
      vi.mocked(container.userRepo.findBySteamId).mockResolvedValue(mockUser)
      vi.mocked(container.sessionRepo.create).mockResolvedValue(mockSession)

      const res = await app.request('/auth/steam/callback?openid.claimed_id=mock')

      expect(res.status).toBe(302)
      expect(container.userRepo.create).not.toHaveBeenCalled()
      expect(container.userRepo.updateSteamProfile).toHaveBeenCalledWith(1, null, null)
      expect(container.userRepo.updateLastLogin).toHaveBeenCalledWith(1)
    })

    it('creates session and sets cookie', async () => {
      vi.mocked(container.userRepo.findBySteamId).mockResolvedValue(mockUser)
      vi.mocked(container.sessionRepo.create).mockResolvedValue(mockSession)

      const res = await app.request('/auth/steam/callback?openid.claimed_id=mock')

      expect(res.status).toBe(302)
      expect(container.sessionRepo.create).toHaveBeenCalledWith(1, false)

      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('tenno_session=session-token-123')
    })

    it('redirects to frontend after successful login', async () => {
      vi.mocked(container.userRepo.findBySteamId).mockResolvedValue(mockUser)
      vi.mocked(container.sessionRepo.create).mockResolvedValue(mockSession)

      const res = await app.request('/auth/steam/callback?openid.claimed_id=mock')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('http://localhost:5173')
    })

    it('redirects to login with error on failure', async () => {
      vi.mocked(container.userRepo.findBySteamId).mockRejectedValue(new Error('DB error'))

      const res = await app.request('/auth/steam/callback?openid.claimed_id=mock')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('http://localhost:5173/login?error=auth_failed')
    })
  })

  describe('POST /auth/logout', () => {
    it('deletes session and clears cookie', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: 'tenno_session=session-token-123',
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ success: true })
      expect(container.sessionRepo.delete).toHaveBeenCalledWith('session-token-123')
    })

    it('succeeds even without session cookie', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ success: true })
      expect(container.sessionRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('GET /auth/me', () => {
    const mockSession = {
      id: 'session-token-123',
      userId: 1,
      rememberMe: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    }

    const mockUserWithSettings = {
      id: 1,
      steamId: '76561198012345678',
      steamDisplayName: 'TestPlayer',
      steamAvatarUrl: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      playerId: 'warframe-player-id',
      platform: 'pc',
      onboardingComplete: true,
    }

    it('returns null when no session cookie', async () => {
      const res = await app.request('/auth/me')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ user: null })
    })

    it('returns null and clears cookie for invalid session', async () => {
      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue(null)

      const res = await app.request('/auth/me', {
        headers: {
          Cookie: 'tenno_session=invalid-session',
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ user: null })
    })

    it('returns null and deletes expired session', async () => {
      const expiredSession = {
        session: {
          ...mockSession,
          expiresAt: new Date(Date.now() - 1000), // expired
        },
        userId: 1,
      }
      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue(expiredSession)

      const res = await app.request('/auth/me', {
        headers: {
          Cookie: 'tenno_session=expired-session',
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ user: null })
      expect(container.sessionRepo.delete).toHaveBeenCalledWith('expired-session')
    })

    it('returns user for valid session', async () => {
      vi.mocked(container.sessionRepo.findByIdWithUser).mockResolvedValue({
        session: mockSession,
        userId: 1,
      })
      vi.mocked(container.userRepo.findByIdWithSettings).mockResolvedValue(mockUserWithSettings)

      const res = await app.request('/auth/me', {
        headers: {
          Cookie: 'tenno_session=session-token-123',
        },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.user).toMatchObject({
        id: 1,
        steamId: '76561198012345678',
        steamDisplayName: 'TestPlayer',
        onboardingComplete: true,
      })
    })
  })
})
