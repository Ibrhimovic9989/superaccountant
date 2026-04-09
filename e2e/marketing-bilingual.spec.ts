import { expect, test } from '@playwright/test'

/**
 * Bilingual smoke test for the marketing app. Per CLAUDE.md §6, every
 * surface must work in both EN and AR — this is the canary that catches
 * RTL regressions, locale routing breakage, and broken cross-app links.
 */

test.describe('marketing landing — bilingual smoke', () => {
  test('English landing renders the hero, CTAs, and footer', async ({ page }) => {
    await page.goto('/en')

    // Hero
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/agentic/i)
    await expect(page.getByRole('link', { name: /placement test/i }).first()).toBeVisible()

    // Both market pills are present
    await expect(page.getByText(/Chartered Path/)).toBeVisible()
    await expect(page.getByText(/Mu'tamad Path/)).toBeVisible()

    // Footer contact info
    await expect(page.getByText(/info@superaccountant\.in/)).toBeVisible()
    await expect(page.getByText(/Hyderabad/)).toBeVisible()

    // Document direction is LTR
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('ltr')

    // Lang attribute
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('en')
  })

  test('Arabic landing renders RTL with translated copy', async ({ page }) => {
    await page.goto('/ar')

    // Page hydrates with RTL direction
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir).toBe('rtl')

    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBe('ar')

    // Arabic hero copy is present (we're checking for the title fragment).
    await expect(page.getByRole('heading', { level: 1 })).toContainText('مدرس المحاسبة')

    // Footer is also translated.
    await expect(page.getByText(/تواصل/)).toBeVisible()
  })

  test('terms and privacy pages load and link to each other from the footer', async ({
    page,
  }) => {
    await page.goto('/en')

    // Click the footer Terms link
    await page.getByRole('link', { name: 'Terms', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/terms$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Terms of use/i)

    // From terms, click footer Privacy
    await page.getByRole('link', { name: 'Privacy', exact: true }).click()
    await expect(page).toHaveURL(/\/en\/privacy$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Privacy policy/i)
  })

  test('404 page renders for unknown routes', async ({ page }) => {
    const response = await page.goto('/en/totally-not-a-real-page')
    expect(response?.status()).toBe(404)
    await expect(page.getByText(/lost in the ledger/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible()
  })
})
