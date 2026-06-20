import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { MarketChartController, type ChartNavAdapter } from './marketChartController'
import {
  DEFAULT_VISIBLE_BARS,
  LEFT_PREFETCH_BARS,
  MAX_BACKSCAN_WINDOWS,
  TIMEFRAME_SECONDS,
  type IsoRange,
  type LogicalSpan,
  type WindowCandle,
} from './chartNavigation'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const wc = (openAtMs: number, close = 100): WindowCandle => ({
  openAtMs,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
  complete: true,
})

class FakeAdapter implements ChartNavAdapter {
  setDataCalls: { time: number }[][] = []
  updateLastCalls: { time: number }[] = []
  setVisibleCalls: LogicalSpan[] = []
  fitContentCount = 0
  unsubscribeSpy = vi.fn()
  handler: (() => void) | null = null
  visibleRange: LogicalSpan | null = null
  barsBeforeValue: number | null = 0
  onFetchHook: (() => void) | null = null

  setData(data: { time: number }[]): void {
    this.setDataCalls.push(data)
  }

  updateLast(datum: { time: number }): void {
    this.updateLastCalls.push(datum)
  }

  getVisibleLogicalRange(): LogicalSpan | null {
    return this.visibleRange
  }

  setVisibleLogicalRange(range: LogicalSpan): void {
    this.setVisibleCalls.push(range)
  }

  barsBefore(): number | null {
    return this.barsBeforeValue
  }

  fitContent(): void {
    this.fitContentCount += 1
  }

  subscribeVisibleLogicalRangeChange(handler: () => void): () => void {
    this.handler = handler

    return this.unsubscribeSpy
  }
}

const flush = (): Promise<void> => new Promise<void>(resolve => setTimeout(resolve, 0))

const makeController = (
  fetchOlder: (range: IsoRange) => Promise<WindowCandle[]>,
  onStateChange?: (state: ReturnType<MarketChartController['getState']>) => void
): MarketChartController =>
  new MarketChartController({
    timeframe: '1m',
    fetchOlder,
    ...(onStateChange ? { onStateChange } : {}),
  })

