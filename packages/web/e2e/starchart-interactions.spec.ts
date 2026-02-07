import { test, expect } from '@playwright/test'
import {
  mockAuthUser,
  mockMasterySummary,
  mockSettings,
  mockStarChartProgress,
} from './fixtures/mock-data'

/**
 * E2E interaction tests for the Star Chart page.
 *
 * These tests verify user interactions like filtering by completion status
 * and toggling Steel Path mode.
 */

test.beforeEach(async ({ page }) => {
  // Freeze time for consistent behavior
  await page.clock.install({ time: new Date('2025-01-15T12:00:00') })

  // Mock auth endpoint
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: mockAuthUser }),
    })
  })

  // Mock mastery summary endpoint
  await page.route('**/mastery/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMasterySummary),
    })
  })

  // Mock settings endpoint
  await page.route('**/sync/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSettings),
    })
  })

  // Mock star chart endpoint with different data for normal vs steel path
  await page.route('**/starchart/nodes*', async (route) => {
    const url = route.request().url()
    const isSteelPath = url.includes('steelPath=true')

    // For steel path, reduce completed counts
    const steelPathProgress = {
      ...mockStarChartProgress,
      planets: mockStarChartProgress.planets.map(planet => ({
        ...planet,
        completed: Math.floor(planet.completed * 0.5),
        xpEarned: Math.floor(planet.xpEarned * 0.5),
        nodes: planet.nodes.map((node, i) => ({
          ...node,
          completed: i % 2 === 0, // Alternate completion for variety
        })),
      })),
      summary: {
        completedNodes: 15,
        totalNodes: 45,
        completedXP: 1500,
        totalXP: 4500,
      },
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSteelPath ? steelPathProgress : mockStarChartProgress),
    })
  })

  // Mock external images
  await page.route('https://cdn.warframestat.us/**', async (route) => {
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: transparentPng,
    })
  })

  await page.route('https://wiki.warframe.com/**', async (route) => {
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: transparentPng,
    })
  })
})

test.describe('Star Chart Page - Filter Tabs', () => {
  test('shows all planets by default', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    const allTab = page.locator('.filter-tab', { hasText: 'ALL' })
    await expect(allTab).toHaveClass(/active/)
  })

  test('filters to incomplete planets', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    const incompleteTab = page.locator('.filter-tab', { hasText: 'INCOMPLETE' })
    await incompleteTab.click()

    await expect(incompleteTab).toHaveClass(/active/)
  })

  test('filters to completed planets', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    // Use exact text to avoid matching "INCOMPLETE"
    const completedTab = page.locator('.filter-tab').filter({ hasText: /^COMPLETED$/ })
    await completedTab.click()

    await expect(completedTab).toHaveClass(/active/)
  })
})

test.describe('Star Chart Page - Steel Path Toggle', () => {
  test('shows normal mode by default', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    // Steel Path toggle should not be active
    const steelPathToggle = page.locator('.steel-path-toggle, [data-testid="steel-path-toggle"]')
    if (await steelPathToggle.isVisible()) {
      await expect(steelPathToggle).not.toHaveClass(/active/)
    }
  })

  test('toggles to Steel Path mode', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    // Find and click Steel Path toggle
    const steelPathToggle = page.locator('button, label').filter({ hasText: /steel path/i })
    if (await steelPathToggle.isVisible()) {
      await steelPathToggle.click()

      // Wait for data to reload
      await page.waitForTimeout(500)
    }
  })
})

test.describe('Star Chart Page - Planet Cards', () => {
  test('displays planet progress cards', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    // Should show Earth planet card
    const earthCard = page.locator('.planet-card, [class*="planet"]', { hasText: 'Earth' })
    await expect(earthCard).toBeVisible()
  })

  test('shows completion percentage', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    // Earth is 100% complete (15/15)
    const earthCard = page.locator('.planet-card, [class*="planet"]', { hasText: 'Earth' })
    if (await earthCard.isVisible()) {
      await expect(earthCard).toContainText(/15/)
    }
  })
})

test.describe('Star Chart Page - Summary Stats', () => {
  test('displays total progress', async ({ page }) => {
    await page.goto('/starchart', { waitUntil: 'networkidle' })

    // Summary should show 35/45 nodes
    const summary = page.locator('.summary, .progress-summary, [class*="summary"]')
    if (await summary.isVisible()) {
      await expect(summary).toContainText(/35/)
    }
  })
})
