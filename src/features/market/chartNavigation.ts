/**
 * Pure, framework-free logic for chart-native market navigation.
 *
 * The `#market` chart replaces the time-travel slider with direct chart
 * interaction: panning left lazily loads older candles, and zooming changes
 * the level-of-detail (timeframe). All the decision math lives here so it can
 * be unit-tested in isolation from lightweight-charts and React.
 *
 * Canonical key for a candle is its `open_at` as epoch milliseconds
 * (`openAtMs`); lightweight-charts itself wants unix *seconds* (`ChartDatum.time`).
 */
import type { CandleData } from '../../types/api'

/** Timeframe level-of-detail ladder, finest first. */
export const TIMEFRAME_LADDER = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const

export type TimeframeValue = (typeof TIMEFRAME_LADDER)[number]

export const TIMEFRAME_SECONDS: Record<TimeframeValue, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
}

const TIMEFRAME_INDEX: ReadonlyMap<string, number> = new Map(
  TIMEFRAME_LADDER.map((tf, index) => [tf, index])
)

const COARSER_TIMEFRAME: ReadonlyMap<TimeframeValue, TimeframeValue> = new Map(
  TIMEFRAME_LADDER.flatMap((tf, index) => {
    const next = TIMEFRAME_LADDER[index + 1]

    return next === undefined ? [] : [[tf, next] as const]
  })
)

const FINER_TIMEFRAME: ReadonlyMap<TimeframeValue, TimeframeValue> = new Map(
  TIMEFRAME_LADDER.flatMap((tf, index) => {
    const previous = index > 0 ? TIMEFRAME_LADDER[index - 1] : undefined

    return previous === undefined ? [] : [[tf, previous] as const]
  })
)

/** Number of bars left of the viewport below which older history is prefetched. */
export const LEFT_PREFETCH_BARS = 100

/** How many bars a single older-history page requests. */
export const FETCH_PAGE_BARS = 600

/** Hard cap on candles retained in the chart window (two-sided eviction). */
export const MAX_CHART_BARS = 5000

/** How many of the most-recent bars to show on first render (keeps the user off the left edge). */
export const DEFAULT_VISIBLE_BARS = 120

/** Maximum widening multiplier when scanning back across gaps (weekends / illiquidity). */
export const MAX_BACKSCAN_WINDOWS = 8

/** Lockout (ms) after a programmatic timeframe switch before auto-LOD may fire again. */
export const LOD_DWELL_MS = 750

/** A candle held in the navigation window. */
export interface WindowCandle {
  openAtMs: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  complete: boolean
}

/** lightweight-charts candlestick datum (time is unix seconds). */
export interface ChartDatum {
  time: number
  open: number
  high: number
  low: number
  close: number
}

/** Inclusive logical-index range as used by lightweight-charts. */
export interface LogicalSpan {
  from: number
  to: number
}

export function isTimeframeValue(value: string): value is TimeframeValue {
  return TIMEFRAME_INDEX.has(value)
}

/** The next coarser timeframe, or null at the coarse end of the ladder. */
export function coarserTimeframe(tf: TimeframeValue): TimeframeValue | null {
  return COARSER_TIMEFRAME.get(tf) ?? null
}

/** The next finer timeframe, or null at the fine end of the ladder. */
export function finerTimeframe(tf: TimeframeValue): TimeframeValue | null {
  return FINER_TIMEFRAME.get(tf) ?? null
}

/** Map a REST candle row to the internal window representation. */
export function toWindowCandle(candle: CandleData): WindowCandle {
  return {
    openAtMs: Date.parse(candle.open_at),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    complete: candle.complete,
  }
}

/**
 * Convert sorted window candles to deduped lightweight-charts data. Bars that
 * collapse onto the same unix-second (sub-second timeframes never do, but a
 * defensive guard keeps lightweight-charts' strict ascending-time contract)
 * keep the latest value.
 */
export function toChartData(candles: readonly WindowCandle[]): ChartDatum[] {
  const out: ChartDatum[] = []

  for (const candle of candles) {
    const time = Math.floor(candle.openAtMs / 1000)
    const datum: ChartDatum = {
      time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }
    const previous = out.at(-1)

    if (previous?.time === time) {
      out[out.length - 1] = datum
    } else {
      out.push(datum)
    }
  }

  return out
}

/** Convert a single window candle to a lightweight-charts datum. */
export function toChartDatum(candle: WindowCandle): ChartDatum {
  return {
    time: Math.floor(candle.openAtMs / 1000),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }
}

/** Bars-per-pixel for the current viewport, or null when undeterminable. */
export function barsPerPixel(range: LogicalSpan | null, width: number): number | null {
  if (!range || width <= 0) {
    return null
  }

  const span = range.to - range.from

  if (span <= 0) {
    return null
  }

  return span / width
}

export interface LodThresholds {
  /** Coarsen when bars-per-pixel rises above this (bars too dense). */
  coarsenAbove: number
  /** Refine when bars-per-pixel falls below this (bars too sparse). */
  refineBelow: number
}

