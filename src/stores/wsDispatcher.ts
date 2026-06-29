import { QueryClient } from '@tanstack/react-query'
import React from 'react'
import toast from 'react-hot-toast'
import WebSocketClient from '../lib/websocket/client'
import i18n from '../i18n/config'
import { AlertToastBody } from '../features/notifications/AlertToastBody'
import { openAlertModal } from '../features/notifications/openAlertModal'
import { useMarketStore } from './market'
import { useAppStore } from './app'
import { useAuthStore } from './auth'
import { useProcessMetricsStore } from './processMetrics'
import {
  type WebSocketMessages,
  type PongWithRtt,
  type CandleData,
  type OrderData,
  type ExecutionData,
  type SignalData,
  type AiReviewCapsViolationFrameData,
  type AiReviewDecisionAckFrameData,
  type AiReviewRequestFrameData,
  type AlertEventData,
  isOrder,
  isExecution,
  isSignal,
  isCandle,
  isTick,
  isTrade,
  isHeartbeat,
  isAlertEvent,
  isAiReviewRequest,
  isAiReviewDecisionAck,
  isAiReviewCapsViolation,
  isProcessSummaryEvent,
  isProcessConfiguredEvent,
  isProcessRunEvent,
  isStrategyListEvent,
} from '../types/ws'
import type { CachedCandle, CachedCandlesResponse } from '../types/api'
import {
  orderDataFromEnvelope,
  executionDataFromEnvelope,
  signalDataFromEnvelope,
} from '../lib/transforms'
import { queryKeys } from '../hooks/queries/keys'

export type AiReviewActivityFrame =
  AiReviewRequestFrameData | AiReviewDecisionAckFrameData | AiReviewCapsViolationFrameData

export const AI_REVIEW_ACTIVITY_QUERY_KEY_ROOT = 'ai-review-activity'
export const AI_REVIEW_ACTIVITY_RING_CAP = 1024
export const ALERT_TOAST_RING_CAP = 3
export const ALERT_HISTORY_QUERY_KEY_PREFIX = ['alerts', 'history'] as const

/**
 * Compose the per-user cache key for the AI review activity ring buffer.
 *
 * Defense-in-depth atop B#3 (`feddb225` 2026-05-01) — the QueryClient
 * is wiped via `queryClient.clear()` in both logout paths
 * (`logout` + `silentLogout`), so the primary cross-user leak vector
 * is closed there. The user public_id is folded into the activity key
 * as a belt-and-suspenders guard: even a hypothetical bug in the
 * logout teardown order could not leak delegate A's frames into
 * delegate B's view.
 *
 * Per-key user scoping is intentionally NOT applied to
 * orders/signals/executions/positions (per B#3 decision) — those
 * caches are owned by the QueryClient.clear() teardown plus REST
 * refetch on every mount; adding per-key scoping there would be a
 * risky defensive overlap with no marginal safety gain.
 *
 * ``null`` is the "unauthenticated" sentinel; frames written under
 * this key are intentionally orphaned because no logged-in delegate
 * should ever read them.
 */
export function aiReviewActivityQueryKey(userPublicId: string | null): readonly unknown[] {
  return [AI_REVIEW_ACTIVITY_QUERY_KEY_ROOT, userPublicId]
}

/**
 * Dedup key — `(type, review_public_id, dispatch_version)`.
 *
 * The triple is the protocol-level uniqueness contract: two frames with
 * the same triple are by-construction the same logical event (e.g. a
 * caps-violation re-fanout from a different worker). Collapsing on
 * `review_public_id` alone would incorrectly merge a v0 request with
 * a later v1 re-dispatch.
 */
function aiReviewActivityDedupKey(frame: AiReviewActivityFrame): string {
  return `${frame.type}|${frame.review_public_id}|${frame.dispatch_version}`
}

type UnsubscribeFn = () => void
interface DispatcherConfig {
  queryClient: QueryClient
  topics?: string[]
  maxCandles?: number
}

