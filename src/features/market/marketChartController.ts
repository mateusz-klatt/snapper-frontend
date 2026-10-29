/**
 * Imperative coordinator between the market window data and a lightweight-charts
 * series. It owns the loaded candle window, lazily pages older history when the
 * viewport nears the left edge, preserves the viewport across prepends, folds in
 * live candles, and bounds memory by evicting from the far side.
 *
 * The chart is abstracted behind {@link ChartNavAdapter} so this logic is unit
 * testable without lightweight-charts or React. The React/lightweight-charts
 * wiring lives in the chart component and the `useMarketChartController` hook.
 */
import {
  DEFAULT_VISIBLE_BARS,
  FETCH_PAGE_BARS,
  LEFT_PREFETCH_BARS,
  LOD_DWELL_MS,
  MAX_BACKSCAN_WINDOWS,
  MAX_CHART_BARS,
  TIMEFRAME_SECONDS,
  appendLive,
  authoritativeSpan,
  barsPerPixel,
  decideLodTimeframe,
  mergeOlder,
  mergeAuthoritative,
  sameCandleValues,
  olderRange,
  shiftLogicalSpan,
  shouldFetchOlder,
  toChartData,
  toChartDatum,
  type IsoRange,
  type LogicalSpan,
  type TimeframeValue,
  type WindowCandle,
} from './chartNavigation'

/** Minimal chart surface the controller drives (wraps a lightweight-charts series + time scale). */
export interface ChartNavAdapter {
  setData(data: ReturnType<typeof toChartData>): void
  updateLast(datum: ReturnType<typeof toChartDatum>): void
  getVisibleLogicalRange(): LogicalSpan | null
  setVisibleLogicalRange(range: LogicalSpan): void
  barsBefore(range: LogicalSpan): number | null
  barsAfter(range: LogicalSpan): number | null
  width(): number
  fitContent(): void
  subscribeVisibleLogicalRangeChange(handler: () => void): () => void
}

export interface ControllerState {
  barCount: number
  olderInFlight: boolean
  historyExhausted: boolean
  error: string | null
}

export interface MarketChartControllerOptions {
  timeframe: TimeframeValue
  fetchOlder: (range: IsoRange) => Promise<WindowCandle[]>
  onStateChange?: (state: ControllerState) => void
  maxBars?: number
  /** Injectable clock for the LOD dwell lockout (defaults to Date.now). */
  now?: () => number
}

export class MarketChartController {
  private window: WindowCandle[] = []
  private adapter: ChartNavAdapter | null = null
  private unsubscribe: (() => void) | null = null
  private olderInFlight = false
  private historyExhausted = false
  private error: string | null = null
  private lastViewport: LogicalSpan | null = null
  private repairingHistory = false
  private repairViewport: { before: LogicalSpan; target: LogicalSpan; settled: boolean } | null =
    null
  private deferredAuthoritative: WindowCandle[] = []
  private onUnresolved: (firstOpenMs: number, lastOpenMs: number) => void = () => {}
  private tfSeconds: number
  private timeframe: TimeframeValue
  private destroyed = false
  /** Bumped whenever the window's identity changes, so in-flight older fetches can be discarded. */
  private generation = 0
  private autoLod = false
  private lodLockedUntilMs = 0
  private onLodTimeframe: ((timeframe: TimeframeValue) => void) | undefined
  private readonly maxBars: number
  private readonly now: () => number
  private fetchOlder: (range: IsoRange) => Promise<WindowCandle[]>
  private readonly onStateChange: ((state: ControllerState) => void) | undefined

  constructor(options: MarketChartControllerOptions) {
    this.timeframe = options.timeframe
    this.tfSeconds = TIMEFRAME_SECONDS[options.timeframe]
    this.fetchOlder = options.fetchOlder
    this.onStateChange = options.onStateChange
    this.maxBars = options.maxBars ?? MAX_CHART_BARS
    this.now = options.now ?? (() => Date.now())
  }

  /** Swap the older-history fetcher (e.g. when the instrument/exchange/timeframe change). */
  setFetchOlder(fetchOlder: (range: IsoRange) => Promise<WindowCandle[]>): void {
    this.fetchOlder = fetchOlder
    this.generation += 1
  }

  /** Enable/disable auto level-of-detail (zoom-driven timeframe switching). */
  setAutoLod(enabled: boolean): void {
    this.autoLod = enabled
  }

  setOnUnresolved(handler: (firstOpenMs: number, lastOpenMs: number) => void): void {
    this.onUnresolved = handler
  }

