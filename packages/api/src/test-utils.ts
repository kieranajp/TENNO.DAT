import { vi } from 'vitest'
import type { MiddlewareHandler } from 'hono'
import type { Container } from './infrastructure/bootstrap/container'
import type { AuthContext } from './application/http/middleware/auth'
import type { PlayerSettings } from './domain/entities/player'
import type { SyncProbe } from './infrastructure/observability/sync-probe'
import type { AuthProbe } from './infrastructure/observability/auth-probe'
import type { PrimePartsProbe } from './infrastructure/observability/prime-parts-probe'
import type { DbProbe } from './infrastructure/observability/db-probe'

/**
 * Creates a mock container with all repository methods stubbed.
 * Use vi.mocked() to set up return values in tests.
 */
export function createMockContainer(): Container {
  return {
    playerRepo: {
      getSettings: vi.fn(),
      createSettings: vi.fn(),
      saveSettings: vi.fn(),
      updateDisplayName: vi.fn(),
      updateLastSync: vi.fn(),
      updateIntrinsics: vi.fn(),
    },
    masteryRepo: {
      getSummary: vi.fn(),
      getItemsWithMastery: vi.fn(),
      upsertMany: vi.fn(),
      getEquipmentMasteryXP: vi.fn(),
      getMasteredItemIds: vi.fn().mockResolvedValue([]),
    },
    loadoutRepo: {
      upsert: vi.fn(),
      getWithItems: vi.fn(),
    },
    nodeRepo: {
      findAllAsMap: vi.fn(),
      upsertCompletions: vi.fn(),
      getStarChartMasteryXP: vi.fn(),
      getNodesWithCompletion: vi.fn(),
    },
    itemRepo: {
      findAll: vi.fn(),
      findByIdWithAcquisitionData: vi.fn(),
      findAllAsMap: vi.fn(),
      getCategories: vi.fn(),
      upsertMany: vi.fn(),
      findPrimesWithComponents: vi.fn().mockResolvedValue([]),
      getComponentCountsByItem: vi.fn().mockResolvedValue(new Map()),
      getComponentIdsForItems: vi.fn().mockResolvedValue([]),
    },
    userRepo: {
      findById: vi.fn(),
      findBySteamId: vi.fn(),
      findByIdWithSettings: vi.fn(),
      create: vi.fn(),
      updateLastLogin: vi.fn(),
      updateSteamProfile: vi.fn(),
      delete: vi.fn(),
    },
    sessionRepo: {
      findByIdWithUser: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    wishlistRepo: {
      getWishlistedItemIds: vi.fn().mockResolvedValue([]),
      isWishlisted: vi.fn(),
      toggle: vi.fn(),
    },
    primePartsRepo: {
      getOwnedCounts: vi.fn().mockResolvedValue(new Map()),
      getOwnedCountsForItem: vi.fn().mockResolvedValue(new Map()),
      toggle: vi.fn(),
      markOwned: vi.fn(),
    },
    profileApi: {
      fetch: vi.fn(),
    },
  }
}

export function createMockSyncProbe(): SyncProbe {
  return {
    startingProfileFetch: vi.fn().mockReturnValue(vi.fn()),
    profileFetchSucceeded: vi.fn(),
    profileFetchFailed: vi.fn(),
    itemsMatched: vi.fn(),
    profileSyncCompleted: vi.fn(),
  } as unknown as SyncProbe
}

export function createMockAuthProbe(): AuthProbe {
  return {
    steamAuthStarted: vi.fn(),
    steamAuthSucceeded: vi.fn(),
    steamAuthFailed: vi.fn(),
    accountDeleted: vi.fn(),
  } as unknown as AuthProbe
}

export function createMockPrimePartsProbe(): PrimePartsProbe {
  return {
    partToggled: vi.fn(),
  } as unknown as PrimePartsProbe
}

export function createMockDbProbe(): DbProbe {
  return {
    startQuery: vi.fn().mockReturnValue(vi.fn()),
  } as unknown as DbProbe
}

/**
 * Creates a middleware that injects a mock auth context.
 * Use this to test protected routes without actual authentication.
 */
export function createMockAuthMiddleware(auth: AuthContext): MiddlewareHandler {
  return async (c, next) => {
    c.set('auth', auth)
    await next()
  }
}

/**
 * Default mock auth context for tests.
 */
export const mockAuth: AuthContext = {
  userId: 1,
  steamId: '76561198012345678',
}

/**
 * Default mock player settings for tests.
 */
export const mockSettings: PlayerSettings = {
  id: 1,
  userId: 1,
  playerId: 'test-player',
  platform: 'pc',
  displayName: null,
  lastSyncAt: null,
  railjackIntrinsics: 0,
  drifterIntrinsics: 0,
}

/**
 * Creates a middleware that injects both mock auth and player settings contexts.
 * Use this to test routes behind the onboarding middleware.
 */
export function createMockOnboardedMiddleware(
  auth: AuthContext,
  settings: PlayerSettings
): MiddlewareHandler {
  return async (c, next) => {
    c.set('auth', auth)
    c.set('playerSettings', settings)
    await next()
  }
}
