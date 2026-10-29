import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMarketStats } from '../../hooks/queries/market'
import type { MarketStats } from '../../lib/api/marketStats'
import type { WindowCandle } from './chartNavigation'
import type { WSDispatcher } from '../../stores/wsDispatcher'
import { MarketData } from './MarketData'

const mockSetSelectedExchange = vi.fn()
const mockSetSelectedInstrument = vi.fn()
const mockSetSelectedMarket = vi.fn()
const mockSetSelectedTimeframe = vi.fn()
const mockChartProps = vi.hoisted(() => vi.fn())

const completeStats: MarketStats = {
  windowEnd: '2026-06-10T12:00:00Z',
  price: 1.085,
  change: 0.005,
  changePercent: 0.46,
  high24h: 1.12,
  low24h: 1.01,
}

const mockStatsResult = (data: MarketStats): void => {
  vi.mocked(useMarketStats).mockReturnValue({ data, isLoading: false, error: null } as never)
}

interface BareCandle {
  open_at: string
  open: number
  high: number
  low: number
  close: number
}

const buildCachedEnvelope = (
  bare: BareCandle[],
  options: { isWarm?: boolean; source?: 'cache' | 'derived' | 'db' } = {}
) => ({
  type: 'cached_candles' as const,
  sequence_id: 0,
  public_id: 'env-pid',
  timestamp: '2024-01-01T00:00:00Z',
  session_id: 'sid',
  topic: null,
  payload: {
    candles: bare.map(c => ({
      open_at_ms: new Date(c.open_at).getTime(),
      timeframe: '1h',
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: 0,
    })),
    sample_count: bare.length,
    is_warm: options.isWarm ?? true,
    source: options.source ?? 'cache',
  },
})

