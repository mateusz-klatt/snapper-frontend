import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LightweightChart, type ChartHandle } from '../../components/LightweightChart'
import { LoadingSpinner } from '../../components/ui'
import { getCandlesRange } from '../../lib/api/market'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'
import type { WSDispatcher } from '../../stores/wsDispatcher'
import { useWebSocketStore } from '../../stores/websocket'
import { useMarketStore } from '../../stores/market'
import { createChartNavAdapter } from './chartNavAdapter'
import {
  FETCH_PAGE_BARS,
  TIMEFRAME_SECONDS,
  toWindowCandle,
  type TimeframeValue,
  type WindowCandle,
} from './chartNavigation'
import { MarketChartController, type ControllerState } from './marketChartController'
import { LateCandleReconciler } from './lateCandleReconciler'

interface MarketChartProps {
  exchange: string | null
  instrument: string | null
  timeframe: TimeframeValue
  precision: number
  /** Coarse jump target (epoch ms) from the scrubber; null anchors at the latest data. */
  anchorMs: number | null
  enabled: boolean
  /** Latest live candle (from the warm cache) to fold in; null while scrubbed or feedless. */
  liveCandle?: WindowCandle | null
  dispatcher?: Pick<WSDispatcher, 'onLiveCandle'> | null
  /** When true, zooming switches the timeframe (level-of-detail). */
  autoLod?: boolean
  /** Invoked with the target timeframe when a zoom level warrants an LOD switch. */
  onLodTimeframe?: (timeframe: TimeframeValue) => void
  height?: number
}

const INITIAL_STATE: ControllerState = {
  barCount: 0,
  olderInFlight: false,
  historyExhausted: false,
  error: null,
}

/**
 * DB-backed candlestick chart with chart-native navigation: dragging left lazily
 * loads older history (with bounded memory and viewport preservation) instead of
 * relying on a fixed window. Initial data is fetched by market time so it works
 * without a live in-memory cache.
 */
