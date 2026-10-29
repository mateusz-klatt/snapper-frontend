import type { CandleData } from '../../types/api'
import type { CandleData as LiveCandleData } from '../../types/ws'
import { MAX_CHART_BARS, TIMEFRAME_SECONDS, type TimeframeValue } from './chartNavigation'

interface Candidate {
  candle: LiveCandleData
  authorMs: number
  attempts: number
  readyAtMs: number
}

interface ReconcilerOptions {
  instrument: string
  exchange: string
  timeframe: TimeframeValue
  needsReconciliation: (candle: LiveCandleData) => boolean
  latestOpenMs: () => number | null
  fetchRange: (start: string, end: string, limit: number, asOf: string) => Promise<CandleData[]>
  apply: (rows: CandleData[]) => void
  isCurrent: () => boolean
  onError: (message: string | null) => void
  onUnresolved: (firstOpenMs: number, lastOpenMs: number) => void
}

const MAX_RANGE_BARS = 32
const MAX_SEEN = MAX_CHART_BARS
const COALESCE_MS = 100
const MAX_ATTEMPTS = 5
const RETRY_DELAYS_MS = [1000, 5000, 30_000, 60_000] as const

function sameValues(left: LiveCandleData, right: CandleData): boolean {
  return (
    left.open === right.open &&
    left.high === right.high &&
    left.low === right.low &&
    left.close === right.close &&
    left.volume === right.volume
  )
}

/**
 * Live notifications request authoritative history, never supply historical prices.
 * Keep 5000 pending keys plus a constant-size unresolved range at the UI boundary;
 * dormant hints share that budget until the chart's actual tail makes them historical.
 * serialize at most 32 timeframe periods per read. Five finite attempts handle
 * publish-before-persist without promising that any measured writer delay is a candle delay.
 */
export class LateCandleReconciler {
  private readonly pending = new Map<number, Candidate>()
  private readonly seen = new Map<number, number>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private timerAtMs = 0
  private inFlight = false
  private destroyed = false

  constructor(private readonly options: ReconcilerOptions) {}

  notify(candle: LiveCandleData): void {
    const openMs = Date.parse(candle.open_at)
    const authorMs = Date.parse(candle.timestamp)
    const previous = this.seen.get(openMs)

    if (
      !this.current() ||
      candle.instrument !== this.options.instrument ||
      candle.exchange !== this.options.exchange ||
      candle.timeframe !== this.options.timeframe ||
      candle.complete !== true ||
      candle.origin === 'replay' ||
      candle.replay_window_start != null ||
      candle.replay_window_end != null ||
      !Number.isFinite(openMs) ||
      !Number.isFinite(authorMs) ||
      authorMs > Date.now() ||
      (previous !== undefined && authorMs <= previous)
    ) {
      return
    }

    const needed = this.options.needsReconciliation(candle)

    if (!needed && !this.waitingForTail(openMs)) {
      return
    }

    this.seen.delete(openMs)
    this.seen.set(openMs, authorMs)

    if (this.seen.size > MAX_SEEN) {
      this.seen.delete(this.seen.keys().next().value as number)
    }

    this.pending.set(openMs, {
      candle,
      authorMs,
      attempts: 0,
      readyAtMs: needed ? Date.now() : Number.POSITIVE_INFINITY,
    })

    if (this.pending.size > MAX_CHART_BARS) {
      this.boundPending()
    }

    this.schedule()
  }

  advance(): void {
    if (!this.current()) {
      return
    }

    this.boundPending()
    this.schedule()
  }

