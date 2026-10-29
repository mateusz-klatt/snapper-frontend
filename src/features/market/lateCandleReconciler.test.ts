import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CandleData } from '../../types/api'
import type { CandleData as LiveCandleData } from '../../types/ws'
import { LateCandleReconciler } from './lateCandleReconciler'

const row = (minute = 31, overrides: Partial<CandleData> = {}): CandleData & LiveCandleData => ({
  type: 'candle',
  sequence_id: minute,
  public_id: `bar-${minute}`,
  session_id: 'publisher',
  timestamp: '2026-10-29T16:40:00Z',
  instrument: 'BTC-USD',
  exchange: 'kraken',
  timeframe: '1m',
  open_at: new Date(Date.parse('2026-10-29T16:00:00Z') + minute * 60_000).toISOString(),
  open: minute,
  high: minute + 1,
  low: minute - 1,
  close: minute,
  volume: minute,
  complete: true,
  origin: 'live',
  ...overrides,
  topic: overrides.topic ?? null,
  vwap: overrides.vwap ?? null,
  trades: overrides.trades ?? null,
  replay_window_start: overrides.replay_window_start ?? null,
  replay_window_end: overrides.replay_window_end ?? null,
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const setup = () => {
  const fetchRange = vi
    .fn<(...args: [string, string, number, string]) => Promise<CandleData[]>>()
    .mockResolvedValue([])
  const options = {
    instrument: 'BTC-USD',
    exchange: 'kraken',
    timeframe: '1m' as const,
    needsReconciliation: vi.fn<(candle: LiveCandleData) => boolean>(() => true),
    latestOpenMs: vi.fn<() => number | null>(() => null),
    fetchRange,
    apply: vi.fn(),
    isCurrent: vi.fn(() => true),
    onError: vi.fn(),
    onUnresolved: vi.fn(),
  }

  return { options, reconciler: new LateCandleReconciler(options) }
}

describe('LateCandleReconciler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-10-29T16:45:00Z')
  })
  afterEach(() => vi.useRealTimers())

  it('coalesces adjacent keys and equal/older author notifications into one bounded request', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockResolvedValue([row(31), row(32), row(33)])

    for (const minute of [31, 32, 33, 31, 32]) {
      reconciler.notify(row(minute))
    }

    reconciler.notify(row(31, { timestamp: '2026-10-29T16:39:00Z' }))
    await vi.advanceTimersByTimeAsync(100)

    expect(options.fetchRange).toHaveBeenCalledExactlyOnceWith(
      '2026-10-29T16:31:00.000Z',
      '2026-10-29T16:33:59.999Z',
      3,
      '2026-10-29T16:45:00.100Z'
    )
    expect(options.apply).toHaveBeenCalledExactlyOnceWith([row(31), row(32), row(33)])
    expect(options.onError).toHaveBeenCalledExactlyOnceWith(null)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(options.fetchRange).toHaveBeenCalledTimes(1)
  })

  it('uses a positive singleton range and explicit fresh H, including at higher timeframes', async () => {
    const { options } = setup()
    const reconciler = new LateCandleReconciler({ ...options, timeframe: '1d' })
    const candle = row(0, { timeframe: '1d' })

    options.fetchRange.mockResolvedValue([candle])
    reconciler.notify(candle)
    await vi.advanceTimersByTimeAsync(100)

    const [start, end, limit, horizon] = options.fetchRange.mock.calls[0] ?? []

    expect(Date.parse(String(end)) - Date.parse(String(start))).toBe(86_399_999)
    expect(limit).toBe(1)
    expect(horizon).toBe('2026-10-29T16:45:00.100Z')
  })

  it.each([
    { instrument: 'ETH-USD' },
    { exchange: 'polygon' },
    { timeframe: '5m' },
    { complete: false },
    { origin: 'replay' },
    { replay_window_start: '2026-10-29T16:00:00Z' },
    { replay_window_end: '2026-10-29T16:45:00Z' },
    { open_at: 'invalid' },
    { timestamp: 'invalid' },
    { timestamp: '2026-10-29T16:46:00Z' },
  ] satisfies Partial<LiveCandleData>[])(
    'ignores an ineligible notification %j',
    async overrides => {
      const { options, reconciler } = setup()

      reconciler.notify({ ...row(), ...overrides })
      await vi.advanceTimersByTimeAsync(5000)
      expect(options.fetchRange).not.toHaveBeenCalled()
    }
  )

  it('ignores notifications without a finality flag', async () => {
    const { options, reconciler } = setup()
    const candle = row()

    Reflect.deleteProperty(candle, 'complete')
    reconciler.notify(candle)
    await vi.advanceTimersByTimeAsync(1000)
    expect(options.fetchRange).not.toHaveBeenCalled()
  })

  it('does no work for unchanged rendered values or keys outside the loaded window', async () => {
    const { options, reconciler } = setup()

    options.needsReconciliation.mockReturnValue(false)
    reconciler.notify(row())
    await vi.advanceTimersByTimeAsync(5000)
    expect(options.fetchRange).not.toHaveBeenCalled()
  })

  it('serializes an in-flight burst into one merged follow-up, retaining newer versions', async () => {
    const pending = deferred<CandleData[]>()
    const { options, reconciler } = setup()
    const newer = row(31, { timestamp: '2026-10-29T16:41:00Z', close: 131 })

    options.fetchRange
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce([newer, row(32), row(33)])
    reconciler.notify(row(31))
    await vi.advanceTimersByTimeAsync(100)
    reconciler.notify(newer)
    reconciler.notify(row(32))
    reconciler.notify(row(33))
    await vi.advanceTimersByTimeAsync(1000)
    expect(options.fetchRange).toHaveBeenCalledTimes(1)
    pending.resolve([])
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).toHaveBeenCalledTimes(2)
    expect(options.apply).toHaveBeenCalledExactlyOnceWith([newer, row(32), row(33)])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(options.fetchRange).toHaveBeenCalledTimes(2)
  })

  it.each([
    { timestamp: '2026-10-29T16:39:00Z' },
    { timestamp: 'invalid' },
    { timestamp: '2026-10-29T16:50:00Z' },
    { close: 900 },
    { open: 900 },
    { high: 900 },
    { low: 900 },
    { volume: 900 },
    { complete: false },
    { instrument: 'ETH-USD' },
    { exchange: 'polygon' },
    { timeframe: '5m' },
  ] satisfies Partial<CandleData>[])(
    'keeps an unconfirmed row out of the chart and stops after five bounded attempts %j',
    async overrides => {
      const { options, reconciler } = setup()

      options.fetchRange.mockResolvedValue([row(31, overrides), row(38)])
      reconciler.notify(row())
      await vi.advanceTimersByTimeAsync(200_000)
      expect(options.fetchRange).toHaveBeenCalledTimes(5)
      expect(options.apply).not.toHaveBeenCalled()
      expect(options.onError).not.toHaveBeenCalledWith(null)
    }
  )

  it('retries absent data once at a newer H and accepts newer authoritative values', async () => {
    const { options, reconciler } = setup()
    const authoritative = row(31, { timestamp: '2026-10-29T16:41:00Z', close: 123 })

    options.fetchRange.mockResolvedValueOnce([]).mockResolvedValueOnce([authoritative])
    reconciler.notify(row())
    await vi.advanceTimersByTimeAsync(1100)
    expect(options.fetchRange).toHaveBeenCalledTimes(2)
    expect(options.fetchRange.mock.calls[1]?.[3]).toBe('2026-10-29T16:45:01.100Z')
    expect(options.apply).toHaveBeenCalledExactlyOnceWith([authoritative])
  })

  it('rejects ambiguous duplicate HTTP keys before applying any rows', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockResolvedValue([row(), row(31, { close: 200 })])
    reconciler.notify(row())
    await vi.advanceTimersByTimeAsync(10_000)
    expect(options.apply).not.toHaveBeenCalled()
    expect(options.onError).toHaveBeenCalledExactlyOnceWith(
      'Duplicate candle open times in history response'
    )
    expect(options.fetchRange).toHaveBeenCalledTimes(1)
  })

  it.each([new Error('HTTP 503'), 'invalid schema'])(
    'reports transport/schema failure without retrying %s',
    async error => {
      const { options, reconciler } = setup()

      options.fetchRange.mockRejectedValue(error)
      reconciler.notify(row())
      await vi.advanceTimersByTimeAsync(10_000)
      expect(options.onError).toHaveBeenCalledExactlyOnceWith(
        error instanceof Error ? error.message : error
      )
      expect(options.apply).not.toHaveBeenCalled()
      expect(options.fetchRange).toHaveBeenCalledTimes(1)
    }
  )

  it('invalidates queued work synchronously and clears a scheduled timer on destroy', async () => {
    const { options, reconciler } = setup()

    reconciler.notify(row())
    reconciler.destroy()
    reconciler.notify(row(32))
    await vi.advanceTimersByTimeAsync(5000)
    expect(options.fetchRange).not.toHaveBeenCalled()
    reconciler.destroy()
  })

  it('does not start a queued read once the identity becomes stale', async () => {
    const { options, reconciler } = setup()

    reconciler.notify(row())
    options.isCurrent.mockReturnValue(false)
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'ignores a response or error after teardown: rejects=%s',
    async rejects => {
      const pending = deferred<CandleData[]>()
      const { options, reconciler } = setup()

      options.fetchRange.mockReturnValue(pending.promise)
      reconciler.notify(row())
      await vi.advanceTimersByTimeAsync(100)
      reconciler.destroy()
      if (rejects) pending.reject(new Error('late error'))
      else pending.resolve([row()])
      await vi.advanceTimersByTimeAsync(10_000)
      expect(options.apply).not.toHaveBeenCalled()
      expect(options.onError).not.toHaveBeenCalled()
      expect(options.fetchRange).toHaveBeenCalledTimes(1)
    }
  )

  it('repairs every key from a one-shot257-key burst using serialized pages of at most32 bars', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockImplementation(async (start, end) =>
      Array.from({ length: 257 }, (_, index) => row(index)).filter(
        candle =>
          Date.parse(candle.open_at) >= Date.parse(start) &&
          Date.parse(candle.open_at) <= Date.parse(end)
      )
    )
    for (let minute = 0; minute < 257; minute += 1) reconciler.notify(row(minute))
    await vi.advanceTimersByTimeAsync(1000)
    expect(options.fetchRange).toHaveBeenCalledTimes(9)
    expect(options.fetchRange.mock.calls[0]?.[2]).toBe(32)
    expect(options.apply.mock.calls.flatMap(call => call[0])).toHaveLength(257)
    expect(
      new Set(
        options.apply.mock.calls.flatMap(call =>
          call[0].map((candle: CandleData) => candle.open_at)
        )
      ).size
    ).toBe(257)
    expect(options.fetchRange.mock.calls.every(call => call[2] <= 32)).toBe(true)
  })

  it('chunks distant pending keys into small serialized ranges', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockResolvedValue([row(0), row(60)])
    reconciler.notify(row(0))
    reconciler.notify(row(60))
    await vi.advanceTimersByTimeAsync(200)
    expect(options.fetchRange).toHaveBeenCalledTimes(2)
    expect(options.fetchRange.mock.calls.map(call => call[2])).toEqual([1, 1])
    expect(options.apply.mock.calls.map(call => call[0])).toEqual([[row(0)], [row(60)]])
  })

  it('retains future hints without HTTP and serially drains them after the real tail advances', async () => {
    const { options, reconciler } = setup()
    const pending = deferred<CandleData[]>()

    options.latestOpenMs.mockReturnValue(Date.parse(row(36).open_at))
    options.needsReconciliation.mockImplementation(
      candle => Date.parse(candle.open_at) < (options.latestOpenMs() ?? 0)
    )
    options.fetchRange.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([row(39)])
    for (const minute of [39, 38, 37]) reconciler.notify(row(minute))
    reconciler.advance()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(options.fetchRange).not.toHaveBeenCalled()
    options.latestOpenMs.mockReturnValue(Date.parse(row(39).open_at))
    reconciler.advance()
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).toHaveBeenCalledExactlyOnceWith(
      row(37).open_at,
      '2026-10-29T16:38:59.999Z',
      2,
      expect.any(String)
    )
    options.latestOpenMs.mockReturnValue(Date.parse(row(40).open_at))
    reconciler.advance()
    await vi.advanceTimersByTimeAsync(1000)
    expect(options.fetchRange).toHaveBeenCalledTimes(1)
    pending.resolve([row(37), row(38)])
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).toHaveBeenCalledTimes(2)
    expect(options.apply.mock.calls.map(call => call[0])).toEqual([[row(37), row(38)], [row(39)]])
  })

  it('discards a dormant hint already satisfied by the loaded window and ignores keys older than it', async () => {
    const { options, reconciler } = setup()

    options.needsReconciliation.mockReturnValue(false)
    options.latestOpenMs.mockReturnValue(Date.parse(row(36).open_at))
    reconciler.notify(row(35))
    reconciler.notify(row(37))
    options.latestOpenMs.mockReturnValue(Date.parse(row(39).open_at))
    reconciler.advance()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(options.fetchRange).not.toHaveBeenCalled()
    expect(Reflect.get(reconciler, 'pending').size).toBe(0)
  })

  it('invalidates dormant hints on teardown before a later tail can make them eligible', async () => {
    const { options, reconciler } = setup()

    options.needsReconciliation.mockReturnValue(false)
    options.latestOpenMs.mockReturnValue(Date.parse(row(36).open_at))
    reconciler.notify(row(37))
    reconciler.destroy()
    options.needsReconciliation.mockReturnValue(true)
    options.latestOpenMs.mockReturnValue(Date.parse(row(39).open_at))
    reconciler.advance()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(options.fetchRange).not.toHaveBeenCalled()
    expect(options.onUnresolved).not.toHaveBeenCalled()
  })

  it('shares the finite work budget with dormant hints and reports excess without an automatic request storm', async () => {
    const { options, reconciler } = setup()

    options.needsReconciliation.mockReturnValue(false)
    options.latestOpenMs.mockReturnValue(Date.parse(row(-6000).open_at))
    for (let minute = -5001; minute < 0; minute += 1) reconciler.notify(row(minute))
    expect(Reflect.get(reconciler, 'pending').size).toBe(5000)
    expect(options.onUnresolved).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(200_000)
    expect(options.fetchRange).not.toHaveBeenCalled()
    reconciler.destroy()
  })

  it('prunes keys that left the loaded window before starting a queued read', async () => {
    const { options, reconciler } = setup()

    reconciler.notify(row())
    options.needsReconciliation.mockReturnValue(false)
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).not.toHaveBeenCalled()
    expect(options.onError).not.toHaveBeenCalled()
  })

  it('starts a fresh correction promptly without consuming an older retry before its deadline', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockResolvedValueOnce([]).mockResolvedValue([row(32), row(31)])
    reconciler.notify(row(31))
    await vi.advanceTimersByTimeAsync(100)
    reconciler.notify(row(32))
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).toHaveBeenCalledTimes(2)
    expect(options.fetchRange.mock.calls[1]?.[0]).toBe(row(32).open_at)
    await vi.advanceTimersByTimeAsync(900)
    expect(options.fetchRange).toHaveBeenCalledTimes(3)
    expect(options.apply.mock.calls.map(call => call[0])).toEqual([[row(32)], [row(31)]])
  })

  it('re-arms safely if the wall clock moves backward before a queued request', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockResolvedValue([row()])
    reconciler.notify(row())
    vi.setSystemTime('2026-10-29T16:44:00Z')
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(options.fetchRange).toHaveBeenCalledTimes(1)
  })

  it('retains a finite queue and reports overflow as unresolved even when a bounded page succeeds', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockResolvedValue([row(1)])
    for (let minute = 0; minute < 5001; minute += 1) reconciler.notify(row(minute))
    expect(Reflect.get(reconciler, 'pending').size).toBe(5000)
    expect(options.onUnresolved).toHaveBeenCalledExactlyOnceWith(
      Date.parse(row(0).open_at),
      Date.parse(row(0).open_at)
    )
    await vi.advanceTimersByTimeAsync(100)
    expect(options.apply).toHaveBeenCalledExactlyOnceWith([row(1)])
    expect(options.onUnresolved).toHaveBeenCalledTimes(1)
    reconciler.destroy()
  })

  it('bounds deduplication metadata across many successfully reconciled batches', async () => {
    const { options, reconciler } = setup()

    options.fetchRange.mockImplementation(async (start, end) =>
      Array.from({ length: 5001 }, (_, index) => row(index)).filter(
        candle =>
          Date.parse(candle.open_at) >= Date.parse(start) &&
          Date.parse(candle.open_at) <= Date.parse(end)
      )
    )

    for (let batch = 0; batch < 5001; batch += 32) {
      for (let minute = batch; minute < Math.min(batch + 32, 5001); minute += 1) {
        reconciler.notify(row(minute))
      }

      await vi.advanceTimersByTimeAsync(100)
    }

    expect(options.fetchRange).toHaveBeenCalledTimes(157)
    reconciler.notify(row(0))
    await vi.advanceTimersByTimeAsync(100)
    expect(options.fetchRange).toHaveBeenCalledTimes(158)
  })
})
