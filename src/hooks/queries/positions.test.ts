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
import type { PositionData } from '../../types/api'
import { useAuth } from '../../stores/auth'
import { useAppStore } from '../../stores/app'
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
  getTrailingStopByCycle: vi.fn(() => Promise.resolve(envelope('message', { payload: 'none' }))),
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
    averagePrice: p.average_price ?? null,
    unrealizedPnl: p.unrealized_pnl ?? null,
    realizedPnl: p.realized_pnl ?? 0,
    markPrice: p.mark_price ?? null,
    markedAt: p.marked_at ? new Date(p.marked_at) : null,
    sourceVenueEventId: p.source_venue_event_id ?? null,
  })),
}))

const positionFixture = (overrides: Partial<PositionData> = {}): PositionData => ({
  type: 'position',
  sequence_id: 1,
  public_id: 'position-1',
  timestamp: '2026-06-20T12:00:00Z',
  session_id: 'test-session',
  instrument: 'BTC-USD',
  instrument_public_id: 'instrument-1',
  exchange: 'kraken',
  mode: 'paper',
  wallet_public_id: 'wallet-1',
  quantity: 1,
  average_price: 100,
  mark_price: 120,
  unrealized_pnl: 20,
  realized_pnl: 0,
  ...overrides,
})

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
    it('preserves a missing open-position mark and unrealized value as unknown aggregates', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [positionFixture({ mark_price: null, unrealized_pnl: null })],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.count).toBe(1)
      expect(result.current.data?.incompleteValuation).toBe(true)
      expect(result.current.data?.totalUnrealizedPnl).toBeNull()
      expect(result.current.data?.totalPnL).toBeNull()
      expect(result.current.data?.totalValue).toBeNull()
      expect(result.current.data?.pnlPercent).toBeNull()
    })

    it.each([
      [positionFixture({ instrument: 'BTC-USD' }), positionFixture({ instrument: 'ETH-EUR' })],
      [positionFixture({ exchange: 'kraken_futures', instrument: 'BTC-USD-PERP' })],
      [positionFixture({ exchange: 'kraken_futures', instrument: 'BTC-USD' })],
    ])(
      'does not invent common-currency aggregates or derivative contract economics (%j)',
      async (...positions) => {
        vi.mocked(getPositions).mockResolvedValueOnce(
          envelope('position_list', { payload: positions, count: positions.length }) as never
        )
        const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data?.count).toBe(positions.length)
        expect(result.current.data?.totalUnrealizedPnl).toBeNull()
        expect(result.current.data?.longCost).toBeNull()
        expect(result.current.data?.totalValue).toBeNull()
        expect(result.current.data?.pnlPercent).toBeNull()
      }
    )

    it('polls latest-state positions every five seconds', async () => {
      vi.useFakeTimers()

      try {
        renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0)
        })
        expect(getPositions).toHaveBeenCalledTimes(1)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5_000)
        })
        expect(getPositions).toHaveBeenCalledTimes(2)
      } finally {
        vi.useRealTimers()
      }
    })
    it('disables latest-state polling while time traveling', async () => {
      vi.useFakeTimers()
      act(() => {
        useAppStore.setState({ asOf: '2026-01-01T00:00:00Z' })
      })

      try {
        renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0)
        })
        expect(getPositions).toHaveBeenCalledTimes(1)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(6_000)
        })
        expect(getPositions).toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
        act(() => {
          useAppStore.setState({ asOf: null })
        })
      }
    })
    it.each([
      ['quantity', Number.NaN],
      ['quantity', Number.POSITIVE_INFINITY],
      ['quantity', Number.NEGATIVE_INFINITY],
      ['average_price', null],
      ['average_price', Number.NaN],
      ['average_price', Number.POSITIVE_INFINITY],
      ['mark_price', null],
      ['mark_price', Number.NaN],
      ['mark_price', Number.NEGATIVE_INFINITY],
      ['unrealized_pnl', null],
      ['unrealized_pnl', Number.NaN],
      ['unrealized_pnl', Number.POSITIVE_INFINITY],
      ['realized_pnl', Number.NaN],
      ['realized_pnl', Number.NEGATIVE_INFINITY],
    ] as const)('flags invalid open-position valuation data (%s)', async (field, value) => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [positionFixture({ [field]: value })],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.incompleteValuation).toBe(true)
      expect(result.current.data?.count).toBe(1)
      expect(result.current.data?.totalUnrealizedPnl).toBeNull()
      expect(result.current.data?.totalValue).toBeNull()
      expect(result.current.data?.pnlPercent).toBeNull()
    })

    it('does not confuse complete marks with an authoritative aggregate valuation basis', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [positionFixture(), positionFixture({ public_id: 'position-2', quantity: -1 })],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({
        count: 2,
        instruments: ['BTC-USD'],
        incompleteValuation: false,
        totalValue: null,
        totalPnL: null,
        totalUnrealizedPnl: null,
        totalRealizedPnl: null,
        longCost: null,
        shortCost: null,
        totalExposure: null,
        pnlPercent: null,
      })
    })

    it('preserves count and unknown aggregates when switching to all-wallet scope', async () => {
      const original = useAppStore.getState()

      useAppStore.setState({
        currentWalletPublicId: 'wallet-1',
        currentOperatorPublicId: 'operator-1',
        asOf: null,
      })
      vi.mocked(getPositions)
        .mockResolvedValueOnce(
          envelope('position_list', { payload: [positionFixture()], count: 1 }) as never
        )
        .mockResolvedValueOnce(
          envelope('position_list', {
            payload: [
              positionFixture(),
              positionFixture({
                public_id: 'position-2',
                instrument: 'ETH-EUR',
                wallet_public_id: 'wallet-2',
              }),
            ],
            count: 2,
          }) as never
        )

      try {
        const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.data?.count).toBe(1))
        act(() =>
          useAppStore.setState({ currentWalletPublicId: null, currentOperatorPublicId: null })
        )
        await waitFor(() => expect(result.current.data?.count).toBe(2))
        expect(result.current.data?.instruments).toEqual(['BTC-USD', 'ETH-EUR'])
        expect(result.current.data?.totalValue).toBeNull()
        expect(result.current.data?.totalUnrealizedPnl).toBeNull()
      } finally {
        useAppStore.setState({
          currentWalletPublicId: original.currentWalletPublicId,
          currentOperatorPublicId: original.currentOperatorPublicId,
          asOf: original.asOf,
        })
      }
    })

    it('keeps empty-portfolio counts while leaving monetary basis unknown', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', { payload: [], count: 0 }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.count).toBe(0)
      expect(result.current.data?.instruments).toEqual([])
      expect(result.current.data?.incompleteValuation).toBe(false)
      expect(result.current.data?.totalValue).toBeNull()
      expect(result.current.data?.pnlPercent).toBeNull()
    })

    it('returns null when positions data is unavailable', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(null as never)
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeNull()
    })
    it('does not warn about absent marks on a flat position or divide by zero', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            positionFixture({
              quantity: 0,
              average_price: null,
              mark_price: null,
              unrealized_pnl: null,
            }),
          ],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.incompleteValuation).toBe(false)
      expect(result.current.data?.count).toBe(1)
      expect(result.current.data?.pnlPercent).toBeNull()
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
        sequence_id: ENV.seq,
        public_id: ENV.pid,
        timestamp: ENV.ts,
        session_id: ENV.sid,
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
