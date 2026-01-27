import { vi } from 'vitest'
import type { Container } from './infrastructure/bootstrap/container'

/**
 * Creates a mock container with all repository methods stubbed.
 * Use vi.mocked() to set up return values in tests.
 */
export function createMockContainer(): Container {
  return {
    playerRepo: {
      getSettings: vi.fn(),
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
    profileApi: {
      fetch: vi.fn(),
    },
  }
}
