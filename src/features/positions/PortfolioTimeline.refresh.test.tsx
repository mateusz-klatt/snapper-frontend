import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PortfolioTimeline } from './PortfolioTimeline'
import { getPortfolioPnlTimeline, type PortfolioPnlTimelineParams } from '../../lib/api/portfolio'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'
import { makeUserProfile } from '../../test/factories'
import type { PnlTimelinePointData, PnlTimelineResponse } from '../../types/api'

vi.mock('../../lib/api/portfolio', () => ({
  getPortfolioPnlTimeline: vi.fn(),
  getPortfolioPnlSeries: vi.fn(),
  getPortfolioAccounts: vi.fn(),
}))
vi.mock('../../hooks/queries/wallets', () => ({
  useWallets: () => ({
    data: {
      payload: [
        { public_id: 'wallet-a', is_paper: false },
        { public_id: 'wallet-b', is_paper: false },
      ],
    },
    isError: false,
  }),
}))
vi.mock('./PnlChart', () => ({
  PnlChart: ({
    points,
    valuationCcy,
  }: {
    points: PnlTimelinePointData[]
    valuationCcy: string
  }) => (
    <output data-testid='refresh-chart-values'>
      {points.map(point => point.net_pnl ?? 'withheld').join(',')} {valuationCcy}
    </output>
  ),
}))

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })

  return { promise, resolve, reject }
}

interface CapturedRequest {
  params: Readonly<PortfolioPnlTimelineParams>
  startedAt: string
  wallet: string
  response: Deferred<PnlTimelineResponse>
}

const requests: CapturedRequest[] = []

function response(request: CapturedRequest, net: number, incomplete = false): PnlTimelineResponse {
  const at = new Date(Math.floor(Date.parse(request.startedAt) / 60_000) * 60_000).toISOString()
  const point: PnlTimelinePointData = {
    point_time: at,
    realized_pnl: net,
    fee_pnl: 0,
    accrual_pnl: 0,
    unrealized_pnl: 0,
    net_pnl: net,
    equity: null,
    cash: null,
    position_value: null,
    drawdown: null,
    valuation_status: 'complete',
    incompleteness_reasons: [],
    per_instrument: [],
    attribution: [
      {
        origin: 'manual',
        strategy_name: null,
        realized_pnl: net,
        fee_pnl: 0,
        accrual_pnl: 0,
        unrealized_pnl: 0,
      },
    ],
  }
  const points = incomplete
    ? [
        point,
        {
          ...point,
          point_time: new Date(Date.parse(at) + 1).toISOString(),
          realized_pnl: null,
          fee_pnl: null,
          accrual_pnl: null,
          unrealized_pnl: null,
          net_pnl: null,
          valuation_status: 'incomplete' as const,
          attribution: [],
        },
      ]
    : [point]
  const stamp = {
    sequence_id: 1,
    public_id: 'synthetic-timeline',
    session_id: 'synthetic-api',
    timestamp: request.startedAt,
  }

  return {
    type: 'pnl_timeline',
    ...stamp,
    payload: {
      type: 'pnl_timeline',
      ...stamp,
      wallet_public_id: request.wallet,
      mode: request.params.mode === 'paper' ? 'paper' : 'live',
      granularity: request.params.granularity,
      valuation_ccy: request.params.valuationCcy,
      from_time: request.params.from,
      to_time: request.params.to ?? request.startedAt,
      as_of: request.params.asOf ?? request.startedAt,
      mark_source: 'synthetic-close',
      rate_sources: [],
      calc_version: 'synthetic',
      points,
      marker_limit: 500,
      markers_truncated: false,
      markers: [],
      execution_history: { status: 'as_recorded', corrections: [] },
      equity_coverage: {
        sampled: false,
        venue_scope: null,
        external_flows_adjusted: null,
        complete_minutes: 0,
        first_minute: null,
        last_minute: null,
        sample_calc_version: null,
        valuation_basis: null,
        converted_from: null,
        conversion_rate_source: null,
        conversion_withheld_minutes: 0,
        drawdown_withheld_reason: null,
      },
    },
  }
}

