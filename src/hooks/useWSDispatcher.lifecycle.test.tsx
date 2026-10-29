import { StrictMode, useEffect, type ReactNode } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WebSocketClient from '../lib/websocket/client'
import type { MessageHandler } from '../lib/websocket/types'
import type { CandleData, WebSocketMessages } from '../types/ws'
import type { CandleData as ApiCandleData } from '../types/api'
import { useWebSocketStore } from '../stores/websocket'
import { resetDispatcher, type WSDispatcher } from '../stores/wsDispatcher'
import { useProcessMetricsStore } from '../stores/processMetrics'
import { useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'
import { useMarketStore } from '../stores/market'
import { MarketChart } from '../features/market/MarketChart'
import type { getCandlesRange } from '../lib/api/market'
import { useWSDispatcher } from './useWSDispatcher'

const chart = vi.hoisted(() => ({
  getCandlesRange: vi.fn<typeof getCandlesRange>(),
  timeScale: {
    getVisibleLogicalRange: vi.fn(() => ({ from: 0, to: 1 })),
    setVisibleLogicalRange: vi.fn(),
    fitContent: vi.fn(),
    width: vi.fn(() => 1000),
    subscribeVisibleLogicalRangeChange: vi.fn(),
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
  },
  series: {
    setData: vi.fn(),
    update: vi.fn(),
    barsInLogicalRange: vi.fn(() => ({ barsBefore: 500, barsAfter: 0 })),
  },
}))

vi.mock('../lib/api/market', () => ({ getCandlesRange: chart.getCandlesRange }))
vi.mock('../components/LightweightChart', () => ({
  LightweightChart: ({
    onChartReady,
  }: {
    onChartReady: (
      value: {
        chart: { timeScale: () => typeof chart.timeScale }
        series: typeof chart.series
      } | null
    ) => void
  }) => {
    useEffect(() => {
      onChartReady({ chart: { timeScale: () => chart.timeScale }, series: chart.series })

      return () => onChartReady(null)
    }, [onChartReady])

    return <div data-testid='chart-shell' />
  },
}))

const SHELL_TOPICS = ['processes.events.summary.']
const OTHER_TOPICS = ['portfolio.accounts.']

interface ConnectedClient {
  client: WebSocketClient
  emit: (message: WebSocketMessages) => void
  listenerCount: (type: string) => number
}

const connectedClient = (): ConnectedClient => {
  const client = new WebSocketClient({ url: 'ws://unit.invalid' })
  const handlers = new Map<string, Set<MessageHandler>>()

  client.disconnect()
  vi.spyOn(client, 'isConnected').mockReturnValue(true)
  vi.spyOn(client, 'subscribe').mockImplementation(() => undefined)
  vi.spyOn(client, 'onMessage').mockImplementation((type, handler) => {
    const listeners = handlers.get(type) ?? new Set<MessageHandler>()

    listeners.add(handler)
    handlers.set(type, listeners)

    return () => {
      listeners.delete(handler)
    }
  })

  return {
    client,
    emit: message => {
      for (const handler of handlers.get(message.type) ?? []) handler(message)
    },
    listenerCount: type => handlers.get(type)?.size ?? 0,
  }
}

const candle = (): CandleData & ApiCandleData => ({
  type: 'candle',
  public_id: 'closed-candle',
  session_id: 'unit-session',
  sequence_id: 1,
  timestamp: '2026-10-29T21:20:01Z',
  exchange: 'kraken',
  instrument: 'BTC-EUR',
  timeframe: '1m',
  open_at: '2026-10-29T21:19:00Z',
  open: 100,
  high: 102,
  low: 99,
  close: 101,
  volume: 10,
  complete: true,
  origin: 'live',
})

interface DispatcherTreeProps {
  enabled: boolean
  showMarket?: boolean
  topics?: string[]
  onShell: (dispatcher: WSDispatcher | null) => void
  onMarket: (dispatcher: WSDispatcher | null) => void
  onCandle: (value: CandleData) => void
}

function MarketConsumer({
  enabled,
  onMarket,
  onCandle,
}: Pick<DispatcherTreeProps, 'enabled' | 'onMarket' | 'onCandle'>): ReactNode {
  const dispatcher = useWSDispatcher({ enabled })

  useEffect(() => onMarket(dispatcher), [dispatcher, onMarket])
  useEffect(() => dispatcher?.onLiveCandle(onCandle), [dispatcher, onCandle])

  return null
}

function DispatcherTree({
  enabled,
  showMarket = true,
  topics = SHELL_TOPICS,
  onShell,
  onMarket,
  onCandle,
}: DispatcherTreeProps): ReactNode {
  const dispatcher = useWSDispatcher({ enabled, topics })

  useEffect(() => onShell(dispatcher), [dispatcher, onShell])

  return showMarket ? (
    <MarketConsumer enabled={enabled} onMarket={onMarket} onCandle={onCandle} />
  ) : null
}

function MarketChartConsumer({ enabled }: { enabled: boolean }): ReactNode {
  const dispatcher = useWSDispatcher({ enabled })

  return (
    <MarketChart
      enabled
      exchange='kraken'
      instrument='BTC-EUR'
      timeframe='1m'
      precision={2}
      anchorMs={null}
      dispatcher={dispatcher}
    />
  )
}

function ChartShell({ enabled }: { enabled: boolean }): ReactNode {
  useWSDispatcher({ enabled, topics: SHELL_TOPICS })

  return <MarketChartConsumer enabled={enabled} />
}

describe('real dispatcher ownership across nested shell and market hooks', () => {
  let queryClient: QueryClient
  let connection: ConnectedClient
  let shell: WSDispatcher | null
  let market: WSDispatcher | null
  const onCandle = vi.fn<(value: CandleData) => void>()

  const onShell = (value: WSDispatcher | null): void => {
    shell = value
  }

  const onMarket = (value: WSDispatcher | null): void => {
    market = value
  }

  const props = { onShell, onMarket, onCandle }

  function wrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  beforeEach(() => {
    resetDispatcher()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    connection = connectedClient()
    shell = null
    market = null
    onCandle.mockClear()
    chart.getCandlesRange.mockReset()
    chart.series.setData.mockClear()
    chart.series.update.mockClear()
    useAppStore.setState({ asOf: null, isTimeTraveling: false })
    useAuthStore.setState({ isAuthenticated: true, user: null, csrfToken: null })
    useMarketStore.setState({
      selectedExchange: 'kraken',
      selectedInstrument: 'BTC-EUR',
      selectedTimeframe: '1m',
    })
    useWebSocketStore.setState({ wsClient: connection.client, isConnected: true })
  })

  afterEach(() => {
    cleanup()
    resetDispatcher()
    useWebSocketStore.setState({ wsClient: null, isConnected: false })
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it('keeps the market attached when nested shell and market return from historical mode together', async () => {
    const { rerender } = render(<DispatcherTree enabled={false} {...props} />, { wrapper })

    expect(shell).toBeNull()
    expect(market).toBeNull()
    rerender(<DispatcherTree enabled {...props} />)
    await waitFor(() => {
      expect(shell?.isAttached()).toBe(true)
      expect(market?.isAttached()).toBe(true)
    })
    expect(market).not.toBe(shell)
    expect(market?.getClient()).toBe(connection.client)
    act(() => connection.emit(candle()))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(candle())
  })

  it('delivers closed candles after a live to historical to live cycle', async () => {
    const { rerender } = render(<DispatcherTree enabled {...props} />, { wrapper })

    await waitFor(() => expect(market).not.toBeNull())
    const previousMarket = market

    rerender(<DispatcherTree enabled={false} {...props} />)
    expect(connection.listenerCount('candle')).toBe(0)
    rerender(<DispatcherTree enabled {...props} />)
    await waitFor(() => expect(market?.isAttached()).toBe(true))
    expect(market).not.toBe(previousMarket)
    act(() => connection.emit(candle()))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(candle())
  })

  it('does not detach the market when only the shell topics change', async () => {
    const { rerender } = render(<DispatcherTree enabled {...props} />, { wrapper })

    await waitFor(() => expect(market).not.toBeNull())
    const previousMarket = market

    rerender(<DispatcherTree enabled topics={OTHER_TOPICS} {...props} />)
    await waitFor(() => {
      expect(shell?.isAttached()).toBe(true)
      expect(market?.isAttached()).toBe(true)
    })
    expect(market).toBe(previousMarket)
    act(() => connection.emit(candle()))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(candle())
  })

  it('rebinds both owned dispatchers when the connected client is replaced', async () => {
    render(<DispatcherTree enabled {...props} />, { wrapper })
    const replacement = connectedClient()

    act(() => useWebSocketStore.setState({ wsClient: replacement.client }))
    await waitFor(() => {
      expect(shell?.getClient()).toBe(replacement.client)
      expect(market?.getClient()).toBe(replacement.client)
    })
    expect(connection.listenerCount('candle')).toBe(0)
    act(() => connection.emit(candle()))
    expect(onCandle).not.toHaveBeenCalled()
    act(() => replacement.emit(candle()))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(candle())
  })

  it('reattaches both consumers after a connection drops and reconnects', async () => {
    render(<DispatcherTree enabled {...props} />, { wrapper })
    act(() => useWebSocketStore.setState({ isConnected: false }))
    expect(connection.listenerCount('candle')).toBe(0)
    act(() => connection.emit(candle()))
    expect(onCandle).not.toHaveBeenCalled()
    act(() => useWebSocketStore.setState({ isConnected: true }))
    await waitFor(() => {
      expect(shell?.isAttached()).toBe(true)
      expect(market?.isAttached()).toBe(true)
    })
    act(() => connection.emit(candle()))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(candle())
  })

  it('binds a fresh market instance to a replacement query client', async () => {
    const { rerender } = render(<DispatcherTree enabled {...props} />, { wrapper })

    await waitFor(() => expect(market).not.toBeNull())
    const previousMarket = market
    const previousQueryClient = queryClient

    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    rerender(<DispatcherTree enabled {...props} />)
    await waitFor(() => {
      expect(shell?.isAttached()).toBe(true)
      expect(market?.isAttached()).toBe(true)
    })
    expect(market).not.toBe(previousMarket)
    previousQueryClient.clear()
    act(() => connection.emit(candle()))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(candle())
  })

  it('keeps shell ownership when the market consumer unmounts', async () => {
    const { rerender } = render(<DispatcherTree enabled {...props} />, { wrapper })

    await waitFor(() => expect(shell?.isAttached()).toBe(true))
    rerender(<DispatcherTree enabled showMarket={false} {...props} />)
    expect(shell?.getClient()).toBe(connection.client)
    expect(connection.listenerCount('candle')).toBe(1)
  })

  it('recovers both attached instances after StrictMode replays effects', async () => {
    render(
      <StrictMode>
        <DispatcherTree enabled {...props} />
      </StrictMode>,
      { wrapper }
    )

    await waitFor(() => {
      expect(shell?.isAttached()).toBe(true)
      expect(market?.isAttached()).toBe(true)
    })
    act(() => connection.emit(candle()))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(candle())
  })

  it('preserves metrics reset on shell setup without resetting it for market-only setup', async () => {
    const reset = vi.spyOn(useProcessMetricsStore.getState(), 'reset')
    const { rerender } = render(<DispatcherTree enabled={false} {...props} />, { wrapper })

    rerender(<DispatcherTree enabled {...props} />)
    await waitFor(() => expect(shell?.isAttached()).toBe(true))
    expect(reset).toHaveBeenCalledTimes(1)
    rerender(<DispatcherTree enabled showMarket={false} {...props} />)
    rerender(<DispatcherTree enabled {...props} />)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('reconciles a closed candle through actual MarketChart after the nested historical to live transition', async () => {
    useAppStore.setState({ asOf: '2026-10-29T20:00:00Z', isTimeTraveling: true })
    const tail = { ...candle(), open_at: '2026-10-29T21:20:00Z', complete: false }

    chart.getCandlesRange.mockResolvedValue([{ ...candle(), complete: false }, tail])
    const { rerender } = render(<ChartShell enabled={false} />, { wrapper })

    await waitFor(() => expect(chart.series.setData).toHaveBeenCalled())
    act(() => useAppStore.setState({ asOf: null, isTimeTraveling: false }))
    rerender(<ChartShell enabled />)
    await waitFor(() => expect(chart.getCandlesRange).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(chart.series.setData).toHaveBeenCalledTimes(2))
    chart.getCandlesRange.mockResolvedValue([
      { ...candle(), timestamp: '2026-10-29T21:20:02Z', high: 106, close: 105 },
    ])
    act(() => connection.emit(candle()))

    await waitFor(() => expect(chart.getCandlesRange).toHaveBeenCalledTimes(3))
    const narrow = chart.getCandlesRange.mock.calls[2]

    expect(narrow?.slice(0, 3)).toEqual(['BTC-EUR', 'kraken', '1m'])
    expect(narrow?.[3]).toBe('2026-10-29T21:19:00.000Z')
    expect(narrow?.[4]).toBe('2026-10-29T21:19:59.999Z')
    expect(narrow?.[5]).toBe(1)
    expect(typeof narrow?.[6]).toBe('string')
    await waitFor(() =>
      expect(chart.series.setData).toHaveBeenLastCalledWith([
        expect.objectContaining({ close: 105 }),
        expect.objectContaining({ close: 101 }),
      ])
    )
  })
})
