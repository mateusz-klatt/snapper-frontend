import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  CandlestickData,
  IChartApi,
  ISeriesApi,
  Time,
  createChart,
} from 'lightweight-charts'
import { useAppStore } from '../stores/app'

/**
 * Resolve candle up/down colors from the currently-mounted CSS vars.
 *
 * Reads `--color-rising-500` / `--color-falling-500` from
 * `<html>`, which `AppWithAuth.tsx` keeps in sync with the user's
 * financial-color preference (auto-derived from locale or explicit
 * Settings choice). Falls back to the Western hex on the rare race
 * where the document attribute hasn't mounted yet.
 *
 * `lightweight-charts` doesn't consume CSS vars directly — it stores
 * hex on a `CandlestickSeries` via `applyOptions(...)`. This helper
 * is the bridge. Effect below re-runs on any of:
 * isDarkMode (different dark-mode hex) / financialColorPreference /
 * locale (the resolver is locale-aware).
 */
export function getFinancialChartPalette(): { upColor: string; downColor: string } {
  if (typeof window === 'undefined') {
    return { upColor: '#0b8f4d', downColor: '#8b1025' }
  }

  const style = getComputedStyle(document.documentElement)
  const upColor = style.getPropertyValue('--color-rising-500').trim() || '#0b8f4d'
  const downColor = style.getPropertyValue('--color-falling-500').trim() || '#8b1025'

  return { upColor, downColor }
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

interface LightweightChartProps {
  data: CandlestickData<Time>[]
  height?: number
  width?: number
  className?: string
}

export const LightweightChart = ({
  data,
  height = 400,
  width,
  className = '',
}: Readonly<LightweightChartProps>) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const isDarkMode = useAppStore(s => s.isDarkMode)
  const financialColorPreference = useAppStore(s => s.financialColorPreference)
  const locale = useAppStore(s => s.locale)

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
      },
    })
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: palette.upColor,
      downColor: palette.downColor,
      borderUpColor: palette.upColor,
      borderDownColor: palette.downColor,
      wickUpColor: palette.upColor,
      wickDownColor: palette.downColor,
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries

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

      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height, width])
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

    /*
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
    if (!seriesRef.current || !chartRef.current) {
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
  }, [data])

  return (
    <div
      ref={chartContainerRef}
      className={`relative ${className}`}
      style={{ height: `${height}px` }}
    />
  )
}
