import { useEffect, type ReactNode } from 'react'
import { act, cleanup, render, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import toast, { useToasterStore } from 'react-hot-toast'
import WebSocketClient from '../lib/websocket/client'
import { parseWsMessage } from '../lib/schemas/ws'
import { useWebSocketStore } from '../stores/websocket'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'
import { useMarketStore } from '../stores/market'
import { useProcessMetricsStore } from '../stores/processMetrics'
import {
  aiReviewActivityQueryKey,
  resetDispatcher,
  type WSDispatcher,
} from '../stores/wsDispatcher'
import { makeUserProfile } from '../test/factories'
import {
  createCandle,
  createExecution,
  createOrder,
  createSignal,
} from '../test/wsMessageFactories'
import type {
  AlertEventData,
  AiReviewRequestFrameData,
  AccountStateChangedEventData,
  ProcessSummaryEventData,
  CandleData,
} from '../types/ws'
import type { CachedCandlesResponse } from '../types/api'
import { useWSDispatcher } from './useWSDispatcher'

class MemorySocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: MemorySocket[] = []
  readonly url: string
  readyState: number = MemorySocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  readonly send = vi.fn<(value: string) => void>()

  constructor(url: string) {
    this.url = url
    MemorySocket.instances.push(this)
  }

  open(): void {
    this.readyState = MemorySocket.OPEN
    this.onopen?.(new Event('open'))
  }

  receive<T extends { type: string }>(message: T): void {
    expect(parseWsMessage(message)?.type).toBe(message.type)
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))
  }

  close(): void {
    this.readyState = MemorySocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code: 1000 }))
  }
}

const PROVENANCE = {
  public_id: 'unit-event',
  session_id: 'unit-session',
  sequence_id: 1,
  timestamp: '2026-10-29T21:20:01Z',
}
const SHELL_TOPICS = ['processes.events.summary.', 'ai_reviews.']
const CACHE_KEY = ['market', 'cache', 'candles', 'kraken', 'BTC-USD', '1m', 100, null]

const alert = (): AlertEventData => ({
  ...PROVENANCE,
  type: 'alert_event',
  user_public_id: 'unit-user',
  alert_type: 'critical_system_error',
  priority: 'high',
  is_safety_critical: true,
  title: 'Unit event',
  body: 'One input frame.',
})

const summary = (): ProcessSummaryEventData => ({
  ...PROVENANCE,
  type: 'process_summary_event',
  coordinator: 'unit-coordinator',
  coordinator_label: 'Unit',
  processes: [],
  snapshot_at: PROVENANCE.timestamp,
})

const account = (): AccountStateChangedEventData => ({
  ...PROVENANCE,
  type: 'account_state_changed_event',
  wallet_public_id: 'unit-wallet',
  exchange: 'kraken',
  mode: 'live',
  kind: 'snapshot',
})

const review = (): AiReviewRequestFrameData => ({
  ...PROVENANCE,
  type: 'ai_review.request',
  review_public_id: 'unit-review',
  user_public_id: 'unit-user',
  strategy_public_id: 'unit-strategy',
  wallet_public_id: 'unit-wallet',
  instrument_public_id: 'unit-instrument',
  selected_delegate_public_id: 'unit-delegate',
  deadline: '2026-10-29T21:25:00Z',
  signal_envelope: {},
  instrument_metadata: {},
  dispatch_version: 0,
})

const cached = (): CachedCandlesResponse => ({
  ...PROVENANCE,
  type: 'cached_candles',
  payload: { candles: [], sample_count: 0, is_warm: false, source: 'cache' },
})

interface ConsumersProps {
  enabled?: boolean
  showMarket?: boolean
  onMarket: (dispatcher: WSDispatcher | null) => void
  onCandle: (message: CandleData) => void
}

function MarketConsumer({
  enabled,
  onMarket,
  onCandle,
}: Required<Pick<ConsumersProps, 'enabled' | 'onMarket' | 'onCandle'>>): ReactNode {
  const dispatcher = useWSDispatcher({ enabled })

  useEffect(() => onMarket(dispatcher), [dispatcher, onMarket])
  useEffect(() => dispatcher?.onLiveCandle(onCandle), [dispatcher, onCandle])

  return null
}

function Consumers({
  enabled = true,
  showMarket = true,
  onMarket,
  onCandle,
}: ConsumersProps): ReactNode {
  useWSDispatcher({ enabled, topics: SHELL_TOPICS })

  return showMarket ? (
    <MarketConsumer enabled={enabled} onMarket={onMarket} onCandle={onCandle} />
  ) : null
}

