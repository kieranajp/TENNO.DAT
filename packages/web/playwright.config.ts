import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // In CI, update snapshots if they don't exist (first run bootstrapping)
  // This allows CI to pass on first run before baselines are committed
  updateSnapshots: process.env.CI ? 'missing' : 'none',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  // Visual regression settings
  expect: {
    toHaveScreenshot: {
      // Allow slight differences for anti-aliasing and font rendering
      maxDiffPixelRatio: 0.02,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
