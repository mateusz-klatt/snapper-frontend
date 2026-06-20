import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MarketData } from './MarketData'

const mockSetSelectedExchange = vi.fn()
const mockSetSelectedInstrument = vi.fn()
const mockSetSelectedMarket = vi.fn()
const mockSetSelectedTimeframe = vi.fn()

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
  useTimeTravelCandles: vi.fn(() => ({
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
    selector({ asOf: null, isTimeTraveling: false })
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
  })),
}))
vi.mock('./MarketChart', () => ({
  MarketChart: ({ instrument, timeframe }: { instrument: string | null; timeframe: string }) => (
    <div data-testid='market-chart'>
      Chart {instrument} {timeframe}
    </div>
  ),
}))
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const renderWithProviders = (ui: ReactNode) => {
  const queryClient = createQueryClient()

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('MarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('renders market data component', () => {
    renderWithProviders(<MarketData />)
    expect(screen.getByText(/Market Data/i)).toBeInTheDocument()
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
    expect(screen.queryByText(/Current Price/)).not.toBeInTheDocument()
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
    expect(screen.queryByText(/Current Price/)).not.toBeInTheDocument()
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
  it('displays stats when candles data is available', async () => {
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
      expect(screen.getAllByText('Current Price').length).toBeGreaterThan(0)
      expect(screen.getAllByText('24h Change').length).toBeGreaterThan(0)
      expect(screen.getAllByText('24h High').length).toBeGreaterThan(0)
      expect(screen.getAllByText('24h Low').length).toBeGreaterThan(0)
    })
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
  it('handles duplicate open_at by keeping the last one', async () => {
    const mockCandles = [
      { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.082 },
      { open_at: '2024-01-01T00:00:00Z', open: 1.0825, high: 1.0855, low: 1.08, close: 1.084 },
      { open_at: '2024-01-01T01:00:00Z', open: 1.084, high: 1.087, low: 1.083, close: 1.086 },
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
      expect(screen.getAllByText('Current Price').length).toBeGreaterThan(0)
    })
  })
  it('displays positive change with green color', async () => {
    const mockCandles = [
      { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.08 },
      { open_at: '2024-01-01T01:00:00Z', open: 1.08, high: 1.086, low: 1.079, close: 1.085 },
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
      const changeElement = screen.getByText(/\+0\.0050/)

      expect(changeElement).toBeInTheDocument()
      expect(changeElement).toHaveClass('text-rising-600')
    })
  })
  it('displays negative change with red color', async () => {
    const mockCandles = [
      { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.085 },
      { open_at: '2024-01-01T01:00:00Z', open: 1.085, high: 1.086, low: 1.079, close: 1.08 },
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
      const changeElement = screen.getByText(/-0\.0050/)

      expect(changeElement).toBeInTheDocument()
      expect(changeElement).toHaveClass('text-falling-600')
    })
  })
  it('switches the chart to a market-time window when scrubbed into the past', async () => {
    const replayCandles = [
      {
        type: 'candle',
        session_id: '',
        sequence_id: 0,
        public_id: 'r1',
        timestamp: '2024-01-01T00:00:00Z',
        instrument: 'EUR-USD',
        exchange: 'kraken',
        timeframe: '1h',
        open_at: '2024-01-01T00:00:00Z',
        open: 1.08,
        high: 1.085,
        low: 1.079,
        close: 1.08,
        vwap: 1.08,
        trades: 1,
        volume: 1,
      },
      {
        type: 'candle',
        session_id: '',
        sequence_id: 0,
        public_id: 'r2',
        timestamp: '2024-01-01T01:00:00Z',
        instrument: 'EUR-USD',
        exchange: 'kraken',
        timeframe: '1h',
        open_at: '2024-01-01T01:00:00Z',
        open: 1.08,
        high: 1.09,
        low: 1.079,
        close: 1.088,
        vwap: 1.08,
        trades: 1,
        volume: 1,
      },
    ]
    const { useCachedCandles, useTimeTravelCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useTimeTravelCandles).mockReturnValue({
      data: replayCandles,
      isLoading: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    } as never)
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    await user.click(screen.getByRole('button', { name: '-1d' }))
    await waitFor(() => {
      expect(screen.getAllByText('Current Price').length).toBeGreaterThan(0)
    })
    expect(vi.mocked(useTimeTravelCandles)).toHaveBeenCalledWith(
      'kraken',
      'EUR-USD',
      '1h',
      expect.any(String),
      expect.any(String),
      400,
      true
    )
  })

  it('keeps an empty stats window while scrubbing before replay candles load', async () => {
    const { useCachedCandles, useTimeTravelCandles } = await import('../../hooks/queries/market')

    vi.mocked(useCachedCandles).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as never)
    vi.mocked(useTimeTravelCandles).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as never)
    const user = userEvent.setup()

    renderWithProviders(<MarketData />)
    await user.click(screen.getByRole('button', { name: '-1d' }))
    await waitFor(() => {
      expect(screen.getByTestId('market-chart')).toBeInTheDocument()
    })
    expect(screen.queryByText('Current Price')).not.toBeInTheDocument()
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
    expect(screen.queryByText('Current Price')).not.toBeInTheDocument()
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
  it('calculates stats from single candle', async () => {
    const mockCandles = [
      { open_at: '2024-01-01T00:00:00Z', open: 1.08, high: 1.085, low: 1.079, close: 1.082 },
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
      expect(screen.getAllByText('Current Price').length).toBeGreaterThan(0)
    })
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
  it('enables candle fetch in time travel even without subscription', async () => {
    const { useAppStore } = await import('../../stores/app')
    const { useMarketSubscription } = await import('../../hooks/useMarketSubscription')

    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: '2024-01-01T00:00:00Z', isTimeTraveling: true })) as never)
    vi.mocked(useMarketSubscription).mockReturnValue(false)
    const { useCachedCandles } = await import('../../hooks/queries/market')

    renderWithProviders(<MarketData />)
    await waitFor(() => {
      expect(vi.mocked(useCachedCandles)).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        true
      )
    })
    vi.mocked(useAppStore).mockImplementation(((
      selector: (s: Record<string, unknown>) => unknown
    ) => selector({ asOf: null, isTimeTraveling: false })) as never)
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
