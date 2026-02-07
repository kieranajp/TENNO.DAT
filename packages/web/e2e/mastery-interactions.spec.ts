import { test, expect } from '@playwright/test'
import {
  mockAuthUser,
  mockMasterySummary,
  mockMasteryItems,
  mockSettings,
  mockWishlistedIds,
} from './fixtures/mock-data'

/**
 * E2E interaction tests for the Mastery page.
 *
 * These tests verify user interactions like filtering, searching,
 * wishlist toggling, and modal behavior.
 */

// Track wishlist state for toggle tests
let wishlistState: Set<number>

test.beforeEach(async ({ page }) => {
  // Reset wishlist state for each test
  wishlistState = new Set(mockWishlistedIds)

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

  // Mock mastery items endpoint with dynamic wishlist state
  await page.route('**/mastery/items*', async (route) => {
    const itemsWithWishlist = mockMasteryItems.map(item => ({
      ...item,
      wishlisted: wishlistState.has(item.id),
    }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(itemsWithWishlist),
    })
  })

  // Mock wishlist toggle endpoint
  await page.route('**/wishlist/*', async (route) => {
    if (route.request().method() === 'POST') {
      const url = route.request().url()
      const itemId = parseInt(url.split('/').pop() || '0')
      // Toggle wishlist state
      if (wishlistState.has(itemId)) {
        wishlistState.delete(itemId)
      } else {
        wishlistState.add(itemId)
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ wishlisted: wishlistState.has(itemId) }),
      })
    }
  })

  // Mock settings endpoint
  await page.route('**/sync/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSettings),
    })
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
        wishlisted: wishlistState.has(item.id),
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

test.describe('Mastery Page - Filter Tabs', () => {
  test('shows all items by default', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const allTab = page.locator('.filter-tab', { hasText: 'ALL' })
    await expect(allTab).toHaveClass(/active/)

    // Should show all 8 items
    const resultsCount = page.locator('.results-count')
    await expect(resultsCount).toContainText('8 RECORDS')
  })

  test('filters to incomplete items', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const incompleteTab = page.locator('.filter-tab', { hasText: 'INCOMPLETE' })
    await incompleteTab.click()

    await expect(incompleteTab).toHaveClass(/active/)
  })

  test('filters to mastered items', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const masteredTab = page.locator('.filter-tab', { hasText: 'MASTERED' })
    await masteredTab.click()

    await expect(masteredTab).toHaveClass(/active/)
  })
})

test.describe('Mastery Page - Category Filter', () => {
  test('shows all categories by default', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const categorySelect = page.locator('.category-select')
    await expect(categorySelect).toHaveValue('')
  })

  test('filters by category from URL parameter', async ({ page }) => {
    await page.goto('/mastery?category=Warframes', { waitUntil: 'networkidle' })

    const categorySelect = page.locator('.category-select')
    await expect(categorySelect).toHaveValue('Warframes')
  })

  test('updates URL when category changes', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const categorySelect = page.locator('.category-select')
    await categorySelect.selectOption('Primary')

    await expect(page).toHaveURL(/category=Primary/)
  })
})

test.describe('Mastery Page - Search', () => {
  test('filters items by search text', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const searchInput = page.locator('.search-retro input')
    await searchInput.fill('Wisp')

    // Should only show Wisp Prime
    const resultsCount = page.locator('.results-count')
    await expect(resultsCount).toContainText('1 RECORDS')

    const itemCard = page.locator('.item-card').first()
    await expect(itemCard).toContainText('Wisp Prime')
  })

  test('shows empty state when no matches', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const searchInput = page.locator('.search-retro input')
    await searchInput.fill('NonexistentItem12345')

    await expect(page.locator('.empty-state')).toBeVisible()
    await expect(page.locator('.empty-state')).toContainText('NO RECORDS MATCH')
  })

  test('search is case insensitive', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const searchInput = page.locator('.search-retro input')
    await searchInput.fill('wisp')

    const resultsCount = page.locator('.results-count')
    await expect(resultsCount).toContainText('1 RECORDS')
  })
})

