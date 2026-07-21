import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PortfolioTimeline } from './PortfolioTimeline'
import { usePortfolioPnlTimeline } from '../../hooks/queries/portfolio'
import { useWallets } from '../../hooks/queries/wallets'
import type {
  PnlInstrumentContributionData,
  PnlTimelineData,
  PnlTimelineMarkerData,
  PnlTimelinePointData,
} from '../../types/api'

const scope = vi.hoisted(() => ({
  walletPublicId: 'wallet-1' as string | null,
  asOf: null as string | null,
}))

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn(
    (selector: (state: { currentWalletPublicId: string | null; asOf: string | null }) => unknown) =>
      selector({
        currentWalletPublicId: scope.walletPublicId,
        asOf: scope.asOf,
      })
  ),
}))

vi.mock('../../hooks/queries/portfolio', () => ({
  usePortfolioPnlTimeline: vi.fn(),
}))

vi.mock('../../hooks/queries/wallets', () => ({
  useWallets: vi.fn(),
}))

vi.mock('./PnlChart', () => ({
  PnlChart: ({
    points,
    markers,
    showMarkers,
    valuationCcy,
  }: {
    points: PnlTimelinePointData[]
    markers: PnlTimelineMarkerData[]
    showMarkers: boolean
    valuationCcy: string
  }) => (
    <div data-testid='mock-pnl-chart'>
      {`${points.length}:${markers.length}:${String(showMarkers)}:${valuationCcy}`}
    </div>
  ),
}))

vi.mock('./ContributionTable', () => ({
  ContributionTable: ({
    contributions,
    valuationCcy,
  }: {
    contributions: PnlInstrumentContributionData[]
    valuationCcy: string
  }) => (
    <div data-testid='mock-contribution-table'>
      {`${contributions.map(value => value.instrument_public_id).join(',')}:${valuationCcy}`}
    </div>
  ),
}))

const contribution: PnlInstrumentContributionData = {
  instrument_public_id: 'instrument-latest',
  realized_pnl: 2,
  fee_pnl: -1,
  accrual_pnl: 0,
  unrealized_pnl: 3,
}

const point = (
  pointTime: string,
  valuationStatus: 'complete' | 'incomplete',
  perInstrument: PnlInstrumentContributionData[] = []
): PnlTimelinePointData => ({
  point_time: pointTime,
  realized_pnl: valuationStatus === 'complete' ? 2 : null,
  fee_pnl: valuationStatus === 'complete' ? -1 : null,
  accrual_pnl: valuationStatus === 'complete' ? 0 : null,
  unrealized_pnl: valuationStatus === 'complete' ? 3 : null,
  net_pnl: valuationStatus === 'complete' ? 4 : null,
  valuation_status: valuationStatus,
  per_instrument: perInstrument,
})

const noFillSignal: PnlTimelineMarkerData = {
  kind: 'signal',
  marker_time: '2026-07-20T11:58:30Z',
  instrument_public_id: 'instrument-signal',
  side: 'buy',
  strategy_name: null,
  strength: 0.7,
  reason: 'candidate rejected before order',
  price: null,
  signal_public_id: 'signal-1',
  outcome: 'no_fill',
  status: 'no_fill',
}

const timeline = (
  points: PnlTimelinePointData[],
  markers: PnlTimelineMarkerData[] = [],
  markersTruncated = false
): PnlTimelineData => ({
  type: 'pnl_timeline',
  sequence_id: 1,
  public_id: 'timeline-1',
  timestamp: '2026-07-20T12:00:00Z',
  session_id: 'session-1',
  wallet_public_id: 'wallet-1',
  mode: 'live',
  granularity: '1m',
  valuation_ccy: 'USD',
  from_time: '2026-07-19T12:00:00Z',
  to_time: '2026-07-20T12:00:00Z',
  as_of: '2026-07-20T12:00:00Z',
  mark_source: 'test-marks',
  calc_version: 'test-version',
  points,
  marker_limit: 500,
  markers_truncated: markersTruncated,
  markers,
})

