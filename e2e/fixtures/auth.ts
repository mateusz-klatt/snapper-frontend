import type { Browser, BrowserContext } from '@playwright/test'

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
  await context.addInitScript(() => {
    globalThis.localStorage.setItem(
      'snapper-auth',
      JSON.stringify({
        state: {
          user: {
            type: 'user_profile',
            public_id: 'usr-e2e',
            username: 'e2e-user',
            role: 'admin',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
          },
        },
        version: 0,
      })
    )
  })

  return context
}
