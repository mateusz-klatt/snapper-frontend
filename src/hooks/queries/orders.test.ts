import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useOrders,
  useExecutions,
  useCreateOrder,
  useCancelOrder,
  useOrdersGrouped,
} from './orders'
import { cancelOrder, createOrder, getExecutions, getOrders } from '../../lib/api/orders'

const ENV = {
  seq: 0,
  pid: 'test-pid',
  ts: '2024-01-01T00:00:00Z',
  sid: 'test-sid',
}

function envelope<T extends string>(type: T, extra: Record<string, unknown> = {}) {
  return {
    type,
    sequence_id: ENV.seq,
    public_id: ENV.pid,
    timestamp: ENV.ts,
    session_id: ENV.sid,
    ...extra,
  }
}

vi.mock('../../lib/api/orders', () => ({
  cancelOrder: vi.fn(() => Promise.resolve({ type: 'execution_plan_response', payload: {} })),
  createOrder: vi.fn(() => Promise.resolve({ type: 'execution_plan_response', payload: {} })),
  getExecutions: vi.fn(() =>
    Promise.resolve(envelope('execution_list', { payload: [], count: 0 }))
  ),
  getOrders: vi.fn(() => Promise.resolve(envelope('order_list', { payload: [], count: 0 }))),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'admin' },
  })),
}))
vi.mock('../../lib/transforms', () => ({
  safeOrderFromAPI: vi.fn(o => o),
  safeExecutionFromAPI: vi.fn(e => e),
  safeSignalFromAPI: vi.fn(s => s),
  positionFromAPI: vi.fn(p => ({
    publicId: p.public_id,
    timestamp: p.timestamp ? new Date(p.timestamp) : undefined,
    instrument: p.instrument ?? '',
    exchange: p.exchange ?? '',
    quantity: p.quantity ?? 0,
    averagePrice: p.average_price ?? 0,
    unrealizedPnl: p.unrealized_pnl ?? 0,
    realizedPnl: p.realized_pnl ?? 0,
  })),
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('orders queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useOrders', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useExecutions', () => {
    it('returns data when authenticated', async () => {
      vi.mocked(getExecutions).mockResolvedValueOnce(
        envelope('execution_list', {
          payload: [null, { public_id: 'exec-1' }],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useOrdersGrouped', () => {
    it('groups orders by status', async () => {
      vi.mocked(getOrders).mockResolvedValueOnce(
        envelope('order_list', {
          payload: [
            {
              public_id: '1',
              status: 'NEW',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '2',
              status: 'OPEN',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '3',
              status: 'FILLED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '4',
              status: 'PARTIALLY_FILLED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '5',
              status: 'CANCELLED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '6',
              status: 'REJECTED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '7',
              status: 'EXPIRED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
          ],
          count: 7,
        }) as never
      )
      const { result } = renderHook(() => useOrdersGrouped(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.new).toHaveLength(1)
      expect(result.current.data?.open).toHaveLength(1)
      expect(result.current.data?.filled).toHaveLength(1)
      expect(result.current.data?.partially_filled).toHaveLength(1)
      expect(result.current.data?.cancelled).toHaveLength(1)
      expect(result.current.data?.rejected).toHaveLength(1)
      expect(Object.values(result.current.data ?? {}).flat()).toHaveLength(6)
    })
    it('returns null when no orders', async () => {
      vi.mocked(getOrders).mockResolvedValueOnce(null as never)
      const { result } = renderHook(() => useOrdersGrouped(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeNull()
    })
  })

  describe('useCreateOrder', () => {
    it('calls createOrder and invalidates orders', async () => {
      const responseBody = {
        type: 'execution_plan_response' as const,
        sequence_id: 1,
        public_id: 'plan-1',
        timestamp: '2026-04-12T00:00:00Z',
        session_id: 'sess-1',
        payload: {
          type: 'execution_plan' as const,
          sequence_id: 1,
          public_id: 'plan-1',
          timestamp: '2026-04-12T00:00:00Z',
          session_id: 'sess-1',
          plan_type: 'order',
          status: 'armed',
          instrument_public_id: 'inst-1',
          exchange: 'kraken' as const,
          mode: 'paper' as const,
          side: 'buy' as const,
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

      vi.mocked(createOrder).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCreateOrder(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ type: 'create_order_command' })
      })

      expect(createOrder).toHaveBeenCalledWith({
        type: 'create_order_command',
      })
    })
  })

  describe('useCancelOrder', () => {
    it('calls cancelOrder with the client_order_id', async () => {
      const responseBody = {
        type: 'execution_plan_response' as const,
        sequence_id: 2,
        public_id: 'plan-2',
        timestamp: '2026-04-12T00:00:00Z',
        session_id: 'sess-1',
        payload: {
          type: 'execution_plan' as const,
          sequence_id: 2,
          public_id: 'plan-2',
          timestamp: '2026-04-12T00:00:00Z',
          session_id: 'sess-1',
          plan_type: 'order',
          status: 'cancelled',
          instrument_public_id: 'inst-1',
          exchange: 'kraken' as const,
          mode: 'paper' as const,
          side: 'buy' as const,
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

      vi.mocked(cancelOrder).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCancelOrder(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync('cid-42')
      })

      expect(cancelOrder).toHaveBeenCalledWith('cid-42')
    })
  })
})
