import { describe, it, expect } from 'vitest'
import type { CandleData } from '../../types/api'
import {
  TIMEFRAME_LADDER,
  TIMEFRAME_SECONDS,
  DEFAULT_LOD_THRESHOLDS,
  LEFT_PREFETCH_BARS,
  MAX_CHART_BARS,
  appendLive,
  barsPerPixel,
  coarserTimeframe,
  decideLodTimeframe,
  finerTimeframe,
  isTimeframeValue,
  mergeOlder,
  olderRange,
  shiftLogicalSpan,
  shouldFetchOlder,
  toChartData,
  toChartDatum,
  toWindowCandle,
  type TimeframeValue,
  type WindowCandle,
} from './chartNavigation'

const candle = (openAtMs: number, close = 100): WindowCandle => ({
  openAtMs,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
  complete: true,
})

const makeCandleData = (overrides: Partial<CandleData> = {}): CandleData => ({
  type: 'candle',
  sequence_id: 1,
  public_id: 'pid',
  timestamp: '2026-06-20T00:00:00Z',
  session_id: 'sid',
  instrument: 'EUR-USD',
  exchange: 'kraken',
  timeframe: '1m',
  open_at: '2026-06-20T00:00:00Z',
  open: 1,
  high: 2,
  low: 0.5,
  close: 1.5,
  volume: 100,
  complete: true,
  ...overrides,
})

describe('timeframe ladder', () => {
  it('maps every ladder entry to a positive second count', () => {
    for (const tf of TIMEFRAME_LADDER) {
      expect(TIMEFRAME_SECONDS[tf]).toBeGreaterThan(0)
    }
  })

  it('recognises valid and rejects invalid timeframe strings', () => {
    expect(isTimeframeValue('1m')).toBe(true)
    expect(isTimeframeValue('1d')).toBe(true)
    expect(isTimeframeValue('2h')).toBe(false)
  })

  it('coarsens within the ladder, returns null at the coarse end and for unknowns', () => {
    expect(coarserTimeframe('1m')).toBe('5m')
    expect(coarserTimeframe('4h')).toBe('1d')
    expect(coarserTimeframe('1d')).toBeNull()
    expect(coarserTimeframe('2h' as TimeframeValue)).toBeNull()
  })

  it('refines within the ladder, returns null at the fine end and for unknowns', () => {
    expect(finerTimeframe('5m')).toBe('1m')
    expect(finerTimeframe('1d')).toBe('4h')
    expect(finerTimeframe('1m')).toBeNull()
    expect(finerTimeframe('2h' as TimeframeValue)).toBeNull()
  })
})

describe('toWindowCandle', () => {
  it('maps a REST candle row to a window candle', () => {
    const result = toWindowCandle(
      makeCandleData({
        open_at: '2026-06-20T00:01:00Z',
        open: 10,
        high: 12,
        low: 9,
        close: 11,
        volume: 5,
      })
    )

    expect(result).toEqual({
      openAtMs: Date.parse('2026-06-20T00:01:00Z'),
      open: 10,
      high: 12,
      low: 9,
      close: 11,
      volume: 5,
      complete: true,
    })
  })
})

describe('toChartData', () => {
  it('converts to unix-second data preserving order', () => {
    const out = toChartData([candle(60_000, 1), candle(120_000, 2)])

    expect(out).toEqual([
      { time: 60, open: 1, high: 2, low: 0, close: 1 },
      { time: 120, open: 2, high: 3, low: 1, close: 2 },
    ])
  })

  it('collapses bars that share a unix second, keeping the latest', () => {
    const out = toChartData([candle(60_000, 1), candle(60_400, 9)])

    expect(out).toEqual([{ time: 60, open: 9, high: 10, low: 8, close: 9 }])
  })

  it('returns an empty array for no candles', () => {
    expect(toChartData([])).toEqual([])
  })
})

