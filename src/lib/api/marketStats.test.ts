import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CandleData } from '../../types/api'
import { getCandlesRange } from './market'
import { getMarketStats } from './marketStats'

vi.mock('./market', () => ({ getCandlesRange: vi.fn() }))

const MINUTE = 60_000
const DAY = 1440 * MINUTE
const NOW = Date.parse('2026-06-20T12:00:30.000Z')
const END = Math.floor(NOW / MINUTE) * MINUTE

const candle = (at: number, overrides: Partial<CandleData> = {}): CandleData => ({
  type: 'candle',
  public_id: `candle-${at}`,
  session_id: 'test-session',
  sequence_id: at,
  timestamp: new Date(at + MINUTE).toISOString(),
  instrument: 'BTC/USD',
  exchange: 'kraken',
  timeframe: '1m',
  open_at: new Date(at).toISOString(),
  open: 100,
  high: 110,
  low: 90,
  close: 100,
  volume: 1,
  complete: true,
  origin: 'live',
  ...overrides,
})

const windowCandle = (index: number, end: number = END): CandleData =>
  candle(end - DAY - MINUTE + index * MINUTE, {
    open: 100 + index,
    high: 110 + index,
    low: 90 + index,
    close: index === 0 ? 100 : 101 + index,
  })

const fullWindow = (end: number = END): CandleData[] =>
  Array.from({ length: 1441 }, (_, index) => windowCandle(index, end))

const serve = (rows: CandleData[]): void => {
  vi.mocked(getCandlesRange)
    .mockResolvedValueOnce(rows.slice(0, 1000))
    .mockResolvedValueOnce(rows.slice(1000))
}

const emptyStats = {
  windowEnd: new Date(END).toISOString(),
  price: null,
  change: null,
  changePercent: null,
  high24h: null,
  low24h: null,
}