describe('MarketChartController', () => {
  let fetchOlder: Mock<(range: IsoRange) => Promise<WindowCandle[]>>

  beforeEach(() => {
    fetchOlder = vi.fn<(range: IsoRange) => Promise<WindowCandle[]>>().mockResolvedValue([])
  })

  it('starts empty', () => {
    const controller = makeController(fetchOlder)

    expect(controller.getState()).toEqual({
      barCount: 0,
      olderInFlight: false,
      historyExhausted: false,
      error: null,
    })
  })

  it('reset without an adapter stores the window and emits', () => {
    const states: number[] = []
    const controller = makeController(fetchOlder, s => states.push(s.barCount))

    controller.reset([wc(120_000), wc(60_000)])

    expect(controller.getState().barCount).toBe(2)
    expect(states.at(-1)).toBe(2)
  })

  it('reset with an adapter renders and fits', () => {
    const adapter = new FakeAdapter()
    const controller = makeController(fetchOlder)

    controller.attach(adapter)
    controller.reset([wc(60_000), wc(120_000)])

    expect(adapter.setDataCalls.at(-1)).toHaveLength(2)
    expect(adapter.fitContentCount).toBe(1)
  })

  it('reset anchors a large window on the most-recent bars', () => {
    const adapter = new FakeAdapter()
    const controller = makeController(fetchOlder)
    const many = Array.from({ length: DEFAULT_VISIBLE_BARS + 30 }, (_unused, index) =>
      wc((index + 1) * 60_000)
    )

    controller.attach(adapter)
    controller.reset(many)

    expect(adapter.fitContentCount).toBe(0)
    expect(adapter.setVisibleCalls.at(-1)).toEqual({
      from: many.length - DEFAULT_VISIBLE_BARS,
      to: many.length - 1,
    })
  })

  it('attach with an empty window subscribes but renders nothing', () => {
    const adapter = new FakeAdapter()
    const controller = makeController(fetchOlder)

    controller.attach(adapter)

    expect(adapter.setDataCalls).toHaveLength(0)
    expect(adapter.handler).toBeTypeOf('function')
  })

  it('attach with a window and no saved viewport renders and fits', () => {
    const adapter = new FakeAdapter()
    const controller = makeController(fetchOlder)

    controller.reset([wc(60_000), wc(120_000)])
    controller.attach(adapter)

    expect(adapter.setDataCalls.at(-1)).toHaveLength(2)
    expect(adapter.fitContentCount).toBe(1)
  })

  it('re-attach restores the saved viewport and unsubscribes the previous chart', () => {
    const first = new FakeAdapter()
    const controller = makeController(fetchOlder)

    controller.reset([wc(60_000), wc(120_000)])
    controller.attach(first)
    first.visibleRange = { from: 0, to: 1 }
    controller.handleRangeChange()

    const second = new FakeAdapter()

    controller.attach(second)

    expect(first.unsubscribeSpy).toHaveBeenCalledTimes(1)
    expect(second.setVisibleCalls.at(-1)).toEqual({ from: 0, to: 1 })
    expect(second.fitContentCount).toBe(0)
  })

  it('detach on a fresh controller is a no-op', () => {
    const controller = makeController(fetchOlder)

    expect(() => {
      controller.detach()
    }).not.toThrow()
  })

  it('setFetchOlder swaps the older-history fetcher', async () => {
    const replacement = vi
      .fn<(range: IsoRange) => Promise<WindowCandle[]>>()
      .mockResolvedValue([wc(30_000)])
    const adapter = new FakeAdapter()
    const controller = makeController(fetchOlder)

    controller.reset([wc(60_000)])
    controller.attach(adapter)
    controller.setFetchOlder(replacement)
    adapter.visibleRange = { from: 0, to: 10 }
    adapter.barsBeforeValue = 0
    controller.handleRangeChange()
    await flush()

    expect(replacement).toHaveBeenCalled()
    expect(fetchOlder).not.toHaveBeenCalled()
  })

  it('setTimeframe changes the older-history page size', async () => {
    const adapter = new FakeAdapter()
    const controller = makeController(fetchOlder)

    controller.reset([wc(600_000)])
    controller.attach(adapter)
    controller.setTimeframe('1h')
    adapter.visibleRange = { from: 0, to: 10 }
    adapter.barsBeforeValue = 0
    controller.handleRangeChange()
    await flush()

    const firstCall = fetchOlder.mock.calls[0]?.[0] as IsoRange
    const spanMs = Date.parse(firstCall.end) - Date.parse(firstCall.start)

    expect(spanMs).toBe(600 * TIMEFRAME_SECONDS['1h'] * 1000)
  })

  describe('applyLive', () => {
    it('ignores a stale bar', () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(120_000), wc(180_000)])
      controller.attach(adapter)
      adapter.updateLastCalls = []
      adapter.setDataCalls = []
      controller.applyLive(wc(60_000))

      expect(adapter.updateLastCalls).toHaveLength(0)
      expect(adapter.setDataCalls).toHaveLength(0)
      expect(controller.getState().barCount).toBe(2)
    })

    it('updates the forming last bar', () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000, 1), wc(120_000, 2)])
      controller.attach(adapter)
      adapter.updateLastCalls = []
      controller.applyLive(wc(120_000, 9))

      expect(adapter.updateLastCalls.at(-1)).toMatchObject({ time: 120, close: 9 })
    })

    it('appends a newer bar via updateLast when under the cap', () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000), wc(120_000)])
      controller.attach(adapter)
      adapter.updateLastCalls = []
      adapter.setDataCalls = []
      controller.applyLive(wc(180_000))

      expect(adapter.updateLastCalls).toHaveLength(1)
      expect(adapter.setDataCalls).toHaveLength(0)
      expect(controller.getState().barCount).toBe(3)
    })

    it('rerenders via setData when an append evicts from the cap', () => {
      const adapter = new FakeAdapter()
      const controller = new MarketChartController({
        timeframe: '1m',
        fetchOlder,
        maxBars: 2,
      })

      controller.reset([wc(60_000), wc(120_000)])
      controller.attach(adapter)
      adapter.setDataCalls = []
      adapter.updateLastCalls = []
      controller.applyLive(wc(180_000))

      expect(adapter.setDataCalls.at(-1)).toHaveLength(2)
      expect(adapter.updateLastCalls).toHaveLength(0)
    })

    it('updates the window without a chart when detached', () => {
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.applyLive(wc(120_000))

      expect(controller.getState().barCount).toBe(2)
    })
  })

  describe('handleRangeChange', () => {
    it('is invoked through the chart subscription on viewport change', async () => {
      fetchOlder.mockResolvedValueOnce([wc(30_000)])
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      adapter.visibleRange = { from: 0, to: 10 }
      adapter.barsBeforeValue = 0
      adapter.handler?.()
      await flush()

      expect(fetchOlder).toHaveBeenCalled()
      expect(controller.getState().barCount).toBe(2)
    })

    it('does nothing without an adapter', () => {
      const controller = makeController(fetchOlder)

      expect(() => {
        controller.handleRangeChange()
      }).not.toThrow()
    })

    it('does nothing when there is no visible range', () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      adapter.visibleRange = null
      controller.handleRangeChange()

      expect(fetchOlder).not.toHaveBeenCalled()
    })

    it('does not fetch when the left edge is far away', async () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      adapter.visibleRange = { from: 0, to: 10 }
      adapter.barsBeforeValue = 500
      controller.handleRangeChange()
      await flush()

      expect(fetchOlder).not.toHaveBeenCalled()
    })
  })

  describe('loadOlder', () => {
    const setupNearEdge = (adapter: FakeAdapter): void => {
      adapter.visibleRange = { from: 0, to: 10 }
      adapter.barsBeforeValue = 0
    }

    it('prepends older history and shifts the viewport', async () => {
      fetchOlder.mockResolvedValueOnce([wc(30_000), wc(45_000)])
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000), wc(120_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      adapter.setDataCalls = []
      adapter.setVisibleCalls = []
      controller.handleRangeChange()
      await flush()

      expect(adapter.setDataCalls.at(-1)).toHaveLength(4)
      expect(adapter.setVisibleCalls.at(-1)).toEqual({ from: 2, to: 12 })
      expect(controller.getState().historyExhausted).toBe(false)
      expect(controller.getState().barCount).toBe(4)
    })

    it('falls back to the captured range when the live range is gone at apply time', async () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      fetchOlder.mockImplementationOnce(async () => {
        adapter.visibleRange = null

        return [wc(30_000)]
      })
      adapter.setVisibleCalls = []
      controller.handleRangeChange()
      await flush()

      expect(adapter.setVisibleCalls.at(-1)).toEqual({ from: 1, to: 11 })
    })

    it('widens the lookback across empty windows before finding history', async () => {
      fetchOlder.mockResolvedValueOnce([]).mockResolvedValueOnce([wc(30_000)])
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      await flush()

      expect(fetchOlder).toHaveBeenCalledTimes(2)
      expect(controller.getState().barCount).toBe(2)
    })

    it('marks history exhausted when every scan window is empty', async () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      await flush()

      expect(fetchOlder).toHaveBeenCalledTimes(MAX_BACKSCAN_WINDOWS)
      expect(controller.getState().historyExhausted).toBe(true)
    })

    it('does not fetch when the window is empty', async () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      await flush()

      expect(fetchOlder).not.toHaveBeenCalled()
      expect(controller.getState().olderInFlight).toBe(false)
    })

    it('records an Error message on failure', async () => {
      fetchOlder.mockRejectedValueOnce(new Error('boom'))
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      await flush()

      expect(controller.getState().error).toBe('boom')
      expect(controller.getState().olderInFlight).toBe(false)
    })

    it('stringifies a non-Error rejection', async () => {
      fetchOlder.mockRejectedValueOnce('nope')
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      await flush()

      expect(controller.getState().error).toBe('nope')
    })

    it('discards an older page when the window identity changes mid-flight', async () => {
      const pending = deferred<WindowCandle[]>()

      fetchOlder.mockReturnValueOnce(pending.promise)
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      controller.reset([wc(500_000)])
      adapter.setDataCalls = []
      adapter.setVisibleCalls = []

      pending.resolve([wc(30_000)])
      await flush()

      expect(adapter.setDataCalls).toHaveLength(0)
      expect(controller.getState().barCount).toBe(1)
    })

    it('ignores a rejected older fetch from a superseded generation', async () => {
      const pending = deferred<WindowCandle[]>()

      fetchOlder.mockReturnValueOnce(pending.promise)
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      controller.reset([wc(500_000)])

      pending.reject(new Error('late'))
      await flush()

      expect(controller.getState().error).toBeNull()
    })

    it('clears exhaustion after the user scrolls clear of the left edge', async () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      controller.handleRangeChange()
      await flush()
      expect(controller.getState().historyExhausted).toBe(true)

      adapter.barsBeforeValue = LEFT_PREFETCH_BARS * 2 + 1
      controller.handleRangeChange()

      expect(controller.getState().historyExhausted).toBe(false)
    })

    it('clamps the viewport onto the data when the cap evicts visible newest bars', async () => {
      const adapter = new FakeAdapter()
      const controller = new MarketChartController({ timeframe: '1m', fetchOlder, maxBars: 5 })

      controller.reset([wc(10_000), wc(20_000), wc(30_000), wc(40_000), wc(50_000)])
      controller.attach(adapter)
      adapter.visibleRange = { from: 3, to: 4 }
      adapter.barsBeforeValue = 0
      fetchOlder.mockResolvedValueOnce([wc(2_000), wc(4_000)])
      controller.handleRangeChange()
      await flush()

      const last = adapter.setVisibleCalls.at(-1)

      expect(last?.to).toBeLessThanOrEqual(4)
      expect(controller.getState().barCount).toBe(5)
    })

    it('does not clamp when eviction leaves the viewport on-data', async () => {
      const adapter = new FakeAdapter()
      const controller = new MarketChartController({ timeframe: '1m', fetchOlder, maxBars: 5 })

      controller.reset([wc(10_000), wc(20_000), wc(30_000), wc(40_000), wc(50_000)])
      controller.attach(adapter)
      adapter.visibleRange = { from: 0, to: 1 }
      adapter.barsBeforeValue = 0
      fetchOlder.mockResolvedValueOnce([wc(2_000), wc(4_000)])
      controller.handleRangeChange()
      await flush()

      expect(adapter.setVisibleCalls.at(-1)).toEqual({ from: 2, to: 3 })
    })

    it('aborts applying history once destroyed mid-fetch', async () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      fetchOlder.mockImplementationOnce(async () => {
        controller.destroy()

        return [wc(30_000)]
      })
      adapter.setDataCalls = []
      controller.handleRangeChange()
      await flush()

      expect(adapter.setDataCalls).toHaveLength(0)
      expect(controller.getState().barCount).toBe(1)
    })

    it('skips the chart but grows the window if detached mid-fetch', async () => {
      const adapter = new FakeAdapter()
      const controller = makeController(fetchOlder)

      controller.reset([wc(60_000)])
      controller.attach(adapter)
      setupNearEdge(adapter)
      fetchOlder.mockImplementationOnce(async () => {
        controller.detach()

        return [wc(30_000)]
      })
      adapter.setDataCalls = []
      controller.handleRangeChange()
      await flush()

      expect(adapter.setDataCalls).toHaveLength(0)
      expect(controller.getState().barCount).toBe(2)
    })
  })

  it('tolerates a missing onStateChange callback', () => {
    const controller = makeController(fetchOlder)

    expect(() => {
      controller.reset([wc(60_000)])
    }).not.toThrow()
  })
})
