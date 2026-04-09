import { defineConfig, devices } from '@playwright/test'

/**
 * Root Playwright config — runs the bilingual smoke suite against the
 * marketing app. Add web-app E2E projects here later.
 *
 * To run locally:
 *   pnpm exec playwright install chromium    # one-time
 *   pnpm exec playwright test                 # all
 *   pnpm exec playwright test --ui            # interactive
 *
 * The CI workflow should set MARKETING_URL to a deploy preview URL.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.MARKETING_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],
  // Spin up the marketing dev server when running locally without a base URL.
  webServer: process.env.MARKETING_URL
    ? undefined
    : {
        command: 'pnpm --filter @sa/marketing dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
