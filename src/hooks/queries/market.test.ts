import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useAllConfiguredPairStats,
  useCachedCandles,
  useCachedPairStats,
  useCacheHealth,
  useCandles,
  useExchanges,
  useExchangeInstruments,
  useExchangeInstrumentsDetail,
  useRelatedInstruments,
  useTimeTravelCandles,
  useUnderlyings,
} from './market'
import { useAuth } from '../../stores/auth'
import {
  getAllConfiguredPairStats,
  getCachedCandles,
  getCachedPairStats,
  getCacheHealth,
  getCandles,
  getCandlesRange,
  getExchangeInstruments,
  getRelatedInstruments,
} from '../../lib/api/market'

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

vi.mock('../../lib/api/market', () => ({
  getCandles: vi.fn(() => Promise.resolve([])),
  getExchangeInstruments: vi.fn(() =>
    Promise.resolve(envelope('instrument_list', { payload: ['BTC/USD', 'ETH/USD'], count: 2 }))
  ),
  getRelatedInstruments: vi.fn(() =>
    Promise.resolve(
      envelope('related_instruments', {
        payload: {
          selected: { exchange: 'kraken', native_symbol: 'BTC-USD' },
          underlying: {
            public_id: 'ua-1',
            ticker: 'BTC',
            name: 'Bitcoin',
            asset_class: 'crypto',
            sector: null,
            description: null,
          },
          groups: [
            {
              relationship_type: 'exact',
              label: 'Same underlying',
              items: [
                {
                  type: 'related_instrument',
                  sequence_id: 1,
                  public_id: 'r-1',
                  timestamp: '2026-04-21T00:00:00Z',
                  session_id: 'sid',
                  instrument_public_id: 'inst-btc-kraken',
                  native_symbol: 'BTC-USD',
                  exchange: 'kraken',
                  asset_type: 'crypto',
                  relationship_type: 'exact',
                  contract_family: null,
                  is_selected: true,
                },
              ],
            },
          ],
        },
      })
    )
  ),
  getExchangeInstrumentsDetail: vi.fn(() =>
    Promise.resolve(
      envelope('instrument_detail_list', {
        payload: [
          {
            type: 'instrument_detail',
            sequence_id: 0,
            public_id: 'row-1',
            timestamp: '2026-04-21T00:00:00Z',
            session_id: 'sid',
            instrument_public_id: 'inst-1',
            symbol_public_id: 'sym-1',
            symbol: 'MNQM6-CME',
            exchange: 'kraken_equities',
            can_trade: false,
            can_market_data: true,
            instrument_kind: 'future',
            expiry_at: null,
          },
        ],
        count: 1,
      })
    )
  ),
  getExchanges: vi.fn(() =>
    Promise.resolve(envelope('exchange_list', { payload: ['kraken', 'binance'], count: 2 }))
  ),
  getUnderlyings: vi.fn(() =>
    Promise.resolve(
      envelope('underlying_asset_list', {
        payload: [
          {
            type: 'underlying_asset',
            sequence_id: 0,
            public_id: 'ua-btc',
            timestamp: '2026-04-21T00:00:00Z',
            session_id: 'sid',
            ticker: 'BTC',
            name: 'Bitcoin',
            asset_class: 'crypto',
            sector: null,
            description: null,
            instrument_count: 3,
          },
        ],
        count: 1,
      })
    )
  ),
  getCachedCandles: vi.fn(() =>
    Promise.resolve(
      envelope('cached_candles', {
        payload: { candles: [], sample_count: 0, is_warm: false, source: 'cache' },
      })
    )
  ),
  getCandlesRange: vi.fn(() => Promise.resolve([])),
  getCachedPairStats: vi.fn(() =>
    Promise.resolve(
      envelope('cached_stats', {
        payload: {
          left: 'kraken:BTC-USD',
          right: 'kraken:ETH-USD',
          pearson_r: null,
          pearson_n: 0,
          coint_t: null,
          coint_pvalue: null,
          coint_critical_values: null,
          computed_at: null,
          sample_count: 0,
          is_warm: false,
        },
      })
    )
  ),
  getCacheHealth: vi.fn(() =>
    Promise.resolve(
      envelope('cache_health', {
        payload: { instruments_cached: 0, pairs_cached: 0, persist_universe_size: 0 },
      })
    )
  ),
  getAllConfiguredPairStats: vi.fn(() =>
    Promise.resolve(
      envelope('listed_cached_stats', {
        payload: { count: 0, pairs: [] },
      })
    )
  ),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'admin' },
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

describe('market queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useTimeTravelCandles', () => {
    it('fetches a market-time window when all params are provided', async () => {
      const { result } = renderHook(
        () =>
          useTimeTravelCandles(
            'kraken',
            'BTC-USD',
            '1d',
            '2023-01-01T00:00:00Z',
            '2023-01-04T00:00:00Z',
            400
          ),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })
      expect(vi.mocked(getCandlesRange)).toHaveBeenCalledWith(
        'BTC-USD',
        'kraken',
        '1d',
        '2023-01-01T00:00:00Z',
        '2023-01-04T00:00:00Z',
        400
      )
    })

    it('does not fetch when the window bounds are null', async () => {
      vi.mocked(getCandlesRange).mockClear()
      const { result } = renderHook(
        () => useTimeTravelCandles('kraken', 'BTC-USD', '1d', null, null, 400),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCandlesRange)).not.toHaveBeenCalled()
    })

    it('does not fetch when exchange and symbol are null', async () => {
      vi.mocked(getCandlesRange).mockClear()
      const { result } = renderHook(
        () =>
          useTimeTravelCandles(
            null,
            null,
            '1d',
            '2023-01-01T00:00:00Z',
            '2023-01-04T00:00:00Z',
            400
          ),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCandlesRange)).not.toHaveBeenCalled()
    })

    it('does not fetch when explicitly disabled', async () => {
      vi.mocked(getCandlesRange).mockClear()
      const { result } = renderHook(
        () =>
          useTimeTravelCandles(
            'kraken',
            'BTC-USD',
            '1d',
            '2023-01-01T00:00:00Z',
            '2023-01-04T00:00:00Z',
            400,
            false
          ),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCandlesRange)).not.toHaveBeenCalled()
    })
  })

  describe('useCandles', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useCandles('EUR-USD', 'kraken', '1h'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('does not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useCandles('EUR-USD', 'kraken', '1h', 100, false), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
    })
  })
  describe('useExchanges', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useExchanges(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload).toEqual(['kraken', 'binance'])
    })
  })
  describe('useUnderlyings', () => {
    it('returns the underlying asset list when authenticated', async () => {
      const { result } = renderHook(() => useUnderlyings(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload).toHaveLength(1)
      expect(result.current.data?.payload[0]?.ticker).toBe('BTC')
      expect(result.current.data?.payload[0]?.public_id).toBe('ua-btc')
    })
  })
  describe('useExchangeInstruments', () => {
    it('returns data when exchange is provided', async () => {
      const { result } = renderHook(() => useExchangeInstruments('kraken'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload).toEqual(['BTC/USD', 'ETH/USD'])
    })
    it('does not fetch when exchange is null', async () => {
      const { result } = renderHook(() => useExchangeInstruments(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
      expect(vi.mocked(getExchangeInstruments)).not.toHaveBeenCalled()
    })
  })
  describe('useExchangeInstrumentsDetail', () => {
    it('returns capability rows when exchange is provided', async () => {
      const { result } = renderHook(() => useExchangeInstrumentsDetail('kraken_equities'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload).toHaveLength(1)
      expect(result.current.data?.payload[0]?.can_trade).toBe(false)
    })
    it('does not fetch when exchange is null', async () => {
      const { result } = renderHook(() => useExchangeInstrumentsDetail(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
    })
  })
  describe('useRelatedInstruments', () => {
    it('returns grouped payload when exchange + symbol provided', async () => {
      const { result } = renderHook(() => useRelatedInstruments('kraken', 'BTC-USD'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload.underlying?.ticker).toBe('BTC')
      expect(result.current.data?.payload.groups[0]?.items[0]?.is_selected).toBe(true)
    })
    it('does not fetch when exchange is null', async () => {
      const { result } = renderHook(() => useRelatedInstruments(null, 'BTC-USD'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
      expect(vi.mocked(getRelatedInstruments)).not.toHaveBeenCalled()
    })
    it('does not fetch when symbol is null', async () => {
      const { result } = renderHook(() => useRelatedInstruments('kraken', null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
      expect(vi.mocked(getRelatedInstruments)).not.toHaveBeenCalled()
    })
  })
  describe('authentication behavior', () => {
    it('useCandles does not fetch when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => useCandles('BTC/USD', 'kraken'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCandles)).not.toHaveBeenCalled()
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>)
    })
  })

  describe('useCachedCandles', () => {
    it('fetches when exchange and symbol are provided', async () => {
      const { result } = renderHook(() => useCachedCandles('kraken', 'BTC-USD', '1m', 100), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })
      expect(vi.mocked(getCachedCandles)).toHaveBeenCalledWith('kraken', 'BTC-USD', '1m', 100)
    })

    it('does not fetch when exchange is null', async () => {
      vi.mocked(getCachedCandles).mockClear()
      const { result } = renderHook(() => useCachedCandles(null, 'BTC-USD'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCachedCandles)).not.toHaveBeenCalled()
    })

    it('does not fetch when nativeSymbol is null', async () => {
      vi.mocked(getCachedCandles).mockClear()
      const { result } = renderHook(() => useCachedCandles('kraken', null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCachedCandles)).not.toHaveBeenCalled()
    })
  })

  describe('useCachedPairStats', () => {
    it('fetches when all four parameters are provided', async () => {
      const { result } = renderHook(
        () => useCachedPairStats('kraken', 'BTC-USD', 'kraken', 'ETH-USD'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })
      expect(vi.mocked(getCachedPairStats)).toHaveBeenCalled()
    })

    it('does not fetch when any leg is null', async () => {
      vi.mocked(getCachedPairStats).mockClear()
      const { result } = renderHook(() => useCachedPairStats('kraken', null, 'kraken', 'ETH-USD'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCachedPairStats)).not.toHaveBeenCalled()
    })

    it.each([
      [null, 'BTC-USD', 'kraken', 'ETH-USD'] as const,
      ['kraken', 'BTC-USD', null, 'ETH-USD'] as const,
      ['kraken', 'BTC-USD', 'kraken', null] as const,
      [null, null, null, null] as const,
    ])(
      'does not fetch when any single leg is null (a=%s sa=%s b=%s sb=%s)',
      async (a, sa, b, sb) => {
        vi.mocked(getCachedPairStats).mockClear()
        const { result } = renderHook(() => useCachedPairStats(a, sa, b, sb), {
          wrapper: createWrapper(),
        })

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })
        expect(vi.mocked(getCachedPairStats)).not.toHaveBeenCalled()
      }
    )
  })

  describe('useCacheHealth', () => {
    it('fetches when authenticated', async () => {
      const { result } = renderHook(() => useCacheHealth(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })
      expect(vi.mocked(getCacheHealth)).toHaveBeenCalled()
    })
  })

  describe('useAllConfiguredPairStats', () => {
    it('fetches when authenticated', async () => {
      vi.mocked(getAllConfiguredPairStats).mockClear()
      const { result } = renderHook(() => useAllConfiguredPairStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true)
      })
      expect(vi.mocked(getAllConfiguredPairStats)).toHaveBeenCalled()
    })

    it('does not fetch when explicitly disabled', async () => {
      vi.mocked(getAllConfiguredPairStats).mockClear()
      const { result } = renderHook(() => useAllConfiguredPairStats(false), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getAllConfiguredPairStats)).not.toHaveBeenCalled()
    })
  })
})
