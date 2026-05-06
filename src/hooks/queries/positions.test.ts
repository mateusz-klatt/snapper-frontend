import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  usePositionsSummary,
  useCreateBracket,
  useCreateTrailingStop,
  useTrailingStopForCycle,
} from './positions'
import { useAuth } from '../../stores/auth'
import {
  createBracket,
  createTrailingStop,
  getPositions,
  getTrailingStopByCycle,
} from '../../lib/api/positions'

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

vi.mock('../../lib/api/positions', () => ({
  cancelTrailingStop: vi.fn(() =>
    Promise.resolve({ type: 'execution_plan_response', payload: {} })
  ),
  createBracket: vi.fn(() => Promise.resolve({ type: 'execution_plan_response', payload: {} })),
  createTrailingStop: vi.fn(() =>
    Promise.resolve({ type: 'execution_plan_response', payload: {} })
  ),
  getPositions: vi.fn(() => Promise.resolve(envelope('position_list', { payload: [], count: 0 }))),
  getTrailingStopByCycle: vi.fn(() => Promise.resolve({ type: 'message', payload: 'none' })),
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

describe('positions queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('usePositionsSummary', () => {
    it('calculates summary for all-long positions', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              type: 'position' as const,
              public_id: '1',
              timestamp: new Date().toISOString(),
              instrument: 'BTC/USD',
              exchange: 'kraken' as const,
              quantity: 10,
              average_price: 100,
              unrealized_pnl: 50,
              realized_pnl: 20,
            },
            {
              type: 'position' as const,
              public_id: '2',
              timestamp: new Date().toISOString(),
              instrument: 'ETH/USD',
              exchange: 'kraken' as const,
              quantity: 5,
              average_price: 200,
              unrealized_pnl: -10,
              realized_pnl: 30,
            },
          ],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.count).toBe(2)
      expect(result.current.data?.instruments).toContain('BTC/USD')
      expect(result.current.data?.instruments).toContain('ETH/USD')
      expect(result.current.data?.totalPnL).toBe(90)
      expect(result.current.data?.longCost).toBe(2000)
      expect(result.current.data?.shortCost).toBe(0)
      expect(result.current.data?.totalExposure).toBe(2000)
      expect(result.current.data?.pnlPercent).toBeCloseTo(4.5, 5)
    })
    it('calculates summary for all-short positions (regression: pnlPercent must not be hidden)', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              type: 'position' as const,
              public_id: '1',
              timestamp: new Date().toISOString(),
              instrument: 'BTC/USD',
              exchange: 'kraken' as const,
              quantity: -10,
              average_price: 100,
              unrealized_pnl: 50,
              realized_pnl: 20,
            },
            {
              type: 'position' as const,
              public_id: '2',
              timestamp: new Date().toISOString(),
              instrument: 'ETH/USD',
              exchange: 'kraken' as const,
              quantity: -5,
              average_price: 200,
              unrealized_pnl: 25,
              realized_pnl: 5,
            },
          ],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.count).toBe(2)
      expect(result.current.data?.totalPnL).toBe(100)
      expect(result.current.data?.longCost).toBe(0)
      expect(result.current.data?.shortCost).toBe(2000)
      expect(result.current.data?.totalExposure).toBe(2000)
      expect(result.current.data?.pnlPercent).toBeCloseTo(5.0, 5)
    })
    it('calculates summary for mixed long and short positions', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              type: 'position' as const,
              public_id: '1',
              timestamp: new Date().toISOString(),
              instrument: 'BTC/USD',
              exchange: 'kraken' as const,
              quantity: 10,
              average_price: 100,
              unrealized_pnl: 50,
              realized_pnl: 0,
            },
            {
              type: 'position' as const,
              public_id: '2',
              timestamp: new Date().toISOString(),
              instrument: 'ETH/USD',
              exchange: 'kraken' as const,
              quantity: -5,
              average_price: 200,
              unrealized_pnl: 25,
              realized_pnl: 0,
            },
          ],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.count).toBe(2)
      expect(result.current.data?.longCost).toBe(1000)
      expect(result.current.data?.shortCost).toBe(1000)
      expect(result.current.data?.totalExposure).toBe(2000)
      expect(result.current.data?.totalPnL).toBe(75)
      expect(result.current.data?.pnlPercent).toBeCloseTo(3.75, 5)
    })
    it('returns null when positions data is unavailable', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(null as never)
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeNull()
    })
    it('handles zero exposure (flat position) without dividing by zero', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              public_id: '1',
              instrument: 'BTC/USD',
              quantity: 0,
              average_price: 0,
              unrealized_pnl: 0,
              realized_pnl: 0,
            },
          ],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.longCost).toBe(0)
      expect(result.current.data?.shortCost).toBe(0)
      expect(result.current.data?.totalExposure).toBe(0)
      expect(result.current.data?.pnlPercent).toBe(0)
    })
  })

  describe('useCreateBracket', () => {
    it('calls createBracket and invalidates positions + orders', async () => {
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

      vi.mocked(createBracket).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCreateBracket(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          position_cycle_public_id: 'cycle-1',
          sl_price: 48000,
        })
      })

      expect(createBracket).toHaveBeenCalledWith({
        position_cycle_public_id: 'cycle-1',
        sl_price: 48000,
      })
    })
  })

  describe('useCreateTrailingStop', () => {
    it('calls createTrailingStop and invalidates queries', async () => {
      const responseBody = {
        type: 'execution_plan_response' as const,
        sequence_id: 1,
        public_id: 'ts-1',
        timestamp: '2026-04-13T00:00:00Z',
        session_id: 'sess-1',
        payload: {
          type: 'execution_plan' as const,
          sequence_id: 1,
          public_id: 'ts-1',
          timestamp: '2026-04-13T00:00:00Z',
          session_id: 'sess-1',
          plan_type: 'trailing_stop',
          status: 'armed',
          instrument_public_id: 'inst-1',
          exchange: 'kraken_futures',
          mode: 'paper',
          side: 'buy',
          total_quantity: 1.0,
          filled_quantity: 0,
          created_at: '2026-04-13T00:00:00Z',
          created_via: 'api',
          wallet_public_id: 'w-1',
          operator_public_id: null,
          params: { trailing_pct: 5 },
          position_cycle_public_id: 'cycle-1',
          parent_plan_public_id: null,
          last_error: null,
          idempotency_key: null,
        },
      }

      vi.mocked(createTrailingStop).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCreateTrailingStop(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          position_cycle_public_id: 'cycle-1',
          trailing_pct: 5,
        })
      })

      expect(createTrailingStop).toHaveBeenCalledWith({
        position_cycle_public_id: 'cycle-1',
        trailing_pct: 5,
      })
    })
  })

  describe('useTrailingStopForCycle', () => {
    it('fetches trailing stop state for a cycle', async () => {
      vi.mocked(getTrailingStopByCycle).mockResolvedValueOnce({
        type: 'message',
        payload: 'none',
      })

      const { result } = renderHook(() => useTrailingStopForCycle('cycle-1'), {
        wrapper: createWrapper(),
      })

      await vi.waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getTrailingStopByCycle).toHaveBeenCalledWith('cycle-1')
    })

    it('is disabled when cyclePublicId is undefined', () => {
      const { result } = renderHook(() => useTrailingStopForCycle(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })
  describe('authentication behavior', () => {
    it('usePositionsSummary does not fetch when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => usePositionsSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getPositions)).not.toHaveBeenCalled()
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>)
    })
  })
})