describe('toChartDatum', () => {
  it('converts a single window candle to unix-second datum', () => {
    expect(toChartDatum(candle(90_000, 7))).toEqual({
      time: 90,
      open: 7,
      high: 8,
      low: 6,
      close: 7,
    })
  })
})

describe('barsPerPixel', () => {
  it('returns null for a missing range', () => {
    expect(barsPerPixel(null, 800)).toBeNull()
  })

  it('returns null for non-positive width', () => {
    expect(barsPerPixel({ from: 0, to: 100 }, 0)).toBeNull()
  })

  it('returns null for a non-positive span', () => {
    expect(barsPerPixel({ from: 10, to: 10 }, 800)).toBeNull()
  })

  it('computes span / width', () => {
    expect(barsPerPixel({ from: 0, to: 400 }, 800)).toBeCloseTo(0.5)
  })
})

describe('decideLodTimeframe', () => {
  it('returns null when bars-per-pixel is unknown', () => {
    expect(decideLodTimeframe('1m', null)).toBeNull()
  })

  it('coarsens when too dense and refines when too sparse', () => {
    expect(decideLodTimeframe('1m', DEFAULT_LOD_THRESHOLDS.coarsenAbove + 0.1)).toBe('5m')
    expect(decideLodTimeframe('5m', DEFAULT_LOD_THRESHOLDS.refineBelow - 0.01)).toBe('1m')
  })

  it('stays put within the hysteresis band', () => {
    expect(decideLodTimeframe('5m', 0.3)).toBeNull()
  })

  it('cannot coarsen past the top or refine past the bottom of the ladder', () => {
    expect(decideLodTimeframe('1d', 1)).toBeNull()
    expect(decideLodTimeframe('1m', 0)).toBeNull()
  })

  it('honours custom thresholds', () => {
    expect(decideLodTimeframe('1m', 0.2, { coarsenAbove: 0.1, refineBelow: 0.01 })).toBe('5m')
  })
})

describe('shouldFetchOlder', () => {
  it('does not fetch when barsBefore is unknown', () => {
    expect(
      shouldFetchOlder({ barsBefore: null, olderInFlight: false, historyExhausted: false })
    ).toBe(false)
  })

  it('does not fetch while a request is in flight', () => {
    expect(shouldFetchOlder({ barsBefore: 0, olderInFlight: true, historyExhausted: false })).toBe(
      false
    )
  })

  it('does not fetch once history is exhausted', () => {
    expect(shouldFetchOlder({ barsBefore: 0, olderInFlight: false, historyExhausted: true })).toBe(
      false
    )
  })

  it('fetches when the left edge is near and idle', () => {
    expect(
      shouldFetchOlder({
        barsBefore: LEFT_PREFETCH_BARS - 1,
        olderInFlight: false,
        historyExhausted: false,
      })
    ).toBe(true)
  })

  it('does not fetch once past the threshold', () => {
    expect(
      shouldFetchOlder({
        barsBefore: LEFT_PREFETCH_BARS,
        olderInFlight: false,
        historyExhausted: false,
      })
    ).toBe(false)
  })

  it('honours a custom threshold', () => {
    expect(
      shouldFetchOlder({
        barsBefore: 5,
        olderInFlight: false,
        historyExhausted: false,
        threshold: 10,
      })
    ).toBe(true)
  })
})

describe('olderRange', () => {
  it('ends one second before the oldest bar and spans pageBars * tf', () => {
    const oldest = Date.parse('2026-06-20T00:00:00Z')
    const { start, end } = olderRange(oldest, TIMEFRAME_SECONDS['1m'], 600)

    expect(Date.parse(end)).toBe(oldest - 1000)
    expect(Date.parse(start)).toBe(oldest - 1000 - 600 * 60 * 1000)
  })

  it('widens the lookback by scanWindows', () => {
    const oldest = Date.parse('2026-06-20T00:00:00Z')
    const single = olderRange(oldest, 60, 600, 1)
    const wide = olderRange(oldest, 60, 600, 3)

    expect(Date.parse(single.end)).toBe(Date.parse(wide.end))
    expect(Date.parse(single.start) - Date.parse(wide.start)).toBe(2 * 600 * 60 * 1000)
  })
})

