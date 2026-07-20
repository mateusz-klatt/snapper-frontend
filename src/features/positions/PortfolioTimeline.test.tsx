import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PortfolioTimeline } from './PortfolioTimeline'
import { usePortfolioPnlSeries } from '../../hooks/queries/portfolio'
import type {
  PnlInstrumentContributionData,
  PnlSeriesData,
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
  usePortfolioPnlSeries: vi.fn(),
}))

vi.mock('./PnlChart', () => ({
  PnlChart: ({
    points,
    valuationCcy,
  }: {
    points: PnlTimelinePointData[]
    valuationCcy: string
  }) => <div data-testid='mock-pnl-chart'>{`${points.length}:${valuationCcy}`}</div>,
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

const series = (points: PnlTimelinePointData[]): PnlSeriesData => ({
  type: 'pnl_series',
  sequence_id: 1,
  public_id: 'series-1',
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
})

const mockQuery = (data: PnlSeriesData | undefined, isLoading = false, isError = false): void => {
  vi.mocked(usePortfolioPnlSeries).mockReturnValue({ data, isLoading, isError } as never)
}

describe('PortfolioTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-20T12:00:00Z'))
    scope.walletPublicId = 'wallet-1'
    scope.asOf = null
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
    mockQuery(series([]))

    render(<PortfolioTimeline />)

    expect(screen.getByText('No P&L history')).toBeInTheDocument()
    expect(screen.getByText('No P&L points are available for this window.')).toBeInTheDocument()
  })

  it('renders the chart, latest contributions, valuation currency, and incomplete count', () => {
    mockQuery(
      series([
        point('2026-07-20T11:59:00Z', 'incomplete'),
        point('2026-07-20T12:00:00Z', 'complete', [contribution]),
      ])
    )

    render(<PortfolioTimeline />)

    expect(screen.getByTestId('pnl-incomplete-badge')).toHaveTextContent('Incomplete points: 1')
    expect(screen.getByTestId('mock-pnl-chart')).toHaveTextContent('2:USD')
    expect(screen.getByTestId('mock-contribution-table')).toHaveTextContent('instrument-latest:USD')
  })

  it('omits the incomplete badge when every point is trustworthy', () => {
    mockQuery(series([point('2026-07-20T12:00:00Z', 'complete')]))

    render(<PortfolioTimeline />)

    expect(screen.queryByTestId('pnl-incomplete-badge')).not.toBeInTheDocument()
  })

  it('updates the requested window and granularity from the selectors', () => {
    mockQuery(series([point('2026-07-20T12:00:00Z', 'complete')]))

    render(<PortfolioTimeline />)
    expect(screen.getByRole('option', { name: 'Last 30 days' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Last 90 days' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select timeline window'), {
      target: { value: '7d' },
    })
    fireEvent.change(screen.getByLabelText('Select timeline granularity'), {
      target: { value: '1h' },
    })

    expect(usePortfolioPnlSeries).toHaveBeenLastCalledWith({
      from: '2026-07-13T12:00:00.000Z',
      to: '2026-07-20T12:00:00.000Z',
      granularity: '1h',
      mode: 'live',
    })
  })

  it('anchors the default window to the point-in-time scope', () => {
    scope.asOf = '2026-07-10T08:30:00Z'

    render(<PortfolioTimeline />)

    expect(usePortfolioPnlSeries).toHaveBeenCalledWith({
      from: '2026-07-09T08:30:00.000Z',
      to: '2026-07-10T08:30:00.000Z',
      granularity: '1m',
      mode: 'live',
    })
  })
})
