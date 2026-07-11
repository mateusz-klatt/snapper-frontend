import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Overview } from './Overview'
import { renderWithI18n } from '../../test/renderWithI18n'
import { useProcessMetricsStore } from '../../stores/processMetrics'

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ asOf: null, isTimeTraveling: false })
  ),
}))

vi.mock('../../hooks/queries/orders', () => ({
  useOrdersGrouped: vi.fn(() => ({ data: null })),
  useExecutions: vi.fn(() => ({ data: [], isLoading: false })),
}))
vi.mock('../../hooks/queries/positions', () => ({
  usePositionsSummary: vi.fn(() => ({ data: null, isLoading: false })),
}))
vi.mock('../../hooks/queries/processes', () => ({
  useProcessSummary: vi.fn(() => ({
    isLoading: false,
    data: {
      payload: {
        feeds: { running: 0, total: 0 },
        strategies: { running: 0, total: 0 },
        executors: { running: 0, total: 0 },
        brokers: { running: 0, total: 0 },
      },
    },
  })),
}))
vi.mock('../../hooks/queries/signals', () => ({
  useLatestSignals: vi.fn(() => ({ data: [], isLoading: false })),
}))

const renderWithMocks = (ui: ReactElement) => {
  return renderWithI18n(ui)
}

describe('Overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProcessMetricsStore.getState().reset()
  })
  it.each([
    ['renders overview page', ['Feeds Running']],
    ['displays metric cards', ['Strategies Active', 'Open Orders', "Today's Executions"]],
    ['displays process status section', ['Process Status']],
    ['displays portfolio summary section', ['Portfolio Summary']],
    ['displays recent signals section', ['Recent Signals']],
    ['displays recent executions section', ['Recent Executions']],
    ['shows no positions message when data is null', ['No positions data available']],
    ['shows no recent signals message when empty', ['No recent signals']],
    ['shows no recent executions message when empty', ['No recent executions']],
  ])('%s', (_name, expectedTexts) => {
    renderWithMocks(<Overview />)
    expectedTexts.forEach(text => {
      expect(screen.getByText(text)).toBeInTheDocument()
    })
  })
  it('handles undefined store values with defaults', async () => {
    const { useExecutions } = await import('../../hooks/queries/orders')
    const { useProcessSummary } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSummary).mockReturnValue({
      isLoading: false,
      data: undefined,
    } as never)
    vi.mocked(useExecutions).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('Feeds Running')).toBeInTheDocument()
  })
  it('displays loading spinner for process status', async () => {
    const { useProcessSummary } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSummary).mockReturnValue({
      isLoading: true,
      data: null,
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('Process Status')).toBeInTheDocument()
  })
  it('displays loading spinner for portfolio', async () => {
    const { usePositionsSummary } = await import('../../hooks/queries/positions')

    vi.mocked(usePositionsSummary).mockReturnValue({
      isLoading: true,
      data: null,
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('Portfolio Summary')).toBeInTheDocument()
  })
  it('displays loading spinner for signals', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: true,
      data: [],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('Recent Signals')).toBeInTheDocument()
  })
  it('displays portfolio data when available', async () => {
    const { usePositionsSummary } = await import('../../hooks/queries/positions')

    vi.mocked(usePositionsSummary).mockReturnValue({
      isLoading: false,
      data: {
        totalValue: 10000,
        totalPnL: 500,
        totalUnrealizedPnl: 500,
        incompleteValuation: false,
        pnlPercent: 5,
        count: 3,
        longCost: 6000,
        shortCost: 4000,
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('Total Value')).toBeInTheDocument()
    expect(screen.getByTestId('overview-long-exposure')).toHaveTextContent('$6,000.00')
    expect(screen.getByTestId('overview-short-exposure')).toHaveTextContent('$4,000.00')
    expect(screen.getByTestId('overview-net-delta')).toHaveTextContent('+$2,000.00')
  })

  it('surfaces the incomplete-valuation indicator when a position lacks a mark', async () => {
    const { usePositionsSummary } = await import('../../hooks/queries/positions')

    vi.mocked(usePositionsSummary).mockReturnValue({
      isLoading: false,
      data: {
        totalValue: 10000,
        totalPnL: 500,
        totalUnrealizedPnl: 300,
        incompleteValuation: true,
        pnlPercent: 5,
        count: 3,
        longCost: 6000,
        shortCost: 4000,
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByTestId('overview-incomplete-valuation')).toBeInTheDocument()
    expect(screen.getByText('+$300.00')).toBeInTheDocument()
    expect(screen.queryByText('+$500.00')).not.toBeInTheDocument()
  })
  it('shows negative net delta as red when net short', async () => {
    const { usePositionsSummary } = await import('../../hooks/queries/positions')

    vi.mocked(usePositionsSummary).mockReturnValue({
      isLoading: false,
      data: {
        totalValue: 8000,
        totalPnL: -500,
        totalUnrealizedPnl: -500,
        incompleteValuation: false,
        pnlPercent: -5.5,
        count: 2,
        longCost: 1000,
        shortCost: 7000,
      },
    } as never)
    renderWithMocks(<Overview />)
    const netDelta = screen.getByTestId('overview-net-delta')

    expect(netDelta).toHaveTextContent('$-6,000.00')
    expect(netDelta.className).toContain('text-falling-600')
  })
  it('displays running feeds status', async () => {
    const { useProcessSummary } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSummary).mockReturnValue({
      isLoading: false,
      data: {
        payload: {
          feeds: { running: 1, total: 2 },
          strategies: { running: 0, total: 0 },
          executors: { running: 0, total: 0 },
          brokers: { running: 0, total: 0 },
        },
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('1 Running')).toBeInTheDocument()
  })
  it('displays running strategies status', async () => {
    const { useProcessSummary } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSummary).mockReturnValue({
      isLoading: false,
      data: {
        payload: {
          feeds: { running: 0, total: 0 },
          strategies: { running: 1, total: 1 },
          executors: { running: 0, total: 0 },
          brokers: { running: 0, total: 0 },
        },
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('1 Active')).toBeInTheDocument()
  })
  it('displays executor status', async () => {
    const { useProcessSummary } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSummary).mockReturnValue({
      isLoading: false,
      data: {
        payload: {
          feeds: { running: 0, total: 0 },
          strategies: { running: 0, total: 0 },
          executors: { running: 1, total: 1 },
          brokers: { running: 0, total: 0 },
        },
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('1/1 Running')).toBeInTheDocument()
  })
  it('displays broker status', async () => {
    const { useProcessSummary } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSummary).mockReturnValue({
      isLoading: false,
      data: {
        payload: {
          feeds: { running: 0, total: 0 },
          strategies: { running: 0, total: 0 },
          executors: { running: 0, total: 0 },
          brokers: { running: 1, total: 1 },
        },
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getAllByText('1/1 Running').length).toBeGreaterThan(0)
  })
  it('displays recent signals when available', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [
        {
          publicId: 1,
          instrument: 'BTC/USD',
          side: 'buy',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('BTC/USD')).toBeInTheDocument()
  })
  it('displays recent executions when available', async () => {
    const { useExecutions } = await import('../../hooks/queries/orders')

    vi.mocked(useExecutions).mockReturnValue({
      data: [
        {
          publicId: 1,
          instrument: 'ETH/USD',
          side: 'buy',
          size: 1.5,
          price: 2000,
          executedAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
      isLoading: false,
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('ETH/USD')).toBeInTheDocument()
  })
  it('counts today executions correctly', async () => {
    const { useExecutions } = await import('../../hooks/queries/orders')

    const today = new Date()
    const yesterday = new Date(Date.now() - 86400000)

    vi.mocked(useExecutions).mockReturnValue({
      data: [
        {
          publicId: 1,
          instrument: 'BTC/USD',
          side: 'buy',
          size: 1,
          price: 50000,
          executedAt: today,
        },
        {
          publicId: 2,
          instrument: 'ETH/USD',
          side: 'sell',
          size: 2,
          price: 3000,
          executedAt: yesterday,
        },
        {
          publicId: 3,
          instrument: 'SOL/USD',
          side: 'buy',
          size: 10,
          price: 100,
          executedAt: today,
        },
      ],
      isLoading: false,
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText("Today's Executions")).toBeInTheDocument()
  })
  it('displays sell signal with error status', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [
        {
          publicId: 1,
          instrument: 'BTC/USD',
          side: 'sell',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getAllByText('SELL').length).toBeGreaterThan(0)
  })
  it('displays execution with sell side', async () => {
    const { useExecutions } = await import('../../hooks/queries/orders')

    vi.mocked(useExecutions).mockReturnValue({
      data: [
        {
          publicId: 1,
          instrument: 'BTC/USD',
          side: 'sell',
          size: 0.5,
          price: 45000,
          executedAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
      isLoading: false,
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getAllByText('SELL').length).toBeGreaterThan(0)
  })
  it('displays negative PnL with correct styling', async () => {
    const { usePositionsSummary } = await import('../../hooks/queries/positions')

    vi.mocked(usePositionsSummary).mockReturnValue({
      isLoading: false,
      data: {
        totalValue: 10000,
        totalPnL: -500,
        totalUnrealizedPnl: -500,
        incompleteValuation: false,
        pnlPercent: -5,
        count: 2,
        longCost: 5000,
        shortCost: 5000,
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('Unrealized P&L')).toBeInTheDocument()
    expect(screen.getByText('P&L %')).toBeInTheDocument()
  })
  it('uses timestamp as key when signal id is null', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [
        {
          publicId: null,
          instrument: 'XRP/USD',
          side: 'buy',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('XRP/USD')).toBeInTheDocument()
  })
  it('uses index as key when signal id is null and timestamp is undefined', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [
        {
          publicId: null,
          instrument: 'AVAX/USD',
          side: 'sell',
          timestamp: undefined,
        },
      ],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('AVAX/USD')).toBeInTheDocument()
  })
  it('renders signal firedAt via centralized formatTime when defined', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [
        {
          publicId: 1,
          instrument: 'SOL/USD',
          side: 'buy',
          firedAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('SOL/USD')).toBeInTheDocument()
  })
  it('displays strategy badge, price and strength on enriched signal rows', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [
        {
          publicId: 1,
          instrument: 'BTC/USD',
          side: 'buy',
          strength: 0.62,
          price: 64136.9,
          strategyName: 'momentum-breakout',
          firedAt: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('momentum-breakout')).toBeInTheDocument()
    expect(screen.getByText('$64136.90')).toBeInTheDocument()
    expect(screen.getByText('62%')).toBeInTheDocument()
  })
  it('shows N/A when signal timestamp is undefined', async () => {
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [
        {
          publicId: 1,
          instrument: 'ADA/USD',
          side: 'buy',
          timestamp: undefined,
        },
      ],
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('ADA/USD')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
  it('shows N/A when execution executedAt is undefined', async () => {
    const { useExecutions } = await import('../../hooks/queries/orders')
    const { useLatestSignals } = await import('../../hooks/queries/signals')

    vi.mocked(useLatestSignals).mockReturnValue({
      isLoading: false,
      data: [],
    } as never)
    vi.mocked(useExecutions).mockReturnValue({
      data: [
        {
          publicId: 1,
          instrument: 'DOT/USD',
          side: 'sell',
          size: 10,
          price: 5,
          executedAt: undefined,
        },
      ],
      isLoading: false,
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('DOT/USD')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
  it('shows the process resources empty state when no processes are present', () => {
    renderWithMocks(<Overview />)
    expect(screen.getByText('No process resource data available')).toBeInTheDocument()
  })
  it('seeds the process metrics store from the REST payload and renders the table', async () => {
    const { useProcessSummary } = await import('../../hooks/queries/processes')

    vi.mocked(useProcessSummary).mockReturnValue({
      isLoading: false,
      data: {
        payload: {
          coordinator: 'alpha',
          timestamp: '2026-06-01T00:00:00Z',
          feeds: { running: 0, total: 0 },
          strategies: { running: 0, total: 0 },
          executors: { running: 0, total: 0 },
          brokers: { running: 0, total: 0 },
          processes: [
            {
              name: 'feed-1',
              running: true,
              enabled: true,
              owned: true,
              role: 'core',
              lifecycle: 'long_running',
              active_public_id: 'run-123',
              rss_bytes: 104857600,
              cpu_percent: 12.5,
            },
            {
              name: 'feed-2',
              running: false,
              enabled: false,
              role: 'core',
              lifecycle: 'long_running',
              rss_bytes: null,
              cpu_percent: null,
            },
          ],
        },
      },
    } as never)
    renderWithMocks(<Overview />)
    expect(screen.getByText('feed-1')).toBeInTheDocument()
    expect(screen.getByText('100.0 MB')).toBeInTheDocument()
    expect(screen.getByText('12.5%')).toBeInTheDocument()
    const seeded = useProcessMetricsStore.getState().byCoordinator['alpha']

    expect(seeded?.['feed-1']?.active_public_id).toBe('run-123')
    expect(seeded?.['feed-2']?.rss_bytes).toBeNull()
    expect(seeded?.['feed-2']?.cpu_percent).toBeNull()
  })
  it('shows date-specific execution label when time traveling', async () => {
    const { useAppStore } = await import('../../stores/app')
    const { useExecutions } = await import('../../hooks/queries/orders')

    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: '2024-06-15T12:00:00Z', isTimeTraveling: true })) as never)
    vi.mocked(useExecutions).mockReturnValue({
      data: [
        {
          instrument: 'BTC/USD',
          exchange: 'kraken',
          side: 'buy',
          size: 1,
          price: 50000,
          executedAt: new Date('2024-06-15T10:00:00Z'),
        },
      ],
      isLoading: false,
    } as never)
    renderWithMocks(<Overview />)

    expect(screen.getByText(/Executions \(/)).toBeInTheDocument()
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: null, isTimeTraveling: false })) as never)
  })
})
