import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useCandles,
  useExchanges,
  useExchangeInstruments,
  useExchangeInstrumentsDetail,
  useRelatedInstruments,
} from './market'
import { useAuth } from '../../stores/auth'
import { getCandles, getExchangeInstruments, getRelatedInstruments } from '../../lib/api/market'

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
})
