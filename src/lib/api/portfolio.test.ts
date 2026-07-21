import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import { getPortfolioAccounts, getPortfolioPnlSeries, getPortfolioPnlTimeline } from './portfolio'

const pnlSeriesResponse = {
  type: 'pnl_series' as const,
  sequence_id: 0,
  public_id: 'pnl-1',
  timestamp: '2026-07-13T12:00:00Z',
  session_id: 'test-sid',
  payload: {
    type: 'pnl_series' as const,
    sequence_id: 0,
    public_id: 'pnl-data-1',
    timestamp: '2026-07-13T12:00:00Z',
    session_id: 'test-sid',
    wallet_public_id: 'w-1',
    mode: 'live',
    granularity: '5m',
    valuation_ccy: 'USD',
    from_time: '2026-07-12T12:00:00Z',
    to_time: '2026-07-13T12:00:00Z',
    as_of: '2026-07-13T12:00:00Z',
    mark_source: 'close',
    rate_sources: [
      {
        source_currency: 'EUR',
        valuation_currency: 'USD',
        base_currency: 'EUR',
        quote_currency: 'USD',
        exchange: 'kraken',
      },
    ],
    calc_version: 'v1',
    points: [
      {
        point_time: '2026-07-13T11:55:00Z',
        realized_pnl: null,
        fee_pnl: null,
        accrual_pnl: null,
        unrealized_pnl: null,
        net_pnl: null,
        valuation_status: 'incomplete' as const,
        per_instrument: [
          {
            instrument_public_id: 'instrument-1',
            realized_pnl: null,
            fee_pnl: null,
            accrual_pnl: null,
            unrealized_pnl: null,
          },
        ],
        attribution: [
          {
            origin: 'unattributed' as const,
            strategy_name: null,
            realized_pnl: null,
            fee_pnl: null,
            accrual_pnl: null,
            unrealized_pnl: null,
          },
        ],
      },
      {
        point_time: '2026-07-13T12:00:00Z',
        realized_pnl: 12.5,
        fee_pnl: -1.25,
        accrual_pnl: 0.5,
        unrealized_pnl: 3.25,
        net_pnl: 15,
        valuation_status: 'complete' as const,
        per_instrument: [
          {
            instrument_public_id: 'instrument-1',
            realized_pnl: 12.5,
            fee_pnl: -1.25,
            accrual_pnl: 0.5,
            unrealized_pnl: 3.25,
          },
        ],
        attribution: [
          {
            origin: 'plan' as const,
            strategy_name: 'momentum',
            realized_pnl: 12.5,
            fee_pnl: -1.25,
            accrual_pnl: 0.5,
            unrealized_pnl: 3.25,
          },
        ],
      },
    ],
  },
}

const pnlTimelineResponse = {
  ...pnlSeriesResponse,
  type: 'pnl_timeline' as const,
  payload: {
    ...pnlSeriesResponse.payload,
    type: 'pnl_timeline' as const,
    marker_limit: 500,
    markers_truncated: false,
    markers: [
      {
        kind: 'signal' as const,
        marker_time: '2026-07-13T11:54:00Z',
        instrument_public_id: 'instrument-1',
        side: 'buy',
        strategy_name: 'momentum',
        strength: 0.8,
        reason: 'threshold crossed',
        price: null,
        signal_public_id: 'signal-1',
        outcome: 'no_fill' as const,
        status: 'no_fill' as const,
      },
      {
        kind: 'fill' as const,
        marker_time: '2026-07-13T11:55:00Z',
        instrument_public_id: 'instrument-1',
        side: 'buy',
        size: 0.5,
        price: 101.25,
        execution_public_id: 'execution-priced',
        order_public_id: 'order-priced',
        outcome: 'executed' as const,
        status: 'filled',
      },
      {
        kind: 'fill' as const,
        marker_time: '2026-07-13T11:56:00Z',
        instrument_public_id: 'instrument-2',
        side: 'sell',
        size: 0.25,
        price: null,
        execution_public_id: 'execution-withheld',
        order_public_id: 'order-withheld',
        outcome: 'executed' as const,
        status: 'filled',
      },
    ],
  },
}

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

