import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { auth, isAuthenticated, needsOnboarding } from './auth'
import type { AuthUser } from './auth'

describe('auth store', () => {
  const mockUser: AuthUser = {
    id: 1,
    steamId: '76561198012345678',
    steamDisplayName: 'TestPlayer',
    steamAvatarUrl: 'https://example.com/avatar.jpg',
    playerId: 'test-player-id',
    platform: 'pc',
    onboardingComplete: true,
    lastSyncAt: '2024-01-15T12:00:00Z',
  }

  beforeEach(() => {
    auth.clear()
  })

  describe('initial state', () => {
    it('starts with null user', () => {
      const state = get(auth)
      expect(state.user).toBeNull()
    })

    it('starts with checked true after clear', () => {
      const state = get(auth)
      expect(state.checked).toBe(true)
    })

    it('starts with loading false after clear', () => {
      const state = get(auth)
      expect(state.loading).toBe(false)
    })
  })

  describe('setUser', () => {
    it('sets user in state', () => {
      auth.setUser(mockUser)
      const state = get(auth)
      expect(state.user).toEqual(mockUser)
    })

    it('sets loading to false', () => {
      auth.setLoading(true)
      auth.setUser(mockUser)
      const state = get(auth)
      expect(state.loading).toBe(false)
    })

    it('sets checked to true', () => {
      auth.setUser(mockUser)
      const state = get(auth)
      expect(state.checked).toBe(true)
    })

    it('can set user to null', () => {
      auth.setUser(mockUser)
      auth.setUser(null)
      const state = get(auth)
      expect(state.user).toBeNull()
    })
  })

  describe('setLoading', () => {
    it('sets loading to true', () => {
      auth.setLoading(true)
      const state = get(auth)
      expect(state.loading).toBe(true)
    })

    it('sets loading to false', () => {
      auth.setLoading(true)
      auth.setLoading(false)
      const state = get(auth)
      expect(state.loading).toBe(false)
    })

    it('preserves user when setting loading', () => {
      auth.setUser(mockUser)
      auth.setLoading(true)
      const state = get(auth)
      expect(state.user).toEqual(mockUser)
    })
  })

  describe('clear', () => {
    it('clears user', () => {
      auth.setUser(mockUser)
      auth.clear()
      const state = get(auth)
      expect(state.user).toBeNull()
    })

    it('sets loading to false', () => {
      auth.setLoading(true)
      auth.clear()
      const state = get(auth)
      expect(state.loading).toBe(false)
    })

    it('sets checked to true', () => {
      auth.clear()
      const state = get(auth)
      expect(state.checked).toBe(true)
    })
  })
})

describe('isAuthenticated derived store', () => {
  beforeEach(() => {
    auth.clear()
  })

  it('returns false when user is null', () => {
    expect(get(isAuthenticated)).toBe(false)
  })

  it('returns true when user is set', () => {
    auth.setUser({
      id: 1,
      steamId: '123',
      steamDisplayName: 'Test',
      steamAvatarUrl: null,
      playerId: 'p',
      platform: 'pc',
      onboardingComplete: true,
      lastSyncAt: null,
    })
    expect(get(isAuthenticated)).toBe(true)
  })

  it('returns false after clearing user', () => {
    auth.setUser({
      id: 1,
      steamId: '123',
      steamDisplayName: 'Test',
      steamAvatarUrl: null,
      playerId: 'p',
      platform: 'pc',
      onboardingComplete: true,
      lastSyncAt: null,
    })
    auth.clear()
    expect(get(isAuthenticated)).toBe(false)
  })
})

describe('needsOnboarding derived store', () => {
  beforeEach(() => {
    auth.clear()
  })

  it('returns false when user is null', () => {
    expect(get(needsOnboarding)).toBe(false)
  })

  it('returns false when user has completed onboarding', () => {
    auth.setUser({
      id: 1,
      steamId: '123',
      steamDisplayName: 'Test',
      steamAvatarUrl: null,
      playerId: 'player-id',
      platform: 'pc',
      onboardingComplete: true,
      lastSyncAt: '2024-01-15',
    })
    expect(get(needsOnboarding)).toBe(false)
  })

  it('returns true when user has not completed onboarding', () => {
    auth.setUser({
      id: 1,
      steamId: '123',
      steamDisplayName: 'Test',
      steamAvatarUrl: null,
      playerId: null,
      platform: null,
      onboardingComplete: false,
      lastSyncAt: null,
    })
    expect(get(needsOnboarding)).toBe(true)
  })

  it('returns false after clearing user', () => {
    auth.setUser({
      id: 1,
      steamId: '123',
      steamDisplayName: 'Test',
      steamAvatarUrl: null,
      playerId: null,
      platform: null,
      onboardingComplete: false,
      lastSyncAt: null,
    })
    auth.clear()
    expect(get(needsOnboarding)).toBe(false)
  })
})