  /** Register the callback invoked when a zoom level warrants a timeframe switch. */
  setOnLodTimeframe(onLodTimeframe: (timeframe: TimeframeValue) => void): void {
    this.onLodTimeframe = onLodTimeframe
  }

  getState(): ControllerState {
    return {
      barCount: this.window.length,
      olderInFlight: this.olderInFlight,
      historyExhausted: this.historyExhausted,
      error: this.error,
    }
  }

  /** Update the timeframe used to size older-history requests + LOD decisions. */
  setTimeframe(timeframe: TimeframeValue): void {
    this.deferredAuthoritative = []
    this.repairViewport = null
    const changed = timeframe !== this.timeframe

    this.timeframe = timeframe
    this.tfSeconds = TIMEFRAME_SECONDS[timeframe]
    this.generation += 1

    if (changed) {
      /** Dwell after a real switch so the post-switch refit doesn't immediately re-trigger LOD. */
      this.lodLockedUntilMs = this.now() + LOD_DWELL_MS
    }
  }

  /** Replace the window with a fresh page (new instrument/timeframe) and show the latest bars. */
  reset(candles: readonly WindowCandle[]): void {
    this.window = [...candles].sort((a, b) => a.openAtMs - b.openAtMs)
    this.historyExhausted = false
    this.olderInFlight = false
    this.error = null
    this.lastViewport = null
    this.repairViewport = null
    this.deferredAuthoritative = []
    this.generation += 1
    this.renderInitialView()
    this.emit()
  }

  /** Bind a (re)created chart, re-rendering the current window and re-subscribing. */
  attach(adapter: ChartNavAdapter): void {
    this.detach()
    /**
     * Re-arm after a prior destroy(). React StrictMode (dev) runs the
     * destroy-effect's setup→cleanup→setup cycle, which calls destroy() once
     * with no symmetric revive; binding a fresh chart means the controller is
     * live again, so clear the flag or older-history loads would silently abort.
     */
    this.destroyed = false
    this.adapter = adapter
    this.unsubscribe = adapter.subscribeVisibleLogicalRangeChange(() => {
      this.handleRangeChange()
    })

    if (this.window.length === 0) {
      return
    }

    if (this.lastViewport) {
      adapter.setData(toChartData(this.window))
      adapter.setVisibleLogicalRange(this.lastViewport)
    } else {
      this.renderInitialView()
    }
  }

  /**
   * Render the current window showing only the most-recent bars. Anchoring on
   * the right edge (rather than fitting everything) keeps the viewport off the
   * left edge, so older history loads on demand as the user pans rather than
   * eagerly on first paint.
   */
  private renderInitialView(): void {
    const adapter = this.adapter

    if (!adapter) {
      return
    }

    adapter.setData(toChartData(this.window))

    const length = this.window.length

    if (length > DEFAULT_VISIBLE_BARS) {
      const range: LogicalSpan = { from: length - DEFAULT_VISIBLE_BARS, to: length - 1 }

      adapter.setVisibleLogicalRange(range)
      this.lastViewport = range
    } else {
      adapter.fitContent()
    }
  }

  /** Unbind the current chart (on chart teardown / recreation). */
  detach(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    this.adapter = null
  }

  /** Permanently release the controller. */
  destroy(): void {
    this.destroyed = true
    this.detach()
  }

  /** Fold a live candle into the window and reflect it on the chart. */
  applyLive(candle: WindowCandle): void {
    const result = appendLive(this.window, candle, this.maxBars)

    if (result.outcome === 'ignore') {
      return
    }

    const adapter = this.adapter
    const evicted = result.evictedBefore

    if (!adapter) {
      this.window = result.candles
      this.emit()

      return
    }

    if (result.outcome === 'append' && evicted > 0) {
      this.applyLiveWithEviction(adapter, result.candles, evicted)

      return
    }

    /**
     * Update-last and plain append (no eviction): lightweight-charts' `update()`
     * keeps the user's scroll position (it only follows when already at the live
     * edge), so this path is viewport-safe without extra work.
     */
    this.window = result.candles
    adapter.updateLast(toChartDatum(candle))
    this.emit()
  }

  needsReconciliation(candle: WindowCandle): boolean {
    const first = this.window.at(0)
    const last = this.window.at(-1)
    const previous = this.window.find(row => row.openAtMs === candle.openAtMs)

    return (
      first !== undefined &&
      last !== undefined &&
      candle.openAtMs >= first.openAtMs &&
      candle.openAtMs < last.openAtMs &&
      (!previous || !sameCandleValues(previous, candle) || (!previous.complete && candle.complete))
    )
  }