describe('one real WebSocket client shared by shell and market dispatchers', () => {
  let queryClient: QueryClient
  let client: WebSocketClient
  let wire: MemorySocket
  let market: WSDispatcher | null
  const onCandle = vi.fn<(message: CandleData) => void>()

  const onMarket = (dispatcher: WSDispatcher | null): void => {
    market = dispatcher
  }

  function wrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  const mount = (props: Partial<Pick<ConsumersProps, 'enabled' | 'showMarket'>> = {}) =>
    render(<Consumers {...props} onMarket={onMarket} onCandle={onCandle} />, { wrapper })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', MemorySocket)
    MemorySocket.instances = []
    resetDispatcher()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    market = null
    onCandle.mockClear()
    useAppStore.setState({ asOf: null, isTimeTraveling: false })
    useAuthStore.setState({
      isAuthenticated: true,
      user: makeUserProfile({ username: 'unit', public_id: 'unit-user', role: 'auditor' }),
    })
    client = new WebSocketClient({ url: 'ws://unit.invalid/api/ws', heartbeatInterval: 60000 })
    client.onConnection(connected => useWebSocketStore.setState({ isConnected: connected }))
    useWebSocketStore.setState({ wsClient: client, isConnected: false })
    client.connect()
    const socket = MemorySocket.instances.at(-1)

    expect(socket).toBeDefined()
    if (!socket) throw new Error('Missing in-memory browser socket')
    wire = socket
    wire.open()
  })

  afterEach(() => {
    cleanup()
    client.disconnect()
    resetDispatcher()
    queryClient.clear()
    useWebSocketStore.setState({ wsClient: null, isConnected: false })
    toast.remove()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('surfaces exactly one real toast for one validated alert wire frame', () => {
    mount()
    const errorToast = vi.spyOn(toast, 'error')
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useToasterStore())

    act(() => wire.receive(alert()))
    expect(result.current.toasts).toHaveLength(1)
    expect(errorToast).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ['alerts', 'history'],
      refetchType: 'active',
    })
  })

  it('applies a process snapshot and its invalidation once for one wire frame', () => {
    mount()
    const snapshot = vi.spyOn(useProcessMetricsStore.getState(), 'setSnapshot')
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => wire.receive(summary()))
    expect(snapshot).toHaveBeenCalledExactlyOnceWith(
      'unit-coordinator',
      'Unit',
      [],
      PROVENANCE.timestamp
    )
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ['processes', 'summary'],
      refetchType: 'active',
    })
  })

  it('preserves AI cache deduplication while invalidating once per input frame', () => {
    mount()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => wire.receive(review()))
    expect(queryClient.getQueryData(aiReviewActivityQueryKey('unit-user'))).toHaveLength(1)
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ['ai-reviews', 'pending'],
      refetchType: 'active',
    })
  })

  it('invalidates the account projection once for one wire frame', () => {
    mount()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => wire.receive(account()))
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ['portfolio', 'accounts'],
      refetchType: 'active',
    })
  })

  it('preserves order execution and signal cache identity with one global event handler', async () => {
    mount()
    queryClient.setQueryData(['orders', undefined, null], [])
    queryClient.setQueryData(['executions', undefined, null], [])
    queryClient.setQueryData(['signals', undefined, null], [])
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => {
      wire.receive({ ...createOrder(), mode: 'live', wallet_public_id: 'unit-wallet' })
      wire.receive({
        ...createExecution(),
        wallet_public_id: 'unit-wallet',
        liquidity_role: 'taker',
      })
      wire.receive({ ...createSignal(), wallet_public_id: 'unit-wallet' })
    })
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(queryClient.getQueryData(['orders', undefined, null])).toHaveLength(1)
    expect(queryClient.getQueryData(['executions', undefined, null])).toHaveLength(1)
    expect(queryClient.getQueryData(['signals', undefined, null])).toHaveLength(1)
    expect(
      invalidate.mock.calls.filter(([arg]) => arg?.queryKey?.[0] === 'positions')
    ).toHaveLength(2)
    expect(
      invalidate.mock.calls.filter(([arg]) => arg?.queryKey?.[0] === 'trailingStopState')
    ).toHaveLength(1)
  })

  it('keeps the shell global delivery intact when Market is not mounted', () => {
    mount({ showMarket: false })
    const errorToast = vi.spyOn(toast, 'error')
    const snapshot = vi.spyOn(useProcessMetricsStore.getState(), 'setSnapshot')

    act(() => {
      wire.receive(alert())
      wire.receive(summary())
    })
    expect(errorToast).toHaveBeenCalledTimes(1)
    expect(snapshot).toHaveBeenCalledTimes(1)
  })

  it('registers every global event family once while retaining the separate candle observer', () => {
    const messages = vi.spyOn(client, 'onMessage')
    const connections = vi.spyOn(client, 'onConnection')

    mount()

    for (const type of [
      'order',
      'execution',
      'signal',
      'tick',
      'trade',
      'heartbeat',
      'pong',
      'ai_review.request',
      'ai_review.decision_ack',
      'ai_review.caps_violation',
      'alert_event',
      'account_state_changed_event',
      'process_summary_event',
      'process_configured_event',
      'process_run_event',
      'strategy_list_event',
      'subscription_success',
    ]) {
      expect(messages.mock.calls.filter(([registered]) => registered === type)).toHaveLength(1)
    }

    expect(messages.mock.calls.filter(([registered]) => registered === 'candle')).toHaveLength(2)
    expect(connections).toHaveBeenCalledTimes(1)
  })

  it.each([
    {
      message: {
        ...PROVENANCE,
        type: 'process_configured_event',
        process_names: ['unit-process'],
        snapshot_at: PROVENANCE.timestamp,
      },
      queryKey: ['processes', 'configured'],
    },
    {
      message: {
        ...PROVENANCE,
        type: 'process_run_event',
        process_name: 'unit-process',
        run_id: 'unit-run',
        status: 'running',
        started_at: PROVENANCE.timestamp,
      },
      queryKey: ['processes', 'runs'],
    },
    {
      message: {
        ...PROVENANCE,
        type: 'strategy_list_event',
        strategy_classes: ['UnitStrategy'],
        snapshot_at: PROVENANCE.timestamp,
      },
      queryKey: ['strategies'],
    },
  ])('delivers $message.type once through the real parser', ({ message, queryKey }) => {
    mount()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => wire.receive(message))
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey, refetchType: 'active' })
  })

  it('keeps one global price update and one market observer for an unbuffered closed candle', async () => {
    mount()
    queryClient.setQueryData(CACHE_KEY, cached())
    const price = vi.spyOn(useMarketStore.getState(), 'updateLastPrice')
    const value = createCandle()

    act(() => wire.receive(value))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(price).toHaveBeenCalledExactlyOnceWith(value.close)
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(value)
    expect(
      queryClient.getQueryData<CachedCandlesResponse>(CACHE_KEY)?.payload.candles
    ).toHaveLength(1)
  })

  it('retains buffered closed notifications across an HTTP cache snapshot replacement', async () => {
    mount()
    expect(market?.isAttached()).toBe(true)
    market?.startBuffering('BTC-USD', 'kraken', '1m')
    queryClient.setQueryData(CACHE_KEY, cached())
    const value = createCandle()

    act(() => wire.receive(value))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(onCandle).not.toHaveBeenCalled()
    queryClient.setQueryData(CACHE_KEY, cached())
    act(() => market?.flushBuffer('BTC-USD', 'kraken', '1m'))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(value)
    expect(
      queryClient.getQueryData<CachedCandlesResponse>(CACHE_KEY)?.payload.candles
    ).toHaveLength(1)
  })

  it('keeps global event side effects single after a historical-to-live remount', () => {
    const { rerender } = mount({ enabled: false })

    rerender(<Consumers enabled onMarket={onMarket} onCandle={onCandle} />)
    const errorToast = vi.spyOn(toast, 'error')

    act(() => wire.receive(alert()))
    expect(errorToast).toHaveBeenCalledTimes(1)
  })

  it('keeps one global owner and one candle observer after an actual connection close and reopen', async () => {
    mount()
    act(() => wire.close())
    expect(useWebSocketStore.getState().isConnected).toBe(false)
    act(() => {
      client.connect()
      const replacement = MemorySocket.instances.at(-1)

      if (!replacement) throw new Error('Missing replacement browser socket')
      wire = replacement
      wire.open()
    })
    const errorToast = vi.spyOn(toast, 'error')
    const value = createCandle()

    act(() => {
      wire.receive(alert())
      wire.receive(value)
    })
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(errorToast).toHaveBeenCalledTimes(1)
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(value)
  })

  it('delivers an older finalized correction to the market observer without rewriting the global cache tail', async () => {
    mount()
    queryClient.setQueryData(CACHE_KEY, cached())
    const latest = createCandle({ open_at: '2026-10-29T22:01:00Z' })
    const correction = createCandle({
      open_at: '2026-10-29T22:00:00Z',
      timestamp: '2026-10-29T22:02:00Z',
      close: 103,
    })

    act(() => wire.receive(latest))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    onCandle.mockClear()
    act(() => wire.receive(correction))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(onCandle).toHaveBeenCalledExactlyOnceWith(correction)
    const rows = queryClient.getQueryData<CachedCandlesResponse>(CACHE_KEY)?.payload.candles

    expect(rows).toHaveLength(1)
    expect(rows?.[0]?.open_at_ms).toBe(Date.parse(latest.open_at))
  })

  it('does not replay an earlier mount buffer into the next market instance', async () => {
    const first = mount()

    market?.startBuffering('BTC-USD', 'kraken', '1m')
    act(() => wire.receive(createCandle()))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(onCandle).not.toHaveBeenCalled()
    const previous = market

    first.unmount()
    mount()
    expect(market).not.toBe(previous)
    act(() => market?.flushBuffer('BTC-USD', 'kraken', '1m'))
    expect(onCandle).not.toHaveBeenCalled()
  })
})
