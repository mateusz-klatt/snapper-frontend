import type { CandleData } from '../../types/api'
import { getCandlesRange } from './market'

const MINUTE_MS = 60_000
const WINDOW_MINUTES = 1440

export interface MarketStats {
  windowEnd: string
  price: number | null
  change: number | null
  changePercent: number | null
  high24h: number | null
  low24h: number | null
}

interface MarketWindow {
  start: number
  end: number
  windowEnd: string
  knowledgeAt: string
}

const marketWindow = (anchorMs: number | null, asOf: string | null): MarketWindow => {
  const now = Date.now()
  const knowledge = asOf === null ? now : Date.parse(asOf)
  const anchor = anchorMs ?? knowledge

  if (!Number.isFinite(knowledge) || !Number.isFinite(anchor)) {
    throw new RangeError('Market statistics require a finite time horizon')
  }

  const end = Math.floor(Math.min(anchor, knowledge) / MINUTE_MS) * MINUTE_MS

  return {
    start: end - WINDOW_MINUTES * MINUTE_MS,
    end,
    windowEnd: new Date(end).toISOString(),
    knowledgeAt: new Date(knowledge).toISOString(),
  }
}

const loadWindow = async (
  instrument: string,
  exchange: string,
  window: MarketWindow
): Promise<CandleData[]> => {
  const firstStart = new Date(window.start - MINUTE_MS).toISOString()
  const firstEnd = new Date(window.start + 998 * MINUTE_MS).toISOString()
  const secondStart = new Date(window.start + 999 * MINUTE_MS).toISOString()
  const secondEnd = new Date(window.end - MINUTE_MS).toISOString()
  const pages = await Promise.all([
    getCandlesRange(instrument, exchange, '1m', firstStart, firstEnd, 1000, window.knowledgeAt),
    getCandlesRange(instrument, exchange, '1m', secondStart, secondEnd, 441, window.knowledgeAt),
  ])

  return pages.flat()
}

const validCandle = (row: CandleData, instrument: string, exchange: string): boolean =>
  row.complete === true &&
  row.timeframe === '1m' &&
  row.instrument === instrument &&
  row.exchange === exchange &&
  [row.open, row.high, row.low, row.close].every(Number.isFinite) &&
  row.high >= Math.max(row.open, row.close, row.low) &&
  row.low <= Math.min(row.open, row.close, row.high)

const samePrices = (left: CandleData, right: CandleData): boolean =>
  (['open', 'high', 'low', 'close'] as const).every(field => left[field] === right[field])

const indexCandles = (
  rows: CandleData[],
  instrument: string,
  exchange: string,
  window: MarketWindow
): Map<number, CandleData | null> => {
  const indexed = new Map<number, CandleData | null>()

  for (const row of rows) {
    const at = Date.parse(row.open_at)

    if (!Number.isFinite(at) || at < window.start - MINUTE_MS || at >= window.end) continue

    const minute = Math.floor(at / MINUTE_MS) * MINUTE_MS
    const current = at === minute && validCandle(row, instrument, exchange) ? row : null
    const previous = indexed.get(minute)

    if (previous === undefined) {
      indexed.set(minute, current)
    } else if (previous === null || current === null || !samePrices(previous, current)) {
      indexed.set(minute, null)
    }
  }

  return indexed
}

const present = (row: CandleData | null | undefined): row is CandleData => row != null

const finiteOrNull = (value: number): number | null => (Number.isFinite(value) ? value : null)

export async function getMarketStats(
  instrument: string,
  exchange: string,
  anchorMs: number | null,
  asOf: string | null
): Promise<MarketStats> {
  const window = marketWindow(anchorMs, asOf)
  const rows = await loadWindow(instrument, exchange, window)
  const indexed = indexCandles(rows, instrument, exchange, window)
  const result: MarketStats = {
    windowEnd: window.windowEnd,
    price: indexed.get(window.end - MINUTE_MS)?.close ?? null,
    change: null,
    changePercent: null,
    high24h: null,
    low24h: null,
  }
  const candles = Array.from({ length: WINDOW_MINUTES }, (_, index) =>
    indexed.get(window.start + index * MINUTE_MS)
  )

  if (!candles.every(present)) return result

  result.high24h = Math.max(...candles.map(row => row.high))
  result.low24h = Math.min(...candles.map(row => row.low))
  const baseline = indexed.get(window.start - MINUTE_MS)

  if (baseline == null) return result

  result.change = finiteOrNull((result.price as number) - baseline.close)
  result.changePercent =
    baseline.close === 0 || result.change === null
      ? null
      : finiteOrNull((result.change / Math.abs(baseline.close)) * 100)

  return result
}
