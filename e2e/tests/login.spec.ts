import { test, expect } from '@playwright/test'
import { mockApi } from '../fixtures/api-handlers'
import { mockWebSocket } from '../fixtures/ws-handlers'
import { TEST_USER } from '../fixtures/envelopes'

test.describe('login flow (no pre-auth)', () => {
  test('signs in via the login form and lands on the authenticated UI', async ({ browser }) => {
    // No authedContext — we want a vanilla anonymous browser to
    // exercise the login form path end-to-end.
    const context = await browser.newContext()
    const page = await context.newPage()

    let loginCalled = false

    await mockApi(page, {
      '**/api/auth/login': async route => {
        loginCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'set-cookie': 'csrf_token=e2e-csrf-from-login; Path=/; SameSite=Lax',
          },
          body: JSON.stringify({
            type: 'login_response',
            sequence_id: 0,
            public_id: 'login-pid',
            timestamp: '2026-01-01T00:00:00Z',
            session_id: 'e2e-sid',
            payload: {
              user: TEST_USER,
              csrf_token: 'e2e-csrf-from-login',
            },
          }),
        })
      },
    })
    await mockWebSocket(page)

    await page.goto('/')
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible({
      timeout: 10_000,
    })

    await page.getByPlaceholder('Enter your username').fill('e2e-user')
    await page.getByPlaceholder('Enter your password').fill('test-password')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Authenticated UI appears.
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 })
    expect(loginCalled).toBe(true)

    await context.close()
  })
})
