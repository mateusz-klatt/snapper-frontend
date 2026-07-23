import React, { useEffect, useRef, useState } from 'react'
import {
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesDataItemTypeMap,
  type SeriesMarker,
  type SeriesMarkerBar,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useTranslation } from 'react-i18next'
import { getIntlLocale } from '../../i18n/countryLanguages'
import type { AppLocale } from '../../i18n/types'
import { formatDateTime } from '../../lib/dateFormat'
import { useAppStore } from '../../stores/app'
import type { PnlTimelineMarkerData, PnlTimelinePointData } from '../../types/api'
import { PNL_MARKER_COLORS } from './pnlMarkerStyles'

type LineSeriesData = SeriesDataItemTypeMap<Time>['Line'][]

interface Props {
  points: PnlTimelinePointData[]
  markers?: readonly PnlTimelineMarkerData[]
  showMarkers?: boolean
  valuationCcy: string
  height?: number
  className?: string
}

interface MarkerRecord {
  id: string
  marker: PnlTimelineMarkerData
  seriesMarker: SeriesMarker<UTCTimestamp>
}

interface DetailRowProps {
  label: string
  value: React.ReactNode
}

const LIGHT_THEME = {
  background: '#fdf8f0',
  text: '#6f695f',
  grid: '#ece8df',
  border: '#e6e3dc',
}
const DARK_THEME = {
  background: '#181a1e',
  text: '#9aa4b4',
  grid: '#262a30',
  border: '#3a4048',
}
const NET_COLOR = '#3b82f6'
const REALIZED_COLOR = '#22c55e'
const UNREALIZED_COLOR = '#f97316'
const EMPTY_MARKERS: readonly PnlTimelineMarkerData[] = []

const toUtc = (iso: string): UTCTimestamp =>
  Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp

const buildSeriesData = (
  points: PnlTimelinePointData[],
  pick: (point: PnlTimelinePointData) => number | null
): LineSeriesData =>
  points.map(point => {
    const time = toUtc(point.point_time)
    const value = pick(point)

    return value === null ? { time } : { time, value }
  })

const markerSourceId = (marker: PnlTimelineMarkerData): string => {
  if (marker.kind === 'fill') return marker.execution_public_id
  if (marker.kind === 'signal') return marker.signal_public_id

  return marker.event_public_id
}

const markerPresentation = (
  marker: PnlTimelineMarkerData
): Pick<SeriesMarkerBar<UTCTimestamp>, 'color' | 'position' | 'shape'> => {
  if (marker.kind === 'fill') {
    return { color: PNL_MARKER_COLORS.fill, position: 'belowBar', shape: 'square' }
  }

  if (marker.kind === 'signal') {
    if (marker.outcome === 'no_fill') {
      return {
        color: PNL_MARKER_COLORS.signalNoFill,
        position: 'aboveBar',
        shape: 'circle',
      }
    }

    return marker.side.toLowerCase() === 'sell'
      ? { color: PNL_MARKER_COLORS.signal, position: 'aboveBar', shape: 'arrowDown' }
      : { color: PNL_MARKER_COLORS.signal, position: 'belowBar', shape: 'arrowUp' }
  }

  if (marker.outcome === 'rejected') {
    return { color: PNL_MARKER_COLORS.rejected, position: 'aboveBar', shape: 'square' }
  }

  if (marker.outcome === 'no_fill') {
    return { color: PNL_MARKER_COLORS.noFill, position: 'aboveBar', shape: 'circle' }
  }

  return { color: PNL_MARKER_COLORS.aiDecision, position: 'belowBar', shape: 'arrowUp' }
}

const buildMarkerRecords = (markers: readonly PnlTimelineMarkerData[]): MarkerRecord[] =>
  markers.map((marker, index) => {
    const id = `${marker.kind}:${markerSourceId(marker)}:${index}`

    return {
      id,
      marker,
      seriesMarker: {
        ...markerPresentation(marker),
        id,
        time: toUtc(marker.marker_time),
        size: 1.2,
      },
    }
  })

const buildMarkerAnchorData = (
  points: PnlTimelinePointData[],
  markerRecords: readonly MarkerRecord[]
): LineSeriesData => {
  const valuedPoints = points
    .filter((point): point is PnlTimelinePointData & { net_pnl: number } => point.net_pnl !== null)
    .map(point => ({ time: toUtc(point.point_time), value: point.net_pnl }))
  const markerTimes: UTCTimestamp[] = []

  for (const record of markerRecords) {
    const time = record.seriesMarker.time

    if (markerTimes.at(-1) !== time) markerTimes.push(time)
  }

  let pointIndex = 0
  let value = valuedPoints[0]?.value ?? 0

  return markerTimes.map(time => {
    let point = valuedPoints[pointIndex]

    while (point !== undefined && point.time <= time) {
      value = point.value
      pointIndex += 1
      point = valuedPoints[pointIndex]
    }

    return { time, value }
  })
}

