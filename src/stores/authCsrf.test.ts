import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../lib/apiClient'
import { getCookie } from '../lib/utils'
import { useAuthStore } from './auth'

const SERVER_TOKEN = 'server-issued-csrf'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const user = {
  public_id: 'u-1',
  username: 'owner',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  effective_permissions: ['manage:ai_integration'],
}

const setServerCookie = (value: string): void => {
  document.cookie = `csrf_token=${value}; Path=/`
}

const csrfHeaderOf = (fetchMock: ReturnType<typeof vi.fn>, url: string): string | null => {
  const call = fetchMock.mock.calls.find(([input]) => input === url)

  return new Headers((call?.[1] as RequestInit | undefined)?.headers).get('X-CSRF-Token')
}

describe('auth store csrf cookie handling with the real api client', () => {
  beforeEach(() => {
    apiClient.clearCSRFToken()
    useAuthStore.setState({ user: null, isAuthenticated: false, csrfToken: null, error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    apiClient.clearCSRFToken()
  })

  it('keeps the server cookie after a login payload without a token and sends it on the next mutation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      if (String(input) === '/api/auth/login') {
        setServerCookie(SERVER_TOKEN)

        return json({ payload: { user } })
      }

      return json({ payload: { ok: true } })
    })

    vi.stubGlobal('fetch', fetchMock)

    await useAuthStore.getState().login({ username: 'owner', password: 'pw', remember_me: false })
    await apiClient.postJSON('/api/mutation', { value: 1 })

    expect(getCookie('csrf_token')).toBe(SERVER_TOKEN)
    expect(useAuthStore.getState().csrfToken).toBe(SERVER_TOKEN)
    expect(csrfHeaderOf(fetchMock, '/api/mutation')).toBe(SERVER_TOKEN)
  })

  it('adopts an explicit payload token over the cookie', async () => {
    setServerCookie('stale-token')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ payload: { user, csrf_token: 'fresh-token' } }))
    )

    await useAuthStore.getState().login({ username: 'owner', password: 'pw', remember_me: false })

    expect(getCookie('csrf_token')).toBe('fresh-token')
    expect(useAuthStore.getState().csrfToken).toBe('fresh-token')
  })

  it('keeps the server cookie when a refresh payload omits the token', async () => {
    setServerCookie(SERVER_TOKEN)
    useAuthStore.setState({ user: user as never, isAuthenticated: true })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ payload: { user } }))
    )

    await useAuthStore.getState().refreshToken()

    expect(getCookie('csrf_token')).toBe(SERVER_TOKEN)
    expect(useAuthStore.getState().csrfToken).toBe(SERVER_TOKEN)
  })

  it('reports no token when neither the payload nor the cookie carries one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ payload: { user } }))
    )

    await useAuthStore.getState().login({ username: 'owner', password: 'pw', remember_me: false })

    expect(getCookie('csrf_token')).toBe('')
    expect(useAuthStore.getState().csrfToken).toBeNull()
  })

  it('still clears the cookie on logout', async () => {
    setServerCookie(SERVER_TOKEN)
    useAuthStore.setState({ user: user as never, isAuthenticated: true, csrfToken: SERVER_TOKEN })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ payload: { message: 'ok' } }))
    )

    await useAuthStore.getState().logout()

    expect(getCookie('csrf_token')).toBe('')
    expect(useAuthStore.getState().csrfToken).toBeNull()
  })
})
