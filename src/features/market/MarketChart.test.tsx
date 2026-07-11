import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import type { CandleData } from '../../types/api'
import { MarketChart } from './MarketChart'

const mocks = vi.hoisted(() => {
  const handlerRef = { current: null as null | (() => void) }
  const timeScale = {
    getVisibleLogicalRange: vi.fn<() => { from: number; to: number } | null>(() => null),
    setVisibleLogicalRange: vi.fn(),
    fitContent: vi.fn(),
    width: vi.fn(() => 1000),
    subscribeVisibleLogicalRangeChange: vi.fn((cb: () => void) => {
      handlerRef.current = cb
    }),
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
  }
  const series = {
    setData: vi.fn(),
    update: vi.fn(),
    barsInLogicalRange: vi.fn<() => { barsBefore: number; barsAfter: number } | null>(() => ({
      barsBefore: 500,
      barsAfter: 0,
    })),
  }
  const handle = { chart: { timeScale: () => timeScale }, series }

  return { handlerRef, timeScale, series, handle, getCandlesRange: vi.fn() }
})

vi.mock('../../lib/api/market', () => ({ getCandlesRange: mocks.getCandlesRange }))

vi.mock('../../components/LightweightChart', () => ({
  LightweightChart: ({ onChartReady }: { onChartReady?: (handle: unknown) => void }) => {
    React.useEffect(() => {
      onChartReady?.(mocks.handle)

      return () => onChartReady?.(null)
    }, [onChartReady])

    return React.createElement('div', { 'data-testid': 'chart-shell' })
  },
}))

vi.mock('../../components/ui', () => ({
  LoadingSpinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { instrument?: string }) =>
      opts?.instrument === undefined ? key : `${key}:${opts.instrument}`,
  }),
}))

const candleRow = (openAt: string, close = 100): CandleData => ({
  type: 'candle',
  sequence_id: 1,
  public_id: 'pid',
  timestamp: openAt,
  session_id: 'sid',
  instrument: 'EUR-USD',
  exchange: 'kraken',
  timeframe: '1m',
  open_at: openAt,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
  complete: true,
  origin: 'live',
})

const liveWc = (openAt: string, close = 100) => ({
  openAtMs: Date.parse(openAt),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
  complete: false,
})

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const baseProps = {
  exchange: 'kraken',
  instrument: 'EUR-USD',
  timeframe: '1m' as const,
  precision: 4,
  anchorMs: null,
  enabled: true,
}