  latestOpenMs(): number | null {
    return this.window.at(-1)?.openAtMs ?? null
  }

  applyAuthoritative(candles: readonly WindowCandle[]): boolean {
    if (this.destroyed) {
      return false
    }

    const patch = [
      ...new Map(
        [...this.deferredAuthoritative, ...candles].map(row => [row.openAtMs, row])
      ).values(),
    ]
    let merged = mergeAuthoritative(this.window, patch, this.maxBars)
    const before = this.adapter?.getVisibleLogicalRange()
    let restored = before ? authoritativeSpan(before, this.window, merged) : null

    if (before && !restored) {
      const existing = new Set(this.window.map(row => row.openAtMs))

      this.deferredAuthoritative = patch
        .filter(row => !existing.has(row.openAtMs))
        .sort((left, right) => right.openAtMs - left.openAtMs)
      const overflow = this.deferredAuthoritative.slice(MAX_CHART_BARS)

      if (overflow.length > 0) {
        this.onUnresolved(
          Math.min(...overflow.map(row => row.openAtMs)),
          Math.max(...overflow.map(row => row.openAtMs))
        )
        this.deferredAuthoritative = this.deferredAuthoritative.slice(0, MAX_CHART_BARS)
      }

      merged = mergeAuthoritative(
        this.window,
        patch.filter(row => existing.has(row.openAtMs)),
        this.maxBars
      )
      restored = before
    } else {
      this.deferredAuthoritative = []
    }

    const changed =
      merged.length !== this.window.length ||
      merged.some((row, index) => row !== this.window[index])

    if (!changed) {
      return false
    }

    this.window = merged
    this.repairViewport = before && restored ? { before, target: restored, settled: false } : null
    this.repairingHistory = true

    try {
      this.adapter?.setData(toChartData(this.window))

      if (restored) {
        this.adapter?.setVisibleLogicalRange(restored)
        this.lastViewport = restored
      }
    } finally {
      this.repairingHistory = false
    }

    this.emit()

    return true
  }

  /**
   * Append that crossed the cap and evicted oldest bars. Front eviction shifts
   * every retained bar left, and setData() does not adjust the visible range, so
   * a naive rebuild would yank a history-browsing user to the right. Capture the
   * range first; if the user is browsing the very oldest bars the eviction would
   * remove, skip the append entirely until they scroll back toward live.
   */
  private applyLiveWithEviction(
    adapter: ChartNavAdapter,
    candles: WindowCandle[],
    evicted: number
  ): void {
    const before = adapter.getVisibleLogicalRange()
    const barsAfter = before ? adapter.barsAfter(before) : null
    const atLiveEdge = barsAfter !== null && barsAfter <= 1

    if (before && !atLiveEdge && before.from - evicted < 0) {
      return
    }

    this.window = candles
    adapter.setData(toChartData(this.window))

    if (before) {
      const maxIndex = this.window.length - 1
      const span = before.to - before.from
      const restored = atLiveEdge
        ? { from: maxIndex - span, to: maxIndex }
        : { from: before.from - evicted, to: before.to - evicted }

      adapter.setVisibleLogicalRange(restored)
      this.lastViewport = restored
    }

    this.emit()
  }

  /**
   * Zoom-driven level-of-detail: if auto-LOD is on, the dwell has elapsed, and
   * the bars-per-pixel density crosses a threshold, request a timeframe switch.
   * Returns true when a switch was requested (caller skips older-history work).
   */
  private maybeSwitchLod(adapter: ChartNavAdapter, range: LogicalSpan): boolean {
    const onLodTimeframe = this.onLodTimeframe

    if (!this.autoLod || !onLodTimeframe || this.now() < this.lodLockedUntilMs) {
      return false
    }

    const target = decideLodTimeframe(this.timeframe, barsPerPixel(range, adapter.width()))

    if (!target) {
      return false
    }

    this.lodLockedUntilMs = this.now() + LOD_DWELL_MS
    onLodTimeframe(target)

    return true
  }

