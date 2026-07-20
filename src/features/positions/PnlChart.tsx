import React, { useEffect, useRef } from 'react'
import {
  IChartApi,
  ISeriesApi,
  LineSeries,
  SeriesDataItemTypeMap,
  Time,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app'
import type { Components } from '../../types/api'

type PnlTimelinePoint = Components['schemas']['PnlTimelinePointData']
type LineSeriesData = SeriesDataItemTypeMap<Time>['Line'][]

interface Props {
  points: PnlTimelinePoint[]
  valuationCcy: string
  height?: number
  className?: string
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

const toUtc = (iso: string): UTCTimestamp =>
  Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp

const buildSeriesData = (
  points: PnlTimelinePoint[],
  pick: (point: PnlTimelinePoint) => number | null
): LineSeriesData =>
  points.map(point => {
    const time = toUtc(point.point_time)
    const value = pick(point)

    return point.valuation_status === 'incomplete' || value === null ? { time } : { time, value }
  })

export const PnlChart: React.FC<Props> = ({
  points,
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
  const isDarkMode = useAppStore(state => state.isDarkMode)

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
    chartRef.current = chart

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }

    globalThis.addEventListener('resize', onResize)

    return () => {
      globalThis.removeEventListener('resize', onResize)
      chartRef.current?.remove()
      chartRef.current = null
      netSeriesRef.current = null
      realizedSeriesRef.current = null
      unrealizedSeriesRef.current = null
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
  }, [isDarkMode])

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
  }, [points])

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
    </div>
  )
}
