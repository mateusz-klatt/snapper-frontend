import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import {
  getCandles,
  getExchanges,
  getExchangeInstruments,
  getExchangeInstrumentsDetail,
  getRelatedInstruments,
} from './market'

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

describe('market API methods', () => {
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

  it('getCandles returns candle data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'candle_list',
        session_id: '',
        sequence_id: 0,
        public_id: 'env-pid',
        timestamp: '2024-01-01T00:00:00Z',
        payload: [
          {
            type: 'candle',
            session_id: '',
            sequence_id: 0,
            public_id: 'cdl-1',
            timestamp: '2024-01-01T00:00:00Z',
            instrument: 'BTC/USD',
            exchange: 'kraken',
            timeframe: '1h',
            open_at: '2024-01-01T00:00:00Z',
            open: 1,
            high: 1.1,
            low: 0.9,
            close: 1.05,
            volume: 1000,
          },
        ],
        count: 1,
      }),
    })
    const result = await getCandles('BTC/USD', 'kraken', '1h', 50)

    expect(result).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('instrument=BTC%2FUSD'),
      expect.any(Object)
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('exchange=kraken'),
      expect.any(Object)
    )
  })
  it('getCandles returns empty array when payload is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'candle_list',
        session_id: '',
        sequence_id: 0,
        public_id: 'env-pid',
        timestamp: '2024-01-01T00:00:00Z',
        payload: [],
        count: 0,
      }),
    })
    const result = await getCandles('BTC/USD', 'kraken')

    expect(result).toEqual([])
  })
  it('getCandles returns empty array when items is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'candle_list',
        session_id: '',
        sequence_id: 0,
        public_id: 'env-pid',
        timestamp: '2024-01-01T00:00:00Z',
        count: 0,
      }),
    })
    const result = await getCandles('BTC/USD', 'kraken', '1h', 50)

    expect(result).toEqual([])
  })
  it('getCandles throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    })
    await expect(getCandles('BTC/USD', 'kraken')).rejects.toThrow('HTTP 500: Server Error')
  })
  it('getExchanges returns exchange list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'exchange_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: ['kraken', 'binance'],
        count: 2,
      }),
    })
    const result = await getExchanges()

    expect(result.payload).toEqual(['kraken', 'binance'])
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/exchanges'),
      expect.any(Object)
    )
  })
  it('getExchangeInstruments returns instruments for exchange', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'instrument_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: ['BTC/USD', 'ETH/USD'],
        count: 2,
      }),
    })
    const result = await getExchangeInstruments('kraken')

    expect(result.payload).toEqual(['BTC/USD', 'ETH/USD'])
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/exchanges/kraken/instruments'),
      expect.any(Object)
    )
  })
  it('getExchangeInstrumentsDetail returns capability-aware instrument rows', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'instrument_detail_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2026-04-21T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'instrument_detail',
            sequence_id: 0,
            public_id: 'row-1',
            timestamp: '2026-04-21T00:00:00Z',
            session_id: 'test-sid',
            instrument_public_id: 'inst-1',
            symbol_public_id: 'sym-1',
            symbol: 'MNQM6-CME',
            exchange: 'kraken_equities',
            can_trade: false,
            can_market_data: true,
            instrument_resolved: true,
            instrument_kind: 'future',
            expiry_at: '2026-06-19T20:00:00Z',
          },
        ],
        count: 1,
      }),
    })
    const result = await getExchangeInstrumentsDetail('kraken_equities')

    expect(result.payload).toHaveLength(1)
    expect(result.payload[0]?.symbol).toBe('MNQM6-CME')
    expect(result.payload[0]?.can_trade).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/exchanges/kraken_equities/instruments/detail'),
      expect.any(Object)
    )
  })
  it('getRelatedInstruments returns the grouped payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'related_instruments',
        sequence_id: 0,
        public_id: 'ri-env-1',
        timestamp: '2026-04-21T00:00:00Z',
        session_id: 'test-sid',
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
                  public_id: 'ri-1',
                  timestamp: '2026-04-21T00:00:00Z',
                  session_id: 'test-sid',
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
      }),
    })

    const result = await getRelatedInstruments('kraken', 'BTC-USD')

    expect(result.payload.underlying?.ticker).toBe('BTC')
    expect(result.payload.groups[0]?.items[0]?.is_selected).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/instruments/kraken/BTC-USD/related'),
      expect.any(Object)
    )
  })

  it('getRelatedInstruments percent-encodes reserved characters in path params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'related_instruments',
        sequence_id: 0,
        public_id: 'ri-env-1',
        timestamp: '2026-04-21T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          selected: { exchange: 'kraken', native_symbol: 'BTC/USD' },
          underlying: null,
          groups: [],
        },
      }),
    })

    await getRelatedInstruments('kraken', 'BTC/USD')

    const requestedUrl = mockFetch.mock.calls[0]?.[0]

    expect(requestedUrl).toContain('/api/instruments/kraken/BTC%2FUSD/related')
    expect(requestedUrl).not.toContain('/api/instruments/kraken/BTC/USD/related')
  })
})