export const DEFAULT_LOD_THRESHOLDS: LodThresholds = {
  coarsenAbove: 0.55,
  refineBelow: 0.07,
}

/**
 * Decide whether zoom level warrants a timeframe change. Returns the target
 * timeframe, or null to stay put. The gap between the two thresholds provides
 * hysteresis so a single drag near a boundary does not thrash.
 */
export function decideLodTimeframe(
  current: TimeframeValue,
  bpp: number | null,
  thresholds: LodThresholds = DEFAULT_LOD_THRESHOLDS
): TimeframeValue | null {
  if (bpp === null) {
    return null
  }

  if (bpp > thresholds.coarsenAbove) {
    return coarserTimeframe(current)
  }

  if (bpp < thresholds.refineBelow) {
    return finerTimeframe(current)
  }

  return null
}

export interface FetchOlderInput {
  barsBefore: number | null
  olderInFlight: boolean
  historyExhausted: boolean
  threshold?: number
}

/** Whether the left edge is close enough (and idle) to prefetch older history. */
export function shouldFetchOlder({
  barsBefore,
  olderInFlight,
  historyExhausted,
  threshold = LEFT_PREFETCH_BARS,
}: FetchOlderInput): boolean {
  if (barsBefore === null || olderInFlight || historyExhausted) {
    return false
  }

  return barsBefore < threshold
}

export interface IsoRange {
  start: string
  end: string
}

/**
 * Compute the `[start, end]` window (ISO-8601 UTC) for the next older page,
 * ending just before the oldest known bar. `scanWindows` widens the lookback
 * to skip gaps (weekends / illiquid instruments).
 */
export function olderRange(
  oldestOpenMs: number,
  tfSeconds: number,
  pageBars: number,
  scanWindows = 1
): IsoRange {
  const endMs = oldestOpenMs - 1000
  const startMs = endMs - pageBars * tfSeconds * 1000 * scanWindows

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  }
}

export interface PrependResult {
  candles: WindowCandle[]
  /** How many older bars were prepended — the logical-index shift to apply. */
  addedBefore: number
  /** How many newest bars were evicted to honour the cap. */
  evictedAfter: number
}

/**
 * Prepend strictly-older bars to the window, deduped and sorted, evicting from
 * the newest end to honour `maxBars` (the user is panning left, so the live
 * edge is the safe side to drop).
 */
export function mergeOlder(
  existing: readonly WindowCandle[],
  older: readonly WindowCandle[],
  maxBars = MAX_CHART_BARS
): PrependResult {
  if (older.length === 0) {
    return { candles: existing.slice(), addedBefore: 0, evictedAfter: 0 }
  }

  const firstExisting = existing.at(0)
  const boundaryMs = firstExisting ? firstExisting.openAtMs : Number.POSITIVE_INFINITY
  const seen = new Set<number>()
  const prepend: WindowCandle[] = []

  for (const candle of [...older].sort((a, b) => a.openAtMs - b.openAtMs)) {
    if (candle.openAtMs >= boundaryMs || seen.has(candle.openAtMs)) {
      continue
    }

    seen.add(candle.openAtMs)
    prepend.push(candle)
  }

  let candles = [...prepend, ...existing]
  let evictedAfter = 0

  if (candles.length > maxBars) {
    evictedAfter = candles.length - maxBars
    candles = candles.slice(0, maxBars)
  }

  return { candles, addedBefore: prepend.length, evictedAfter }
}

type LiveOutcome = 'append' | 'update' | 'ignore'

export interface AppendLiveResult {
  candles: WindowCandle[]
  outcome: LiveOutcome
  /** Bars evicted from the oldest (front) end to honour `maxBars`. */
  evictedBefore: number
}

/**
 * Fold a live candle into the window: replace the forming last bar, append a
 * newer one (evicting oldest beyond the cap), or ignore a stale bar that
 * belongs to already-loaded history.
 */
export function appendLive(
  existing: readonly WindowCandle[],
  live: WindowCandle,
  maxBars = MAX_CHART_BARS
): AppendLiveResult {
  const last = existing.at(-1)

  if (!last) {
    return { candles: [live], outcome: 'append', evictedBefore: 0 }
  }

  if (live.openAtMs === last.openAtMs) {
    const candles = existing.slice(0, -1)

    candles.push(live)

    return { candles, outcome: 'update', evictedBefore: 0 }
  }

  if (live.openAtMs > last.openAtMs) {
    let candles = [...existing, live]
    let evictedBefore = 0

    if (candles.length > maxBars) {
      evictedBefore = candles.length - maxBars
      candles = candles.slice(evictedBefore)
    }

    return { candles, outcome: 'append', evictedBefore }
  }

  return { candles: existing.slice(), outcome: 'ignore', evictedBefore: 0 }
}

/** Shift a logical range by a bar count (used after prepending older bars). */
export function shiftLogicalSpan(range: LogicalSpan, shift: number): LogicalSpan {
  return { from: range.from + shift, to: range.to + shift }
}
