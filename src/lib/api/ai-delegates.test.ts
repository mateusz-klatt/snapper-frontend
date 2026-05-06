import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import {
  listAiDelegates,
  getAiDelegate,
  createAiDelegate,
  updateAiDelegateCaps,
  deactivateAiDelegate,
} from './ai-delegates'

vi.mock('../utils', () => ({
  getCookie: vi.fn(() => 'test-csrf-token'),
}))
vi.mock('../wsTicketCache', () => ({
  storeWsTicket: vi.fn(),
}))

let mockSeqCounter = 0

vi.mock('uuid', () => ({
  v7: vi.fn(() => `00000000-0000-7000-8000-${String(++mockSeqCounter).padStart(12, '0')}`),
}))
vi.mock('../sequenceTracker', () => ({
  getTracker: vi.fn(() => ({
    sessionId: 'test-session-id',
    nextSequence: vi.fn(() => ++mockSeqCounter),
  })),
}))

describe('ai-delegates API methods', () => {
  const apiClient = sharedApiClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCookie).mockReturnValue('test-csrf')
    mockFetch = vi.fn()
    ;(globalThis as any).fetch = mockFetch
    apiClient.setTimeTravelAsOf(null)
    apiClient.setOperatorScope(null)
    apiClient.setWalletScope(null)
  })
  describe('AI integration', () => {
    it('listAiDelegates returns validated delegate list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'delegate_list',
          sequence_id: 1,
          public_id: 'p',
          timestamp: '2026-04-21T00:00:00Z',
          session_id: 's',
          payload: [
            {
              public_id: 'd-1',
              username: 'ai-alpha',
              label: 'Alpha',
              created_by_user_public_id: 'u-1',
              created_at: '2026-04-21T00:00:00Z',
              is_active: true,
              caps: {
                max_open_orders: 10,
                max_daily_notional_usd: 1000,
                max_cancels_per_minute: null,
                max_order_quantity_per_instrument: null,
              },
            },
          ],
          count: 1,
        }),
      })
      const result = await listAiDelegates()

      expect(result.count).toBe(1)
      expect(result.payload[0]?.label).toBe('Alpha')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai-delegates'),
        expect.any(Object)
      )
    })
    it('listAiDelegates throws APIError on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'delegates endpoint unavailable' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(listAiDelegates()).rejects.toThrow('delegates endpoint unavailable')
    })
    it('getAiDelegate returns validated detail response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'delegate_response',
          sequence_id: 1,
          public_id: 'p',
          timestamp: '2026-04-21T00:00:00Z',
          session_id: 's',
          payload: {
            public_id: 'd-1',
            username: 'ai-alpha',
            label: 'Alpha',
            created_by_user_public_id: 'u-1',
            created_at: '2026-04-21T00:00:00Z',
            is_active: true,
            caps: {
              max_open_orders: 5,
              max_daily_notional_usd: 1000,
              max_cancels_per_minute: null,
              max_order_quantity_per_instrument: null,
            },
          },
        }),
      })
      const result = await getAiDelegate('d-1')

      expect(result.payload.public_id).toBe('d-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai-delegates/d-1'),
        expect.any(Object)
      )
    })
    it('getAiDelegate throws APIError on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'not found' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(getAiDelegate('missing')).rejects.toThrow('not found')
    })
    it('createAiDelegate posts body and returns created payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'delegate_created_response',
          sequence_id: 1,
          public_id: 'p',
          timestamp: '2026-04-21T00:00:00Z',
          session_id: 's',
          payload: {
            delegate: {
              public_id: 'd-1',
              username: 'ai-alpha',
              label: 'Alpha',
              created_by_user_public_id: 'u-1',
              created_at: '2026-04-21T00:00:00Z',
              is_active: true,
              caps: {
                max_open_orders: null,
                max_daily_notional_usd: null,
                max_cancels_per_minute: null,
                max_order_quantity_per_instrument: null,
              },
            },
            access_token: 'a',
            expires_in: 900,
          },
        }),
      })
      const result = await createAiDelegate({
        label: 'Alpha',
        caps: {
          max_open_orders: null,
          max_daily_notional_usd: null,
          max_cancels_per_minute: null,
          max_order_quantity_per_instrument: null,
        },
        operator_public_id: null,
      })

      expect(result.payload.access_token).toBe('a')
      expect(mockFetch.mock.calls[0]?.[1].method).toBe('POST')
    })
    it('createAiDelegate throws APIError on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'label too long' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(
        createAiDelegate({ label: 'x'.repeat(1000), operator_public_id: null })
      ).rejects.toThrow('label too long')
    })
    it('updateAiDelegateCaps patches and returns updated delegate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'delegate_response',
          sequence_id: 1,
          public_id: 'p',
          timestamp: '2026-04-21T00:00:00Z',
          session_id: 's',
          payload: {
            public_id: 'd-1',
            username: 'ai-alpha',
            label: 'Alpha',
            created_by_user_public_id: 'u-1',
            created_at: '2026-04-21T00:00:00Z',
            is_active: true,
            caps: {
              max_open_orders: 25,
              max_daily_notional_usd: null,
              max_cancels_per_minute: null,
              max_order_quantity_per_instrument: null,
            },
          },
        }),
      })
      const result = await updateAiDelegateCaps('d-1', {
        caps: {
          max_open_orders: 25,
          max_daily_notional_usd: null,
          max_cancels_per_minute: null,
          max_order_quantity_per_instrument: null,
        },
      })

      expect(result.payload.caps.max_open_orders).toBe(25)
      expect(mockFetch.mock.calls[0]?.[1].method).toBe('PATCH')
      expect(mockFetch.mock.calls[0]?.[0]).toEqual(expect.stringContaining('/api/ai-delegates/d-1'))
    })
    it('updateAiDelegateCaps throws APIError on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'forbidden' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(
        updateAiDelegateCaps('d-1', {
          caps: {
            max_open_orders: null,
            max_daily_notional_usd: null,
            max_cancels_per_minute: null,
            max_order_quantity_per_instrument: null,
          },
        })
      ).rejects.toThrow('forbidden')
    })
    it('deactivateAiDelegate posts and returns revoked delegate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'delegate_response',
          sequence_id: 1,
          public_id: 'p',
          timestamp: '2026-04-21T00:00:00Z',
          session_id: 's',
          payload: {
            public_id: 'd-1',
            username: 'ai-alpha',
            label: 'Alpha',
            created_by_user_public_id: 'u-1',
            created_at: '2026-04-21T00:00:00Z',
            is_active: false,
            caps: {
              max_open_orders: null,
              max_daily_notional_usd: null,
              max_cancels_per_minute: null,
              max_order_quantity_per_instrument: null,
            },
          },
        }),
      })
      const result = await deactivateAiDelegate('d-1')

      expect(result.payload.is_active).toBe(false)
      expect(mockFetch.mock.calls[0]?.[0]).toEqual(
        expect.stringContaining('/api/ai-delegates/d-1/deactivate')
      )
      expect(mockFetch.mock.calls[0]?.[1].method).toBe('POST')
    })
    it('deactivateAiDelegate throws APIError on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'database is locked' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(deactivateAiDelegate('d-1')).rejects.toThrow('database is locked')
    })
  })
})