describe('MarketChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlerRef.current = null
    mocks.timeScale.getVisibleLogicalRange.mockReturnValue(null)
    mocks.series.barsInLogicalRange.mockReturnValue({ barsBefore: 500, barsAfter: 0 })
    mocks.getCandlesRange.mockResolvedValue([])
  })

  it('fetches initial history by market time and renders the chart', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:00:00Z')])
    render(<MarketChart {...baseProps} />)

    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalled()
    })
    expect(screen.getByTestId('chart-shell')).toBeInTheDocument()
    expect(screen.queryByTestId('chart-no-data')).not.toBeInTheDocument()
    const call = mocks.getCandlesRange.mock.calls[0]

    expect(call?.[0]).toBe('EUR-USD')
    expect(call?.[1]).toBe('kraken')
    expect(call?.[2]).toBe('1m')
    expect(call?.[5]).toBe(600)
  })

  it('anchors the initial window at anchorMs when scrubbed', async () => {
    const anchorMs = Date.parse('2026-06-10T12:00:00Z')

    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-10T11:00:00Z')])
    render(<MarketChart {...baseProps} anchorMs={anchorMs} />)

    await waitFor(() => {
      expect(mocks.getCandlesRange).toHaveBeenCalled()
    })
    const call = mocks.getCandlesRange.mock.calls[0]

    expect(call?.[4]).toBe(new Date(anchorMs).toISOString())
  })

  it('folds a live candle into the chart when not scrubbed', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:00:00Z')])
    render(<MarketChart {...baseProps} liveCandle={liveWc('2026-06-20T00:01:00Z')} />)

    await waitFor(() => {
      expect(mocks.series.update).toHaveBeenCalled()
    })
  })

  it('defers live candles until the initial window has loaded', async () => {
    const pending = deferred<CandleData[]>()

    mocks.getCandlesRange.mockReturnValueOnce(pending.promise)
    render(<MarketChart {...baseProps} liveCandle={liveWc('2026-06-20T00:01:00Z')} />)

    expect(mocks.series.update).not.toHaveBeenCalled()
    await act(async () => {
      pending.resolve([candleRow('2026-06-20T00:00:00Z')])
      await pending.promise
    })
    await waitFor(() => {
      expect(mocks.series.update).toHaveBeenCalled()
    })
  })

  it('ignores live candles while scrubbed into the past', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-10T00:00:00Z')])
    render(
      <MarketChart
        {...baseProps}
        anchorMs={Date.parse('2026-06-10T12:00:00Z')}
        liveCandle={liveWc('2026-06-10T00:01:00Z')}
      />
    )

    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalled()
    })
    expect(mocks.series.update).not.toHaveBeenCalled()
  })

  it('requests a timeframe switch when zoomed out with auto-LOD on', async () => {
    const onLodTimeframe = vi.fn()

    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:00:00Z')])
    render(<MarketChart {...baseProps} autoLod onLodTimeframe={onLodTimeframe} />)
    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalled()
    })

    mocks.timeScale.getVisibleLogicalRange.mockReturnValue({ from: 0, to: 600 })
    mocks.timeScale.width.mockReturnValue(1000)

    act(() => {
      mocks.handlerRef.current?.()
    })

    expect(onLodTimeframe).toHaveBeenCalledWith('5m')
  })

  it('shows no-data when the initial window is empty', async () => {
    render(<MarketChart {...baseProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('chart-no-data')).toBeInTheDocument()
    })
    expect(screen.getByText('chart.noDataTitle:EUR-USD')).toBeInTheDocument()
  })

  it('does not fetch when disabled', () => {
    render(<MarketChart {...baseProps} enabled={false} />)

    expect(mocks.getCandlesRange).not.toHaveBeenCalled()
    expect(screen.getByTestId('chart-no-data')).toBeInTheDocument()
  })

  it('does not fetch when no instrument is selected', () => {
    render(<MarketChart {...baseProps} instrument={null} />)

    expect(mocks.getCandlesRange).not.toHaveBeenCalled()
  })

  it('shows a spinner while the initial fetch is in flight', async () => {
    const pending = deferred<CandleData[]>()

    mocks.getCandlesRange.mockReturnValueOnce(pending.promise)
    render(<MarketChart {...baseProps} />)

    expect(screen.getByTestId('initial-loading')).toBeInTheDocument()
    await act(async () => {
      pending.resolve([candleRow('2026-06-20T00:00:00Z')])
      await pending.promise
    })
    await waitFor(() => {
      expect(screen.queryByTestId('initial-loading')).not.toBeInTheDocument()
    })
  })

  it('surfaces an initial fetch error', async () => {
    mocks.getCandlesRange.mockRejectedValueOnce(new Error('boom'))
    render(<MarketChart {...baseProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('chart-error')).toBeInTheDocument()
    })
    expect(screen.getByText('chart.errorPrefix boom')).toBeInTheDocument()
  })

  it('falls back to the unknown-error label and stringifies non-errors', async () => {
    mocks.getCandlesRange.mockRejectedValueOnce('')
    render(<MarketChart {...baseProps} />)

    await waitFor(() => {
      expect(screen.getByText('chart.errorPrefix chart.unknownError')).toBeInTheDocument()
    })
  })

  it('loads older history and shifts the viewport when panned to the left edge', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:05:00Z')])
    render(<MarketChart {...baseProps} />)
    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalledTimes(1)
    })

    mocks.timeScale.getVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
    mocks.series.barsInLogicalRange.mockReturnValue({ barsBefore: 0, barsAfter: 0 })
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:00:00Z', 99)])

    await act(async () => {
      mocks.handlerRef.current?.()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalledTimes(2)
    })
    expect(mocks.timeScale.setVisibleLogicalRange).toHaveBeenCalled()
  })

  it('shows the older-loading indicator while paging history', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:05:00Z')])
    render(<MarketChart {...baseProps} />)
    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalled()
    })

    const pending = deferred<CandleData[]>()

    mocks.timeScale.getVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
    mocks.series.barsInLogicalRange.mockReturnValue({ barsBefore: 0, barsAfter: 0 })
    mocks.getCandlesRange.mockReturnValueOnce(pending.promise)

    act(() => {
      mocks.handlerRef.current?.()
    })

    await waitFor(() => {
      expect(screen.getByTestId('older-loading')).toBeInTheDocument()
    })
    await act(async () => {
      pending.resolve([candleRow('2026-06-20T00:00:00Z', 99)])
      await pending.promise
    })
    await waitFor(() => {
      expect(screen.queryByTestId('older-loading')).not.toBeInTheDocument()
    })
  })

  it('shows a non-blocking error badge when paging older history fails', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:05:00Z')])
    render(<MarketChart {...baseProps} />)
    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalled()
    })

    mocks.timeScale.getVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
    mocks.series.barsInLogicalRange.mockReturnValue({ barsBefore: 0, barsAfter: 0 })
    mocks.getCandlesRange.mockRejectedValueOnce(new Error('older boom'))

    await act(async () => {
      mocks.handlerRef.current?.()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByTestId('older-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('chart-shell')).toBeInTheDocument()
  })

  it('returns no older candles when the instrument has been cleared', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:05:00Z')])
    const { rerender } = render(<MarketChart {...baseProps} />)

    await waitFor(() => {
      expect(mocks.series.setData).toHaveBeenCalled()
    })

    mocks.getCandlesRange.mockClear()
    rerender(<MarketChart {...baseProps} instrument={null} />)
    mocks.timeScale.getVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
    mocks.series.barsInLogicalRange.mockReturnValue({ barsBefore: 0, barsAfter: 0 })

    await act(async () => {
      mocks.handlerRef.current?.()
      await Promise.resolve()
    })

    expect(mocks.getCandlesRange).not.toHaveBeenCalled()
  })

  it('detaches and destroys the controller on unmount', async () => {
    mocks.getCandlesRange.mockResolvedValueOnce([candleRow('2026-06-20T00:00:00Z')])
    const { unmount } = render(<MarketChart {...baseProps} />)

    await waitFor(() => {
      expect(mocks.timeScale.subscribeVisibleLogicalRangeChange).toHaveBeenCalled()
    })

    unmount()
    expect(mocks.timeScale.unsubscribeVisibleLogicalRangeChange).toHaveBeenCalled()
  })

  it('ignores an initial result that resolves after unmount', async () => {
    const pending = deferred<CandleData[]>()

    mocks.getCandlesRange.mockReturnValueOnce(pending.promise)
    const { unmount } = render(<MarketChart {...baseProps} />)

    unmount()
    await act(async () => {
      pending.resolve([candleRow('2026-06-20T00:00:00Z')])
      await pending.promise
    })

    expect(mocks.series.setData).not.toHaveBeenCalled()
  })

  it('ignores an initial error that rejects after unmount', async () => {
    const pending = deferred<CandleData[]>()

    mocks.getCandlesRange.mockReturnValueOnce(pending.promise)
    const { unmount } = render(<MarketChart {...baseProps} />)

    unmount()
    await act(async () => {
      pending.reject(new Error('late'))
      await pending.promise.catch(() => undefined)
    })

    expect(screen.queryByTestId('chart-error')).not.toBeInTheDocument()
  })
})