const mockQuery = (data: PnlTimelineData | undefined, isLoading = false, isError = false): void => {
  vi.mocked(usePortfolioPnlTimeline).mockReturnValue({ data, isLoading, isError } as never)
}

const mockWalletQuery = (
  wallets: { public_id: string; is_paper: boolean }[] | undefined,
  isError = false
): void => {
  vi.mocked(useWallets).mockReturnValue({
    data: wallets === undefined ? undefined : { payload: wallets },
    isError,
  } as never)
}

describe('PortfolioTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-20T12:00:00Z'))
    scope.walletPublicId = 'wallet-1'
    scope.asOf = null
    mockWalletQuery([{ public_id: 'wallet-1', is_paper: false }])
    mockQuery(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('prompts for a required wallet when no single wallet is selected', () => {
    scope.walletPublicId = null

    render(<PortfolioTimeline />)

    expect(screen.getByText('Select a wallet')).toBeInTheDocument()
    expect(screen.getByText('Choose a wallet to view its P&L timeline.')).toBeInTheDocument()
    expect(screen.queryByTestId('portfolio-timeline')).not.toBeInTheDocument()
  })

  it('renders the translated loading state', () => {
    mockQuery(undefined, true)

    render(<PortfolioTimeline />)

    expect(screen.getByRole('status')).toHaveAccessibleName('Loading...')
    expect(screen.getByText('Loading P&L timeline…')).toBeInTheDocument()
  })

  it('renders the translated error state', () => {
    mockQuery(undefined, false, true)

    render(<PortfolioTimeline />)

    expect(screen.getByText('Could not load P&L timeline')).toBeInTheDocument()
    expect(screen.getByText('Try again in a moment.')).toBeInTheDocument()
  })

  it('renders the translated empty state when the series has no points', () => {
    mockQuery(timeline([]))

    render(<PortfolioTimeline />)

    expect(screen.getByText('No P&L history')).toBeInTheDocument()
    expect(screen.getByText('No P&L points are available for this window.')).toBeInTheDocument()
  })

  it('renders the chart, latest contributions, valuation currency, and incomplete count', () => {
    mockQuery(
      timeline([
        point('2026-07-20T11:59:00Z', 'incomplete'),
        point('2026-07-20T12:00:00Z', 'complete', [contribution]),
      ])
    )

    render(<PortfolioTimeline />)

    expect(screen.getByTestId('pnl-incomplete-badge')).toHaveTextContent('Incomplete points: 1')
    expect(screen.getByTestId('mock-pnl-chart')).toHaveTextContent('2:0:true:USD')
    expect(screen.getByTestId('mock-contribution-table')).toHaveTextContent('instrument-latest:USD')
  })

  it('omits the incomplete badge when every point is trustworthy', () => {
    mockQuery(timeline([point('2026-07-20T12:00:00Z', 'complete')]))

    render(<PortfolioTimeline />)

    expect(screen.queryByTestId('pnl-incomplete-badge')).not.toBeInTheDocument()
  })

  it('updates the requested window and granularity from the selectors', () => {
    mockQuery(timeline([point('2026-07-20T12:00:00Z', 'complete')]))

    render(<PortfolioTimeline />)
    expect(screen.getByRole('option', { name: 'Last 30 days' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Last 90 days' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select timeline window'), {
      target: { value: '7d' },
    })
    fireEvent.change(screen.getByLabelText('Select timeline granularity'), {
      target: { value: '1h' },
    })

    expect(usePortfolioPnlTimeline).toHaveBeenLastCalledWith(
      {
        from: '2026-07-13T12:00:00.000Z',
        to: '2026-07-20T12:00:00.000Z',
        granularity: '1h',
        mode: 'live',
      },
      true
    )
  })

  it('anchors the default window to the point-in-time scope', () => {
    scope.asOf = '2026-07-10T08:30:00Z'

    render(<PortfolioTimeline />)

    expect(usePortfolioPnlTimeline).toHaveBeenCalledWith(
      {
        from: '2026-07-09T08:30:00.000Z',
        to: '2026-07-10T08:30:00.000Z',
        granularity: '1m',
        mode: 'live',
      },
      true
    )
    expect(screen.getByTestId('pnl-time-travel-notice')).toHaveTextContent(
      'Historical view: showing P&L as known at 2026-07-10T08:30:00Z.'
    )
  })

  it('omits the time-travel notice for a live series', () => {
    render(<PortfolioTimeline />)

    expect(screen.queryByTestId('pnl-time-travel-notice')).not.toBeInTheDocument()
  })

  it('requests paper timelines from the selected wallet metadata', () => {
    mockWalletQuery([{ public_id: 'wallet-1', is_paper: true }])

    render(<PortfolioTimeline />)

    expect(usePortfolioPnlTimeline).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'paper' }),
      true
    )
  })

  it('waits for wallet metadata before requesting a timeline', () => {
    mockWalletQuery(undefined)

    render(<PortfolioTimeline />)

    expect(usePortfolioPnlTimeline).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'live' }),
      false
    )
    expect(screen.getByText('Loading P&L timeline…')).toBeInTheDocument()
  })

  it('renders an error when the selected wallet is missing from loaded metadata', () => {
    mockWalletQuery([])

    render(<PortfolioTimeline />)

    expect(usePortfolioPnlTimeline).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'live' }),
      false
    )
    expect(screen.getByText('Could not load P&L timeline')).toBeInTheDocument()
  })

  it('renders an error when wallet metadata fails to load', () => {
    mockWalletQuery(undefined, true)

    render(<PortfolioTimeline />)

    expect(screen.getByText('Could not load P&L timeline')).toBeInTheDocument()
  })

  it('toggles marker overlays and renders the outcome-aware legend', () => {
    mockQuery(timeline([point('2026-07-20T12:00:00Z', 'complete')], [noFillSignal]))

    render(<PortfolioTimeline />)

    expect(screen.getByTestId('pnl-marker-legend')).toHaveAccessibleName('Decision marker legend')
    expect(screen.getByText('Fill · executed')).toBeInTheDocument()
    expect(screen.getByText('Signal · no fill')).toBeInTheDocument()
    expect(screen.getByText('AI decision · rejected')).toBeInTheDocument()
    expect(screen.getByTestId('pnl-marker-legend-fill-executed')).toHaveStyle({
      color: '#16a34a',
    })
    expect(screen.getByTestId('pnl-marker-legend-signal-executed')).toHaveStyle({
      color: '#2563eb',
    })
    expect(screen.getByTestId('pnl-marker-legend-signal-no-fill')).toHaveStyle({
      color: '#64748b',
    })
    expect(screen.getByTestId('pnl-marker-legend-ai-executed')).toHaveStyle({
      color: '#9333ea',
    })
    expect(screen.getByTestId('pnl-marker-legend-ai-rejected')).toHaveStyle({
      color: '#dc2626',
    })
    expect(screen.getByTestId('pnl-marker-legend-ai-no-fill')).toHaveStyle({
      color: '#d97706',
    })
    expect(screen.getByTestId('mock-pnl-chart')).toHaveTextContent('1:1:true:USD')

    fireEvent.click(screen.getByRole('button', { name: 'Hide decision markers' }))

    expect(screen.queryByTestId('pnl-marker-legend')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show decision markers' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByTestId('mock-pnl-chart')).toHaveTextContent('1:1:false:USD')
  })

  it('discloses marker truncation with the response limit', () => {
    mockQuery(timeline([], [], true))

    render(<PortfolioTimeline />)

    expect(screen.getByTestId('pnl-marker-truncation-warning')).toHaveTextContent(
      'Marker results were truncated at 500. Additional decisions or fills exist in this window.'
    )
  })

  it('renders marker-only windows without fabricating a contribution row', () => {
    mockQuery(timeline([], [noFillSignal]))

    render(<PortfolioTimeline />)

    expect(screen.getByTestId('mock-pnl-chart')).toHaveTextContent('0:1:true:USD')
    expect(screen.queryByTestId('mock-contribution-table')).not.toBeInTheDocument()
    expect(screen.queryByText('No P&L history')).not.toBeInTheDocument()
  })
})
