import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { listAiReviews, listPendingAiReviews, submitAiReviewDecision } from './ai-reviews'

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

describe('ai-reviews API methods', () => {
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
    it('listPendingAiReviews returns validated pending list with no params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              review_public_id: 'r-1',
              selected_delegate_public_id: 'del-1',
              wallet_public_id: 'wal-1',
              dispatch_version: 0,
              status: 'pending',
              deadline: '2026-04-27T10:05:00Z',
              fanout_after: '2026-04-27T10:00:00Z',
            },
          ],
          count: 1,
        }),
      })
      const result = await listPendingAiReviews()

      expect(result.count).toBe(1)
      expect(result.items[0]?.review_public_id).toBe('r-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/ai-reviews\/pending$/),
        expect.any(Object)
      )
    })
    it('listPendingAiReviews appends wallet_public_id and limit query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], count: 0 }),
      })
      await listPendingAiReviews({ wallet_public_id: 'wal-77', limit: 25 })
      const calledUrl = mockFetch.mock.calls[0]?.[0] as string

      expect(calledUrl).toContain('wallet_public_id=wal-77')
      expect(calledUrl).toContain('limit=25')
    })
    it('listPendingAiReviews throws APIError on 422 (non-delegate caller)', async () => {
      const jsonFn = async () => ({ detail: 'not_a_delegate' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Content',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(listPendingAiReviews()).rejects.toThrow('not_a_delegate')
    })
    /**
     * The decision endpoint follows the same envelope contract as every
     * other mutating REST call (orders, brackets, trailing stops,
     * backtests): provenance fields on the envelope, domain payload
     * nested under `payload`. This test pins the contract.
     */
    it('submitAiReviewDecision posts decision wrapped in provenance envelope', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          error_code: null,
          message: 'recorded',
          details: {},
        }),
      })
      const result = await submitAiReviewDecision('rev-1', 'approve', 'looks good')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/ai-reviews\/rev-1\/decision$/),
        expect.objectContaining({ method: 'POST' })
      )
      const body = JSON.parse((mockFetch.mock.calls[0]?.[1].body as string) ?? '{}') as {
        public_id?: string
        session_id?: string
        sequence_id?: number
        timestamp?: string
        payload?: { decision?: string; rationale?: string }
      }

      expect(typeof body.public_id).toBe('string')
      expect(typeof body.session_id).toBe('string')
      expect(typeof body.sequence_id).toBe('number')
      expect(typeof body.timestamp).toBe('string')
      expect(body.payload?.decision).toBe('approve')
      expect(body.payload?.rationale).toBe('looks good')
    })
    it('submitAiReviewDecision omits rationale field when not supplied', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          error_code: null,
          message: 'recorded',
          details: {},
        }),
      })
      await submitAiReviewDecision('rev-2', 'reject')
      const body = JSON.parse((mockFetch.mock.calls[0]?.[1].body as string) ?? '{}') as {
        payload?: Record<string, unknown>
      }

      expect(body.payload?.['decision']).toBe('reject')
      expect(body.payload?.['rationale']).toBeUndefined()
    })
    it('submitAiReviewDecision omits rationale field when empty string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          error_code: null,
          message: 'recorded',
          details: {},
        }),
      })
      await submitAiReviewDecision('rev-3', 'approve', '')
      const body = JSON.parse((mockFetch.mock.calls[0]?.[1].body as string) ?? '{}') as {
        payload?: Record<string, unknown>
      }

      expect(body.payload?.['rationale']).toBeUndefined()
    })
    it('listAiReviews returns the validated decision list and hits the collection path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              review_public_id: 'rev-1',
              strategy_public_id: 'strat-1',
              user_public_id: 'user-1',
              operator_public_id: 'op-1',
              wallet_public_id: 'wal-1',
              instrument_public_id: 'inst-1',
              selected_delegate_public_id: 'del-1',
              responding_delegate_public_id: 'del-1',
              status: 'resolved_approved',
              decision: 'approve',
              rationale: 'ok',
              resolution_mode: 'pick_one_primary',
              dispatch_version: 0,
              created_at: '2026-07-08T10:00:00Z',
              resolved_at: '2026-07-08T10:00:30Z',
              deadline: '2026-07-08T10:05:00Z',
              signal_envelope: { side: 'buy' },
            },
          ],
          count: 1,
        }),
      })
      const result = await listAiReviews()

      expect(result.count).toBe(1)
      expect(result.items[0]?.decision).toBe('approve')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/ai-reviews$/),
        expect.any(Object)
      )
    })
    it('listAiReviews appends the limit query param', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], count: 0 }),
      })
      await listAiReviews({ limit: 25 })
      const calledUrl = mockFetch.mock.calls[0]?.[0] as string

      expect(calledUrl).toContain('/api/ai-reviews?')
      expect(calledUrl).toContain('limit=25')
    })
    it('submitAiReviewDecision throws APIError on 422 (invalid decision)', async () => {
      const jsonFn = async () => ({
        detail: { success: false, error_code: 'invalid_decision', message: 'bad', details: {} },
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Content',
        json: jsonFn,
        clone: () => ({ json: jsonFn }),
      })
      await expect(submitAiReviewDecision('rev-4', 'approve')).rejects.toThrow()
    })
  })
})