describe('mergeOlder', () => {
  it('returns the existing window unchanged when there is nothing to prepend', () => {
    const existing = [candle(60_000), candle(120_000)]
    const result = mergeOlder(existing, [])

    expect(result.addedBefore).toBe(0)
    expect(result.candles).toEqual(existing)
    expect(result.candles).not.toBe(existing)
  })

  it('prepends strictly-older bars, sorted and deduped, dropping overlap', () => {
    const existing = [candle(120_000, 5), candle(180_000, 6)]
    const older = [candle(60_000, 1), candle(60_000, 1), candle(120_000, 99), candle(30_000, 0)]
    const result = mergeOlder(existing, older)

    expect(result.addedBefore).toBe(2)
    expect(result.candles.map(c => c.openAtMs)).toEqual([30_000, 60_000, 120_000, 180_000])
  })

  it('treats an empty window as an infinite boundary', () => {
    const result = mergeOlder([], [candle(120_000), candle(60_000)])

    expect(result.addedBefore).toBe(2)
    expect(result.candles.map(c => c.openAtMs)).toEqual([60_000, 120_000])
  })

  it('evicts from the newest end to honour the cap', () => {
    const existing = [candle(300_000), candle(360_000)]
    const older = [candle(60_000), candle(120_000), candle(180_000)]
    const result = mergeOlder(existing, older, 3)

    expect(result.candles).toHaveLength(3)
    expect(result.candles.map(c => c.openAtMs)).toEqual([60_000, 120_000, 180_000])
    expect(result.addedBefore).toBe(3)
    expect(result.evictedAfter).toBe(2)
  })
})

describe('appendLive', () => {
  it('appends into an empty window', () => {
    const result = appendLive([], candle(60_000))

    expect(result.outcome).toBe('append')
    expect(result.candles).toHaveLength(1)
    expect(result.evictedBefore).toBe(0)
  })

  it('replaces the forming last bar when open_at matches', () => {
    const existing = [candle(60_000, 1), candle(120_000, 2)]
    const result = appendLive(existing, candle(120_000, 7))

    expect(result.outcome).toBe('update')
    expect(result.candles.map(c => c.close)).toEqual([1, 7])
  })

  it('appends a newer bar without eviction while under the cap', () => {
    const existing = [candle(60_000), candle(120_000)]
    const result = appendLive(existing, candle(180_000))

    expect(result.outcome).toBe('append')
    expect(result.evictedBefore).toBe(0)
    expect(result.candles.map(c => c.openAtMs)).toEqual([60_000, 120_000, 180_000])
  })

  it('appends a newer bar and evicts oldest beyond the cap', () => {
    const existing = [candle(60_000), candle(120_000), candle(180_000)]
    const result = appendLive(existing, candle(240_000), 3)

    expect(result.outcome).toBe('append')
    expect(result.evictedBefore).toBe(1)
    expect(result.candles.map(c => c.openAtMs)).toEqual([120_000, 180_000, 240_000])
  })

  it('ignores a stale bar older than the last', () => {
    const existing = [candle(120_000), candle(180_000)]
    const result = appendLive(existing, candle(60_000))

    expect(result.outcome).toBe('ignore')
    expect(result.candles).toEqual(existing)
    expect(result.candles).not.toBe(existing)
  })
})

describe('shiftLogicalSpan', () => {
  it('shifts both endpoints by the bar count', () => {
    expect(shiftLogicalSpan({ from: 10, to: 20 }, 5)).toEqual({ from: 15, to: 25 })
  })
})

describe('constants', () => {
  it('exposes sane navigation defaults', () => {
    expect(MAX_CHART_BARS).toBeGreaterThan(LEFT_PREFETCH_BARS)
  })
})
