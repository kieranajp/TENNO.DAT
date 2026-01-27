import { test, expect } from '@playwright/test'
import {
  mockAuthUser,
  mockMasterySummary,
  mockMasteryItems,
  mockSettings,
  mockStarChartProgress,
} from './fixtures/mock-data'

/**
 * Visual regression tests for the TENNO.DAT UI.
 *
 * These tests capture screenshots of key pages and compare them against
 * baseline images. Use these to catch unintended visual changes during
 * CSS/SASS refactors.
 *
 * API routes are mocked to ensure consistent data across local and CI environments.
 *
 * Commands:
 *   pnpm test:e2e                    - Run tests (fails if screenshots differ)
 *   pnpm test:e2e:update-snapshots   - Update baseline screenshots
 *   pnpm test:e2e:ui                 - Interactive UI mode
 */

// Setup API mocking before each test
test.beforeEach(async ({ page }) => {
  // Freeze time for consistent screenshots
  await page.clock.install({ time: new Date('2025-01-15T12:00:00') })

  // Mock auth endpoint - return authenticated user to bypass login
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

  // Mock item details endpoint (return a generic item)
  await page.route('**/items/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        uniqueName: '/Lotus/Powersuits/Wisp/WispPrime',
        name: 'Wisp Prime',
        category: 'Warframes',
        isPrime: true,
        masteryReq: 0,
        maxRank: 30,
        imageName: 'wisp-prime.png',
        vaulted: false,
        marketCost: null,
        bpCost: 25000,
        buildPrice: 25000,
        buildTime: 259200,
        acquisitionData: null,
      }),
    })
  })

  // Mock external image requests with a placeholder
  await page.route('https://cdn.warframestat.us/**', async (route) => {
    // Return a small transparent PNG placeholder
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

  // Mock mastery rank icon requests
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

test.describe('Visual Regression', () => {
  test.describe('Dashboard (Home)', () => {
    test('full page screenshot', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      // Extra wait for any CSS transitions
      await page.waitForTimeout(300)
      await expect(page).toHaveScreenshot('dashboard-full.png', {
        fullPage: true,
      })
    })

    test('header and navigation', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      const header = page.locator('header, nav, .navbar').first()
      if (await header.isVisible()) {
        await expect(header).toHaveScreenshot('dashboard-header.png')
      }
    })
  })

  test.describe('Mastery Page', () => {
    test('full page screenshot', async ({ page }) => {
      await page.goto('/mastery', { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      await expect(page).toHaveScreenshot('mastery-full.png', {
        fullPage: true,
      })
    })

    test('category cards grid', async ({ page }) => {
      await page.goto('/mastery', { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const mainContent = page.locator('main, .container, [class*="grid"]').first()
      if (await mainContent.isVisible()) {
        await expect(mainContent).toHaveScreenshot('mastery-content.png')
      }
    })
  })

  test.describe('Star Chart Page', () => {
    test('full page screenshot', async ({ page }) => {
      await page.goto('/starchart', { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      await expect(page).toHaveScreenshot('starchart-full.png', {
        fullPage: true,
      })
    })
  })

  test.describe('Responsive Design', () => {
    test('dashboard on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.waitForTimeout(500) // Longer wait for mobile layout
      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.02, // Allow 2% pixel difference for font rendering variance
      })
    })

    test('mastery page on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/mastery', { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      await expect(page).toHaveScreenshot('mastery-tablet.png', {
        fullPage: true,
      })
    })
  })
})

test.describe('Component Screenshots', () => {
  test.describe('Buttons and Controls', () => {
    test('primary buttons', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const button = page.locator('button.btn-primary, button[type="submit"]').first()
      if (await button.isVisible()) {
        await expect(button).toHaveScreenshot('button-primary.png')
      }
    })
  })

  test.describe('Cards', () => {
    test('card component', async ({ page }) => {
      await page.goto('/mastery', { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const card = page.locator('.card').first()
      if (await card.isVisible()) {
        await expect(card).toHaveScreenshot('card-component.png')
      }
    })
  })
})
