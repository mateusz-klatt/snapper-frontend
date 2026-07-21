import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePortfolioAccounts, usePortfolioPnlSeries, usePortfolioPnlTimeline } from './portfolio'
import {
  getPortfolioAccounts,
  getPortfolioPnlSeries,
  getPortfolioPnlTimeline,
} from '../../lib/api/portfolio'
import { queryKeys } from './keys'
import type {
  PnlSeriesResponse,
  PnlTimelineResponse,
  PortfolioAccountStateListResponse,
} from '../../types/api'

const listResponse: PortfolioAccountStateListResponse = {
  type: 'portfolio_account_state_list',
  sequence_id: 0,
  public_id: 'p-1',
  timestamp: '2026-07-13T00:00:00Z',
  session_id: 's-1',
  payload: [
    {
      type: 'portfolio_account_state',
      sequence_id: 0,
      public_id: 'acct-1',
      timestamp: '2026-07-13T00:00:00Z',
      session_id: 's-1',
      wallet_public_id: 'w-1',
      exchange: 'kraken',
      mode: 'live',
      sync_status: 'observed',
      effective_status: 'observed',
      is_authoritative: true,
      balance_status: 'observed',
      position_status: 'not_applicable',
      valuation_status: 'native_only',
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
}

const pnlSeriesResponse: PnlSeriesResponse = {
  type: 'pnl_series',
  sequence_id: 0,
  public_id: 'pnl-1',
  timestamp: '2026-07-13T12:00:00Z',
  session_id: 's-1',
  payload: {
    type: 'pnl_series',
    sequence_id: 0,
    public_id: 'pnl-data-1',
    timestamp: '2026-07-13T12:00:00Z',
    session_id: 's-1',
    wallet_public_id: 'w-1',
    mode: 'live',
    granularity: '5m',
    valuation_ccy: 'USD',
    from_time: '2026-07-12T12:00:00Z',
    to_time: '2026-07-13T12:00:00Z',
    as_of: '2026-07-13T12:00:00Z',
    mark_source: 'close',
    calc_version: 'v1',
    points: [],
  },
}

const pnlTimelineResponse: PnlTimelineResponse = {
  ...pnlSeriesResponse,
  type: 'pnl_timeline',
  payload: {
    ...pnlSeriesResponse.payload,
    type: 'pnl_timeline',
    marker_limit: 500,
    markers_truncated: false,
    markers: [],
  },
}

const control = vi.hoisted(() => ({
  asOf: null as string | null,
  operatorPublicId: null as string | null,
  walletPublicId: null as string | null,
  isAuthenticated: true,
}))

vi.mock('../../lib/api/portfolio', () => ({
  getPortfolioAccounts: vi.fn(() => Promise.resolve(listResponse)),
  getPortfolioPnlSeries: vi.fn(() => Promise.resolve(pnlSeriesResponse)),
  getPortfolioPnlTimeline: vi.fn(() => Promise.resolve(pnlTimelineResponse)),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: control.isAuthenticated,
    user: { public_id: 'u-1', role: 'admin' },
  })),
}))

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn(
    (
      selector: (s: {
        asOf: string | null
        currentOperatorPublicId: string | null
        currentWalletPublicId: string | null
      }) => unknown
    ) =>
      selector({
        asOf: control.asOf,
        currentOperatorPublicId: control.operatorPublicId,
        currentWalletPublicId: control.walletPublicId,
      })
  ),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('usePortfolioAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    control.asOf = null
    control.operatorPublicId = null
    control.walletPublicId = null
    control.isAuthenticated = true
  })

  it('returns the account payload for the current scope', async () => {
    const { result } = renderHook(() => usePortfolioAccounts(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getPortfolioAccounts).toHaveBeenCalledTimes(1)
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.wallet_public_id).toBe('w-1')
  })

  it('runs the live safety-net poll every 60 seconds', async () => {
    vi.useFakeTimers()

    try {
      renderHook(() => usePortfolioAccounts(), { wrapper: createWrapper() })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(getPortfolioAccounts).toHaveBeenCalledTimes(1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(59_999)
      })
      expect(getPortfolioAccounts).toHaveBeenCalledTimes(1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(getPortfolioAccounts).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('disables the safety-net poll while time traveling', async () => {
    vi.useFakeTimers()
    control.asOf = '2026-07-13T00:00:00Z'

    try {
      renderHook(() => usePortfolioAccounts(), { wrapper: createWrapper() })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(getPortfolioAccounts).toHaveBeenCalledTimes(1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(180_000)
      })
      expect(getPortfolioAccounts).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('usePortfolioPnlSeries', () => {
  const params = {
    from: '2026-07-12T12:00:00Z',
    to: '2026-07-13T12:00:00Z',
    granularity: '5m' as const,
    mode: 'live',
    valuationCcy: 'PLN',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    control.asOf = '2026-07-13T12:00:00Z'
    control.operatorPublicId = 'op-1'
    control.walletPublicId = 'w-1'
    control.isAuthenticated = true
  })

  it('returns the series at the global time-travel horizon', async () => {
    const { result } = renderHook(() => usePortfolioPnlSeries(params), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getPortfolioPnlSeries).toHaveBeenCalledWith({
      mode: 'live',
      granularity: '5m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      asOf: '2026-07-13T12:00:00Z',
      valuationCcy: 'PLN',
    })
    expect(result.current.data?.valuation_ccy).toBe('USD')
    expect(
      queryKeys.portfolioPnlSeries(
        control.asOf,
        control.operatorPublicId,
        control.walletPublicId,
        params.from,
        params.to,
        params.granularity,
        params.mode,
        params.valuationCcy
      )
    ).toEqual([
      'portfolio',
      'pnl',
      'series',
      '2026-07-13T12:00:00Z',
      'op-1',
      'w-1',
      '2026-07-12T12:00:00Z',
      '2026-07-13T12:00:00Z',
      '5m',
      'live',
      'PLN',
    ])
  })

  it('stays disabled without a selected wallet', () => {
    control.walletPublicId = null

    const { result } = renderHook(() => usePortfolioPnlSeries(params), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getPortfolioPnlSeries).not.toHaveBeenCalled()
  })

  it('stays disabled while unauthenticated', () => {
    control.isAuthenticated = false

    const { result } = renderHook(() => usePortfolioPnlSeries(params), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getPortfolioPnlSeries).not.toHaveBeenCalled()
  })
})

describe('usePortfolioPnlTimeline', () => {
  const params = {
    from: '2026-07-12T12:00:00Z',
    to: '2026-07-13T12:00:00Z',
    granularity: '5m' as const,
    mode: 'live',
    valuationCcy: 'EUR',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    control.asOf = '2026-07-13T12:00:00Z'
    control.operatorPublicId = 'op-1'
    control.walletPublicId = 'w-1'
    control.isAuthenticated = true
  })

  it('returns the timeline at the global time-travel horizon', async () => {
    const { result } = renderHook(() => usePortfolioPnlTimeline(params), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getPortfolioPnlTimeline).toHaveBeenCalledWith({
      mode: 'live',
      granularity: '5m',
      from: '2026-07-12T12:00:00Z',
      to: '2026-07-13T12:00:00Z',
      asOf: '2026-07-13T12:00:00Z',
      valuationCcy: 'EUR',
    })
    expect(result.current.data?.marker_limit).toBe(500)
    expect(
      queryKeys.portfolioPnlTimeline(
        control.asOf,
        control.operatorPublicId,
        control.walletPublicId,
        params.from,
        params.to,
        params.granularity,
        params.mode,
        params.valuationCcy
      )
    ).toEqual([
      'portfolio',
      'pnl',
      'timeline',
      '2026-07-13T12:00:00Z',
      'op-1',
      'w-1',
      '2026-07-12T12:00:00Z',
      '2026-07-13T12:00:00Z',
      '5m',
      'live',
      'EUR',
    ])
  })

  it('stays disabled without a selected wallet', () => {
    control.walletPublicId = null

    const { result } = renderHook(() => usePortfolioPnlTimeline(params), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getPortfolioPnlTimeline).not.toHaveBeenCalled()
  })

  it('stays disabled while unauthenticated', () => {
    control.isAuthenticated = false

    const { result } = renderHook(() => usePortfolioPnlTimeline(params), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getPortfolioPnlTimeline).not.toHaveBeenCalled()
  })

  it('stays disabled when its caller is waiting for wallet metadata', () => {
    const { result } = renderHook(() => usePortfolioPnlTimeline(params, false), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getPortfolioPnlTimeline).not.toHaveBeenCalled()
  })
})