  destroy(): void {
    this.destroyed = true
    this.pending.clear()

    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private current(): boolean {
    return !this.destroyed && this.options.isCurrent()
  }

  private waitingForTail(openMs: number): boolean {
    const latest = this.options.latestOpenMs()

    return latest !== null && openMs >= latest
  }

  private boundPending(): void {
    if (this.pending.size === 0) {
      return
    }

    for (const [openMs, candidate] of this.pending) {
      const needed = this.options.needsReconciliation(candidate.candle)

      if (!needed && !this.waitingForTail(openMs)) {
        this.pending.delete(openMs)
        this.seen.delete(openMs)
      } else if (needed && !Number.isFinite(candidate.readyAtMs)) {
        candidate.readyAtMs = Date.now()
      }
    }

    if (this.pending.size <= MAX_CHART_BARS) {
      return
    }

    const overflow = [...this.pending.keys()]
      .sort((left, right) => right - left)
      .slice(MAX_CHART_BARS)

    this.options.onUnresolved(Math.min(...overflow), Math.max(...overflow))

    for (const openMs of overflow) {
      this.pending.delete(openMs)
      this.seen.delete(openMs)
    }
  }

  private schedule(): void {
    if (this.inFlight || this.pending.size === 0) {
      return
    }

    const now = Date.now()
    const next = Math.max(
      now + COALESCE_MS,
      Math.min(...[...this.pending.values()].map(candidate => candidate.readyAtMs))
    )

    if (!Number.isFinite(next)) {
      return
    }

    if (this.timer !== null && this.timerAtMs <= next) {
      return
    }

    if (this.timer !== null) {
      clearTimeout(this.timer)
    }

    this.timerAtMs = next

    this.timer = setTimeout(() => {
      this.timer = null
      void this.reconcile()
    }, next - now)
  }

  private confirmed(row: CandleData, candidate: Candidate, horizonMs: number): boolean {
    const authorMs = Date.parse(row.timestamp)

    return (
      row.instrument === this.options.instrument &&
      row.exchange === this.options.exchange &&
      row.timeframe === this.options.timeframe &&
      row.complete &&
      authorMs <= horizonMs &&
      (authorMs > candidate.authorMs ||
        (authorMs === candidate.authorMs && sameValues(candidate.candle, row)))
    )
  }

  private accept(rows: CandleData[], batch: Map<number, Candidate>, horizonMs: number): void {
    const confirmed = new Map<number, CandleData>()
    const returned = new Set<number>()

    for (const row of rows) {
      const openMs = Date.parse(row.open_at)
      const candidate = batch.get(openMs)

      if (candidate && returned.has(openMs)) {
        throw new Error('Duplicate candle open times in history response')
      }

      returned.add(openMs)

      if (candidate && this.confirmed(row, candidate, horizonMs)) {
        confirmed.set(openMs, row)
      }
    }

    if (confirmed.size > 0) {
      this.options.apply([...confirmed.values()])
      this.options.onError(null)
    }

    for (const [openMs, candidate] of batch) {
      if (
        !confirmed.has(openMs) &&
        candidate.attempts < MAX_ATTEMPTS - 1 &&
        !this.pending.has(openMs)
      ) {
        this.pending.set(openMs, {
          ...candidate,
          attempts: candidate.attempts + 1,
          readyAtMs: Date.now() + (RETRY_DELAYS_MS[candidate.attempts] as number),
        })
      } else if (!confirmed.has(openMs) && !this.pending.has(openMs)) {
        this.options.onUnresolved(openMs, openMs)
      }
    }

    this.boundPending()
  }

  private async reconcile(): Promise<void> {
    if (!this.current()) {
      return
    }

    this.boundPending()

    if (this.pending.size === 0) {
      return
    }

    const available = [...this.pending].filter(([, candidate]) => candidate.readyAtMs <= Date.now())

    if (available.length === 0) {
      this.schedule()

      return
    }

    const first = Math.min(...available.map(([openMs]) => openMs))
    const endOpen = first + (MAX_RANGE_BARS - 1) * TIMEFRAME_SECONDS[this.options.timeframe] * 1000
    const batch = new Map(available.filter(([openMs]) => openMs <= endOpen))
    const opens = [...batch.keys()]
    const start = Math.min(...opens)
    const end = Math.max(...opens)
    const limit = Math.floor((end - start) / (TIMEFRAME_SECONDS[this.options.timeframe] * 1000)) + 1
    const horizonMs = Date.now()

    for (const openMs of batch.keys()) {
      this.pending.delete(openMs)
    }

    this.inFlight = true

    try {
      const rows = await this.options.fetchRange(
        new Date(start).toISOString(),
        new Date(end + TIMEFRAME_SECONDS[this.options.timeframe] * 1000 - 1).toISOString(),
        limit,
        new Date(horizonMs).toISOString()
      )

      if (this.current()) {
        this.accept(rows, batch, horizonMs)
      }
    } catch (error: unknown) {
      if (this.current()) {
        this.options.onError(error instanceof Error ? error.message : String(error))
        this.options.onUnresolved(Math.min(...opens), Math.max(...opens))
      }
    } finally {
      this.inFlight = false

      if (this.current()) {
        this.schedule()
      }
    }
  }
}
