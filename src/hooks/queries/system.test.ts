import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useSystemStatus,
  useSystemMetrics,
  useDbStats,
  useNotificationMetrics,
  useRetentionRun,
  useEgressHealth,
} from './system'
import { useAuth } from '../../stores/auth'
import { getSystemStatus, getEgressHealth } from '../../lib/api/system'

const ENV = {
  seq: 0,
  pid: 'test-pid',
  ts: '2024-01-01T00:00:00Z',
  sid: 'test-sid',
}

function envelope<T extends string>(type: T, extra: Record<string, unknown> = {}) {
  return {
    type,
    sequence_id: ENV.seq,
    public_id: ENV.pid,
    timestamp: ENV.ts,
    session_id: ENV.sid,
    ...extra,
  }
}

vi.mock('../../lib/api/system', () => ({
  getDbStats: vi.fn(() =>
    Promise.resolve(
      envelope('db_stats_response', {
        payload: envelope('db_stats', {
          snapshot_started_at: '2026-05-02T17:00:00Z',
          snapshot_completed_at: '2026-05-02T17:00:01Z',
          interval_seconds: 60,
          tables: [
            {
              table: 'orders',
              table_kind: 'state',
              total: 10,
              current: 5,
              closed: 5,
              archivable: 1,
              is_stale: false,
              last_sampled_at: '2026-05-02T17:00:01Z',
            },
          ],
        }),
      })
    )
  ),
  getNotificationMetrics: vi.fn(() =>
    Promise.resolve(
      envelope('notification_metrics_response', {
        payload: envelope('notification_metrics', {
          delivery_success_total: 0,
          delivery_failed_total: 0,
          delivery_410_unregistered_total: 0,
          delivery_cancelled_scope_total: 0,
          outbox_queued_depth: 0,
        }),
      })
    )
  ),
  getRetentionRun: vi.fn(() =>
    Promise.resolve(
      envelope('retention_run_response', {
        payload: envelope('retention_run', {
          run_started_at: '2026-05-02T17:00:00Z',
          run_completed_at: '2026-05-02T17:00:01Z',
          dry_run: false,
          results: [],
        }),
      })
    )
  ),
  getEgressHealth: vi.fn(() =>
    Promise.resolve(
      envelope('egress_health_response', {
        payload: envelope('egress_health', {
          enabled: true,
          on_all_quarantined: 'wait',
          private_fallback_route_id: 'pl',
          private_on_fallback: false,
          routes: [],
        }),
      })
    )
  ),
  getSystemMetrics: vi.fn(() =>
    Promise.resolve(
      envelope('system_metrics_response', {
        payload: envelope('system_metrics', {
          bus_time: '2026-05-02T17:00:00Z',
          process: {
            pid: 1,
            uptime_seconds: 1,
            status: 'running',
            num_threads: 1,
            num_fds: 1,
            num_connections: 0,
          },
          cpu: {
            process_percent: 0,
            user_time_seconds: 0,
            system_time_seconds: 0,
            cgroup_quota_microseconds: null,
            cgroup_throttled_count: null,
          },
          memory: {
            rss_bytes: 0,
            rss_peak_bytes: 0,
            vms_bytes: 0,
            python_traced_bytes: null,
            native_bytes: null,
            cgroup_limit_bytes: null,
            cgroup_current_bytes: null,
            saturation_pct: null,
          },
          asyncio: { active_tasks: 0, pending_tasks: 0 },
          gc: {
            collections_gen0: 0,
            collections_gen1: 0,
            collections_gen2: 0,
            uncollectable: 0,
            current_objects: 0,
          },
          limits: { rlimit_nproc: 0, rlimit_nofile: 0, rlimit_as_bytes: 0 },
          saturation: { threads_pct: null, fds_pct: null },
          db_internal: {
            aiosqlite_live_connections: 0,
            pool_size: null,
            pool_checked_out: null,
          },
          tracemalloc_active: false,
          cgroup_version: null,
        }),
      })
    )
  ),
  getSystemStatus: vi.fn(() =>
    Promise.resolve(
      envelope('system_status_response', {
        payload: envelope('system_status', {
          trader: { status: 'running' },
          backtests: {},
        }),
      })
    )
  ),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'admin' },
  })),
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('system queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useSystemStatus', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useSystemMetrics', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useSystemMetrics(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useDbStats', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useDbStats(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useNotificationMetrics', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useNotificationMetrics(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useRetentionRun', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useRetentionRun(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useEgressHealth', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useEgressHealth(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('authentication behavior', () => {
    it('does not fetch when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => useSystemStatus(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getSystemStatus)).not.toHaveBeenCalled()
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>)
    })
    it('does not fetch egress health when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => useEgressHealth(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getEgressHealth)).not.toHaveBeenCalled()
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>)
    })
  })
  describe('time-travel polling suppression', () => {
    let appStoreModule: typeof import('../../stores/app')

    beforeEach(async () => {
      appStoreModule = await import('../../stores/app')
      appStoreModule.useAppStore.setState({ asOf: null, isTimeTraveling: false })
    })
    afterEach(() => {
      appStoreModule.useAppStore.setState({ asOf: null, isTimeTraveling: false })
    })
    it('useSystemMetrics disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useSystemMetrics(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useDbStats disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useDbStats(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useNotificationMetrics disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useNotificationMetrics(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useRetentionRun disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useRetentionRun(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useEgressHealth disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useEgressHealth(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
  })
})