export function MarketChart({
  exchange,
  instrument,
  timeframe,
  precision,
  anchorMs,
  enabled,
  liveCandle = null,
  dispatcher = null,
  autoLod = false,
  onLodTimeframe,
  height = 400,
}: Readonly<MarketChartProps>) {
  const { t } = useTranslation('market')
  const asOf = useAppStore(s => s.asOf)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const userId = useAuthStore(s => s.user?.public_id)
  const csrfToken = useAuthStore(s => s.csrfToken)
  const isConnected = useWebSocketStore(s => s.isConnected)
  const wsClient = useWebSocketStore(s => s.wsClient)
  const [state, setState] = useState<ControllerState>(INITIAL_STATE)
  const [initialLoading, setInitialLoading] = useState(false)
  const [initialError, setInitialError] = useState<string | null>(null)
  const [reconciliationError, setReconciliationError] = useState<string | null>(null)
  const reconcilerRef = useRef<LateCandleReconciler | null>(null)
  const [reloadRevision, setReloadRevision] = useState(0)
  const [reloadHorizon, setReloadHorizon] = useState<{ key: string; horizon: string } | null>(null)
  const [unresolved, setUnresolved] = useState<{
    key: string
    revision: number
    first: number
    last: number
  } | null>(null)
  /** Identity of the params whose initial window has been reset into the controller. */
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const selectionKey = `${exchange}|${instrument}|${timeframe}|${anchorMs ?? 'live'}|${asOf ?? 'now'}`
  const liveHorizon = reloadHorizon?.key === selectionKey ? reloadHorizon.horizon : null
  const currentKey = `${selectionKey}|${reloadRevision}`
  const markUnresolved = useCallback(
    (first: number, last: number) => {
      setUnresolved(previous =>
        previous?.key === selectionKey && previous.revision === reloadRevision
          ? {
              key: selectionKey,
              revision: reloadRevision,
              first: Math.min(first, previous.first),
              last: Math.max(last, previous.last),
            }
          : { key: selectionKey, revision: reloadRevision, first, last }
      )
    },
    [selectionKey, reloadRevision]
  )

  useLayoutEffect(() => {
    setReloadHorizon(null)
    setUnresolved(null)
  }, [selectionKey])

  const fetchOlder = useCallback(
    async (range: { start: string; end: string }) => {
      if (!exchange || !instrument) {
        return []
      }

      const rows = await getCandlesRange(
        instrument,
        exchange,
        timeframe,
        range.start,
        range.end,
        FETCH_PAGE_BARS,
        asOf
      )

      return rows.map(toWindowCandle)
    },
    [exchange, instrument, timeframe, asOf]
  )

  const [controller] = useState(
    () => new MarketChartController({ timeframe, onStateChange: setState, fetchOlder })
  )

  useLayoutEffect(() => {
    controller.setOnUnresolved(markUnresolved)
  }, [controller, markUnresolved])

  useEffect(() => {
    controller.setFetchOlder(fetchOlder)
  }, [controller, fetchOlder])

  useEffect(() => {
    /** Gate LOD on initial-load readiness so a zoom during a fetch can't decide against a stale viewport. */
    controller.setAutoLod(autoLod && readyKey === currentKey)
  }, [controller, autoLod, readyKey, currentKey])

  useEffect(() => {
    if (onLodTimeframe) {
      controller.setOnLodTimeframe(onLodTimeframe)
    }
  }, [controller, onLodTimeframe])

  const onChartReady = useCallback(
    (handle: ChartHandle | null) => {
      if (handle) {
        controller.attach(createChartNavAdapter(handle))
      } else {
        controller.detach()
      }
    },
    [controller]
  )

  useEffect(() => {
    if (!enabled || !exchange || !instrument) {
      return undefined
    }

    let cancelled = false

    setInitialLoading(true)
    setInitialError(null)
    setReadyKey(null)
    controller.setTimeframe(timeframe)

    const requestAsOf = asOf ?? liveHorizon
    const horizon = requestAsOf === null ? Date.now() : Date.parse(requestAsOf)
    const end = Math.min(anchorMs ?? horizon, horizon)
    const start = end - FETCH_PAGE_BARS * TIMEFRAME_SECONDS[timeframe] * 1000

    getCandlesRange(
      instrument,
      exchange,
      timeframe,
      new Date(start).toISOString(),
      new Date(end).toISOString(),
      FETCH_PAGE_BARS,
      requestAsOf
    )
      .then(rows => {
        if (cancelled) {
          return
        }

        controller.reset(rows.map(toWindowCandle))

        if (liveHorizon !== null) {
          setUnresolved(previous =>
            previous !== null && previous.revision < reloadRevision ? null : previous
          )
        }

        setReadyKey(currentKey)
        setInitialLoading(false)
      })
      .catch((error_: unknown) => {
        if (cancelled) {
          return
        }

        setInitialError(error_ instanceof Error ? error_.message : String(error_))
        setInitialLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    controller,
    enabled,
    exchange,
    instrument,
    timeframe,
    anchorMs,
    asOf,
    currentKey,
    liveHorizon,
    reloadRevision,
  ])

  useEffect(() => {
    if (!liveCandle || anchorMs !== null || asOf !== null || readyKey !== currentKey) {
      return
    }

    controller.applyLive(liveCandle)
    reconcilerRef.current?.advance()
  }, [controller, liveCandle, anchorMs, asOf, readyKey, currentKey])

  useLayoutEffect(() => {
    setReconciliationError(null)

    if (
      !dispatcher ||
      !enabled ||
      !exchange ||
      !instrument ||
      !isAuthenticated ||
      !isConnected ||
      anchorMs !== null ||
      asOf !== null ||
      readyKey !== currentKey
    ) {
      return undefined
    }

    const market = useMarketStore.getState()
    const reconciler = new LateCandleReconciler({
      instrument,
      exchange,
      timeframe,
      needsReconciliation: candle =>
        controller.needsReconciliation({
          openAtMs: Date.parse(candle.open_at),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          complete: candle.complete === true,
        }),
      latestOpenMs: () => controller.latestOpenMs(),
      fetchRange: (start, end, limit, horizon) =>
        getCandlesRange(instrument, exchange, timeframe, start, end, limit, horizon),
      apply: rows => controller.applyAuthoritative(rows.map(toWindowCandle)),
      isCurrent: () => {
        const auth = useAuthStore.getState()
        const connection = useWebSocketStore.getState()
        const currentMarket = useMarketStore.getState()

        return (
          useAppStore.getState().asOf === null &&
          auth.isAuthenticated &&
          auth.user?.public_id === userId &&
          auth.csrfToken === csrfToken &&
          connection.isConnected &&
          connection.wsClient === wsClient &&
          currentMarket.selectedExchange === market.selectedExchange &&
          currentMarket.selectedInstrument === market.selectedInstrument &&
          currentMarket.selectedTimeframe === market.selectedTimeframe
        )
      },
      onError: setReconciliationError,
      onUnresolved: markUnresolved,
    })

    reconcilerRef.current = reconciler
    const unsubscribe = dispatcher.onLiveCandle(candle => reconciler.notify(candle))

    return () => {
      unsubscribe()
      reconciler.destroy()
      reconcilerRef.current = null
    }
  }, [
    dispatcher,
    controller,
    enabled,
    exchange,
    instrument,
    timeframe,
    isAuthenticated,
    userId,
    csrfToken,
    isConnected,
    wsClient,
    anchorMs,
    asOf,
    readyKey,
    currentKey,
    markUnresolved,
  ])

  useEffect(
    () => () => {
      controller.destroy()
    },
    [controller]
  )

  const hasData = state.barCount > 0
  const showNoData = !initialLoading && initialError === null && !hasData

  return (
    <div className='relative' style={{ height: `${height}px` }}>
      <div style={{ visibility: readyKey === currentKey ? 'visible' : 'hidden' }}>
        <LightweightChart
          data={[]}
          height={height}
          precision={precision}
          onChartReady={onChartReady}
        />
      </div>
      {state.olderInFlight && (
        <div className='absolute left-2 top-2' data-testid='older-loading'>
          <LoadingSpinner />
        </div>
      )}
      {state.error !== null && (
        <div
          className='absolute right-2 top-2 rounded-sm bg-loss-600/90 px-2 py-1 text-xs text-white'
          data-testid='older-error'
        >
          {t('chart.errorPrefix')} {state.error}
        </div>
      )}
      {reconciliationError !== null && (
        <div className='absolute right-2 top-2 text-loss-600' data-testid='reconciliation-error'>
          {t('chart.errorPrefix')} {reconciliationError}
        </div>
      )}
      {enabled &&
        isAuthenticated &&
        unresolved?.key === selectionKey &&
        anchorMs === null &&
        asOf === null && (
          <div
            className='absolute left-2 bottom-2 rounded-sm bg-white/90 p-2 text-sm dark:bg-dark-800/90'
            data-testid='reconciliation-unresolved'
          >
            <p>{t('chart.updatesUnconfirmed')}</p>
            <button
              type='button'
              className='font-medium text-alpine-600 hover:underline'
              onClick={() => {
                setReloadHorizon({ key: selectionKey, horizon: new Date().toISOString() })
                setReloadRevision(revision => revision + 1)
              }}
            >
              {t('chart.reloadRecent')}
            </button>
          </div>
        )}
      {initialLoading && (
        <div
          className='absolute inset-0 flex items-center justify-center'
          data-testid='initial-loading'
        >
          <LoadingSpinner />
        </div>
      )}
      {initialError !== null && (
        <div
          className='absolute inset-0 flex items-center justify-center'
          data-testid='chart-error'
        >
          <p className='text-loss-600'>
            {t('chart.errorPrefix')} {initialError || t('chart.unknownError')}
          </p>
        </div>
      )}
      {showNoData && (
        <div
          className='absolute inset-0 flex items-center justify-center'
          data-testid='chart-no-data'
        >
          <div className='text-center'>
            <p className='text-muted-500 mb-2'>
              {t('chart.noDataTitle', { instrument: instrument ?? '' })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
