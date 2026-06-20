import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LightweightChart, type ChartHandle } from '../../components/LightweightChart'
import { LoadingSpinner } from '../../components/ui'
import { getCandlesRange } from '../../lib/api/market'
import { createChartNavAdapter } from './chartNavAdapter'
import {
  FETCH_PAGE_BARS,
  TIMEFRAME_SECONDS,
  toWindowCandle,
  type TimeframeValue,
  type WindowCandle,
} from './chartNavigation'
import { MarketChartController, type ControllerState } from './marketChartController'

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
  autoLod = false,
  onLodTimeframe,
  height = 400,
}: Readonly<MarketChartProps>) {
  const { t } = useTranslation('market')
  const [state, setState] = useState<ControllerState>(INITIAL_STATE)
  const [initialLoading, setInitialLoading] = useState(false)
  const [initialError, setInitialError] = useState<string | null>(null)
  /** Identity of the params whose initial window has been reset into the controller. */
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const currentKey = `${exchange}|${instrument}|${timeframe}|${anchorMs ?? 'live'}`

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
        FETCH_PAGE_BARS
      )

      return rows.map(toWindowCandle)
    },
    [exchange, instrument, timeframe]
  )

  const [controller] = useState(
    () => new MarketChartController({ timeframe, onStateChange: setState, fetchOlder })
  )

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
    controller.setTimeframe(timeframe)

    const end = anchorMs ?? Date.now()
    const start = end - FETCH_PAGE_BARS * TIMEFRAME_SECONDS[timeframe] * 1000

    getCandlesRange(
      instrument,
      exchange,
      timeframe,
      new Date(start).toISOString(),
      new Date(end).toISOString(),
      FETCH_PAGE_BARS
    )
      .then(rows => {
        if (cancelled) {
          return
        }

        controller.reset(rows.map(toWindowCandle))
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
  }, [controller, enabled, exchange, instrument, timeframe, anchorMs, currentKey])

  useEffect(() => {
    if (!liveCandle || anchorMs !== null || readyKey !== currentKey) {
      return
    }

    controller.applyLive(liveCandle)
  }, [controller, liveCandle, anchorMs, readyKey, currentKey])

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
      <LightweightChart
        data={[]}
        height={height}
        precision={precision}
        onChartReady={onChartReady}
      />
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