describe('getMarketStats', () => {
  beforeEach(() => {
    vi.mocked(getCandlesRange).mockReset().mockResolvedValue([])
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reconstructs OHLC extrema and baseline-relative change from a complete day', async () => {
    const rows = fullWindow()

    rows[0] = candle(END - DAY - MINUTE, { high: 999_999, low: -999_999 })
    serve(rows)

    await expect(getMarketStats('BTC/USD', 'kraken', null, null)).resolves.toEqual({
      windowEnd: new Date(END).toISOString(),
      price: 1541,
      change: 1441,
      changePercent: 1441,
      high24h: 1550,
      low24h: 91,
    })
  })

  it('fetches two inclusive bounded pages with one explicit knowledge horizon', async () => {
    serve(fullWindow())

    await getMarketStats('BTC/USD', 'kraken', null, null)

    const start = END - DAY

    expect(getCandlesRange).toHaveBeenNthCalledWith(
      1,
      'BTC/USD',
      'kraken',
      '1m',
      new Date(start - MINUTE).toISOString(),
      new Date(start + 998 * MINUTE).toISOString(),
      1000,
      new Date(NOW).toISOString()
    )
    expect(getCandlesRange).toHaveBeenNthCalledWith(
      2,
      'BTC/USD',
      'kraken',
      '1m',
      new Date(start + 999 * MINUTE).toISOString(),
      new Date(END - MINUTE).toISOString(),
      441,
      new Date(NOW).toISOString()
    )
    expect(Date.now).toHaveBeenCalledTimes(1)
  })

  it('keeps an old replay business anchor separate from current knowledge', async () => {
    const replay = END - DAY

    serve(fullWindow(replay))

    const result = await getMarketStats('BTC/USD', 'kraken', replay, null)

    expect(result.windowEnd).toBe(new Date(replay).toISOString())
    expect(getCandlesRange).toHaveBeenNthCalledWith(
      1,
      'BTC/USD',
      'kraken',
      '1m',
      expect.any(String),
      expect.any(String),
      1000,
      new Date(NOW).toISOString()
    )
  })

  it('clamps a replay anchor to the earlier historical knowledge horizon', async () => {
    const horizon = END - 3 * DAY + 19_000
    const end = Math.floor(horizon / MINUTE) * MINUTE

    serve(fullWindow(end))

    const result = await getMarketStats('BTC/USD', 'kraken', END, new Date(horizon).toISOString())

    expect(result.windowEnd).toBe(new Date(end).toISOString())
    expect(result.price).toBe(1541)
    expect(getCandlesRange).toHaveBeenNthCalledWith(
      2,
      'BTC/USD',
      'kraken',
      '1m',
      expect.any(String),
      expect.any(String),
      441,
      new Date(horizon).toISOString()
    )
  })

  it('uses the historical horizon when there is no local replay anchor', async () => {
    const end = END - 2 * DAY

    serve(fullWindow(end))

    const result = await getMarketStats('BTC/USD', 'kraken', null, new Date(end).toISOString())

    expect(result.windowEnd).toBe(new Date(end).toISOString())
  })

  it('returns unavailable values for absent history', async () => {
    await expect(getMarketStats('BTC/USD', 'kraken', null, null)).resolves.toEqual(emptyStats)
  })

  it('keeps the exact latest price when the remainder of the day is unavailable', async () => {
    serve([candle(END - MINUTE, { close: 103 })])

    await expect(getMarketStats('BTC/USD', 'kraken', null, null)).resolves.toEqual({
      ...emptyStats,
      price: 103,
    })
  })

  it('keeps full-day extrema but withholds change when the exact baseline is absent', async () => {
    serve(fullWindow().slice(1))

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result).toEqual({
      ...emptyStats,
      price: 1541,
      high24h: 1550,
      low24h: 91,
    })
  })

  it.each([1, 720, 1440])(
    'withholds full-day statistics when window row %i is missing',
    async index => {
      const rows = fullWindow().filter((_, position) => position !== index)

      serve(rows)

      const result = await getMarketStats('BTC/USD', 'kraken', null, null)

      expect(result).toEqual({ ...emptyStats, price: index === 1440 ? null : 1541 })
    }
  )

  it('never substitutes an older stale bar for the exact latest minute', async () => {
    serve([candle(END - 2 * MINUTE)])

    await expect(getMarketStats('BTC/USD', 'kraken', null, null)).resolves.toEqual(emptyStats)
  })

  it('ignores outside and future rows before validating their values', async () => {
    const rows = fullWindow()

    rows.push(
      candle(END, { complete: false, high: Infinity }),
      candle(END + MINUTE, { close: NaN }),
      candle(END - DAY - 2 * MINUTE, { low: -Infinity })
    )
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result.high24h).toBe(1550)
    expect(result.low24h).toBe(91)
    expect(result.change).toBe(1441)
  })

  it('deduplicates identical OHLC rows without depending on response order or row IDs', async () => {
    const rows = fullWindow()

    rows.push({ ...windowCandle(40), public_id: 'duplicate-observation', volume: 999 })
    rows.reverse()
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result.change).toBe(1441)
    expect(result.high24h).toBe(1550)
  })

  it.each(['open', 'high', 'low', 'close'] as const)(
    'withholds a window containing conflicting duplicate %s values',
    async field => {
      const rows = fullWindow()
      const row = windowCandle(40)

      rows.push({ ...row, [field]: row[field] + (field === 'low' ? -0.25 : 0.25) })
      serve(rows)

      const result = await getMarketStats('BTC/USD', 'kraken', null, null)

      expect(result).toEqual({ ...emptyStats, price: 1541 })
    }
  )

  it('does not recover an invalid minute by seeing a later valid duplicate', async () => {
    const rows = fullWindow()

    rows.unshift({ ...windowCandle(40), complete: false })
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result).toEqual({ ...emptyStats, price: 1541 })
  })

  it('invalidates the latest price when its later duplicate is invalid', async () => {
    const rows = fullWindow()

    rows.push({ ...windowCandle(1440), complete: false })
    serve(rows)

    await expect(getMarketStats('BTC/USD', 'kraken', null, null)).resolves.toEqual(emptyStats)
  })

  it('withholds only change when the baseline has conflicting observations', async () => {
    const rows = fullWindow()

    rows.push({ ...windowCandle(0), close: 101 })
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result).toEqual({ ...emptyStats, price: 1541, high24h: 1550, low24h: 91 })
  })

  it.each([
    { open: NaN },
    { high: Infinity },
    { low: -Infinity },
    { close: NaN },
    { high: 1 },
    { high: 1000, low: 200 },
    { complete: false },
    { timeframe: '5m' },
    { instrument: 'OTHER/PAIR' },
    { exchange: 'kraken_futures' },
    { open_at: 'unparseable' },
  ] satisfies Partial<CandleData>[])(
    'withholds full-day values for malformed or mismatched rows: %j',
    async patch => {
      const rows = fullWindow()

      rows[40] = { ...windowCandle(40), ...patch }
      serve(rows)

      const result = await getMarketStats('BTC/USD', 'kraken', null, null)

      expect(result).toEqual({ ...emptyStats, price: 1541 })
    }
  )

  it('rejects an unaligned row for its containing minute even beside a valid duplicate', async () => {
    const rows = fullWindow()

    rows.push({
      ...windowCandle(40),
      open_at: new Date(END - DAY + 39 * MINUTE + 500).toISOString(),
    })
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result).toEqual({ ...emptyStats, price: 1541 })
  })

  it('uses an absolute baseline denominator for negative prices', async () => {
    const rows = fullWindow()

    rows[0] = candle(END - DAY - MINUTE, { open: -100, high: -99, low: -101, close: -100 })
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result.change).toBe(1641)
    expect(result.changePercent).toBe(1641)
  })

  it('withholds percentage at a zero baseline while retaining finite absolute change', async () => {
    const rows = fullWindow()

    rows[0] = candle(END - DAY - MINUTE, { open: 0, high: 0, low: 0, close: 0 })
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result.change).toBe(1541)
    expect(result.changePercent).toBeNull()
  })

  it('withholds overflowing changes without discarding finite prices and extrema', async () => {
    const rows = fullWindow()

    rows[0] = candle(END - DAY - MINUTE, {
      open: -Number.MAX_VALUE,
      high: -Number.MAX_VALUE,
      low: -Number.MAX_VALUE,
      close: -Number.MAX_VALUE,
    })
    rows[1440] = candle(END - MINUTE, {
      open: Number.MAX_VALUE,
      high: Number.MAX_VALUE,
      low: Number.MAX_VALUE,
      close: Number.MAX_VALUE,
    })
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result.price).toBe(Number.MAX_VALUE)
    expect(result.high24h).toBe(Number.MAX_VALUE)
    expect(result.change).toBeNull()
    expect(result.changePercent).toBeNull()
  })

  it('withholds percentage overflow while retaining a finite absolute change', async () => {
    const rows = fullWindow()

    rows[0] = candle(END - DAY - MINUTE, {
      open: Number.MIN_VALUE,
      high: Number.MIN_VALUE,
      low: Number.MIN_VALUE,
      close: Number.MIN_VALUE,
    })
    serve(rows)

    const result = await getMarketStats('BTC/USD', 'kraken', null, null)

    expect(result.change).toBe(1541)
    expect(result.changePercent).toBeNull()
  })

  it.each([
    { anchor: NaN, horizon: null },
    { anchor: Infinity, horizon: null },
    { anchor: null, horizon: 'not-a-time' },
    { anchor: -8_640_000_000_000_000, horizon: null },
  ])('rejects invalid time bounds before requesting data: %j', async ({ anchor, horizon }) => {
    await expect(getMarketStats('BTC/USD', 'kraken', anchor, horizon)).rejects.toThrow()
    expect(getCandlesRange).not.toHaveBeenCalled()
  })

  it('propagates a failed page rather than presenting partial responses as valid statistics', async () => {
    vi.mocked(getCandlesRange).mockRejectedValueOnce(new Error('History unavailable'))

    await expect(getMarketStats('BTC/USD', 'kraken', null, null)).rejects.toThrow(
      'History unavailable'
    )
  })
})
