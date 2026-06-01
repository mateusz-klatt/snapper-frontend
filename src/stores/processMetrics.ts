import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { ProcessSummaryItem } from '../types/ws.generated'

interface ProcessMetricsState {
  byCoordinator: Record<string, Record<string, ProcessSummaryItem>>
  snapshotAt: Record<string, string>
}

interface ProcessMetricsStore extends ProcessMetricsState {
  setSnapshot: (
    coordinator: string,
    items: readonly ProcessSummaryItem[],
    snapshotAt: string
  ) => void
  reset: () => void
}

const COMPARED_FIELDS: readonly (keyof ProcessSummaryItem)[] = [
  'running',
  'enabled',
  'role',
  'lifecycle',
  'active_public_id',
  'rss_bytes',
  'cpu_percent',
]

/**
 * Decide whether two rows for the SAME process name are value-equal.
 *
 * `setSnapshot` reuses the previous row OBJECT when this returns true so
 * per-cell selectors keyed off `useMetricRow` keep referential identity
 * and do not fire on snapshots that left a row unchanged. The `name`
 * field is the map key and therefore always equal, so it is not
 * re-compared here (doing so would be a dead branch).
 */
function rowsEqual(a: ProcessSummaryItem, b: ProcessSummaryItem): boolean {
  return COMPARED_FIELDS.every(field => a[field] === b[field])
}

/**
 * Diff-merge incoming rows against the prior name-map for one coordinator.
 *
 * Unchanged rows keep their previous object reference; only changed or
 * new rows allocate. Rows absent from `items` are dropped, so the result
 * mirrors the latest snapshot exactly while maximising shared identity.
 */
function mergeRows(
  previous: Record<string, ProcessSummaryItem> | undefined,
  items: readonly ProcessSummaryItem[]
): Record<string, ProcessSummaryItem> {
  const next: Record<string, ProcessSummaryItem> = {}

  items.forEach(item => {
    const prior = previous?.[item.name]

    next[item.name] = prior && rowsEqual(prior, item) ? prior : item
  })

  return next
}

export const useProcessMetricsStore = create<ProcessMetricsStore>()(
  subscribeWithSelector((set, _get) => ({
    byCoordinator: {},
    snapshotAt: {},
    setSnapshot: (coordinator, items, snapshotAt) => {
      set(state => ({
        byCoordinator: {
          ...state.byCoordinator,
          [coordinator]: mergeRows(state.byCoordinator[coordinator], items),
        },
        snapshotAt: {
          ...state.snapshotAt,
          [coordinator]: snapshotAt,
        },
      }))
    },
    reset: () => set({ byCoordinator: {}, snapshotAt: {} }),
  }))
)

export function useMetricCoordinators(): string[] {
  return useProcessMetricsStore(useShallow(state => Object.keys(state.byCoordinator).sort()))
}

export function useMetricProcessNames(coordinator: string): string[] {
  return useProcessMetricsStore(
    useShallow(state => Object.keys(state.byCoordinator[coordinator] ?? {}).sort())
  )
}

export function useMetricRow(coordinator: string, name: string): ProcessSummaryItem | undefined {
  return useProcessMetricsStore(state => state.byCoordinator[coordinator]?.[name])
}

export function useMetricContainerRssTotal(coordinator: string): number | null {
  return useProcessMetricsStore(state => {
    const rows = state.byCoordinator[coordinator]

    if (!rows) return null

    let total = 0
    let seen = false

    Object.values(rows).forEach(row => {
      if (row.rss_bytes != null) {
        total += row.rss_bytes
        seen = true
      }
    })

    return seen ? total : null
  })
}
