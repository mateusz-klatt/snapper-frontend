import { useEffect, useMemo, useRef } from 'react'
import {
  CandlestickSeries,
  CandlestickData,
  IChartApi,
  ISeriesApi,
  TickMarkType,
  Time,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts'
import { useAppStore } from '../stores/app'
import { getIntlLocale } from '../i18n/countryLanguages'
import { getFinancialChartPalette } from './financialChartPalette'

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

/** Imperative handle exposed to a controller that drives data/viewport itself. */
export interface ChartHandle {
  chart: IChartApi
  series: ISeriesApi<'Candlestick'>
}

interface LightweightChartProps {
  data: CandlestickData<Time>[]
  height?: number
  width?: number
  className?: string
  precision?: number
  /**
   * When provided, the chart hands its `{ chart, series }` to a controller on
   * (re)creation (and `null` on teardown) and stops driving `data` itself — the
   * controller owns `setData` / viewport. Called with `null` on cleanup.
   */
  onChartReady?: (handle: ChartHandle | null) => void
}

export const LightweightChart = ({
  data,
  height = 400,
  width,
  className = '',
  precision = 2,
  onChartReady,
}: Readonly<LightweightChartProps>) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const precisionRef = useRef(precision)
  const onChartReadyRef = useRef(onChartReady)
  const managed = onChartReady !== undefined

  useEffect(() => {
    precisionRef.current = precision
    onChartReadyRef.current = onChartReady
  })

  const isDarkMode = useAppStore(s => s.isDarkMode)
  const financialColorPreference = useAppStore(s => s.financialColorPreference)
  const locale = useAppStore(s => s.locale)

  const localization = useMemo(() => {
    const intlLocale = getIntlLocale(locale)

    return {
      locale: intlLocale,
      timeFormatter: (time: Time): string => {
        const date = new Date((time as UTCTimestamp) * 1000)

        return new Intl.DateTimeFormat(intlLocale, {
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      },
      dateFormatter: (time: Time): string => {
        const date = new Date((time as UTCTimestamp) * 1000)

        return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' }).format(date)
      },
    }
  }, [locale])

  /**
   * Tick-mark labels on the X-axis are rendered by lightweight-charts
   * itself; the chart-level localization.timeFormatter only feeds the
   * crosshair / tooltip. Without overriding tickMarkFormatter the axis
   * stays in UTC even when the browser is in a different timezone
   * (observed 2026-05-24: CEST browser showing UTC chart labels).
   * Route through Intl.DateTimeFormat with the browser-resolved
   * timezone so the axis ticks match the cursor labels.
   */
  const tickMarkFormatter = useMemo(() => {
    const intlLocale = getIntlLocale(locale)

    return (time: Time, tickMarkType: TickMarkType): string => {
      const date = new Date((time as UTCTimestamp) * 1000)

      switch (tickMarkType) {
        case TickMarkType.Year:
          return new Intl.DateTimeFormat(intlLocale, { year: 'numeric' }).format(date)
        case TickMarkType.Month:
          return new Intl.DateTimeFormat(intlLocale, {
            month: 'short',
            year: 'numeric',
          }).format(date)
        case TickMarkType.DayOfMonth:
          return new Intl.DateTimeFormat(intlLocale, {
            day: 'numeric',
            month: 'short',
          }).format(date)
        case TickMarkType.TimeWithSeconds:
          return new Intl.DateTimeFormat(intlLocale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(date)
        default:
          return new Intl.DateTimeFormat(intlLocale, {
            hour: '2-digit',
            minute: '2-digit',
          }).format(date)
      }
    }
  }, [locale])

  useEffect(() => {
    if (!chartContainerRef.current) {
      return
    }

    const palette = getFinancialChartPalette()
    const chart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
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
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: LIGHT_THEME.border,
      },
      timeScale: {
        borderColor: LIGHT_THEME.border,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter,
      },
    })
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: palette.upColor,
      downColor: palette.downColor,
      borderUpColor: palette.upColor,
      borderDownColor: palette.downColor,
      wickUpColor: palette.upColor,
      wickDownColor: palette.downColor,
      priceFormat: {
        type: 'price',
        precision: precisionRef.current,
        minMove: 10 ** -precisionRef.current,
      },
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries
    onChartReadyRef.current?.({ chart, series: candlestickSeries })

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: width || chartContainerRef.current.clientWidth,
        })
      }
    }

    let observer: ResizeObserver | null = null

    if (typeof ResizeObserver !== 'undefined' && chartContainerRef.current) {
      observer = new ResizeObserver(handleResize)
      observer.observe(chartContainerRef.current)
    } else {
      globalThis.addEventListener('resize', handleResize)
    }

    return () => {
      if (observer) {
        observer.disconnect()
      } else {
        globalThis.removeEventListener('resize', handleResize)
      }

      onChartReadyRef.current?.(null)
      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height, width, tickMarkFormatter])
  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    chartRef.current.applyOptions({ localization })
  }, [localization])
  useEffect(() => {
    if (!chartRef.current) {
      return
    }

    const theme = isDarkMode ? DARK_THEME : LIGHT_THEME

    chartRef.current.applyOptions({
      layout: {
        background: { color: theme.background },
        textColor: theme.text,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      rightPriceScale: {
        borderColor: theme.border,
      },
      timeScale: {
        borderColor: theme.border,
      },
    })
  }, [isDarkMode])
  useEffect(() => {
    if (!seriesRef.current) {
      return
    }

    /**
     * Re-apply candle palette on any change to:
     * - isDarkMode (different dark-mode hex stops)
     * - financialColorPreference (explicit Western/Asian choice)
     * - locale (auto-default flip on cn/hk/jp/kr)
     *
     * The palette helper reads computed CSS vars set on <html> by
     * AppWithAuth.tsx — those vars switch via the
     * [data-color-convention] attribute selector, so calling
     * applyOptions here picks up the new hex without re-running
     * the resolver directly.
     */
    const palette = getFinancialChartPalette()

    seriesRef.current.applyOptions({
      upColor: palette.upColor,
      downColor: palette.downColor,
      borderUpColor: palette.upColor,
      borderDownColor: palette.downColor,
      wickUpColor: palette.upColor,
      wickDownColor: palette.downColor,
    })
  }, [isDarkMode, financialColorPreference, locale])
  useEffect(() => {
    if (!seriesRef.current) {
      return
    }

    seriesRef.current.applyOptions({
      priceFormat: { type: 'price', precision, minMove: 10 ** -precision },
    })
  }, [precision])
  useEffect(() => {
    if (managed || !seriesRef.current || !chartRef.current) {
      return
    }

    try {
      if (data.length > 0) {
        const uniqueData = data.filter((item, index, arr) => {
          if (index === 0) return true

          return item.time !== arr[index - 1]?.time
        })

        if (uniqueData.length > 0) {
          seriesRef.current.setData(uniqueData)
          chartRef.current.timeScale().fitContent()
        } else {
          seriesRef.current.setData([])
        }
      } else {
        seriesRef.current.setData([])
      }
    } catch (error) {
      console.error('LightweightChart: Error updating chart data:', error)

      try {
        seriesRef.current.setData([])
      } catch (cleanupError) {
        console.error('LightweightChart: Error clearing chart data:', cleanupError)
      }
    }
  }, [data, managed])

  return (
    <div
      ref={chartContainerRef}
      className={`relative ${className}`}
      style={{ height: `${height}px` }}
    />
  )
}
