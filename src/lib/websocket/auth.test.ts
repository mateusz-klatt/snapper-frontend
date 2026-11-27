import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isAuthControlMessage, getWsToken as requestWsToken, WsTicketNetworkError } from './auth'
import * as wsTicketCache from '../wsTicketCache'
import { apiClient } from '../apiClient'
import { APIError } from '../api/error'

vi.mock('../wsTicketCache', () => ({
  consumeWsTicket: vi.fn(),
}))
vi.mock('../apiClient', () => ({
  apiClient: {
    refreshSession: vi.fn(),
    consumeIndependentRestTicket: vi.fn(() => false),
    getSessionEpoch: vi.fn(() => 0),
  },
}))

const refreshResponse = (payload: unknown): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve(payload) }) as unknown as Response
const socket = {} as WebSocket
const getWsToken = () => requestWsToken(socket, () => true)

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  describe('isAuthControlMessage', () => {
    it('returns true for auth_required message', () => {
      expect(isAuthControlMessage({ type: 'auth_required' })).toBe(true)
    })
    it('returns true for auth_ok message', () => {
      expect(isAuthControlMessage({ type: 'auth_ok' })).toBe(true)
    })
    it('returns true for auth_complete message', () => {
      expect(isAuthControlMessage({ type: 'auth_complete' })).toBe(true)
    })
    it('returns true for auth_failed message', () => {
      expect(isAuthControlMessage({ type: 'auth_failed' })).toBe(true)
    })
    it('returns true for auth_expired message', () => {
      expect(isAuthControlMessage({ type: 'auth_expired' })).toBe(true)
    })
    it('returns true for reauth_required message', () => {
      expect(isAuthControlMessage({ type: 'reauth_required' })).toBe(true)
    })
    it('returns false for candle message', () => {
      expect(isAuthControlMessage({ type: 'candle' })).toBe(false)
    })
    it('returns false for heartbeat message', () => {
      expect(isAuthControlMessage({ type: 'heartbeat' })).toBe(false)
    })
    it('returns false for unknown message type', () => {
      expect(isAuthControlMessage({ type: 'unknown_type' })).toBe(false)
    })
  })
  describe('getWsToken', () => {
    it('returns token from cache when available', async () => {
      const cachedTicket = { token: 'cached-token', exp: 1234567890 }

      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(cachedTicket)
      const result = await getWsToken()

      expect(result).toEqual({ token: 'cached-token', exp: 1234567890 })
      expect(apiClient.refreshSession).not.toHaveBeenCalled()
    })
    it('fetches token from API when cache is empty', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      const expDate = new Date('2026-01-07T12:00:00Z')

      vi.mocked(apiClient.refreshSession).mockResolvedValue(
        refreshResponse({
          payload: {
            ws_token: 'fetched-token',
            ws_token_exp: expDate.toISOString(),
          },
        })
      )
      const result = await getWsToken()

      expect(result).toEqual({ token: 'fetched-token', exp: Math.floor(expDate.getTime() / 1000) })
      expect(apiClient.refreshSession).toHaveBeenCalledTimes(1)
      expect(apiClient.refreshSession).toHaveBeenCalledWith(undefined, { claimWsTicket: true })
    })
    it.each([
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
      [502, 'Bad Gateway'],
    ])('retains HTTP %s on a failed refresh', async (status, statusText) => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockResolvedValue(
        new Response(null, { status, statusText })
      )
      const pending = getWsToken()

      await expect(pending).rejects.toBeInstanceOf(APIError)
      await expect(pending).rejects.toMatchObject({
        status,
        statusText,
        message: `Refresh failed with status ${status}`,
      })
    })
    it('marks fetch TypeError as a network failure and allows a new token request', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      const cause = new TypeError('Failed to fetch')
      const expiration = '2026-01-07T12:00:00Z'

      vi.mocked(apiClient.refreshSession)
        .mockRejectedValueOnce(cause)
        .mockResolvedValueOnce(
          refreshResponse({ payload: { ws_token: 'recovered', ws_token_exp: expiration } })
        )
      const failed = getWsToken()

      await expect(failed).rejects.toBeInstanceOf(WsTicketNetworkError)
      await expect(failed).rejects.toMatchObject({ message: 'Failed to fetch', cause })
      await expect(getWsToken()).resolves.toEqual({
        token: 'recovered',
        exp: Date.parse(expiration) / 1000,
      })
    })
    it.each([
      ['AbortError', new DOMException('The operation was aborted.', 'AbortError')],
      ['TimeoutError', new DOMException('Refresh request timed out', 'TimeoutError')],
    ])('marks DOMException %s as WsTicketNetworkError', async (_name, cause) => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockRejectedValueOnce(cause)
      const failed = getWsToken()

      await expect(failed).rejects.toBeInstanceOf(WsTicketNetworkError)
      await expect(failed).rejects.toMatchObject({ message: cause.message, cause })
    })
    it('preserves non-abort/timeout DOMException failures', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      const failure = new DOMException('Invalid state', 'InvalidStateError')

      vi.mocked(apiClient.refreshSession).mockRejectedValueOnce(failure)

      await expect(getWsToken()).rejects.toBe(failure)
    })
    it('preserves non-network refresh failures', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      const failure = new Error('Unexpected refresh error')

      vi.mocked(apiClient.refreshSession).mockRejectedValueOnce(failure)

      await expect(getWsToken()).rejects.toBe(failure)
    })
    it('does not classify a response body TypeError as a fetch failure', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      const failure = new TypeError('Invalid response body')
      const response = new Response('')

      vi.spyOn(response, 'json').mockRejectedValueOnce(failure)
      vi.mocked(apiClient.refreshSession).mockResolvedValueOnce(response)

      await expect(getWsToken()).rejects.toBe(failure)
    })
    it.each([
      ['AbortError', new DOMException('Body read aborted', 'AbortError')],
      ['TimeoutError', new DOMException('Body read timed out', 'TimeoutError')],
    ])('maps response body %s to WsTicketNetworkError', async (_name, failure) => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      const response = new Response('')

      vi.spyOn(response, 'json').mockRejectedValueOnce(failure)
      vi.mocked(apiClient.refreshSession).mockResolvedValueOnce(response)

      const pending = getWsToken()

      await expect(pending).rejects.toBeInstanceOf(WsTicketNetworkError)
      await expect(pending).rejects.toMatchObject({ message: failure.message, cause: failure })
    })
    it('allows a replacement socket to consume an independent REST-only cached ticket', async () => {
      let resolveOld!: (response: Response) => void

      vi.mocked(wsTicketCache.consumeWsTicket)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ token: 'rest-only-ticket', exp: 9999999999 })
      vi.mocked(apiClient.refreshSession).mockImplementationOnce(
        () =>
          new Promise<Response>(resolve => {
            resolveOld = resolve
          })
      )
      vi.mocked(apiClient.consumeIndependentRestTicket).mockReturnValueOnce(true)

      const oldSocket = {} as WebSocket
      const newSocket = {} as WebSocket
      const oldPromise = requestWsToken(oldSocket, () => true)
      const replacementPromise = requestWsToken(newSocket, () => true)

      resolveOld(
        refreshResponse({
          payload: {
            ws_token: 'old-ticket',
            ws_token_exp: '2030-01-01T00:00:00.000Z',
          },
        })
      )

      await expect(oldPromise).resolves.toMatchObject({ token: 'old-ticket' })
      await expect(replacementPromise).resolves.toEqual({
        token: 'rest-only-ticket',
        exp: 9999999999,
      })
      expect(apiClient.refreshSession).toHaveBeenCalledTimes(1)
    })
    it('drops a valid ticket whose body finishes after the session changes', async () => {
      let resolveBody!: (body: unknown) => void
      const body = new Promise(resolve => {
        resolveBody = resolve
      })
      const response = new Response('')
      const readBody = vi.spyOn(response, 'json').mockReturnValueOnce(body)
      const epoch = vi.mocked(apiClient.getSessionEpoch)

      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockResolvedValueOnce(response)

      const ticket = getWsToken()

      await vi.waitFor(() => expect(readBody).toHaveBeenCalledTimes(1))
      epoch.mockReturnValue(1)

      try {
        resolveBody({
          payload: { ws_token: 'old-ticket', ws_token_exp: '2030-01-01T00:00:00.000Z' },
        })
        await expect(ticket).resolves.toBeNull()
      } finally {
        epoch.mockReturnValue(0)
      }
    })
    it('releases a closed socket ticket flight before sleeping on a malformed response', async () => {
      vi.useFakeTimers()
      let resolveOld!: (response: Response) => void
      const pendingResponse = new Promise<Response>(resolve => {
        resolveOld = resolve
      })

      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession)
        .mockReturnValueOnce(pendingResponse)
        .mockResolvedValueOnce(
          refreshResponse({
            payload: { ws_token: 'replacement', ws_token_exp: '2030-01-01T00:00:00.000Z' },
          })
        )

      let isOpen = true
      const oldTicket = requestWsToken(socket, () => isOpen)

      isOpen = false
      const replacement = requestWsToken({} as WebSocket, () => true)

      resolveOld(refreshResponse({ payload: {} }))
      await vi.advanceTimersByTimeAsync(0)

      expect(apiClient.refreshSession).toHaveBeenCalledTimes(2)
      await expect(oldTicket).resolves.toBeNull()
      await expect(replacement).resolves.toMatchObject({ token: 'replacement' })
    })
    it.each(['socket replacement', 'session change'])(
      'abandons a malformed-ticket retry after %s during backoff',
      async invalidation => {
        vi.useFakeTimers()
        vi.spyOn(Math, 'random').mockReturnValue(0.5)
        vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
        vi.mocked(apiClient.refreshSession).mockResolvedValueOnce(refreshResponse({ payload: {} }))
        const epoch = vi.mocked(apiClient.getSessionEpoch)
        let isCurrent = true
        const ticket = requestWsToken(socket, () => isCurrent)

        await vi.advanceTimersByTimeAsync(2999)

        try {
          if (invalidation === 'session change') epoch.mockReturnValue(1)
          else isCurrent = false

          await vi.advanceTimersByTimeAsync(1)
          await expect(ticket).resolves.toBeNull()
          expect(apiClient.refreshSession).toHaveBeenCalledTimes(1)
        } finally {
          epoch.mockReturnValue(0)
        }
      }
    )
    it.each([
      { payload: { invalid: 'response' } },
      null,
      { payload: { ws_token: 12345, ws_token_exp: '2030-01-01T00:00:00.000Z' } },
      { payload: { ws_token: 'valid-token', ws_token_exp: 12345 } },
    ])('rejects after three attempts for malformed ticket payload %j', async payload => {
      vi.useFakeTimers()
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockResolvedValue(refreshResponse(payload))
      const failure = expect(getWsToken()).rejects.toThrow(
        'Invalid ws_token response from refresh endpoint'
      )

      await vi.advanceTimersByTimeAsync(2999)
      expect(apiClient.refreshSession).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(apiClient.refreshSession).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(4500)
      await failure
      expect(apiClient.refreshSession).toHaveBeenCalledTimes(3)
    })
    it('deduplicates concurrent requests', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      const expDate = new Date('2026-01-07T12:00:00Z')

      vi.mocked(apiClient.refreshSession).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve(
                  refreshResponse({
                    payload: {
                      ws_token: 'dedup-token',
                      ws_token_exp: expDate.toISOString(),
                    },
                  })
                ),
              50
            )
          )
      )
      const [result1, result2] = await Promise.all([getWsToken(), getWsToken()])
      const expectedExp = Math.floor(expDate.getTime() / 1000)

      expect(result1).toEqual({ token: 'dedup-token', exp: expectedExp })
      expect(result2).toEqual({ token: 'dedup-token', exp: expectedExp })
      expect(apiClient.refreshSession).toHaveBeenCalledTimes(1)
    })
  })
})