test.describe('Mastery Page - Prime Filter', () => {
  test('shows prime items by default', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const primeCheckbox = page.locator('.checkbox-retro', { hasText: 'SHOW PRIME' }).locator('input')
    await expect(primeCheckbox).toBeChecked()

    // Wisp Prime should be visible
    await expect(page.locator('.item-card', { hasText: 'Wisp Prime' })).toBeVisible()
  })

  test('hides prime items when unchecked', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const primeCheckbox = page.locator('.checkbox-retro', { hasText: 'SHOW PRIME' }).locator('input')
    await primeCheckbox.uncheck()

    // Wisp Prime should not be visible
    await expect(page.locator('.item-card', { hasText: 'Wisp Prime' })).not.toBeVisible()
    // Frost (non-prime) should still be visible
    await expect(page.locator('.item-card', { hasText: 'Frost' })).toBeVisible()
  })
})

test.describe('Mastery Page - Wishlist', () => {
  test('displays wishlisted items with active star', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    // Excalibur (id: 3) should have active wishlist button
    const excaliburCard = page.locator('.item-card', { hasText: 'Excalibur' })
    const wishlistBtn = excaliburCard.locator('.wishlist-btn')
    await expect(wishlistBtn).toHaveClass(/active/)
  })

  test('toggles wishlist on button click', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    // Find Wisp Prime (not wishlisted)
    const wispCard = page.locator('.item-card', { hasText: 'Wisp Prime' })
    const wishlistBtn = wispCard.locator('.wishlist-btn')

    // Should not be active initially
    await expect(wishlistBtn).not.toHaveClass(/active/)

    // Click to wishlist
    await wishlistBtn.click()

    // Should now be active
    await expect(wishlistBtn).toHaveClass(/active/)
  })

  test('removes from wishlist on button click', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    // Find Excalibur (wishlisted)
    const excaliburCard = page.locator('.item-card', { hasText: 'Excalibur' })
    const wishlistBtn = excaliburCard.locator('.wishlist-btn')

    // Should be active initially
    await expect(wishlistBtn).toHaveClass(/active/)

    // Click to remove
    await wishlistBtn.click()

    // Should no longer be active
    await expect(wishlistBtn).not.toHaveClass(/active/)
  })

  test('filters to only wishlisted items', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const wishlistCheckbox = page.locator('.checkbox-wishlist input')
    await wishlistCheckbox.check()

    // Should only show wishlisted items (Excalibur and Volt Prime)
    const resultsCount = page.locator('.results-count')
    await expect(resultsCount).toContainText('2 RECORDS')
  })

  test('wishlisted items appear first in list', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    // Get all item cards
    const itemCards = page.locator('.item-card')

    // First card should be a wishlisted item (Excalibur or Volt Prime)
    const firstCard = itemCards.first()
    const firstWishlistBtn = firstCard.locator('.wishlist-btn')
    await expect(firstWishlistBtn).toHaveClass(/active/)
  })
})

test.describe('Mastery Page - Item Modal', () => {
  test('opens modal on item click', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const itemCard = page.locator('.item-card', { hasText: 'Wisp Prime' })
    await itemCard.click()

    // Modal should be visible (uses .modal-overlay wrapper)
    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()
  })

  test('closes modal on close button', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    // Open modal
    const itemCard = page.locator('.item-card', { hasText: 'Wisp Prime' })
    await itemCard.click()

    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()

    // Close modal
    const closeBtn = modal.locator('.close-btn')
    await closeBtn.click()

    await expect(modal).not.toBeVisible()
  })

  test('closes modal on overlay click', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    // Open modal
    const itemCard = page.locator('.item-card', { hasText: 'Wisp Prime' })
    await itemCard.click()

    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()

    // Click overlay (outside modal content)
    await modal.click({ position: { x: 10, y: 10 } })

    await expect(modal).not.toBeVisible()
  })

  test('closes modal on escape key', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    // Open modal
    const itemCard = page.locator('.item-card', { hasText: 'Wisp Prime' })
    await itemCard.click()

    const modal = page.locator('.modal-overlay')
    await expect(modal).toBeVisible()

    // Press escape
    await page.keyboard.press('Escape')

    await expect(modal).not.toBeVisible()
  })

  test('wishlist button does not open modal', async ({ page }) => {
    await page.goto('/mastery', { waitUntil: 'networkidle' })

    const itemCard = page.locator('.item-card', { hasText: 'Wisp Prime' })
    const wishlistBtn = itemCard.locator('.wishlist-btn')

    // Click wishlist button
    await wishlistBtn.click()

    // Modal should NOT be visible
    const modal = page.locator('.modal-overlay')
    await expect(modal).not.toBeVisible()
  })
})
