import { describe, it, expect, vi } from 'vitest'
import type { ChartHandle } from '../../components/LightweightChart'
import { createChartNavAdapter } from './chartNavAdapter'
import type { ChartDatum } from './chartNavigation'

const datum: ChartDatum = { time: 120, open: 1, high: 2, low: 0, close: 1.5 }

const makeHandle = (
  overrides: {
    visibleRange?: { from: number; to: number } | null
    barsInfo?: { barsBefore: number; barsAfter: number } | null
  } = {}
) => {
  const timeScale = {
    getVisibleLogicalRange: vi.fn(() => overrides.visibleRange ?? null),
    setVisibleLogicalRange: vi.fn(),
    fitContent: vi.fn(),
    subscribeVisibleLogicalRangeChange: vi.fn(),
    unsubscribeVisibleLogicalRangeChange: vi.fn(),
  }
  const series = {
    setData: vi.fn(),
    update: vi.fn(),
    barsInLogicalRange: vi.fn(() => overrides.barsInfo ?? null),
  }
  const chart = { timeScale: () => timeScale }
  const handle = { chart, series } as unknown as ChartHandle

  return { handle, timeScale, series }
}

describe('createChartNavAdapter', () => {
  it('maps setData to lightweight-charts candlesticks', () => {
    const { handle, series } = makeHandle()

    createChartNavAdapter(handle).setData([datum])

    expect(series.setData).toHaveBeenCalledWith([
      { time: 120, open: 1, high: 2, low: 0, close: 1.5 },
    ])
  })

  it('maps updateLast to a single series update', () => {
    const { handle, series } = makeHandle()

    createChartNavAdapter(handle).updateLast(datum)

    expect(series.update).toHaveBeenCalledWith({ time: 120, open: 1, high: 2, low: 0, close: 1.5 })
  })

  it('returns the visible logical range when present', () => {
    const { handle } = makeHandle({ visibleRange: { from: 3, to: 9 } })

    expect(createChartNavAdapter(handle).getVisibleLogicalRange()).toEqual({ from: 3, to: 9 })
  })

  it('returns null when there is no visible logical range', () => {
    const { handle } = makeHandle({ visibleRange: null })

    expect(createChartNavAdapter(handle).getVisibleLogicalRange()).toBeNull()
  })

  it('forwards setVisibleLogicalRange', () => {
    const { handle, timeScale } = makeHandle()

    createChartNavAdapter(handle).setVisibleLogicalRange({ from: 1, to: 2 })

    expect(timeScale.setVisibleLogicalRange).toHaveBeenCalledWith({ from: 1, to: 2 })
  })

  it('returns barsBefore from the series', () => {
    const { handle } = makeHandle({ barsInfo: { barsBefore: 42, barsAfter: 7 } })

    expect(createChartNavAdapter(handle).barsBefore({ from: 0, to: 10 })).toBe(42)
  })

  it('returns null barsBefore when the series has no info', () => {
    const { handle } = makeHandle({ barsInfo: null })

    expect(createChartNavAdapter(handle).barsBefore({ from: 0, to: 10 })).toBeNull()
  })

  it('returns barsAfter from the series', () => {
    const { handle } = makeHandle({ barsInfo: { barsBefore: 42, barsAfter: 7 } })

    expect(createChartNavAdapter(handle).barsAfter({ from: 0, to: 10 })).toBe(7)
  })

  it('returns null barsAfter when the series has no info', () => {
    const { handle } = makeHandle({ barsInfo: null })

    expect(createChartNavAdapter(handle).barsAfter({ from: 0, to: 10 })).toBeNull()
  })

  it('forwards fitContent', () => {
    const { handle, timeScale } = makeHandle()

    createChartNavAdapter(handle).fitContent()

    expect(timeScale.fitContent).toHaveBeenCalled()
  })

  it('subscribes and returns an unsubscribe that detaches the same handler', () => {
    const { handle, timeScale } = makeHandle()
    const handler = vi.fn()

    const unsubscribe = createChartNavAdapter(handle).subscribeVisibleLogicalRangeChange(handler)
    const wrapped = timeScale.subscribeVisibleLogicalRangeChange.mock.calls[0]?.[0] as () => void

    wrapped()
    expect(handler).toHaveBeenCalledTimes(1)

    unsubscribe()
    expect(timeScale.unsubscribeVisibleLogicalRangeChange).toHaveBeenCalledWith(wrapped)
  })
})
