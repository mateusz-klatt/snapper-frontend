import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import {
  getPositions,
  createBracket,
  cancelBracket,
  getBracket,
  createTrailingStop,
  cancelTrailingStop,
  getTrailingStopByCycle,
} from './positions'

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

describe('positions API methods', () => {
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

  it('getPositions returns positions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'position_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'position',
            sequence_id: 0,
            public_id: 'test-pid',
            timestamp: '2024-01-01T00:00:00Z',
            session_id: 'test-sid',
            instrument: 'BTC/USD',
            instrument_public_id: 'inst-uuid-test',
            exchange: 'kraken',
            mode: 'live',
            quantity: 1,
            average_price: 50000,
            unrealized_pnl: 100,
            realized_pnl: 50,
            wallet_public_id: 'wallet-uuid-test',
          },
        ],
        count: 1,
      }),
    })
    const result = await getPositions()

    expect(result.payload).toHaveLength(1)
  })
  describe('Bracket API', () => {
    const planResponse = {
      type: 'execution_plan_response',
      sequence_id: 1,
      public_id: 'plan-1',
      timestamp: '2026-04-12T00:00:00Z',
      session_id: 'sess-1',
      payload: {
        type: 'execution_plan',
        sequence_id: 1,
        public_id: 'plan-1',
        timestamp: '2026-04-12T00:00:00Z',
        session_id: 'sess-1',
        plan_type: 'bracket',
        status: 'armed',
        instrument_public_id: 'inst-1',
        exchange: 'kraken_futures',
        mode: 'paper',
        side: 'buy',
        total_quantity: 1.0,
        filled_quantity: 0,
        created_at: '2026-04-12T00:00:00Z',
        created_via: 'api',
        wallet_public_id: 'w-1',
        operator_public_id: null,
        params: { sl_price: 48000 },
        position_cycle_public_id: 'cycle-1',
        parent_plan_public_id: null,
        last_error: null,
        idempotency_key: null,
      },
    }

    it('createBracket posts to /api/execution-plans', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => planResponse,
      })
      const result = await createBracket({
        position_cycle_public_id: 'cycle-1',
        sl_price: 48000,
      })

      expect(result.payload.plan_type).toBe('bracket')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/execution-plans'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    it('cancelBracket posts to /api/execution-plans/{id}/cancel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => planResponse,
      })
      const result = await cancelBracket('plan-1')

      expect(result.payload.public_id).toBe('plan-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/execution-plans/plan-1/cancel'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    it('getBracket fetches /api/execution-plans/{id}', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => planResponse,
      })
      const result = await getBracket('plan-1')

      expect(result.payload.plan_type).toBe('bracket')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/execution-plans/plan-1'),
        expect.objectContaining({ method: 'GET' })
      )
    })
    it('createTrailingStop posts to /api/trailing-stops', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => planResponse,
      })
      const result = await createTrailingStop({
        position_cycle_public_id: 'cycle-1',
        trailing_pct: 5,
      })

      expect(result.payload.plan_type).toBe('bracket')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trailing-stops'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    it('cancelTrailingStop posts to /api/trailing-stops/{id}/cancel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => planResponse,
      })
      const result = await cancelTrailingStop('ts-1')

      expect(result.payload.public_id).toBe('plan-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trailing-stops/ts-1/cancel'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    it('getTrailingStopByCycle fetches /api/trailing-stops/by-cycle/{id}', async () => {
      const messageEnv = {
        type: 'message',
        sequence_id: 0,
        public_id: 'msg-1',
        timestamp: '2026-05-04T00:00:00Z',
        session_id: 'test-sid',
        payload: 'none',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => messageEnv,
      })
      const result = await getTrailingStopByCycle('cycle-1')

      expect(result).toEqual(messageEnv)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trailing-stops/by-cycle/cycle-1'),
        expect.objectContaining({ method: 'GET' })
      )
    })
  })
})
