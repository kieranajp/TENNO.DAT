import { vi } from 'vitest'
import type { MiddlewareHandler } from 'hono'
import type { Container } from './infrastructure/bootstrap/container'
import type { AuthContext } from './application/http/middleware/auth'

/**
 * Creates a mock container with all repository methods stubbed.
 * Use vi.mocked() to set up return values in tests.
 */
export function createMockContainer(): Container {
  return {
    playerRepo: {
      getSettings: vi.fn(),
      getSettingsByPlayerId: vi.fn(),
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
      findById: vi.fn(),
      findByIdWithAcquisitionData: vi.fn(),
      findAllAsMap: vi.fn(),
      getCategories: vi.fn(),
      upsertMany: vi.fn(),
    },
    userRepo: {
      findById: vi.fn(),
      findBySteamId: vi.fn(),
      findByIdWithSettings: vi.fn(),
      create: vi.fn(),
      updateLastLogin: vi.fn(),
      updateSteamProfile: vi.fn(),
    },
    sessionRepo: {
      findById: vi.fn(),
      findByIdWithUser: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteExpired: vi.fn(),
      deleteAllForUser: vi.fn(),
    },
    profileApi: {
      fetch: vi.fn(),
    },
  }
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
