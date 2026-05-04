import { v7 as uuid7 } from 'uuid'

const STORAGE_KEY = 'snapper_sequence_tracker'

interface TrackerState {
  sessionId: string
  counters: Record<string, number>
}

class SequenceTracker {
  readonly sessionId: string
  private readonly counters: Map<string, number>

  constructor(sessionId: string, counters?: Map<string, number>) {
    this.sessionId = sessionId
    this.counters = counters ?? new Map()
  }

  nextSequence(table: string): number {
    const seq = (this.counters.get(table) ?? 0) + 1

    this.counters.set(table, seq)
    this.persist()

    return seq
  }

  persist(): void {
    const state: TrackerState = {
      sessionId: this.sessionId,
      counters: Object.fromEntries(this.counters),
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

let tracker: SequenceTracker | null = null

function isValidTrackerState(value: unknown): value is TrackerState {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>

  if (typeof obj.sessionId !== 'string') return false
  if (typeof obj.counters !== 'object' || obj.counters === null) return false

  for (const v of Object.values(obj.counters as Record<string, unknown>)) {
    if (typeof v !== 'number') return false
  }

  return true
}

function tryParseStored(stored: string): TrackerState | null {
  try {
    const parsed: unknown = JSON.parse(stored)

    return isValidTrackerState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function getTracker(): SequenceTracker {
  if (tracker) return tracker

  const stored = sessionStorage.getItem(STORAGE_KEY)
  const state = stored ? tryParseStored(stored) : null

  if (state) {
    tracker = new SequenceTracker(state.sessionId, new Map(Object.entries(state.counters)))
  } else {
    tracker = new SequenceTracker(uuid7())
    tracker.persist()
  }

  return tracker
}

export function resetTracker(): void {
  sessionStorage.removeItem(STORAGE_KEY)
  tracker = null
}

export { SequenceTracker }
