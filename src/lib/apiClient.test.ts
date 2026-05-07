import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCookie } from './utils'
import { apiClient as sharedApiClient } from './apiClient'

vi.mock('./utils', () => ({
  getCookie: vi.fn(() => 'test-csrf-token'),
}))
vi.mock('./wsTicketCache', () => ({
  storeWsTicket: vi.fn(),
}))

let mockSeqCounter = 0

vi.mock('uuid', () => ({
  v7: vi.fn(() => `00000000-0000-7000-8000-${String(++mockSeqCounter).padStart(12, '0')}`),
}))
vi.mock('./sequenceTracker', () => ({
  getTracker: vi.fn(() => ({
    sessionId: 'test-session-id',
    nextSequence: vi.fn(() => ++mockSeqCounter),
  })),
}))

describe('APIClient', () => {
  let apiClient: typeof import('./apiClient').apiClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    ;(globalThis as any).fetch = mockFetch
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'csrf_token=test-token; access_token=test-access',
    })
    const mod = await import('./apiClient')

    apiClient = mod.apiClient
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('singleton pattern', () => {
    it('exports APIClient singleton', () => {
      expect(apiClient).toBeDefined()
    })
    it('returns same instance', async () => {
      const mod = await import('./apiClient')
      const instance1 = mod.apiClient
      const instance2 = mod.apiClient

      expect(instance1).toBe(instance2)
    })
    it('getInstance returns existing singleton', () => {
      const APIClient = (apiClient as any).constructor
      const instance = APIClient.getInstance()

      expect(instance).toBe(apiClient)
    })
  })
  describe('request method', () => {
    it('makes GET request without CSRF token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      })
      await apiClient.request('/test', { method: 'GET' })
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
    })
    it('makes POST request with CSRF token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      })
      await apiClient.request('/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      })
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
    })
    it('adds Content-Type header for JSON requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      await apiClient.request('/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      })
      const callArgs = mockFetch.mock.calls[0]?.[1]
      const headers = callArgs.headers as Headers

      expect(headers.get('Content-Type')).toBe('application/json')
    })
    it('skips CSRF header when skipCSRF is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      await apiClient.request('/test', {
        method: 'POST',
        skipCSRF: true,
        body: JSON.stringify({ test: 'data' }),
      })
      const callArgs = mockFetch.mock.calls[0]?.[1]
      const headers = callArgs.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBeNull()
    })
    it('does not set CSRF header when cookie is missing', async () => {
      vi.mocked(getCookie).mockReturnValueOnce('')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      await apiClient.request('/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      })
      const callArgs = mockFetch.mock.calls[0]?.[1]
      const headers = callArgs.headers as Headers

      expect(headers.get('X-CSRF-Token')).toBeNull()
    })
    it('defaults to GET when method is omitted', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      await apiClient.request('/test')
      const callArgs = mockFetch.mock.calls[0]?.[1]
      const headers = callArgs.headers as Headers

      expect(callArgs.method).toBeUndefined()
      expect(headers.get('X-CSRF-Token')).toBeNull()
    })
    it('handles 401 with token refresh and retry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          payload: {
            ws_token: 'new-token',
            ws_token_exp: new Date(Date.now() + 3600000).toISOString(),
          },
        }),
        clone: function () {
          return {
            json: async () => ({
              payload: {
                ws_token: 'new-token',
                ws_token_exp: new Date(Date.now() + 3600000).toISOString(),
              },
            }),
          }
        },
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      })
      const response = await apiClient.request('/test', { method: 'GET' })

      expect(response.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
    it('handles 401 when refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      await expect(apiClient.request('/test', { method: 'GET' })).rejects.toThrow(
        'Authentication required'
      )
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
    it('triggers auth logout callback with cooldown', async () => {
      vi.useFakeTimers()
      vi.resetModules()
      const freshApiClient = (await import('./apiClient')).apiClient
      const originalAuthLogout = (window as { authLogoutCallback?: () => void }).authLogoutCallback
      const authLogout = vi.fn()

      ;(window as { authLogoutCallback?: () => void }).authLogoutCallback = authLogout

      const queueAuthFailure = () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
      }

      try {
        queueAuthFailure()
        await expect(freshApiClient.request('/test', { method: 'GET' })).rejects.toThrow(
          'Authentication required'
        )
        expect(authLogout).toHaveBeenCalledTimes(1)
        queueAuthFailure()
        await expect(freshApiClient.request('/test', { method: 'GET' })).rejects.toThrow(
          'Authentication required'
        )
        expect(authLogout).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(1000)
        await vi.runAllTimersAsync()
        queueAuthFailure()
        await expect(freshApiClient.request('/test', { method: 'GET' })).rejects.toThrow(
          'Authentication required'
        )
        expect(authLogout).toHaveBeenCalledTimes(2)
      } finally {
        if (originalAuthLogout) {
          ;(window as { authLogoutCallback?: () => void }).authLogoutCallback = originalAuthLogout
        } else {
          delete (window as { authLogoutCallback?: () => void }).authLogoutCallback
        }

        vi.useRealTimers()
      }
    })
    it('handles authentication failure without window', () => {
      vi.useFakeTimers()
      const originalWindow = globalThis.window

      vi.stubGlobal('window', undefined)

      try {
        const APIClientClass = (apiClient as any).constructor
        const instance = APIClientClass.getInstance()

        instance.isLoggingOut = false
        expect(() => instance.handleAuthenticationFailure()).not.toThrow()
        vi.runAllTimers()
      } finally {
        vi.stubGlobal('window', originalWindow)
        vi.useRealTimers()
      }
    })
    it('skips retry when skipRetry is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      const response = await apiClient.request('/test', {
        method: 'GET',
        skipRetry: true,
      })

      expect(response.status).toBe(401)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
    it('handles 403 CSRF error with retry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        clone: function () {
          return {
            json: async () => ({ detail: 'CSRF token invalid' }),
          }
        },
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      const response = await apiClient.request('/test', { method: 'POST' })

      expect(response.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
    it('handles non-CSRF 403 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        clone: function () {
          return {
            json: async () => ({ detail: 'Access denied' }),
          }
        },
        json: async () => ({ detail: 'Access denied' }),
      })
      await expect(apiClient.request('/test', { method: 'GET' })).rejects.toThrow(
        expect.objectContaining({ name: 'APIError', status: 403, message: 'Access denied' })
      )
    })
  })
  describe('convenience methods', () => {
    it('provides GET convenience method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      await apiClient.get('/test')
      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'GET' }))
    })
    it('provides POST convenience method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      await apiClient.post('/test', { data: 'test' })
      expect(mockFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'POST' }))
    })
    it('provides POST convenience method without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      await apiClient.post('/test')
      const callArgs = mockFetch.mock.calls[0]?.[1]

      expect(callArgs.body).toBeUndefined()
    })
  })
  describe('JSON convenience methods', () => {
    it('provides getJSON method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      })
      const data = await apiClient.getJSON('/test')

      expect(data).toEqual({ data: 'test' })
    })
    it('throws on non-ok response in getJSON with detail message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ detail: 'Database connection failed' }),
      })
      await expect(apiClient.getJSON('/test')).rejects.toThrow('Database connection failed')
    })
    it('throws on non-ok response in getJSON with message field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ message: 'Server message without detail' }),
      })
      await expect(apiClient.getJSON('/test')).rejects.toThrow('Server message without detail')
    })
    it('throws status text when response has object without detail or message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ other: 'field' }),
      })
      await expect(apiClient.getJSON('/test')).rejects.toThrow('HTTP 500: Internal Server Error')
    })
    it('throws status text when response json is not an object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue('string response'),
      })
      await expect(apiClient.getJSON('/test')).rejects.toThrow('HTTP 500: Internal Server Error')
    })
    it('throws on non-ok response in getJSON without json body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('No JSON')),
      })
      await expect(apiClient.getJSON('/test')).rejects.toThrow('HTTP 500: Internal Server Error')
    })
    it('requestJSON returns parsed body without explicit options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'value' }),
      })
      const data = await apiClient.requestJSON<{ data: string }>('/api/raw')

      expect(data).toEqual({ data: 'value' })
    })
    it('requestJSON throws APIError when response is non-ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ detail: 'missing' }),
      })
      await expect(apiClient.requestJSON('/api/raw', { method: 'GET' })).rejects.toThrow('missing')
    })
    it('provides postJSON method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      })
      const data = await apiClient.postJSON('/test', { input: 'data' })

      expect(data).toEqual({ data: 'test' })
    })
  })
  describe('cookie management', () => {
    it('checks for auth cookies', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrf_token=test; access_token=test',
      })
      expect(apiClient.hasAuthCookies()).toBe(true)
    })
    it('returns false when no auth cookies', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other=value',
      })
      expect(apiClient.hasAuthCookies()).toBe(false)
    })
    it('provides clearCSRFToken method', () => {
      expect(typeof apiClient.clearCSRFToken).toBe('function')
      apiClient.clearCSRFToken()
    })
    it('provides setCsrfToken method', () => {
      expect(typeof apiClient.setCsrfToken).toBe('function')
      apiClient.setCsrfToken('test-token')
    })
    it('returns early when document is undefined (SSR-like)', () => {
      const originalDocument = globalThis.document

      vi.stubGlobal('document', undefined)

      try {
        expect(() => apiClient.setCsrfToken('token')).not.toThrow()
        expect(() => apiClient.setCsrfToken(null)).not.toThrow()
      } finally {
        vi.stubGlobal('document', originalDocument)
      }
    })
    it('exercises HTTPS branch of Secure flag (set + clear)', () => {
      const originalLocation = window.location

      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, protocol: 'https:' },
      })

      try {
        expect(() => apiClient.setCsrfToken('https-token')).not.toThrow()
        expect(() => apiClient.setCsrfToken(null)).not.toThrow()
      } finally {
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: originalLocation,
        })
      }
    })
  })
})
describe('cacheWsTicketFromResponse', () => {
  const apiClient = sharedApiClient
  let mockFetch: ReturnType<typeof vi.fn>
  let storeWsTicket: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(getCookie).mockReturnValue('test-csrf')
    mockFetch = vi.fn()
    ;(globalThis as any).fetch = mockFetch
    const wsTicketCacheMod = await import('./wsTicketCache')

    storeWsTicket = wsTicketCacheMod.storeWsTicket as unknown as ReturnType<typeof vi.fn>
    apiClient.setTimeTravelAsOf(null)
    apiClient.setOperatorScope(null)
    apiClient.setWalletScope(null)
  })
  it('stores ws ticket from valid refresh response', async () => {
    const expDate = new Date('2026-01-07T12:00:00Z')

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        clone: function () {
          return {
            json: async () => ({
              payload: {
                ws_token: 'test-token',
                ws_token_exp: expDate.toISOString(),
              },
            }),
          }
        },
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    await apiClient.request('/test', { method: 'GET' })
    expect(storeWsTicket).toHaveBeenCalledWith({
      token: 'test-token',
      exp: Math.floor(expDate.getTime() / 1000),
    })
  })
  it('stores null when ws_token is missing', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        clone: function () {
          return {
            json: async () => ({ payload: { other: 'data' } }),
          }
        },
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    await apiClient.request('/test', { method: 'GET' })
    expect(storeWsTicket).toHaveBeenCalledWith(null)
  })
  it('stores null when json parsing fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        clone: function () {
          return {
            json: async () => {
              throw new Error('JSON parse error')
            },
          }
        },
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    await apiClient.request('/test', { method: 'GET' })
    expect(storeWsTicket).toHaveBeenCalledWith(null)
  })
  it('throws error when postJSON receives non-ok response with detail message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ detail: 'Invalid current password or user not found' }),
    })
    await expect(apiClient.postJSON('/test', { data: 'test' })).rejects.toThrow(
      'Invalid current password or user not found'
    )
  })
  it('throws error when postJSON receives non-ok response with message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ message: 'Custom error message' }),
    })
    await expect(apiClient.postJSON('/test', { data: 'test' })).rejects.toThrow(
      'Custom error message'
    )
  })
  it('throws error when postJSON receives non-ok response without json body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockRejectedValue(new Error('No JSON')),
    })
    await expect(apiClient.postJSON('/test', { data: 'test' })).rejects.toThrow(
      'HTTP 400: Bad Request'
    )
  })
  it('handles JSON parse error in CSRF retry logic', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      clone: () => ({
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      }),
    })
    await expect(apiClient.request('/test', { method: 'POST' })).rejects.toThrow()
  })
  describe('provenance stamping', () => {
    beforeEach(() => {
      mockSeqCounter = 0
    })
    it('stamps POST body with provenance fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.post('/api/test', { key: 'value' })
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call?.[1]?.body as string)

      expect(body.payload.key).toBe('value')
      expect(body.public_id).toBeDefined()
      expect(body.session_id).toBe('test-session-id')
      expect(body.sequence_id).toEqual(expect.any(Number))
      expect(body.timestamp).toBeDefined()
    })
    it('does not stamp GET requests', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/test')
      const call = mockFetch.mock.calls[0]

      expect(call?.[1]?.body).toBeUndefined()
    })
    it('does not stamp POST without body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.post('/api/test')
      const call = mockFetch.mock.calls[0]

      expect(call?.[1]?.body).toBeUndefined()
    })
    it('does not stamp array bodies', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.post('/api/test', [1, 2, 3])
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call?.[1]?.body as string)

      expect(Array.isArray(body)).toBe(true)
      expect(body).toEqual([1, 2, 3])
    })
    it('does not stamp null bodies', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.post('/api/test', null)
      const call = mockFetch.mock.calls[0]

      expect(call?.[1]?.body).toBeUndefined()
    })
  })
  describe('time-travel mode', () => {
    afterEach(() => {
      apiClient.setTimeTravelAsOf(null)
    })
    it('appends as_of query parameter to GET requests when time-traveling', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/positions')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('as_of=2026-03-15T10%3A00%3A00Z')
    })
    it('appends as_of with & when URL already has query params', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/candles?instrument=BTC-USD')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('&as_of=')
    })
    it('does not append as_of when not time-traveling', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/positions')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).not.toContain('as_of')
    })
    it('blocks POST requests when time-traveling', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')

      await expect(apiClient.post('/api/settings/foo/set', { value: 'bar' })).rejects.toThrow(
        'Write operations are disabled in time-travel mode'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })
    it('allows POST requests when not time-traveling', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.post('/api/settings/foo/set', { value: 'bar' })

      expect(mockFetch).toHaveBeenCalled()
    })
    it('allows auth POST requests when time-traveling', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.post('/api/auth/refresh', {})

      expect(mockFetch).toHaveBeenCalled()
    })
    it('allows login POST when time-traveling', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.post('/api/auth/login', { username: 'u', password: 'p' })

      expect(mockFetch).toHaveBeenCalled()
    })
    it('exposes current asOf via getter', () => {
      expect(apiClient.getTimeTravelAsOf()).toBeNull()
      apiClient.setTimeTravelAsOf('2026-01-01T00:00:00Z')
      expect(apiClient.getTimeTravelAsOf()).toBe('2026-01-01T00:00:00Z')
    })
    it('blocks DELETE requests when time-traveling via request()', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')

      await expect(apiClient.request('/api/settings/foo', { method: 'DELETE' })).rejects.toThrow(
        'Write operations are disabled in time-travel mode'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })
    it('blocks PUT requests when time-traveling via request()', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')

      await expect(
        apiClient.request('/api/settings/foo', { method: 'PUT', body: '{}' })
      ).rejects.toThrow('Write operations are disabled in time-travel mode')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
  describe('multi-tenant scope query params', () => {
    afterEach(() => {
      apiClient.setOperatorScope(null)
      apiClient.setWalletScope(null)
    })
    it('appends operator_public_id when operator scope is set', async () => {
      apiClient.setOperatorScope('op-123')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/orders')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('operator_public_id=op-123')
    })
    it('appends wallet_public_id when wallet scope is set', async () => {
      apiClient.setWalletScope('wallet-456')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/positions')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('wallet_public_id=wallet-456')
    })
    it('appends both scope params when both are set', async () => {
      apiClient.setOperatorScope('op-123')
      apiClient.setWalletScope('wallet-456')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/orders')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('operator_public_id=op-123')
      expect(url).toContain('wallet_public_id=wallet-456')
    })
    it('does not append scope params when both are null', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/orders')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).not.toContain('operator_public_id')
      expect(url).not.toContain('wallet_public_id')
    })
    it('exposes current scope via getters', () => {
      expect(apiClient.getOperatorScope()).toBeNull()
      expect(apiClient.getWalletScope()).toBeNull()
      apiClient.setOperatorScope('op-1')
      apiClient.setWalletScope('w-1')
      expect(apiClient.getOperatorScope()).toBe('op-1')
      expect(apiClient.getWalletScope()).toBe('w-1')
    })
    it('combines with time-travel as_of when both are active', async () => {
      apiClient.setTimeTravelAsOf('2026-03-15T10:00:00Z')
      apiClient.setOperatorScope('op-99')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      await apiClient.get('/api/orders')
      const url = mockFetch.mock.calls[0]?.[0] as string

      expect(url).toContain('as_of=')
      expect(url).toContain('operator_public_id=op-99')
      apiClient.setTimeTravelAsOf(null)
    })
  })
  describe('patchJSON helper', () => {
    it('sends PATCH with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: 1 }),
      })
      const result = await apiClient.patchJSON('/api/custom-patch', { x: 1 })

      expect(result).toEqual({ ok: 1 })
      expect(mockFetch.mock.calls[0]?.[1].method).toBe('PATCH')
    })
    it('sends PATCH without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: 1 }),
      })
      const result = await apiClient.patchJSON('/api/custom-patch')

      expect(result).toEqual({ ok: 1 })
      expect(mockFetch.mock.calls[0]?.[1].method).toBe('PATCH')
      expect(mockFetch.mock.calls[0]?.[1].body).toBeUndefined()
    })
    it('throws APIError on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'bad patch' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(apiClient.patchJSON('/api/custom-patch', {})).rejects.toThrow('bad patch')
    })
  })
})
