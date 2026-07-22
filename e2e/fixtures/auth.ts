import type { Browser, BrowserContext } from '@playwright/test'

import { TEST_USER } from './envelopes'

const BASE_URL = 'http://localhost:4173'

/**
 * Pre-authenticated context — injects the cookies that the real login
 * flow would set, so tests skip the login form. The mocked
 * `/api/auth/refresh` handler completes the bootstrap path.
 *
 * Use `context.newPage()` after this, not `browser.newPage()`.
 */
export async function authedContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext()

  await context.addCookies([
    {
      name: 'csrf_token',
      value: 'e2e-csrf',
      url: BASE_URL,
      sameSite: 'Lax',
    },
    {
      name: 'refresh_token',
      value: 'e2e-refresh',
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: 'access_token',
      value: 'e2e-access',
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  // Pre-seed the zustand persist store so `useAuthStore.getState().user`
  // is non-null on first paint, matching the post-restart state where
  // the user record is persisted but the in-memory `isAuthenticated`
  // flag has not yet been hydrated.
  await context.addInitScript(user => {
    globalThis.localStorage.setItem(
      'snapper-auth',
      JSON.stringify({
        state: {
          user,
        },
        version: 0,
      })
    )
  }, TEST_USER)

  return context
}