const formatMarkerNumber = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(value)

const DetailRow: React.FC<Readonly<DetailRowProps>> = ({ label, value }) => (
  <div className='grid gap-1 sm:grid-cols-[10rem_1fr]'>
    <dt className='text-muted-500'>{label}</dt>
    <dd className='break-all font-mono text-alpine-900'>{value}</dd>
  </div>
)

const MarkerDetail: React.FC<{ marker: PnlTimelineMarkerData; locale: AppLocale }> = ({
  marker,
  locale,
}) => {
  const { t } = useTranslation('positions')
  const noValue = t('timeline.markers.detail.noValue')
  const kindLabel = t(`timeline.markers.detail.types.${marker.kind}`)
  const outcomeLabel = t(`timeline.markers.detail.outcomes.${marker.outcome}`)
  const formatNumber = (value: number): string => formatMarkerNumber(value, getIntlLocale(locale))

  return (
    <section
      className='mt-4 rounded-xl border border-dark-600 bg-alpine-100 p-4 text-sm'
      data-testid='pnl-marker-detail'
      aria-live='polite'
    >
      <h4 className='mb-3 font-semibold text-alpine-900'>{t('timeline.markers.detail.title')}</h4>
      <dl className='space-y-2'>
        <DetailRow label={t('timeline.markers.detail.type')} value={kindLabel} />
        <DetailRow
          label={t('timeline.markers.detail.time')}
          value={formatDateTime(new Date(marker.marker_time), locale)}
        />
        <DetailRow
          label={t('timeline.markers.detail.instrument')}
          value={marker.instrument_public_id}
        />
        <DetailRow label={t('timeline.markers.detail.outcome')} value={outcomeLabel} />
        <DetailRow label={t('timeline.markers.detail.status')} value={marker.status} />
        {marker.kind === 'fill' && (
          <>
            <DetailRow label={t('timeline.markers.detail.side')} value={marker.side} />
            <DetailRow
              label={t('timeline.markers.detail.size')}
              value={formatNumber(marker.size)}
            />
            <DetailRow
              label={t('timeline.markers.detail.price')}
              value={marker.price === null ? noValue : formatNumber(marker.price)}
            />
            <DetailRow
              label={t('timeline.markers.detail.executionId')}
              value={marker.execution_public_id}
            />
            <DetailRow
              label={t('timeline.markers.detail.orderId')}
              value={marker.order_public_id}
            />
          </>
        )}
        {marker.kind === 'signal' && (
          <>
            <DetailRow label={t('timeline.markers.detail.side')} value={marker.side} />
            <DetailRow
              label={t('timeline.markers.detail.strategyName')}
              value={marker.strategy_name ?? noValue}
            />
            <DetailRow
              label={t('timeline.markers.detail.strength')}
              value={formatNumber(marker.strength)}
            />
            <DetailRow label={t('timeline.markers.detail.reason')} value={marker.reason} />
            <DetailRow
              label={t('timeline.markers.detail.price')}
              value={marker.price === null ? noValue : formatNumber(marker.price)}
            />
            <DetailRow
              label={t('timeline.markers.detail.signalId')}
              value={marker.signal_public_id}
            />
          </>
        )}
        {marker.kind === 'ai_decision' && (
          <>
            <DetailRow
              label={t('timeline.markers.detail.strategyId')}
              value={marker.strategy_public_id}
            />
            <DetailRow
              label={t('timeline.markers.detail.reviewId')}
              value={marker.review_public_id}
            />
            <DetailRow
              label={t('timeline.markers.detail.eventId')}
              value={marker.event_public_id}
            />
            <DetailRow
              label={t('timeline.markers.detail.decision')}
              value={marker.decision ?? noValue}
            />
            <DetailRow
              label={t('timeline.markers.detail.rationale')}
              value={marker.rationale ?? noValue}
            />
          </>
        )}
      </dl>
    </section>
  )
}

