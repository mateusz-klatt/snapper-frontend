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
    it('throws error for invalid API response', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockResolvedValue(
        refreshResponse({ payload: { invalid: 'response' } })
      )
      await expect(getWsToken()).rejects.toThrow('Invalid ws_token response from refresh endpoint')
    })
    it('throws error when API returns null', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockResolvedValue(refreshResponse(null))
      await expect(getWsToken()).rejects.toThrow('Invalid ws_token response from refresh endpoint')
    })
    it('throws error when ws_token is not a string', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockResolvedValue(
        refreshResponse({
          payload: {
            ws_token: 12345,
            ws_token_exp: new Date().toISOString(),
          },
        })
      )
      await expect(getWsToken()).rejects.toThrow('Invalid ws_token response from refresh endpoint')
    })
    it('throws error when ws_token_exp is not a string', async () => {
      vi.mocked(wsTicketCache.consumeWsTicket).mockReturnValue(null)
      vi.mocked(apiClient.refreshSession).mockResolvedValue(
        refreshResponse({
          payload: {
            ws_token: 'valid-token',
            ws_token_exp: 12345,
          },
        })
      )
      await expect(getWsToken()).rejects.toThrow('Invalid ws_token response from refresh endpoint')
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