describe('portfolio API', () => {
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

  it('getPortfolioAccounts fetches /api/portfolio/accounts and returns the payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'portfolio_account_state_list',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2026-07-13T00:00:00Z',
        session_id: 'test-sid',
        payload: [
          {
            type: 'portfolio_account_state',
            sequence_id: 0,
            public_id: 'acct-1',
            timestamp: '2026-07-13T00:00:00Z',
            session_id: 'test-sid',
            wallet_public_id: 'w-1',
            exchange: 'kraken',
            mode: 'live',
            sync_status: 'observed',
            effective_status: 'observed',
            is_authoritative: true,
            balance_status: 'observed',
            position_status: 'not_applicable',
            valuation_status: 'native_only',
            balances: [{ currency: 'USD', total: 100, free: 100, used: 0 }],
            open_positions: null,
            balance_observed_at: '2026-07-13T00:00:00Z',
            position_observed_at: null,
            authoritative_until: '2026-07-13T00:05:00Z',
            current_attempt_observation_id: 1,
            balance_payload_source_observation_id: 1,
            position_payload_source_observation_id: null,
            error: null,
            reconciliation: {
              method: null,
              evaluation_status: null,
              effective_status: 'incomplete',
              is_authoritative: false,
              evaluated_at: null,
              current_observation_id: null,
              last_full_observation_id: null,
              detail_source_observation_id: null,
              last_full_outcome: null,
              consecutive_full_mismatches: 0,
              anchor_public_id: null,
              venue_account_state_public_id: null,
              venue_account_observation_id: null,
              source_watermark_kind: null,
              source_watermark: null,
              expected: null,
              actual: null,
              difference: null,
              tolerance: null,
              reconciled_at: null,
              authoritative_until: null,
              error: null,
              open_drift_episode: null,
            },
          },
        ],
        count: 1,
      }),
    })

    const result = await getPortfolioAccounts()

    expect(result.payload).toHaveLength(1)
    expect(result.payload[0]?.exchange).toBe('kraken')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/portfolio/accounts'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('getPortfolioPnlSeries sends the explicit as_of horizon once', async () => {
    apiClient.setTimeTravelAsOf('2026-07-14T12:00:00Z')
    apiClient.setOperatorScope('op-1')
    apiClient.setWalletScope('w-1')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => pnlSeriesResponse,
    })

    const result = await getPortfolioPnlSeries({
      mode: 'live',
      granularity: '5m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      asOf: '2026-07-13T12:00:00Z',
      valuationCcy: 'PLN',
    })
    const requestUrl = new URL(String(mockFetch.mock.calls[0]?.[0]), 'http://localhost')

    expect(result.payload.points[0]?.net_pnl).toBeNull()
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      wallet_public_id: 'w-1',
      operator_public_id: 'op-1',
      mode: 'live',
      granularity: '5m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      as_of: '2026-07-13T12:00:00Z',
      valuation_ccy: 'PLN',
    })
    expect(requestUrl.searchParams.getAll('wallet_public_id')).toEqual(['w-1'])
    expect(requestUrl.searchParams.getAll('operator_public_id')).toEqual(['op-1'])
    expect(requestUrl.searchParams.getAll('as_of')).toEqual(['2026-07-13T12:00:00Z'])
  })

  it('getPortfolioPnlSeries omits absent optional scope parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => pnlSeriesResponse,
    })

    await getPortfolioPnlSeries({
      mode: 'live',
      granularity: '1m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      asOf: null,
      valuationCcy: 'USD',
    })
    const requestUrl = new URL(String(mockFetch.mock.calls[0]?.[0]), 'http://localhost')

    expect(requestUrl.searchParams.has('operator_public_id')).toBe(false)
    expect(requestUrl.searchParams.has('as_of')).toBe(false)
    expect(requestUrl.searchParams.get('valuation_ccy')).toBe('USD')
  })

  it('getPortfolioPnlTimeline validates markers and sends the timeline window', async () => {
    apiClient.setTimeTravelAsOf('2026-07-14T12:00:00Z')
    apiClient.setOperatorScope('op-1')
    apiClient.setWalletScope('w-1')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => pnlTimelineResponse,
    })

    const result = await getPortfolioPnlTimeline({
      mode: 'live',
      granularity: '5m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      asOf: '2026-07-13T12:00:00Z',
      valuationCcy: 'EUR',
    })
    const requestUrl = new URL(String(mockFetch.mock.calls[0]?.[0]), 'http://localhost')

    expect(result.payload.markers[0]).toMatchObject({
      kind: 'signal',
      outcome: 'no_fill',
      signal_public_id: 'signal-1',
    })
    expect(result.payload.markers[1]).toMatchObject({
      kind: 'fill',
      price: 101.25,
      execution_public_id: 'execution-priced',
    })
    expect(result.payload.markers[2]).toMatchObject({
      kind: 'fill',
      price: null,
      execution_public_id: 'execution-withheld',
    })
    expect(result.payload.rate_sources).toEqual([
      {
        source_currency: 'EUR',
        valuation_currency: 'USD',
        base_currency: 'EUR',
        quote_currency: 'USD',
        exchange: 'kraken',
      },
    ])
    expect(requestUrl.pathname).toBe('/api/portfolio/pnl/timeline')
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      wallet_public_id: 'w-1',
      operator_public_id: 'op-1',
      mode: 'live',
      granularity: '5m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      as_of: '2026-07-13T12:00:00Z',
      valuation_ccy: 'EUR',
    })
    expect(requestUrl.searchParams.getAll('as_of')).toEqual(['2026-07-13T12:00:00Z'])
  })

  it('getPortfolioPnlTimeline accepts backend-shaped attribution buckets', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => pnlTimelineResponse,
    })

    const result = await getPortfolioPnlTimeline({
      mode: 'live',
      granularity: '5m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      asOf: null,
      valuationCcy: 'USD',
    })

    expect(result.payload.points[1]?.attribution).toEqual([
      {
        origin: 'plan',
        strategy_name: 'momentum',
        realized_pnl: 12.5,
        fee_pnl: -1.25,
        accrual_pnl: 0.5,
        unrealized_pnl: 3.25,
      },
    ])
  })
})