const DEFAULT_MAX_CANDLES = 100

export class WSDispatcher {
  private wsClient: WebSocketClient | null = null
  private readonly queryClient: QueryClient
  private unsubscribers: UnsubscribeFn[] = []
  private readonly topics: string[]
  private readonly maxCandles: number
  private readonly candleBuffers: Map<string, CandleData[]> = new Map()
  private orderBuffer: OrderData[] | null = null
  private executionBuffer: ExecutionData[] | null = null
  private signalBuffer: SignalData[] | null = null
  private readonly toastIds: string[] = []
  constructor(config: DispatcherConfig) {
    this.queryClient = config.queryClient
    this.maxCandles = config.maxCandles ?? DEFAULT_MAX_CANDLES
    this.topics = config.topics ?? []
  }
  attach(client: WebSocketClient): void {
    this.detach()
    this.wsClient = client
    this.unsubscribers.push(
      client.onMessage('order', this.handleOrderMessage.bind(this)),
      client.onMessage('execution', this.handleExecutionMessage.bind(this)),
      client.onMessage('signal', this.handleSignalMessage.bind(this)),
      client.onMessage('candle', this.handleCandleMessage.bind(this)),
      client.onMessage('tick', this.handleTickMessage.bind(this)),
      client.onMessage('trade', this.handleTradeMessage.bind(this)),
      client.onMessage('heartbeat', this.handleHeartbeatMessage.bind(this)),
      client.onMessage('pong', this.handlePongMessage.bind(this)),
      client.onMessage('ai_review.request', this.handleAiReviewActivityMessage.bind(this)),
      client.onMessage('ai_review.decision_ack', this.handleAiReviewActivityMessage.bind(this)),
      client.onMessage('ai_review.caps_violation', this.handleAiReviewActivityMessage.bind(this)),
      client.onMessage('alert_event', this.handleAlertEventMessage.bind(this)),
      client.onMessage('process_summary_event', this.handleProcessSummaryEvent.bind(this)),
      client.onMessage('process_configured_event', this.handleProcessConfiguredEvent.bind(this)),
      client.onMessage('process_run_event', this.handleProcessRunEvent.bind(this)),
      client.onMessage('strategy_list_event', this.handleStrategyListEvent.bind(this)),
      client.onMessage('subscription_success', () => {
        useAppStore.getState().setSubscribedTopics(client.getSubscribedTopics())
      }),
      client.onConnection((connected: boolean) => {
        if (connected && this.topics.length > 0) {
          const existing = new Set(client.getSubscribedTopics())
          const newTopics = this.topics.filter(t => !existing.has(t))

          if (newTopics.length > 0) {
            client.subscribe(newTopics)
          }

          useAppStore.getState().setSubscribedTopics(client.getSubscribedTopics())
        } else if (!connected) {
          useAppStore.getState().setSubscribedTopics([])
        }

        useAppStore.getState().setConnected(connected)

        if (connected) {
          this.invalidateOnReconnect()
        }
      })
    )

    if (client.isConnected()) {
      if (this.topics.length > 0) {
        client.subscribe(this.topics)
      }

      useAppStore.getState().setConnected(true)
      useAppStore.getState().setSubscribedTopics(client.getSubscribedTopics())
      this.invalidateOnReconnect()
    }
  }
  /**
   * Mirror the reconnect-invalidation block both branches share.
   *
   * `useWSDispatcher` detaches the dispatcher when the connection
   * drops; on reconnect the `attach()` already-connected branch runs
   * INSTEAD of the `onConnection(true)` callback. The Codex Q2
   * post-commit review caught that asymmetry — both paths must
   * invalidate the same set of caches or hooks that dropped polling
   * will go stale until the next manual refresh.
   */
  private invalidateOnReconnect(): void {
    this.invalidateActive(queryKeys.pendingAiReviewsAll)
    this.invalidateActive(queryKeys.positionsAll)
    this.invalidateActive(queryKeys.trailingStopAll)
    this.invalidateActive(queryKeys.processSummaryAll)
    this.invalidateActive(queryKeys.configuredProcessesAll)
    this.invalidateActive(queryKeys.processRunsAll)
    this.invalidateActive(queryKeys.strategiesAll)
  }
  detach(): void {
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
    this.wsClient = null
  }
  private handleOrderMessage(message: WebSocketMessages): void {
    if (!isOrder(message)) return

    this.mergeOrderIntoCache(message)
  }
  private handleExecutionMessage(message: WebSocketMessages): void {
    if (!isExecution(message)) return

    this.mergeExecutionIntoCache(message)
  }
  private handleSignalMessage(message: WebSocketMessages): void {
    if (!isSignal(message)) return

    this.mergeSignalIntoCache(message)
  }
  private handleCandleMessage(message: WebSocketMessages): void {
    if (!isCandle(message)) return

    if (message.close !== undefined && message.close !== null) {
      useMarketStore.getState().updateLastPrice(message.close)
    }

    if (message.instrument && message.exchange && message.timeframe) {
      this.mergeCandleIntoCache(message)
    }
  }
  startBuffering(instrument: string, exchange: string, timeframe: string): void {
    const bufferKey = `${instrument}:${exchange}:${timeframe}`

    this.candleBuffers.set(bufferKey, [])
  }
  flushBuffer(instrument: string, exchange: string, timeframe: string): void {
    const bufferKey = `${instrument}:${exchange}:${timeframe}`
    const buffered = this.candleBuffers.get(bufferKey)

    this.candleBuffers.delete(bufferKey)

    if (!buffered || buffered.length === 0) {
      return
    }

    for (const candle of buffered) {
      this.mergeCandleIntoCache(candle)
    }
  }
  stopBuffering(instrument: string, exchange: string, timeframe: string): void {
    const bufferKey = `${instrument}:${exchange}:${timeframe}`

    this.candleBuffers.delete(bufferKey)
  }
  startTradeBuffering(): void {
    this.orderBuffer = []
    this.executionBuffer = []
    this.signalBuffer = []
  }
  flushTradeBuffer(): void {
    const orders = this.orderBuffer
    const executions = this.executionBuffer
    const signals = this.signalBuffer

    this.orderBuffer = null
    this.executionBuffer = null
    this.signalBuffer = null

    if (orders) {
      for (const o of orders) {
        this.mergeOrderIntoCache(o)
      }
    }

    if (executions) {
      for (const e of executions) {
        this.mergeExecutionIntoCache(e)
      }
    }

    if (signals) {
      for (const s of signals) {
        this.mergeSignalIntoCache(s)
      }
    }
  }
  stopTradeBuffering(): void {
    this.orderBuffer = null
    this.executionBuffer = null
    this.signalBuffer = null
  }
  private mergeCandleIntoCache(envelope: CandleData): void {
    const bufferKey = `${envelope.instrument}:${envelope.exchange}:${envelope.timeframe}`
    const buffer = this.candleBuffers.get(bufferKey)

    if (buffer) {
      buffer.push(envelope)

      return
    }

    const cachedPopulated = this.queryClient
      .getQueriesData<CachedCandlesResponse>({
        queryKey: [
          'market',
          'cache',
          'candles',
          envelope.exchange,
          envelope.instrument,
          envelope.timeframe,
        ],
      })
      .filter(
        (entry): entry is [readonly unknown[], CachedCandlesResponse] =>
          entry[0][entry[0].length - 1] === null && entry[1] !== undefined
      )

    if (cachedPopulated.length === 0) {
      return
    }

    const incomingMs = new Date(envelope.open_at).getTime()
    const incomingSnap: CachedCandle = {
      open_at_ms: incomingMs,
      timeframe: envelope.timeframe,
      open: envelope.open,
      high: envelope.high,
      low: envelope.low,
      close: envelope.close,
      volume: envelope.volume,
    }

    for (const [key, existing] of cachedPopulated) {
      const candles = existing.payload.candles
      const lastCandle = candles[candles.length - 1]
      const lastMs = lastCandle?.open_at_ms ?? 0
      const cap = typeof key[6] === 'number' ? key[6] : this.maxCandles
      let updated: CachedCandle[]

      if (incomingMs === lastMs) {
        updated = [...candles]
        updated[updated.length - 1] = incomingSnap
      } else if (incomingMs > lastMs) {
        const appended = [...candles, incomingSnap]

        updated = appended.length > cap ? appended.slice(-cap) : appended
      } else {
        continue
      }

      this.queryClient.setQueryData<CachedCandlesResponse>(key, {
        ...existing,
        payload: {
          ...existing.payload,
          candles: updated,
          sample_count: updated.length,
          is_warm: existing.payload.is_warm || updated.length >= cap,
        },
      })
    }
  }
  private mergeOrderIntoCache(envelope: OrderData): void {
    this.invalidateActive(queryKeys.positionsAll)
    const queries = this.queryClient
      .getQueriesData<OrderData[]>({ queryKey: ['orders'] })
      .filter(([key]) => key[key.length - 1] === null)

    if (queries.every(([, data]) => !data)) {
      if (this.orderBuffer) {
        this.orderBuffer.push(envelope)
      }

      return
    }

    const data = orderDataFromEnvelope(envelope)

    for (const [queryKey, existing] of queries) {
      if (!existing) continue

      const idx = existing.findIndex(o => o.client_order_id === data.client_order_id)

      if (idx >= 0) {
        const updated = [...existing]

        updated[idx] = data
        this.queryClient.setQueryData<OrderData[]>(queryKey, updated)
      } else {
        this.queryClient.setQueryData<OrderData[]>(queryKey, [data, ...existing])
      }
    }
  }
  private mergeExecutionIntoCache(envelope: ExecutionData): void {
    this.invalidateActive(queryKeys.positionsAll)
    this.invalidateActive(queryKeys.trailingStopAll)
    const queries = this.queryClient
      .getQueriesData<ExecutionData[]>({ queryKey: ['executions'] })
      .filter(([key]) => key[key.length - 1] === null)

    if (queries.every(([, data]) => !data)) {
      if (this.executionBuffer) {
        this.executionBuffer.push(envelope)
      }

      return
    }

    const data = executionDataFromEnvelope(envelope)

    for (const [queryKey, existing] of queries) {
      if (!existing) continue

      const isDuplicate = existing.some(e => e.public_id === data.public_id)

      if (!isDuplicate) {
        this.queryClient.setQueryData<ExecutionData[]>(queryKey, [data, ...existing])
      }
    }
  }
  private mergeSignalIntoCache(envelope: SignalData): void {
    const queries = this.queryClient
      .getQueriesData<SignalData[]>({ queryKey: ['signals'] })
      .filter(([key]) => key[key.length - 1] === null)

    if (queries.every(([, data]) => !data)) {
      if (this.signalBuffer) {
        this.signalBuffer.push(envelope)
      }

      return
    }

    const data = signalDataFromEnvelope(envelope)

    for (const [queryKey, existing] of queries) {
      if (!existing) continue

      const isDuplicate = existing.some(
        s =>
          s.strategy_name === data.strategy_name &&
          s.fired_at === data.fired_at &&
          s.instrument === data.instrument &&
          s.exchange === data.exchange
      )

      if (!isDuplicate) {
        this.queryClient.setQueryData<SignalData[]>(queryKey, [data, ...existing])
      }
    }
  }
  private handleTickMessage(message: WebSocketMessages): void {
    if (!isTick(message)) return

    let lastPrice: number | null = message.last ?? null

    if (
      lastPrice === null &&
      message.bid !== null &&
      message.bid !== undefined &&
      message.ask !== null &&
      message.ask !== undefined
    ) {
      lastPrice = (message.bid + message.ask) / 2
    }

    if (lastPrice !== null) {
      useMarketStore.getState().updateLastPrice(lastPrice)
    }
  }
  private handleTradeMessage(message: WebSocketMessages): void {
    if (!isTrade(message)) return

    useMarketStore.getState().updateLastPrice(message.price)
  }
  private handleHeartbeatMessage(message: WebSocketMessages): void {
    if (!isHeartbeat(message)) return

    useAppStore.getState().updateLastUpdate()
  }
  private handlePongMessage(message: WebSocketMessages): void {
    const rtt = (message as PongWithRtt).rtt_ms

    if (rtt !== undefined) {
      useAppStore.getState().setConnectionLag(rtt)
    }
  }
  private handleAiReviewActivityMessage(message: WebSocketMessages): void {
    if (
      !isAiReviewRequest(message) &&
      !isAiReviewDecisionAck(message) &&
      !isAiReviewCapsViolation(message)
    ) {
      return
    }

    this.mergeAiReviewActivity(message)
    this.invalidateActive(queryKeys.pendingAiReviewsAll)
  }
  /**
   * Phase E live-refresh: invalidate the Alerts tab list + surface a
   * priority-tinted toast.
   *
   * Invocation: registered on `attach()` for the `alert_event` message
   * type. The sidecar (`src/snapper/application/notify/sidecar.py`)
   * publishes one `AlertEventData` frame per persisted alert AFTER
   * the `alert_events` SCD2 insert and BEFORE the APNs fanout; the
   * bridge forwards the frame iff the destination socket's principal
   * matches the payload's `user_public_id` (ADMIN bypasses).
   *
   * Cache invalidation: the `['alerts', 'history']` prefix matches
   * every `useAlertHistory(asOf, operator, wallet)` variant, so any
   * mounted Alerts tab refetches the first page on the next tick.
   * React Query coalesces concurrent invalidations on the same key,
   * so a burst of alert frames does NOT multiply REST calls.
   */
  private handleAlertEventMessage(message: WebSocketMessages): void {
    if (!isAlertEvent(message)) return

    this.invalidateActive([...ALERT_HISTORY_QUERY_KEY_PREFIX])
    this.scheduleAlertToast(message)
  }
  /**
   * Render the toast for a freshly-received alert frame.
   *
   * Skip rule (Decisions table in plan v4): suppress toast iff
   * `priority === 'low' && !is_safety_critical`. Low-priority
   * background-info alerts surface only in the list refresh —
   * safety-critical alerts ALWAYS toast (mirrors iOS quiet-hours
   * bypass semantics for the same flag).
   *
   * High / safety-critical path uses `toast.error` with
   * `ariaProps.role='alert'` + `aria-live='assertive'` so screen
   * readers announce it; medium uses the default `toast()` styling.
   *
   * Ring buffer (cap `ALERT_TOAST_RING_CAP`): when more than N toasts
   * are visible the oldest id is dismissed via `toast.dismiss(id)`
   * to keep the top-right stack readable.
   *
   * Locale: `frame.title` / `frame.body` are backend-resolved per
   * Phase D (`user.default_language`). The CTA label `toast.cta.view`
   * is namespaced under the `alerts` i18n catalog (imported i18n
   * direct, no constructor injection — same pattern as
   * `stores/app.ts` / `stores/auth.ts`).
   */
  private scheduleAlertToast(frame: AlertEventData): void {
    const isLowAndNotSafety = frame.priority === 'low' && !frame.is_safety_critical

    if (isLowAndNotSafety) return

    const isHigh = (frame.is_safety_critical ?? false) || frame.priority === 'high'
    const cta = i18n.t('view', { ns: 'common' })
    const message = `${frame.title}\n${frame.body}`

    const renderBody = (toastObj: { id: string }) =>
      React.createElement(AlertToastBody, {
        message,
        cta,
        onClick: () => openAlertModal(frame.public_id, toastObj.id),
      })

    const id = isHigh
      ? toast.error(renderBody, {
          duration: 6000,
          ariaProps: { role: 'alert', 'aria-live': 'assertive' },
        })
      : toast(renderBody, { duration: 4000 })

    this.toastIds.push(id)

    if (this.toastIds.length > ALERT_TOAST_RING_CAP) {
      const overflow = this.toastIds.length - ALERT_TOAST_RING_CAP
      const dropped = this.toastIds.splice(0, overflow)

      dropped.forEach(d => toast.dismiss(d))
    }
  }
  /**
   * Invalidate paths the four 2026-05-14 emit-site topics drive.
   *
   * Backend `ProcessLauncherService` publishes a full snapshot on
   * each topic, but the event payloads do not match the REST cache
   * shapes 1:1 (summary returns aggregated category counts, configured
   * is a `ConfiguredProcess` list, etc.) so we invalidate and let
   * React Query refetch via the existing REST path. `refetchType:
   * 'active'` keeps background tabs from re-fetching unnecessarily.
   */
  private handleProcessSummaryEvent(message: WebSocketMessages): void {
    if (!isProcessSummaryEvent(message)) return

    useProcessMetricsStore
      .getState()
      .setSnapshot(message.coordinator ?? '', message.processes, message.snapshot_at)
    this.invalidateActive(queryKeys.processSummaryAll)
  }
  private handleProcessConfiguredEvent(message: WebSocketMessages): void {
    if (!isProcessConfiguredEvent(message)) return

    this.invalidateActive(queryKeys.configuredProcessesAll)
  }
  private handleProcessRunEvent(message: WebSocketMessages): void {
    if (!isProcessRunEvent(message)) return

    this.invalidateActive(queryKeys.processRunsAll)
  }
  private handleStrategyListEvent(message: WebSocketMessages): void {
    if (!isStrategyListEvent(message)) return

    this.invalidateActive(queryKeys.strategiesAll)
  }
  /**
   * Mark a query family stale and re-fetch only mounted observers.
   *
   * The polling sweep on 2026-05-14 dropped ``refetchInterval`` from
   * ``usePendingAiReviews`` / ``usePositions`` /
   * ``useTrailingStopForCycle`` in favour of snapshot-only REST plus
   * this invalidate-on-WS-frame hook. ``refetchType: 'active'`` keeps
   * the refetch off background tabs and unmounted hooks; React Query
   * coalesces concurrent invalidations on the same key, so a burst of
   * order/execution frames does not multiply REST calls.
   */
  private invalidateActive(queryKey: readonly unknown[]): void {
    this.queryClient
      .invalidateQueries({ queryKey, refetchType: 'active' })
      .catch(error => console.error('Failed to invalidate active query:', error))
  }
  private mergeAiReviewActivity(frame: AiReviewActivityFrame): void {
    const userPublicId = useAuthStore.getState().user?.public_id ?? null
    const queryKey = aiReviewActivityQueryKey(userPublicId)
    const existing = this.queryClient.getQueryData<AiReviewActivityFrame[]>(queryKey) ?? []
    const dedupKey = aiReviewActivityDedupKey(frame)

    if (existing.some(item => aiReviewActivityDedupKey(item) === dedupKey)) {
      return
    }

    const appended = [...existing, frame]
    const trimmed =
      appended.length > AI_REVIEW_ACTIVITY_RING_CAP
        ? appended.slice(-AI_REVIEW_ACTIVITY_RING_CAP)
        : appended

    this.queryClient.setQueryData<AiReviewActivityFrame[]>(queryKey, trimmed)
  }
  getClient(): WebSocketClient | null {
    return this.wsClient
  }
  isAttached(): boolean {
    return this.wsClient !== null
  }
}
let dispatcherInstance: WSDispatcher | null = null

export function getDispatcher(queryClient: QueryClient): WSDispatcher {
  dispatcherInstance ??= new WSDispatcher({ queryClient })

  return dispatcherInstance
}

export function resetDispatcher(): void {
  if (dispatcherInstance) {
    dispatcherInstance.detach()
    dispatcherInstance = null
  }

  useProcessMetricsStore.getState().reset()
}
