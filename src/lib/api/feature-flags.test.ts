import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getFeatureFlags } from './feature-flags'

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

describe('feature-flags API methods', () => {
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
    it('getFeatureFlags returns parsed response with ai_integration_enabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'feature_flags_response',
          sequence_id: 1,
          public_id: 'p',
          timestamp: '2026-04-21T00:00:00Z',
          session_id: 's',
          payload: { ai_integration_enabled: true },
        }),
      })
      const result = await getFeatureFlags()

      expect(result.payload.ai_integration_enabled).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settings/features'),
        expect.any(Object)
      )
    })
    it('getFeatureFlags throws APIError on non-ok response', async () => {
      const jsonFn = async () => ({ detail: 'server error' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(getFeatureFlags()).rejects.toThrow('server error')
    })
  })
})
