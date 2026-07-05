import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useProcessMetricsStore,
  useMetricCoordinators,
  useMetricProcessNames,
  useMetricRow,
  useMetricContainerRssTotal,
  useCoordinatorLabel,
} from './processMetrics'
import { makeProcessSummaryItem } from '../test/factories'

describe('useProcessMetricsStore', () => {
  beforeEach(() => {
    useProcessMetricsStore.getState().reset()
  })

  describe('setSnapshot', () => {
    it('records rows under the coordinator keyed by process name', () => {
      useProcessMetricsStore
        .getState()
        .setSnapshot(
          'alpha',
          null,
          [makeProcessSummaryItem({ name: 'feed', rss_bytes: 100 })],
          '2026-06-01T00:00:00Z'
        )
      const state = useProcessMetricsStore.getState()

      expect(state.byCoordinator['alpha']?.['feed']?.rss_bytes).toBe(100)
      expect(state.snapshotAt['alpha']).toBe('2026-06-01T00:00:00Z')
    })

    it('replaces only the named coordinator and leaves others intact', () => {
      const store = useProcessMetricsStore.getState()

      store.setSnapshot('alpha', null, [makeProcessSummaryItem({ name: 'feed' })], 't1')
      store.setSnapshot('beta', null, [makeProcessSummaryItem({ name: 'broker' })], 't2')
      store.setSnapshot('alpha', null, [makeProcessSummaryItem({ name: 'strategy' })], 't3')
      const state = useProcessMetricsStore.getState()

      expect(Object.keys(state.byCoordinator['alpha'] ?? {})).toEqual(['strategy'])
      expect(Object.keys(state.byCoordinator['beta'] ?? {})).toEqual(['broker'])
      expect(state.snapshotAt['alpha']).toBe('t3')
      expect(state.snapshotAt['beta']).toBe('t2')
    })

    it('drops rows absent from the latest snapshot', () => {
      const store = useProcessMetricsStore.getState()

      store.setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed' }), makeProcessSummaryItem({ name: 'broker' })],
        't1'
      )
      store.setSnapshot('alpha', null, [makeProcessSummaryItem({ name: 'feed' })], 't2')
      expect(Object.keys(useProcessMetricsStore.getState().byCoordinator['alpha'] ?? {})).toEqual([
        'feed',
      ])
    })

    it('keeps the prior object reference when a row is unchanged', () => {
      const store = useProcessMetricsStore.getState()

      store.setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed', rss_bytes: 50 })],
        't1'
      )
      const first = useProcessMetricsStore.getState().byCoordinator['alpha']?.['feed']

      store.setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed', rss_bytes: 50 })],
        't2'
      )
      const second = useProcessMetricsStore.getState().byCoordinator['alpha']?.['feed']

      expect(second).toBe(first)
    })

    it('allocates a new object when a row value changes', () => {
      const store = useProcessMetricsStore.getState()

      store.setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed', rss_bytes: 50 })],
        't1'
      )
      const first = useProcessMetricsStore.getState().byCoordinator['alpha']?.['feed']

      store.setSnapshot(
        'alpha',
        null,
        [makeProcessSummaryItem({ name: 'feed', rss_bytes: 99 })],
        't2'
      )
      const second = useProcessMetricsStore.getState().byCoordinator['alpha']?.['feed']

      expect(second).not.toBe(first)
      expect(second?.rss_bytes).toBe(99)
    })
  })

  describe('reset', () => {
    it('clears all coordinators and snapshot times', () => {
      const store = useProcessMetricsStore.getState()

      store.setSnapshot('alpha', null, [makeProcessSummaryItem({ name: 'feed' })], 't1')
      store.reset()
      const state = useProcessMetricsStore.getState()

      expect(state.byCoordinator).toEqual({})
      expect(state.snapshotAt).toEqual({})
    })
  })

  describe('useMetricCoordinators', () => {
    it('returns coordinator slugs sorted', () => {
      const store = useProcessMetricsStore.getState()

      act(() => {
        store.setSnapshot('zeta', null, [makeProcessSummaryItem({ name: 'feed' })], 't1')
        store.setSnapshot('alpha', null, [makeProcessSummaryItem({ name: 'feed' })], 't2')
      })
      const { result } = renderHook(() => useMetricCoordinators())

      expect(result.current).toEqual(['alpha', 'zeta'])
    })
  })

  describe('useMetricProcessNames', () => {
    it('returns process names for a coordinator sorted', () => {
      act(() => {
        useProcessMetricsStore
          .getState()
          .setSnapshot(
            'alpha',
            null,
            [
              makeProcessSummaryItem({ name: 'strategy' }),
              makeProcessSummaryItem({ name: 'feed' }),
            ],
            't1'
          )
      })
      const { result } = renderHook(() => useMetricProcessNames('alpha', false))

      expect(result.current).toEqual(['feed', 'strategy'])
    })

    it('returns an empty list for an unknown coordinator', () => {
      const { result } = renderHook(() => useMetricProcessNames('missing', true))

      expect(result.current).toEqual([])
    })

    it('filters out disabled rows when hideDisabled is true, keeping stopped-but-enabled', () => {
      act(() => {
        useProcessMetricsStore
          .getState()
          .setSnapshot(
            'alpha',
            null,
            [
              makeProcessSummaryItem({ name: 'live', running: true, enabled: true }),
              makeProcessSummaryItem({ name: 'stopped', running: false, enabled: true }),
              makeProcessSummaryItem({ name: 'disabled', running: false, enabled: false }),
            ],
            't1'
          )
      })
      const { result } = renderHook(() => useMetricProcessNames('alpha', true))

      expect(result.current).toEqual(['live', 'stopped'])
    })
  })

  describe('useMetricRow', () => {
    it('returns the row for a coordinator and name', () => {
      act(() => {
        useProcessMetricsStore
          .getState()
          .setSnapshot(
            'alpha',
            null,
            [makeProcessSummaryItem({ name: 'feed', cpu_percent: 12.5 })],
            't1'
          )
      })
      const { result } = renderHook(() => useMetricRow('alpha', 'feed'))

      expect(result.current?.cpu_percent).toBe(12.5)
    })

    it('returns undefined for an unknown coordinator or name', () => {
      const { result } = renderHook(() => useMetricRow('alpha', 'feed'))

      expect(result.current).toBeUndefined()
    })
  })

  describe('useMetricContainerRssTotal', () => {
    it('returns null for an unknown coordinator', () => {
      const { result } = renderHook(() => useMetricContainerRssTotal('missing'))

      expect(result.current).toBeNull()
    })

    it('returns null when every row has a null rss', () => {
      act(() => {
        useProcessMetricsStore
          .getState()
          .setSnapshot(
            'alpha',
            null,
            [
              makeProcessSummaryItem({ name: 'feed', rss_bytes: null }),
              makeProcessSummaryItem({ name: 'broker', rss_bytes: null }),
            ],
            't1'
          )
      })
      const { result } = renderHook(() => useMetricContainerRssTotal('alpha'))

      expect(result.current).toBeNull()
    })

    it('sums non-null rss values and ignores null rows', () => {
      act(() => {
        useProcessMetricsStore
          .getState()
          .setSnapshot(
            'alpha',
            null,
            [
              makeProcessSummaryItem({ name: 'feed', rss_bytes: 100 }),
              makeProcessSummaryItem({ name: 'broker', rss_bytes: null }),
              makeProcessSummaryItem({ name: 'strategy', rss_bytes: 250 }),
            ],
            't1'
          )
      })
      const { result } = renderHook(() => useMetricContainerRssTotal('alpha'))

      expect(result.current).toBe(350)
    })

    it('returns null for an empty coordinator snapshot', () => {
      act(() => {
        useProcessMetricsStore.getState().setSnapshot('alpha', null, [], 't1')
      })
      const { result } = renderHook(() => useMetricContainerRssTotal('alpha'))

      expect(result.current).toBeNull()
    })
  })

  describe('useCoordinatorLabel', () => {
    it('returns the label recorded for a coordinator', () => {
      act(() => {
        useProcessMetricsStore
          .getState()
          .setSnapshot('coord-1', 'Feed', [makeProcessSummaryItem({ name: 'kfp' })], 't1')
      })
      const { result } = renderHook(() => useCoordinatorLabel('coord-1'))

      expect(result.current).toBe('Feed')
    })

    it('returns null for an unknown coordinator or a null label', () => {
      act(() => {
        useProcessMetricsStore.getState().setSnapshot('coord-1', null, [], 't1')
      })
      const known = renderHook(() => useCoordinatorLabel('coord-1'))
      const unknown = renderHook(() => useCoordinatorLabel('missing'))

      expect(known.result.current).toBeNull()
      expect(unknown.result.current).toBeNull()
    })
  })
})
