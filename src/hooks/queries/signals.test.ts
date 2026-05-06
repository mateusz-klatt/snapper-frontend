import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLatestSignals } from './signals'
import { getSignals } from '../../lib/api/signals'

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

vi.mock('../../lib/api/signals', () => ({
  getSignals: vi.fn(() => Promise.resolve(envelope('signal_list', { payload: [], count: 0 }))),
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

describe('signals queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useLatestSignals', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useLatestSignals(10), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('uses default limit of 10', async () => {
      const { result } = renderHook(() => useLatestSignals(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('sorts signals by timestamp and applies limit', async () => {
      vi.mocked(getSignals).mockResolvedValueOnce(
        envelope('signal_list', {
          payload: [
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'buy',
              strength: 0.5,
              reason: 'oldest',
              strategyName: 'test',
              price: 50000,
              firedAt: new Date('2026-01-15T10:00:00Z'),
            },
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'buy',
              strength: 0.6,
              reason: 'newest',
              strategyName: 'test',
              price: 50100,
              firedAt: new Date('2026-01-15T12:00:00Z'),
            },
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'sell',
              strength: 0.4,
              reason: 'middle',
              strategyName: 'test',
              price: 49900,
              firedAt: new Date('2026-01-15T11:00:00Z'),
            },
          ],
          count: 3,
        }) as never
      )
      const { result } = renderHook(() => useLatestSignals(2), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.[0]?.reason).toBe('newest')
      expect(result.current.data?.[1]?.reason).toBe('middle')
    })
    it('handles signals with undefined timestamp in sorting', async () => {
      vi.mocked(getSignals).mockResolvedValueOnce(
        envelope('signal_list', {
          payload: [
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'buy',
              strength: 0.5,
              reason: 'with-timestamp',
              strategyName: 'test',
              price: 50000,
              firedAt: new Date('2026-01-15T10:00:00Z'),
            },
            {
              exchange: 'kraken',
              instrument: 'ETH/USD',
              side: 'sell',
              strength: 0.6,
              reason: 'no-timestamp',
              strategyName: 'test',
              price: 3000,
              firedAt: undefined,
            },
            {
              exchange: 'kraken',
              instrument: 'SOL/USD',
              side: 'buy',
              strength: 0.4,
              reason: 'newer-timestamp',
              strategyName: 'test',
              price: 100,
              firedAt: new Date('2026-01-15T12:00:00Z'),
            },
          ],
          count: 3,
        }) as never
      )
      const { result } = renderHook(() => useLatestSignals(3), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toHaveLength(3)
      expect(result.current.data?.[0]?.reason).toBe('newer-timestamp')
      expect(result.current.data?.[1]?.reason).toBe('with-timestamp')
      expect(result.current.data?.[2]?.reason).toBe('no-timestamp')
    })
  })
})
