import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCookie } from '../utils'
import { apiClient as sharedApiClient } from '../apiClient'
import {
  getSystemStatus,
  getSystemMetrics,
  getDbStats,
  getNotificationMetrics,
  getRetentionRun,
  getEgressHealth,
} from './system'

vi.mock('../utils', () => ({
  getCookie: vi.fn(() => 'test-csrf-token'),
}))
vi.mock('../wsTicketCache', () => ({
  storeWsTicket: vi.fn(),
}))

let mockSeqCounter = 0

vi.mock('uuid', () => ({
  v7: vi.fn(() => `00000000-0000-7000-8000-${String(++mockSeqCounter).padStart(12, '0')}`),
}))
vi.mock('../sequenceTracker', () => ({
  getTracker: vi.fn(() => ({
    sessionId: 'test-session-id',
    nextSequence: vi.fn(() => ++mockSeqCounter),
  })),
}))

describe('system API methods', () => {
  const apiClient = sharedApiClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCookie).mockReturnValue('test-csrf')
    mockFetch = vi.fn()
    ;(globalThis as any).fetch = mockFetch
    apiClient.setTimeTravelAsOf(null)
    apiClient.setOperatorScope(null)
    apiClient.setWalletScope(null)
  })

  it('getSystemStatus returns system status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'system_status_response',
        sequence_id: 0,
        public_id: 'test-pid',
        timestamp: '2024-01-01T00:00:00Z',
        session_id: 'test-sid',
        payload: {
          type: 'system_status',
          sequence_id: 0,
          public_id: 'test-pid',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'test-sid',
          trader: {
            status: 'running',
            pid: 1234,
          },
          backtests: {},
          strategies: [],
        },
      }),
    })
    const result = await getSystemStatus()

    expect(result.payload.trader.status).toBe('running')
    expect(result.payload.backtests).toEqual({})
  })
  it('getSystemMetrics returns process metrics snapshot', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'system_metrics_response',
        sequence_id: 0,
        public_id: 'env-pid',
        timestamp: '2026-05-02T17:00:00Z',
        session_id: 'sid',
        payload: {
          type: 'system_metrics',
          sequence_id: 1,
          public_id: 'p-pid',
          timestamp: '2026-05-02T17:00:00Z',
          session_id: 'sid',
          bus_time: '2026-05-02T17:00:00Z',
          process: {
            pid: 100,
            uptime_seconds: 60,
            status: 'running',
            num_threads: 4,
            num_fds: 12,
            num_connections: 0,
          },
          cpu: {
            process_percent: 1.5,
            user_time_seconds: 0.4,
            system_time_seconds: 0.2,
            cgroup_quota_microseconds: null,
            cgroup_throttled_count: null,
          },
          memory: {
            rss_bytes: 1024,
            rss_peak_bytes: 2048,
            vms_bytes: 4096,
            python_traced_bytes: null,
            native_bytes: null,
            cgroup_limit_bytes: null,
            cgroup_current_bytes: null,
            saturation_pct: null,
          },
          asyncio: { active_tasks: 1, pending_tasks: 0 },
          gc: {
            collections_gen0: 0,
            collections_gen1: 0,
            collections_gen2: 0,
            uncollectable: 0,
            current_objects: 100,
          },
          limits: { rlimit_nproc: 1024, rlimit_nofile: 4096, rlimit_as_bytes: 0 },
          saturation: { threads_pct: null, fds_pct: null },
          db_internal: {
            aiosqlite_live_connections: 0,
            pool_size: null,
            pool_checked_out: null,
          },
          disk: {
            mount_path: '/',
            total_bytes: 781000000000,
            used_bytes: 572000000000,
            free_bytes: 209000000000,
            percent_used: 73.2,
            disk_low: false,
            disk_critical: false,
            status: 'healthy',
          },
          tracemalloc_active: false,
          cgroup_version: null,
        },
      }),
    })
    const result = await getSystemMetrics()

    expect(result.payload.process.pid).toBe(100)
    expect(result.payload.cpu.process_percent).toBeCloseTo(1.5)
  })
  it('getDbStats returns table statistics snapshot', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'db_stats_response',
        sequence_id: 0,
        public_id: 'env-db',
        timestamp: '2026-05-02T17:00:00Z',
        session_id: 'sid',
        payload: {
          type: 'db_stats',
          sequence_id: 1,
          public_id: 'p-db',
          timestamp: '2026-05-02T17:00:00Z',
          session_id: 'sid',
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
        },
      }),
    })
    const result = await getDbStats()

    expect(result.payload.tables).toHaveLength(1)
    expect(result.payload.tables[0]?.table).toBe('orders')
    expect(result.payload.interval_seconds).toBe(60)
  })
  it('getNotificationMetrics returns outbox counters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'notification_metrics_response',
        sequence_id: 0,
        public_id: 'env-n',
        timestamp: '2026-05-02T17:00:00Z',
        session_id: 'sid',
        payload: {
          type: 'notification_metrics',
          sequence_id: 1,
          public_id: 'p-n',
          timestamp: '2026-05-02T17:00:00Z',
          session_id: 'sid',
          delivery_success_total: 100,
          delivery_failed_total: 3,
          delivery_410_unregistered_total: 1,
          delivery_cancelled_scope_total: 2,
          outbox_queued_depth: 5,
        },
      }),
    })
    const result = await getNotificationMetrics()

    expect(result.payload.delivery_success_total).toBe(100)
    expect(result.payload.outbox_queued_depth).toBe(5)
  })
  it('getRetentionRun returns the latest scheduler tick', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'retention_run_response',
        sequence_id: 0,
        public_id: 'env-r',
        timestamp: '2026-05-02T17:00:00Z',
        session_id: 'sid',
        payload: {
          type: 'retention_run',
          sequence_id: 1,
          public_id: 'p-r',
          timestamp: '2026-05-02T17:00:00Z',
          session_id: 'sid',
          run_started_at: '2026-05-02T17:00:00Z',
          run_completed_at: '2026-05-02T17:00:01Z',
          dry_run: true,
          results: [
            {
              table: 'orders',
              retain_days: 30,
              backlog_lookback_days: 7,
              day_start: '2026-04-01',
              day_end: '2026-04-02',
              archived_rows: 100,
              purged_rows: 0,
              files_written: 1,
              error: null,
            },
          ],
        },
      }),
    })
    const result = await getRetentionRun()

    expect(result.payload.dry_run).toBe(true)
    expect(result.payload.results).toHaveLength(1)
    expect(result.payload.results[0]?.archived_rows).toBe(100)
  })
  it('getEgressHealth returns egress pool status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        type: 'egress_health_response',
        sequence_id: 0,
        public_id: 'env-egress',
        timestamp: '2026-06-21T18:00:00Z',
        session_id: 'sid',
        payload: {
          type: 'egress_health',
          sequence_id: 1,
          public_id: 'p-egress',
          timestamp: '2026-06-21T18:00:00Z',
          session_id: 'sid',
          enabled: true,
          on_all_quarantined: 'wait',
          private_fallback_route_id: 'pl',
          private_on_fallback: false,
          containers: [
            {
              container: 'api:orders@snapper',
              last_seen_age_seconds: 3,
              stale: false,
              route_count: 1,
            },
          ],
          routes: [
            {
              id: 'direct',
              kind: 'direct',
              region: 'host',
              exit_ip: '198.51.100.11',
              provider: 'isp',
              priority: 0,
              allowed_exchanges: [],
              enabled: true,
              quarantined: false,
              quarantine_seconds_remaining: null,
              in_use_count: 1,
              active_reservations: [
                { exchange: 'kraken', traffic_class: 'private', container: 'api:orders@snapper' },
              ],
              connections: [
                {
                  host: 'api.kraken.com',
                  kind: 'rest',
                  exchange: 'kraken',
                  traffic_class: 'private',
                  container: 'api:orders@snapper',
                  count: 0,
                  last_seen_at: '2026-06-21T17:59:57Z',
                },
              ],
            },
          ],
        },
      }),
    })
    const result = await getEgressHealth()

    expect(result.payload.enabled).toBe(true)
    expect(result.payload.routes?.[0]?.id).toBe('direct')
    expect(result.payload.routes?.[0]?.active_reservations?.[0]?.traffic_class).toBe('private')
    expect(result.payload.routes?.[0]?.active_reservations?.[0]?.container).toBe(
      'api:orders@snapper'
    )
    expect(result.payload.routes?.[0]?.connections?.[0]?.host).toBe('api.kraken.com')
    expect(result.payload.containers?.[0]?.container).toBe('api:orders@snapper')
  })
})