  /** React to a viewport change: maybe switch LOD timeframe, else prefetch older history. */
  handleRangeChange(): void {
    const adapter = this.adapter

    if (!adapter) {
      return
    }

    const range = adapter.getVisibleLogicalRange()

    if (!range) {
      return
    }

    this.lastViewport = range

    if (this.repairingHistory || this.isRepairEcho(range)) {
      return
    }

    const deferred = this.deferredAuthoritative

    this.deferredAuthoritative = []

    if (deferred.length > 0 && this.applyAuthoritative(deferred)) {
      return
    }

    if (this.maybeSwitchLod(adapter, range)) {
      return
    }

    const barsBefore = adapter.barsBefore(range)

    /**
     * Clear a prior exhaustion verdict once the user scrolls well clear of the
     * left edge. A single empty backscan (e.g. a gap wider than the scan span,
     * or a transient empty response) should not permanently block history — the
     * next approach to the edge re-probes instead of staying stuck forever.
     */
    if (this.historyExhausted && barsBefore !== null && barsBefore > LEFT_PREFETCH_BARS * 2) {
      this.historyExhausted = false
      this.emit()
    }

    if (
      shouldFetchOlder({
        barsBefore,
        olderInFlight: this.olderInFlight,
        historyExhausted: this.historyExhausted,
      })
    ) {
      void this.loadOlder(range)
    }
  }

  private isRepairEcho(range: LogicalSpan): boolean {
    const repair = this.repairViewport

    if (!repair) {
      return false
    }

    /** Pixel/bar-spacing round trips introduce fractions far below a visible bar movement. */
    const matches = (expected: LogicalSpan): boolean =>
      Math.abs(range.from - expected.from) <= 1e-7 && Math.abs(range.to - expected.to) <= 1e-7

    if (matches(repair.target)) {
      repair.settled = true

      return true
    }

    if (!repair.settled && matches(repair.before)) {
      return true
    }

    this.repairViewport = null

    return false
  }

  private async loadOlder(capturedRange: LogicalSpan): Promise<void> {
    const oldest = this.window.at(0)

    if (!oldest) {
      return
    }

    const generation = this.generation

    this.olderInFlight = true
    this.emit()

    /**
     * A request is "stale" once it is torn down or the window's identity changed
     * mid-flight (instrument/timeframe/anchor switch). A stale request must not
     * touch ANY shared state — not just skip applying the page, but also not set
     * `error` from a late rejection nor clear `olderInFlight` (which a newer
     * request may now own). So every state mutation below is gated on currency.
     */
    let fresh: WindowCandle[] = []
    let failure: string | null = null

    try {
      for (let scan = 1; scan <= MAX_BACKSCAN_WINDOWS; scan += 1) {
        const range = olderRange(oldest.openAtMs, this.tfSeconds, FETCH_PAGE_BARS, scan)
        const page = await this.fetchOlder(range)

        if (this.destroyed || generation !== this.generation) {
          return
        }

        fresh = page.filter(candle => candle.openAtMs < oldest.openAtMs)

        if (fresh.length > 0) {
          break
        }
      }
    } catch (error_) {
      if (this.destroyed || generation !== this.generation) {
        return
      }

      failure = error_ instanceof Error ? error_.message : String(error_)
    }

    if (failure !== null) {
      this.error = failure
    } else if (fresh.length === 0) {
      this.historyExhausted = true
      this.error = null
    } else {
      this.applyOlder(fresh, capturedRange)
      this.error = null
    }

    this.olderInFlight = false
    this.emit()
  }

  private applyOlder(fresh: readonly WindowCandle[], capturedRange: LogicalSpan): void {
    const merged = mergeOlder(this.window, fresh, this.maxBars)
    const adapter = this.adapter

    if (!adapter) {
      this.window = merged.candles

      return
    }

    /**
     * Read the visible range BEFORE setData: prepending shifts every existing
     * bar right by ``addedBefore`` logical indices, and lightweight-charts does
     * not adjust the visible logical range across setData. Re-reading after
     * setData would double-count the shift and push the viewport past the data.
     */
    const before = adapter.getVisibleLogicalRange() ?? capturedRange

    this.window = merged.candles
    adapter.setData(toChartData(this.window))

    /**
     * Shift the viewport right by the prepended count to keep the same bars in
     * view. When the cap evicted newest bars that were visible (only when fully
     * zoomed out at the cap), clamp the range back onto the data so the viewport
     * never lands past the last index (which would render blank).
     */
    let shifted = shiftLogicalSpan(before, merged.addedBefore)

    if (merged.evictedAfter > 0) {
      const overflow = shifted.to - (this.window.length - 1)

      if (overflow > 0) {
        shifted = { from: shifted.from - overflow, to: shifted.to - overflow }
      }
    }

    adapter.setVisibleLogicalRange(shifted)
    this.lastViewport = shifted
  }

  private emit(): void {
    this.onStateChange?.(this.getState())
  }
}