vi.mock('../../hooks/queries/market', () => ({
  useCachedCandles: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    isFetching: false,
  })),
  useMarketStats: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    isFetching: false,
  })),
  useExchanges: vi.fn(() => ({
    data: { payload: ['kraken', 'binance'], count: 2 },
    isLoading: false,
    error: null,
  })),
  useExchangeInstrumentsDetail: vi.fn(() => ({
    data: {
      payload: [
        { symbol: 'EUR-USD', can_trade: true },
        { symbol: 'GBP-USD', can_trade: true },
        { symbol: 'BTC-USD', can_trade: true },
      ],
      count: 3,
    },
    isLoading: false,
    error: null,
  })),
  useRelatedInstruments: vi.fn(() => ({
    data: undefined,
    isFetching: false,
  })),
  useAllConfiguredPairStats: vi.fn(() => ({
    data: undefined,
  })),
}))
vi.mock('../../stores/market', () => ({
  useMarketStore: vi.fn(() => ({
    selectedExchange: 'kraken',
    selectedInstrument: 'EUR-USD',
    selectedTimeframe: '1h',
    setSelectedExchange: mockSetSelectedExchange,
    setSelectedInstrument: mockSetSelectedInstrument,
    setSelectedMarket: mockSetSelectedMarket,
    setSelectedTimeframe: mockSetSelectedTimeframe,
  })),
}))
vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ asOf: null, isTimeTraveling: false, locale: 'us' })
  ),
}))
vi.mock('../../hooks/useMarketSubscription', () => ({
  useMarketSubscription: vi.fn(() => true),
}))
vi.mock('../../stores/websocket', () => ({
  useWebSocketStore: vi.fn(() => ({
    isConnected: true,
  })),
}))
vi.mock('../../hooks/useWSDispatcher', () => ({
  useWSDispatcher: vi.fn(() => ({
    startBuffering: vi.fn(),
    flushBuffer: vi.fn(),
    stopBuffering: vi.fn(),
    onLiveCandle: vi.fn(() => vi.fn()),
  })),
}))
vi.mock('./MarketChart', () => ({
  MarketChart: ({
    instrument,
    timeframe,
    onLodTimeframe,
    liveCandle,
    dispatcher,
  }: {
    instrument: string | null
    timeframe: string
    onLodTimeframe?: (tf: string) => void
    liveCandle?: WindowCandle | null
    dispatcher?: Pick<WSDispatcher, 'onLiveCandle'> | null
  }) => {
    mockChartProps({ liveCandle, dispatcher })

    return (
      <div data-testid='market-chart'>
        Chart {instrument} {timeframe}
        <button data-testid='lod-trigger' onClick={() => onLodTimeframe?.('5m')}>
          lod
        </button>
      </div>
    )
  },
}))
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithProviders = (ui: ReactNode) => {
  const queryClient = createQueryClient()

  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

describe('MarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMarketStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as never)
  })
  it('renders market data component', () => {
    renderWithProviders(<MarketData />)
    expect(screen.getByText(/Market Data/i)).toBeInTheDocument()
    expect(mockChartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dispatcher: expect.objectContaining({ onLiveCandle: expect.any(Function) }),
      })
    )
  })
  it('renders the instrument description banner between title and controls', async () => {
    const { useRelatedInstruments } = await import('../../hooks/queries/market')

    vi.mocked(useRelatedInstruments).mockReturnValue({
      data: {
        type: 'related_instruments',
        sequence_id: 0,
        public_id: 'ri-env-banner',
        timestamp: '2026-05-18T00:00:00Z',
        session_id: 'sid',
        payload: {
          selected: { exchange: 'kraken', native_symbol: 'EUR-USD' },
          underlying: {
            public_id: 'ua-eur',
            ticker: 'EUR',
            name: 'Euro',
            asset_class: 'forex',
            sector: null,
            description: null,
          },
          groups: [],
        },
      },
      isFetching: false,
      isError: false,
    } as never)

    try {
      renderWithProviders(<MarketData />)
      const title = screen.getByRole('heading', { name: 'Market Data' })
      const banner = screen.getByTestId('instrument-description-banner')
      const exchangeControl = screen.getByLabelText('Exchange:')

      expect(title.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
      expect(
        banner.compareDocumentPosition(exchangeControl) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
      expect(screen.getByText('Euro · Forex')).toBeInTheDocument()
    } finally {
      vi.mocked(useRelatedInstruments).mockReturnValue({
        data: undefined,
        isFetching: false,
      } as never)
    }
  })
  it('displays instrument selector', async () => {
    renderWithProviders(<MarketData />)
    await waitFor(() => {
      expect(screen.getByLabelText('Instrument:')).toBeInTheDocument()
    })
  })
  it('displays timeframe selector', async () => {
    renderWithProviders(<MarketData />)
    await waitFor(() => {
      const selectors = document.querySelectorAll('select, [role="combobox"]')

      expect(selectors.length).toBeGreaterThan(0)
    })
  })
  it('displays no data message when candles are empty', async () => {
    renderWithProviders(<MarketData />)
    expect(screen.queryByText(/Last closed price/)).not.toBeInTheDocument()
  })
  it('shows loading state while fetching candles', async () => {
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isFetching: true,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<MarketData />)
    expect(screen.queryByText(/Last closed price/)).not.toBeInTheDocument()
  })
  it('displays exchange dropdown with options', async () => {
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    const trigger = screen.getAllByRole('combobox')[0]

    await user.click(trigger as HTMLElement)
    await waitFor(() => {
      expect(screen.getAllByText('kraken').length).toBeGreaterThanOrEqual(2)
    })
  })
  it('displays timeframe dropdown with options', async () => {
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    const trigger = screen.getByLabelText('Timeframe:')

    await user.click(trigger as HTMLElement)
    await waitFor(() => {
      expect(screen.getAllByText('1 Hour').length).toBeGreaterThanOrEqual(2)
    })
  })
  it('passes null when no exchange or instrument selected', async () => {
    const { useMarketStore } = await import('../../stores/market')
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useMarketStore).mockReturnValueOnce({
      selectedExchange: null,
      selectedInstrument: null,
      selectedTimeframe: '1h',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    })
    renderWithProviders(<MarketData />)
    expect(useCachedCandles).toHaveBeenCalledWith(null, null, '1h', 100, true)
  })
  it('enables snapshot when WebSocket is disconnected (fallback)', async () => {
    const { useCachedCandles } = await import('../../hooks/queries/market')
    const { useMarketSubscription } = await import('../../hooks/useMarketSubscription')
    const { useWebSocketStore } = await import('../../stores/websocket')

    vi.mocked(useMarketSubscription).mockReturnValue(false)
    vi.mocked(useWebSocketStore).mockReturnValue({ isConnected: false } as never)
    renderWithProviders(<MarketData />)

    expect(useCachedCandles).toHaveBeenCalledWith('kraken', 'EUR-USD', '1h', 100, true)
  })
  it('displays true one-day statistics from their independent query', () => {
    mockStatsResult(completeStats)
    renderWithProviders(<MarketData />)
    expect(screen.getAllByText('Last closed price').length).toBeGreaterThan(0)
    expect(screen.getByText('1.1200')).toBeInTheDocument()
    expect(screen.getByText('1.0100')).toBeInTheDocument()
    expect(document.querySelector('time')?.dateTime).toBe(completeStats.windowEnd)
  })
  it('displays chart when candles data is available', async () => {
    const mockCandles = [
      { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.082 },
      { open_at: '2024-01-01T01:00:00Z', open: 1.082, high: 1.086, low: 1.081, close: 1.085 },
    ]
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: buildCachedEnvelope(mockCandles),
      isLoading: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<MarketData />)
    await waitFor(() => {
      expect(screen.getByText('Price Chart')).toBeInTheDocument()
    })
  })
  it('does not calculate statistics from a duplicate or short live cache', async () => {
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: buildCachedEnvelope([
        { open_at: '2024-01-01T00:00:00Z', open: 100, high: 999, low: 1, close: 200 },
        { open_at: '2024-01-01T00:00:00Z', open: 200, high: 999, low: 1, close: 300 },
      ]),
      isFetching: false,
    } as never)
    mockStatsResult(completeStats)
    renderWithProviders(<MarketData />)
    expect(screen.getByText('1.0850')).toBeInTheDocument()
    expect(screen.getByText('1.1200')).toBeInTheDocument()
    expect(screen.queryByText('300.0000')).not.toBeInTheDocument()
  })
  it('displays positive change with green color', () => {
    mockStatsResult(completeStats)
    renderWithProviders(<MarketData />)
    expect(screen.getByText(/\+0\.0050/)).toHaveClass('text-rising-600')
  })
  it('displays negative change with red color', () => {
    mockStatsResult({ ...completeStats, change: -0.005, changePercent: -0.46 })
    renderWithProviders(<MarketData />)
    expect(screen.getByText(/-0\.0050/)).toHaveClass('text-falling-600')
  })
  it('anchors statistics at the scrubber time without a future half-window', async () => {
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    await user.click(screen.getByRole('button', { name: '-1d' }))
    const lastCall = vi.mocked(useMarketStats).mock.calls.at(-1)

    expect(lastCall?.[0]).toBe('kraken')
    expect(lastCall?.[1]).toBe('EUR-USD')
    expect(lastCall?.[2]).toBeLessThan(Date.now())
    expect(lastCall).toHaveLength(3)
  })

  it('preserves the replay anchor and statistics identity when chart timeframe changes', async () => {
    const { useMarketStore } = await import('../../stores/market')
    const initial = useMarketStore()
    const { rerender } = renderWithProviders(<MarketData />)

    fireEvent.click(screen.getByRole('button', { name: '-1d' }))
    const previous = vi.mocked(useMarketStats).mock.calls.at(-1)

    try {
      vi.mocked(useMarketStore).mockReturnValue({ ...initial, selectedTimeframe: '5m' })
      rerender(<MarketData />)
      expect(vi.mocked(useMarketStats).mock.calls.at(-1)).toEqual(previous)
    } finally {
      vi.mocked(useMarketStore).mockReturnValue(initial)
    }
  })
  it('shows loading without reusing previous statistics while replay is pending', async () => {
    vi.mocked(useMarketStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never)
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    await user.click(screen.getByRole('button', { name: '-1d' }))
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Last closed price')).not.toBeInTheDocument()
  })

  it('keeps partial history honest without fabricating a zero return', () => {
    mockStatsResult({
      ...completeStats,
      change: null,
      changePercent: null,
      high24h: null,
      low24h: null,
    })
    renderWithProviders(<MarketData />)
    expect(screen.getByText('Complete 24h history unavailable')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.queryByText(/0.00%/)).not.toBeInTheDocument()
  })

  it('shows unavailable price and omits percentage for a zero baseline', () => {
    mockStatsResult({ ...completeStats, price: null, change: 0, changePercent: null })
    renderWithProviders(<MarketData />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('+0.00')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('reports a failed statistics query instead of showing stale values', () => {
    vi.mocked(useMarketStats).mockReturnValue({
      data: completeStats,
      isLoading: false,
      error: new Error('range failed'),
    } as never)
    renderWithProviders(<MarketData />)
    expect(screen.getByRole('alert')).toHaveTextContent('range failed')
    expect(screen.queryByText('Last closed price')).not.toBeInTheDocument()
  })
  it('uses raw timeframe text when selected timeframe is unknown', async () => {
    const { useCachedCandles } = await import('../../hooks/queries/market')
    const { useMarketStore } = await import('../../stores/market')

    vi.mocked(useMarketStore).mockReturnValueOnce({
      selectedExchange: 'kraken',
      selectedInstrument: 'EUR-USD',
      selectedTimeframe: 'custom',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedMarket: mockSetSelectedMarket,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    })
    vi.mocked(useCachedCandles).mockReturnValue({
      data: buildCachedEnvelope([]),
      isLoading: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<MarketData />)
    await waitFor(() => {
      expect(screen.getByText(/custom data/i)).toBeInTheDocument()
    })
  })
  it('calls setSelectedExchange when exchange is changed', async () => {
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    const triggers = screen.getAllByRole('combobox')

    await user.click(triggers[0] as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('binance')).toBeInTheDocument()
    })
    await user.click(screen.getByText('binance'))
    expect(mockSetSelectedExchange).toHaveBeenCalledWith('binance')
  })
  it('calls setSelectedInstrument when a known symbol is typed into the input', async () => {
    renderWithProviders(<MarketData />)
    const input = screen.getByLabelText('Instrument:') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'GBP-USD' } })
    expect(mockSetSelectedInstrument).toHaveBeenCalledWith('GBP-USD')
  })
  it('does not commit selection while the input value is a partial match', async () => {
    renderWithProviders(<MarketData />)
    const input = screen.getByLabelText('Instrument:') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'GBP' } })
    expect(mockSetSelectedInstrument).not.toHaveBeenCalled()
  })
  it('reverts the input on blur if the typed value is not a known symbol', async () => {
    renderWithProviders(<MarketData />)
    const input = screen.getByLabelText('Instrument:') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'NOT-A-SYMBOL' } })
    expect(input.value).toBe('NOT-A-SYMBOL')
    fireEvent.blur(input)
    expect(input.value).toBe('EUR-USD')
  })
  it('keeps the input on blur when the typed value is a known symbol', async () => {
    renderWithProviders(<MarketData />)
    const input = screen.getByLabelText('Instrument:') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'GBP-USD' } })
    fireEvent.blur(input)
    expect(input.value).toBe('GBP-USD')
  })
  it('reverts to empty string on blur when no instrument is currently selected', async () => {
    const { useMarketStore } = await import('../../stores/market')

    vi.mocked(useMarketStore).mockReturnValue({
      selectedExchange: 'kraken',
      selectedInstrument: null,
      selectedTimeframe: '1h',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    })

    try {
      renderWithProviders(<MarketData />)
      const input = screen.getByLabelText('Instrument:') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'NOT-A-SYMBOL' } })
      fireEvent.blur(input)
      expect(input.value).toBe('')
    } finally {
      vi.mocked(useMarketStore).mockReturnValue({
        selectedExchange: 'kraken',
        selectedInstrument: 'EUR-USD',
        selectedTimeframe: '1h',
        setSelectedExchange: mockSetSelectedExchange,
        setSelectedInstrument: mockSetSelectedInstrument,
        setSelectedTimeframe: mockSetSelectedTimeframe,
      })
    }
  })
  it('exposes a datalist of all available instrument symbols', () => {
    renderWithProviders(<MarketData />)
    const datalist = document.getElementById('instrument-options')

    expect(datalist).not.toBeNull()
    const optionValues = Array.from(
      datalist?.querySelectorAll<HTMLOptionElement>('option') ?? []
    ).map(o => o.value)

    expect(optionValues).toEqual(expect.arrayContaining(['EUR-USD', 'GBP-USD', 'BTC-USD']))
  })
  it('input is wired to the datalist via the list attribute', () => {
    renderWithProviders(<MarketData />)
    const input = screen.getByLabelText('Instrument:') as HTMLInputElement

    expect(input.getAttribute('list')).toBe('instrument-options')
  })
  it('applies an auto-LOD timeframe switch from the chart', async () => {
    renderWithProviders(<MarketData />)
    fireEvent.click(screen.getByTestId('lod-trigger'))
    expect(mockSetSelectedTimeframe).toHaveBeenCalledWith('5m')
  })

  it('calls setSelectedTimeframe when timeframe is changed', async () => {
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    const trigger = screen.getByLabelText('Timeframe:')

    await user.click(trigger as HTMLElement)
    await waitFor(() => {
      expect(screen.getByText('15 Minutes')).toBeInTheDocument()
    })
    await user.click(screen.getByText('15 Minutes'))
    expect(mockSetSelectedTimeframe).toHaveBeenCalledWith('15m')
  })
  it('returns empty chartData when isFetching', async () => {
    const mockCandles = [
      { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.082 },
    ]
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: buildCachedEnvelope(mockCandles),
      isLoading: false,
      error: null,
      isFetching: true,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<MarketData />)
    expect(screen.queryByText('Last closed price')).not.toBeInTheDocument()
  })
  it('handles undefined exchanges data', async () => {
    const { useExchanges } = await import('../../hooks/queries/market')

    vi.mocked(useExchanges).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: null,
    } as never)
    renderWithProviders(<MarketData />)
    expect(screen.getByText(/Market Data/i)).toBeInTheDocument()
  })
  it('handles undefined instruments data', async () => {
    const { useExchangeInstrumentsDetail } = await import('../../hooks/queries/market')

    vi.mocked(useExchangeInstrumentsDetail).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: null,
    } as never)
    renderWithProviders(<MarketData />)
    expect(screen.getByText(/Market Data/i)).toBeInTheDocument()
  })
  it('does not manufacture 24h statistics from a single cached candle', async () => {
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: buildCachedEnvelope([
        { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.082 },
      ]),
      isFetching: false,
    } as never)
    mockStatsResult({
      ...completeStats,
      price: null,
      change: null,
      changePercent: null,
      high24h: null,
      low24h: null,
    })
    renderWithProviders(<MarketData />)
    expect(screen.getByText('Complete 24h history unavailable')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(4)
  })
  it('shows selected instrument in input', async () => {
    renderWithProviders(<MarketData />)
    const input = screen.getByLabelText('Instrument:') as HTMLInputElement

    expect(input.value).toBe('EUR-USD')
  })
  it('disables instrument input when no exchange selected', async () => {
    const { useMarketStore } = await import('../../stores/market')
    const nullExchangeState = {
      selectedExchange: null,
      selectedInstrument: null,
      selectedTimeframe: '1h',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    }

    vi.mocked(useMarketStore).mockReturnValueOnce(nullExchangeState)
    renderWithProviders(<MarketData />)
    const input = screen.getByLabelText('Instrument:')

    expect(input).toBeDisabled()
  })
  it('disables candle fetch when not subscribed and connected in live mode', async () => {
    const { useMarketSubscription } = await import('../../hooks/useMarketSubscription')
    const { useCachedCandles } = await import('../../hooks/queries/market')
    const { useWebSocketStore } = await import('../../stores/websocket')

    vi.mocked(useMarketSubscription).mockReturnValue(false)
    vi.mocked(useWebSocketStore).mockReturnValue({ isConnected: true } as never)
    renderWithProviders(<MarketData />)

    expect(vi.mocked(useCachedCandles)).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Number),
      false
    )
  })
  it('disables the live cache and subscription throughout global time travel', async () => {
    const { useAppStore } = await import('../../stores/app')
    const { useMarketSubscription } = await import('../../hooks/useMarketSubscription')

    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: '2024-01-01T00:00:00Z', isTimeTraveling: true, locale: 'us' })) as never)
    vi.mocked(useMarketSubscription).mockReturnValue(false)
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: buildCachedEnvelope(
        [{ open_at: '2026-06-20T00:00:00Z', open: 100, high: 101, low: 99, close: 100 }],
        { isWarm: false }
      ),
      isFetching: false,
    } as never)

    renderWithProviders(<MarketData />)
    await waitFor(() => {
      expect(vi.mocked(useCachedCandles)).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        false
      )
    })
    expect(useMarketSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ instrument: null })
    )
    expect(mockChartProps).toHaveBeenLastCalledWith(expect.objectContaining({ liveCandle: null }))
    expect(screen.queryByText(/Cache warming up/)).not.toBeInTheDocument()
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: null, isTimeTraveling: false, locale: 'us' })) as never)
    vi.mocked(useMarketSubscription).mockReturnValue(true)
  })

  it('renders the market-data-only badge next to the title when the selected instrument is observation-only', async () => {
    const queries = await import('../../hooks/queries/market')
    const marketStore = await import('../../stores/market')

    vi.mocked(marketStore.useMarketStore).mockReturnValue({
      selectedExchange: 'kraken',
      selectedInstrument: 'EUR-USD',
      selectedTimeframe: '1h',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    } as never)
    vi.mocked(queries.useExchangeInstrumentsDetail).mockImplementation((() => ({
      data: {
        payload: [
          { symbol: 'EUR-USD', can_trade: false },
          { symbol: 'GBP-USD', can_trade: true },
        ],
        count: 2,
      },
      isLoading: false,
      error: null,
    })) as never)

    try {
      renderWithProviders(<MarketData />)
      const badges = await screen.findAllByTestId('market-data-only-badge')

      expect(badges.length).toBeGreaterThan(0)
    } finally {
      vi.mocked(queries.useExchangeInstrumentsDetail).mockImplementation((() => ({
        data: {
          payload: [
            { symbol: 'EUR-USD', can_trade: true },
            { symbol: 'GBP-USD', can_trade: true },
            { symbol: 'BTC-USD', can_trade: true },
          ],
          count: 3,
        },
        isLoading: false,
        error: null,
      })) as never)
    }
  })

  it('hides the title badge when no instrument is selected', async () => {
    const { useMarketStore } = await import('../../stores/market')

    vi.mocked(useMarketStore).mockReturnValueOnce({
      selectedExchange: 'kraken',
      selectedInstrument: null,
      selectedTimeframe: '1h',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    } as never)
    renderWithProviders(<MarketData />)
    expect(screen.queryByTestId('market-data-only-badge')).toBeNull()
  })

  it('shows the market-data-only badge in the header when selected instrument cannot trade', async () => {
    const { useExchangeInstrumentsDetail } = await import('../../hooks/queries/market')
    const { useMarketStore } = await import('../../stores/market')

    vi.mocked(useExchangeInstrumentsDetail).mockImplementation((() => ({
      data: {
        payload: [
          { symbol: 'MNQM6-CME', can_trade: false },
          { symbol: 'BTC-USD', can_trade: true },
        ],
        count: 2,
      },
      isLoading: false,
      error: null,
    })) as never)
    vi.mocked(useMarketStore).mockReturnValue({
      selectedExchange: 'kraken_futures',
      selectedInstrument: 'MNQM6-CME',
      selectedTimeframe: '1h',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    })

    try {
      renderWithProviders(<MarketData />)
      const badges = await screen.findAllByTestId('market-data-only-badge')

      expect(badges.length).toBeGreaterThan(0)
    } finally {
      vi.mocked(useExchangeInstrumentsDetail).mockImplementation((() => ({
        data: {
          payload: [
            { symbol: 'EUR-USD', can_trade: true },
            { symbol: 'GBP-USD', can_trade: true },
            { symbol: 'BTC-USD', can_trade: true },
          ],
          count: 3,
        },
        isLoading: false,
        error: null,
      })) as never)
      vi.mocked(useMarketStore).mockReturnValue({
        selectedExchange: 'kraken',
        selectedInstrument: 'EUR-USD',
        selectedTimeframe: '1h',
        setSelectedExchange: mockSetSelectedExchange,
        setSelectedInstrument: mockSetSelectedInstrument,
        setSelectedTimeframe: mockSetSelectedTimeframe,
      })
    }
  })

  it('renders the cache-warming banner when the cache has not reached the requested limit', async () => {
    const mockCandles = [
      { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.082 },
    ]
    const { useCachedCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValueOnce({
      data: buildCachedEnvelope(mockCandles, { isWarm: false, source: 'derived' }),
      isLoading: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    } as never)
    renderWithProviders(<MarketData />)
    await waitFor(() => {
      expect(screen.getByText(/Cache warming up/)).toBeInTheDocument()
      expect(screen.getByText(/\(derived from 1m\)/)).toBeInTheDocument()
    })
  })

  it('clicking a related-instrument chip calls setSelectedMarket atomically', async () => {
    const { useRelatedInstruments } = await import('../../hooks/queries/market')
    const { useMarketStore } = await import('../../stores/market')

    vi.mocked(useMarketStore).mockReturnValue({
      selectedExchange: 'kraken',
      selectedInstrument: 'EUR-USD',
      selectedTimeframe: '1h',
      setSelectedExchange: mockSetSelectedExchange,
      setSelectedInstrument: mockSetSelectedInstrument,
      setSelectedMarket: mockSetSelectedMarket,
      setSelectedTimeframe: mockSetSelectedTimeframe,
    } as never)
    vi.mocked(useRelatedInstruments).mockReturnValue({
      data: {
        type: 'related_instruments',
        sequence_id: 0,
        public_id: 'ri-env-1',
        timestamp: '2026-04-21T00:00:00Z',
        session_id: 'sid',
        payload: {
          selected: { exchange: 'kraken', native_symbol: 'EUR-USD' },
          underlying: {
            public_id: 'ua-eur-usd',
            ticker: 'EUR',
            name: 'Euro / US Dollar',
            asset_class: 'forex',
            sector: null,
            description: null,
          },
          groups: [
            {
              relationship_type: 'derivative',
              label: 'Derivatives',
              items: [
                {
                  type: 'related_instrument',
                  sequence_id: 1,
                  public_id: 'ri-perp',
                  timestamp: '2026-04-21T00:00:00Z',
                  session_id: 'sid',
                  instrument_public_id: 'inst-eur-usd-perp',
                  native_symbol: 'EUR-USD-PERP',
                  exchange: 'kraken_futures',
                  asset_type: 'forex',
                  relationship_type: 'derivative',
                  contract_family: 'EUR',
                  is_selected: false,
                },
              ],
            },
          ],
        },
      },
      isFetching: false,
    } as never)

    try {
      renderWithProviders(<MarketData />)
      const chip = await screen.findByRole('button', { name: /EUR-USD-PERP.*kraken_futures/i })

      fireEvent.click(chip)
      expect(mockSetSelectedMarket).toHaveBeenCalledWith({
        exchange: 'kraken_futures',
        instrument: 'EUR-USD-PERP',
      })
    } finally {
      vi.mocked(useRelatedInstruments).mockReturnValue({
        data: undefined,
        isFetching: false,
      } as never)
    }
  })

  it('clicking a pair-stats chip calls setSelectedMarket with the other leg', async () => {
    const { useAllConfiguredPairStats } = await import('../../hooks/queries/market')

    vi.mocked(useAllConfiguredPairStats).mockReturnValue({
      data: {
        type: 'listed_cached_stats',
        sequence_id: 0,
        public_id: 'lcs-1',
        timestamp: '2026-05-18T10:00:00Z',
        session_id: 'sid',
        topic: null,
        payload: {
          count: 1,
          pairs: [
            {
              type: 'cached_stats',
              sequence_id: 1,
              public_id: 'cs-1',
              timestamp: '2026-05-18T10:00:00Z',
              session_id: 'sid',
              topic: null,
              left: 'kraken:EUR-USD',
              right: 'kraken:GBP-USD',
              pearson_r: 0.85,
              pearson_n: 96,
              coint_t: -3.9,
              coint_pvalue: 0.02,
              coint_critical_values: [-3.9, -3.3, -3],
              computed_at: '2026-05-18T10:00:00Z',
              sample_count: 96,
              is_warm: true,
            },
          ],
        },
      },
    } as never)

    try {
      renderWithProviders(<MarketData />)
      const chip = await screen.findByRole('button', { name: /Pair stats with GBP-USD/i })

      fireEvent.click(chip)
      expect(mockSetSelectedMarket).toHaveBeenCalledWith({
        exchange: 'kraken',
        instrument: 'GBP-USD',
      })
    } finally {
      vi.mocked(useAllConfiguredPairStats).mockReturnValue({
        data: undefined,
      } as never)
    }
  })
})