export const PnlChart: React.FC<Readonly<Props>> = ({
  points,
  markers = EMPTY_MARKERS,
  showMarkers = true,
  valuationCcy,
  height = 300,
  className = '',
}) => {
  const { t } = useTranslation('positions')
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const netSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const realizedSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const unrealizedSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const markerAnchorSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const markerPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const markerByIdRef = useRef<Map<string, PnlTimelineMarkerData>>(new Map())
  const [selectedMarker, setSelectedMarker] = useState<PnlTimelineMarkerData | null>(null)
  const isDarkMode = useAppStore(state => state.isDarkMode)
  const locale = useAppStore(state => state.locale)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: LIGHT_THEME.background },
        textColor: LIGHT_THEME.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: LIGHT_THEME.grid },
        horzLines: { color: LIGHT_THEME.grid },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: LIGHT_THEME.border },
      timeScale: {
        borderColor: LIGHT_THEME.border,
        timeVisible: true,
        secondsVisible: false,
      },
    })

    netSeriesRef.current = chart.addSeries(LineSeries, { color: NET_COLOR, lineWidth: 2 })
    realizedSeriesRef.current = chart.addSeries(LineSeries, {
      color: REALIZED_COLOR,
      lineWidth: 2,
    })
    unrealizedSeriesRef.current = chart.addSeries(LineSeries, {
      color: UNREALIZED_COLOR,
      lineWidth: 2,
    })
    markerAnchorSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'transparent',
      lineVisible: false,
      pointMarkersVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    const markerPlugin = createSeriesMarkers(markerAnchorSeriesRef.current, [], {
      autoScale: true,
      zOrder: 'top',
    })

    markerPluginRef.current = markerPlugin
    chartRef.current = chart

    const selectMarker = (event: MouseEventParams<Time>): void => {
      const objectId = event.hoveredInfo?.objectId

      if (typeof objectId !== 'string') return
      const marker = markerByIdRef.current.get(objectId)

      if (marker !== undefined) setSelectedMarker(marker)
    }

    chart.subscribeCrosshairMove(selectMarker)
    chart.subscribeClick(selectMarker)

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }

    globalThis.addEventListener('resize', onResize)

    return () => {
      globalThis.removeEventListener('resize', onResize)
      chart.unsubscribeCrosshairMove(selectMarker)
      chart.unsubscribeClick(selectMarker)
      markerPlugin.detach()
      chart.remove()
      chartRef.current = null
      netSeriesRef.current = null
      realizedSeriesRef.current = null
      unrealizedSeriesRef.current = null
      markerAnchorSeriesRef.current = null
      markerPluginRef.current = null
      markerByIdRef.current.clear()
    }
  }, [height])

  useEffect(() => {
    if (!chartRef.current) return
    const theme = isDarkMode ? DARK_THEME : LIGHT_THEME

    chartRef.current.applyOptions({
      layout: { background: { color: theme.background }, textColor: theme.text },
      grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderColor: theme.border },
      timeScale: { borderColor: theme.border },
    })
  }, [height, isDarkMode])

  useEffect(() => {
    if (
      !netSeriesRef.current ||
      !realizedSeriesRef.current ||
      !unrealizedSeriesRef.current ||
      !chartRef.current
    ) {
      return
    }

    netSeriesRef.current.setData(buildSeriesData(points, point => point.net_pnl))
    realizedSeriesRef.current.setData(buildSeriesData(points, point => point.realized_pnl))
    unrealizedSeriesRef.current.setData(buildSeriesData(points, point => point.unrealized_pnl))

    if (points.length > 0) {
      chartRef.current.timeScale().fitContent()
    }
  }, [height, points])

  useEffect(() => {
    if (!markerAnchorSeriesRef.current || !markerPluginRef.current || !chartRef.current) return

    const visibleMarkers = showMarkers ? markers : EMPTY_MARKERS
    const records = buildMarkerRecords(visibleMarkers).sort(
      (left, right) => Number(left.seriesMarker.time) - Number(right.seriesMarker.time)
    )

    markerByIdRef.current = new Map(records.map(record => [record.id, record.marker]))
    markerAnchorSeriesRef.current.setData(buildMarkerAnchorData(points, records))
    markerPluginRef.current.setMarkers(records.map(record => record.seriesMarker))
    setSelectedMarker(null)

    if (visibleMarkers.length > 0) {
      chartRef.current.timeScale().fitContent()
    }
  }, [height, markers, points, showMarkers])

  return (
    <div className={`relative ${className}`} data-testid='pnl-chart'>
      <h3 className='mb-2 text-sm font-medium text-alpine-900'>{t('timeline.chart.title')}</h3>
      <div ref={containerRef} style={{ height: `${height}px` }} />
      <div className='mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-500'>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-3 rounded-sm'
            style={{ backgroundColor: NET_COLOR }}
          />
          <span>{t('timeline.chart.net')}</span>
        </span>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-3 rounded-sm'
            style={{ backgroundColor: REALIZED_COLOR }}
          />
          <span>{t('timeline.chart.realized')}</span>
        </span>
        <span className='flex items-center gap-1'>
          <span
            className='inline-block h-2 w-3 rounded-sm'
            style={{ backgroundColor: UNREALIZED_COLOR }}
          />
          <span>{t('timeline.chart.unrealized')}</span>
        </span>
        <span>{t('timeline.chart.valuationCurrency', { currency: valuationCcy })}</span>
      </div>
      {selectedMarker !== null && <MarkerDetail marker={selectedMarker} locale={locale} />}
    </div>
  )
}
