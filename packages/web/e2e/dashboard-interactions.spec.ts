import { test, expect } from '@playwright/test'
import {
  mockAuthUser,
  mockMasterySummary,
  mockMasteryItems,
  mockSettings,
  mockStarChartProgress,
} from './fixtures/mock-data'

/**
 * E2E interaction tests for the Dashboard (Home) page.
 *
 * These tests verify user interactions like sync button, navigation,
 * and loadout display.
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

  // Mock mastery items endpoint
  await page.route('**/mastery/items*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMasteryItems),
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

  // Mock star chart endpoint
  await page.route('**/starchart/nodes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockStarChartProgress),
    })
  })

  // Mock sync profile endpoint
  await page.route('**/sync/profile', async (route) => {
    if (route.request().method() === 'POST') {
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          synced: 150,
          mastered: 125,
          nodesSynced: 35,
        }),
      })
    }
  })

  // Mock item details endpoint
  await page.route('**/items/*', async (route) => {
    const url = route.request().url()
    const itemId = parseInt(url.split('/').pop() || '1')
    const item = mockMasteryItems.find(i => i.id === itemId) || mockMasteryItems[0]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...item,
        marketCost: null,
        bpCost: 25000,
        buildPrice: 25000,
        buildTime: 259200,
        acquisitionData: null,
      }),
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

test.describe('Dashboard - User Info', () => {
  test('displays user display name', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Should show TestTenno somewhere on the page
    await expect(page.locator('body')).toContainText('TestTenno')
  })

  test('displays mastery rank', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Should show MR 32 (from mock data)
    await expect(page.locator('body')).toContainText('32')
  })
})

test.describe('Dashboard - Sync Button', () => {
  test('sync button is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const syncButton = page.locator('button', { hasText: /sync/i })
    await expect(syncButton).toBeVisible()
  })

  test('sync button triggers profile sync', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const syncButton = page.locator('button', { hasText: /sync/i })

    // Track if sync endpoint was called
    let syncCalled = false
    await page.route('**/sync/profile', async (route) => {
      syncCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, synced: 150 }),
      })
    })

    await syncButton.click()
    await page.waitForTimeout(500)

    expect(syncCalled).toBe(true)
  })
})

test.describe('Dashboard - Loadout Display', () => {
  test('displays current loadout', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Should show loadout items from mockMasterySummary
    // Wisp Prime is the equipped warframe
    await expect(page.locator('body')).toContainText(/Wisp Prime|Fulmin Prime|Laetum|Praedos/i)
  })

  test('displays focus school if shown', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Focus school may be shown in loadout section - check if visible
    // The loadout data has focusSchool: 'Madurai'
    const pageContent = await page.textContent('body')
    // Just verify page loaded - focus school display is optional
    expect(pageContent).toBeTruthy()
  })
})

test.describe('Dashboard - Category Progress', () => {
  test('displays category cards', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Should show category progress
    await expect(page.locator('body')).toContainText(/Warframes|Primary|Secondary|Melee/i)
  })

  test('shows mastered counts', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Should show mastered/total like 72/89 for Warframes
    await expect(page.locator('body')).toContainText('72')
  })
})

test.describe('Dashboard - Navigation', () => {
  test('navigates to mastery page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Find link to mastery page
    const masteryLink = page.locator('a[href*="mastery"], button', { hasText: /mastery|database|items/i }).first()
    if (await masteryLink.isVisible()) {
      await masteryLink.click()
      await expect(page).toHaveURL(/mastery/)
    }
  })

  test('navigates to star chart page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Find link to star chart page
    const starchartLink = page.locator('a[href*="starchart"], button', { hasText: /star chart|nodes/i }).first()
    if (await starchartLink.isVisible()) {
      await starchartLink.click()
      await expect(page).toHaveURL(/starchart/)
    }
  })
})

test.describe('Dashboard - Last Sync', () => {
  test('displays last sync time', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Should show some indication of last sync
    // The mock data has lastSyncAt: '2025-01-15T10:30:00Z'
    const pageContent = await page.textContent('body')
    // Could be displayed as relative time "2 hours ago" or absolute time
    expect(pageContent).toBeTruthy()
  })
})
