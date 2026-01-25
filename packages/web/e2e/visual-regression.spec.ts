import { test, expect } from '@playwright/test'

/**
 * Visual regression tests for the TENNO.DAT UI.
 *
 * These tests capture screenshots of key pages and compare them against
 * baseline images. Use these to catch unintended visual changes during
 * CSS/SASS refactors.
 *
 * Commands:
 *   pnpm test:e2e                    - Run tests (fails if screenshots differ)
 *   pnpm test:e2e:update-snapshots   - Update baseline screenshots
 *   pnpm test:e2e:ui                 - Interactive UI mode
 *
 * Note: The API must be running with seeded data for full page content.
 * If running without API, pages will show loading/error states.
 */

test.describe('Visual Regression', () => {
  test.describe('Dashboard (Home)', () => {
    test('full page screenshot', async ({ page }) => {
      await page.goto('/')
      // Wait for any animations/transitions to complete
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('dashboard-full.png', {
        fullPage: true,
      })
    })

    test('header and navigation', async ({ page }) => {
      await page.goto('/')
      const header = page.locator('header, nav, .navbar').first()
      if (await header.isVisible()) {
        await expect(header).toHaveScreenshot('dashboard-header.png')
      }
    })
  })

  test.describe('Mastery Page', () => {
    test('full page screenshot', async ({ page }) => {
      await page.goto('/mastery')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('mastery-full.png', {
        fullPage: true,
      })
    })

    test('category cards grid', async ({ page }) => {
      await page.goto('/mastery')
      await page.waitForTimeout(500)
      // Try to capture the main content area with category cards
      const mainContent = page.locator('main, .container, [class*="grid"]').first()
      if (await mainContent.isVisible()) {
        await expect(mainContent).toHaveScreenshot('mastery-content.png')
      }
    })
  })

  test.describe('Settings Page', () => {
    test('full page screenshot', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('settings-full.png', {
        fullPage: true,
      })
    })

    test('settings form', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForTimeout(500)
      const form = page.locator('form, .settings-form, .card').first()
      if (await form.isVisible()) {
        await expect(form).toHaveScreenshot('settings-form.png')
      }
    })
  })

  test.describe('Star Chart Page', () => {
    test('full page screenshot', async ({ page }) => {
      await page.goto('/starchart')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('starchart-full.png', {
        fullPage: true,
      })
    })
  })

  test.describe('Responsive Design', () => {
    test('dashboard on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true,
      })
    })

    test('mastery page on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/mastery')
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('mastery-tablet.png', {
        fullPage: true,
      })
    })
  })
})

test.describe('Component Screenshots', () => {
  test.describe('Buttons and Controls', () => {
    test('primary buttons', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForTimeout(500)
      const button = page.locator('button.btn-primary, button[type="submit"]').first()
      if (await button.isVisible()) {
        await expect(button).toHaveScreenshot('button-primary.png')
      }
    })
  })

  test.describe('Cards', () => {
    test('card component', async ({ page }) => {
      await page.goto('/mastery')
      await page.waitForTimeout(500)
      const card = page.locator('.card').first()
      if (await card.isVisible()) {
        await expect(card).toHaveScreenshot('card-component.png')
      }
    })
  })
})