async function tick(milliseconds = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

async function settle(index: number, net: number, incomplete = false): Promise<void> {
  const request = requests[index]

  if (!request) throw new Error('Expected an owned timeline request')
  await act(async () => {
    request.response.resolve(response(request, net, incomplete))
    await request.response.promise
    await vi.advanceTimersByTimeAsync(0)
  })
}

describe('PortfolioTimeline real query refresh flow', () => {
  let client: QueryClient
  let view: ReturnType<typeof render> | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-07-20T12:00:59Z')
    vi.clearAllMocks()
    requests.length = 0
    useAuthStore.setState({
      isAuthenticated: true,
      user: makeUserProfile({ username: 'synthetic-user', public_id: 'user-a' }),
    })
    useAppStore.setState({
      asOf: null,
      isTimeTraveling: false,
      currentWalletPublicId: 'wallet-a',
      currentOperatorPublicId: 'operator-a',
    })
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    vi.mocked(getPortfolioPnlTimeline).mockImplementation(params => {
      const pending = deferred<PnlTimelineResponse>()

      requests.push({
        params,
        startedAt: new Date().toISOString(),
        wallet: useAppStore.getState().currentWalletPublicId ?? 'none',
        response: pending,
      })

      return pending.promise
    })
  })

  afterEach(async () => {
    view?.unmount()
    client.clear()
    for (const request of requests) request.response.resolve(response(request, 1))
    await Promise.allSettled(requests.map(request => request.response.promise))
    vi.useRealTimers()
  })

  const mount = (): void => {
    view = render(
      <QueryClientProvider client={client}>
        <PortfolioTimeline />
      </QueryClientProvider>
    )
  }

  it('keeps one near-boundary request and coalesces the newest minute while old incomplete data stays visibly refreshing', async () => {
    mount()
    await tick()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.params.from).toBe('2026-07-19T12:00:00.000Z')
    await tick(121_000)
    expect(requests).toHaveLength(1)
    await settle(0, 12, true)
    expect(requests).toHaveLength(2)
    expect(requests[1]?.params.from).toBe('2026-07-19T12:03:00.000Z')
    expect(screen.getByTestId('refresh-chart-values')).toHaveTextContent('12,withheld USD')
    expect(screen.getByTestId('pnl-refreshing')).toBeInTheDocument()
    expect(screen.getByTestId('pnl-incomplete-badge')).toHaveTextContent('Incomplete points: 1')
    await settle(1, 34)
    expect(requests).toHaveLength(2)
    expect(screen.getByTestId('refresh-chart-values')).toHaveTextContent('34 USD')
    expect(screen.queryByTestId('pnl-refreshing')).not.toBeInTheDocument()
  })

  it('starts a selected time window immediately and ignores an old-window completion', async () => {
    mount()
    await tick()
    fireEvent.change(screen.getByLabelText('Select timeline window'), { target: { value: '7d' } })
    await tick()
    expect(requests).toHaveLength(2)
    expect(requests[1]?.params.from).toBe('2026-07-13T12:00:00.000Z')
    await settle(0, 99)
    expect(screen.queryByTestId('refresh-chart-values')).not.toBeInTheDocument()
    await settle(1, 7)
    expect(screen.getByTestId('refresh-chart-values')).toHaveTextContent('7 USD')
  })

  it('isolates wallet changes from an earlier pending request', async () => {
    mount()
    await tick()
    act(() => useAppStore.setState({ currentWalletPublicId: 'wallet-b' }))
    await tick()
    expect(requests).toHaveLength(2)
    expect(requests[1]?.wallet).toBe('wallet-b')
    await settle(0, 99)
    expect(screen.queryByTestId('refresh-chart-values')).not.toBeInTheDocument()
    await settle(1, 23)
    expect(screen.getByTestId('refresh-chart-values')).toHaveTextContent('23 USD')
  })

  it('retires successful and pending values across logout/login with identical IDs', async () => {
    mount()
    await tick()
    await settle(0, 12)
    await tick(1000)
    expect(requests).toHaveLength(2)
    act(() => useAuthStore.setState({ isAuthenticated: false }))
    act(() => useAuthStore.setState({ isAuthenticated: true }))
    await tick()
    expect(requests).toHaveLength(3)
    expect(screen.queryByTestId('refresh-chart-values')).not.toBeInTheDocument()
    await settle(1, 99)
    expect(screen.queryByTestId('refresh-chart-values')).not.toBeInTheDocument()
    await settle(2, 24)
    expect(screen.getByTestId('refresh-chart-values')).toHaveTextContent('24 USD')
  })

  it('keeps frozen knowledge time isolated and stops moving-minute requests', async () => {
    mount()
    await tick()
    act(() => useAppStore.getState().setAsOf('2026-07-10T08:30:00Z'))
    await tick()
    expect(requests).toHaveLength(2)
    expect(requests[1]?.params).toEqual(
      expect.objectContaining({
        asOf: '2026-07-10T08:30:00Z',
        to: '2026-07-10T08:30:00.000Z',
        from: '2026-07-09T08:30:00.000Z',
      })
    )
    await settle(0, 99)
    expect(screen.queryByTestId('refresh-chart-values')).not.toBeInTheDocument()
    await settle(1, 7)
    await tick(180_000)
    expect(requests).toHaveLength(2)
    expect(screen.getByTestId('refresh-chart-values')).toHaveTextContent('7 USD')
  })

  it('unblocks the newest requested minute after an error instead of holding the old anchor forever', async () => {
    mount()
    await tick()
    await tick(121_000)
    const first = requests[0]

    if (!first) throw new Error('Expected the initial owned request')
    await act(async () => {
      first.response.reject(new Error('HTTP 503'))
      await first.response.promise.catch(() => undefined)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(requests).toHaveLength(2)
    expect(requests[1]?.params.from).toBe('2026-07-19T12:03:00.000Z')
    await settle(1, 31)
    expect(screen.getByTestId('refresh-chart-values')).toHaveTextContent('31 USD')
  })
})
