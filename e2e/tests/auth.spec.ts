import { test, expect } from '@playwright/test'
import { authedContext } from '../fixtures/auth'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'

test.describe('auth flows', () => {
  test('cold-load with valid cookies bootstraps to authenticated UI', async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()

    await mockApi(page)
    await mockWebSocket(page)

    await page.goto('/')

    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Snapper Trading Login/i)).toHaveCount(0)

    await context.close()
  })

  test('logout clears state and reveals login form', async ({ browser }) => {
    const context = await authedContext(browser)
    const page = await context.newPage()

    await mockApi(page)
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })

    // Open user dropdown — the trigger button contains the username.
    await page.getByRole('button', { name: /e2e-user/i }).click()
    await page.getByRole('button', { name: /sign out/i }).click()

    // After logout the login form should appear.
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible({
      timeout: 10_000,
    })

    await context.close()
  })
})
