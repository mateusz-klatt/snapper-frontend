import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getOrders, getExecutions, createOrder, cancelOrder } from './orders'

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

describe('orders API methods', () => {
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

  it('getOrders returns orders with optional symbol filter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'order_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'order',
            sequence_id: 0,
            public_id: 'test-pid',
            timestamp: '2024-01-01T00:00:00Z',
            session_id: 'test-sid',
            instrument: 'BTC/USD',
            exchange: 'kraken',
            mode: 'live',
            client_order_id: 'client-1',
            exchange_order_id: 'ex-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            side: 'buy',
            order_type: 'limit',
            price: 50000,
            size: 1,
            filled_size: 1,
            status: 'filled',
            reduce_only: false,
            wallet_public_id: 'wallet-1',
          },
        ],
        count: 1,
      }),
    })
    const result = await getOrders('BTC/USD', 50, 10)

    expect(result.payload).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('symbol=BTC%2FUSD'),
      expect.any(Object)
    )
  })
  it('getOrders works without symbol filter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'order_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    await getOrders()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.not.stringContaining('symbol='),
      expect.any(Object)
    )
  })
  it('getOrders passes exchange filter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'order_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [],
        count: 0,
      }),
    })
    await getOrders('BTC/USD', 50, 10, 'kraken')
    const url = mockFetch.mock.calls[0]?.[0] as string

    expect(url).toContain('exchange=kraken')
  })
  it('getExecutions returns executions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'execution_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'execution',
            sequence_id: 0,
            public_id: 'test-pid',
            timestamp: '2024-01-01T00:00:00Z',
            session_id: 'test-sid',
            client_order_id: 'client-1',
            executed_at: '2024-01-01T00:00:00Z',
            price: 100,
            size: 1,
            last_size: 1,
            last_price: 100,
            fee: 0.1,
            fee_asset: 'USD',
            instrument: 'BTC/USD',
            side: 'buy',
            exchange: 'kraken',
            status: 'filled',
            wallet_public_id: 'wallet-1',
            liquidity_role: 'unknown',
          },
        ],
        count: 1,
      }),
    })
    const result = await getExecutions(50)

    expect(result.payload).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=50'), expect.any(Object))
  })
  it('getExecutions uses default limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'execution_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'execution',
            sequence_id: 0,
            public_id: 'test-pid',
            timestamp: '2024-01-01T00:00:00Z',
            session_id: 'test-sid',
            client_order_id: 'client-1',
            executed_at: '2024-01-01T00:00:00Z',
            price: 100,
            size: 1,
            last_size: 1,
            last_price: 100,
            fee: 0.1,
            fee_asset: 'USD',
            instrument: 'BTC/USD',
            side: 'buy',
            exchange: 'kraken',
            status: 'filled',
            wallet_public_id: 'wallet-1',
            liquidity_role: 'unknown',
          },
        ],
        count: 1,
      }),
    })
    const result = await getExecutions()

    expect(result.payload).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=100'), expect.any(Object))
  })
  it('createOrder posts order body', async () => {
    const responseBody = {
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
        plan_type: 'order',
        status: 'armed',
        instrument_public_id: 'inst-1',
        exchange: 'kraken',
        mode: 'paper',
        side: 'buy',
        total_quantity: 1.0,
        filled_quantity: 0,
        created_at: '2026-04-12T00:00:00Z',
        created_via: 'api',
        wallet_public_id: 'w-1',
        operator_public_id: null,
        params: {},
        position_cycle_public_id: null,
        parent_plan_public_id: null,
        last_error: null,
        idempotency_key: null,
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => responseBody,
    })
    const result = await createOrder({ type: 'create_order_command' })

    expect(result).toEqual(responseBody)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.objectContaining({ method: 'POST' })
    )
  })
  it('cancelOrder posts to /api/orders/by-client-order-id/{cid}/cancel', async () => {
    const responseBody = {
      type: 'execution_plan_response',
      sequence_id: 2,
      public_id: 'plan-2',
      timestamp: '2026-04-12T00:00:00Z',
      session_id: 'sess-1',
      payload: {
        type: 'execution_plan',
        sequence_id: 2,
        public_id: 'plan-2',
        timestamp: '2026-04-12T00:00:00Z',
        session_id: 'sess-1',
        plan_type: 'order',
        status: 'cancelled',
        instrument_public_id: 'inst-1',
        exchange: 'kraken',
        mode: 'paper',
        side: 'buy',
        total_quantity: 1.0,
        filled_quantity: 0,
        created_at: '2026-04-12T00:00:00Z',
        created_via: 'api',
        wallet_public_id: 'w-1',
        operator_public_id: null,
        params: {},
        position_cycle_public_id: null,
        parent_plan_public_id: null,
        last_error: null,
        idempotency_key: null,
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => responseBody,
    })
    const result = await cancelOrder('cid 42/with special')

    expect(result).toEqual(responseBody)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders/by-client-order-id/cid%2042%2Fwith%20special/cancel'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
