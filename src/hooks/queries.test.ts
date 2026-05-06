import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useSystemStatus,
  useSystemMetrics,
  useDbStats,
  useNotificationMetrics,
  useRetentionRun,
  useCandles,
  useExchanges,
  useExchangeInstruments,
  useExchangeInstrumentsDetail,
  useOperators,
  useWallets,
  useScopeGrants,
  useCreateScopeGrant,
  useHandoverScopeGrant,
  useCredentials,
  useCreateCredential,
  useRotateCredential,
  useOrders,
  useExecutions,
  useCancelOrder,
  useCreateOrder,
  useAvailableProcesses,
  useConfiguredProcesses,
  useProcessSummary,
  useStrategies,
  useProcessSchema,
  useProcessRuns,
  useLatestSignals,
  useOrdersGrouped,
  usePositionsSummary,
  useStartProcessByName,
  useStopProcessByName,
  useCreateProcessConfig,
  useCreateBracket,
  useCreateTrailingStop,
  useTrailingStopForCycle,
  useBacktests,
  useBacktestRunsByConfigHash,
  useBacktest,
  useBacktestTrades,
  useBacktestSignals,
  useCreateBacktest,
  useBacktestComparison,
  useBacktestComparisons,
  useCreateBacktestComparison,
  useFeatureFlags,
  useAiDelegates,
  useAiDelegate,
  useCreateAiDelegate,
  useUpdateAiDelegateCaps,
  useDeactivateAiDelegate,
  usePendingAiReviews,
  useSubmitAiReviewDecision,
  useAiReviewActivity,
} from './queries'
import { aiReviewActivityQueryKey, type AiReviewActivityFrame } from '../stores/wsDispatcher'
import { useAuth } from '../stores/auth'
import {
  createBacktest,
  createBacktestComparison,
  getBacktest,
  getBacktestComparison,
  getBacktestComparisons,
  getBacktestSignals,
  getBacktestTrades,
  getBacktests,
} from '../lib/api/backtests'
import { cancelOrder, createOrder, getExecutions, getOrders } from '../lib/api/orders'
import {
  createBracket,
  createTrailingStop,
  getPositions,
  getTrailingStopByCycle,
} from '../lib/api/positions'
import { APIError } from '../lib/api/error'
import {
  createAiDelegate,
  deactivateAiDelegate,
  getAiDelegate,
  listAiDelegates,
  updateAiDelegateCaps,
} from '../lib/api/ai-delegates'
import { listPendingAiReviews, submitAiReviewDecision } from '../lib/api/ai-reviews'
import { createCredential, getCredentials, rotateCredential } from '../lib/api/credentials'
import { getFeatureFlags } from '../lib/api/feature-flags'
import { getCandles, getExchangeInstruments } from '../lib/api/market'
import {
  createProcessConfig,
  getProcessRuns,
  startProcessByName,
  stopProcessByName,
} from '../lib/api/processes'
import { createScopeGrant, getScopeGrants, handoverScopeGrant } from '../lib/api/scope-grants'
import { getSignals } from '../lib/api/signals'
import { getSystemStatus } from '../lib/api/system'
import { getOperators, getWallets } from '../lib/api/wallets'

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

vi.mock('../lib/api/ai-delegates', () => ({
  createAiDelegate: vi.fn(() =>
    Promise.resolve(envelope('delegate_created_response', { payload: {} }))
  ),
  deactivateAiDelegate: vi.fn(() =>
    Promise.resolve(envelope('delegate_response', { payload: {} }))
  ),
  getAiDelegate: vi.fn(() => Promise.resolve(envelope('delegate_response', { payload: {} }))),
  listAiDelegates: vi.fn(() =>
    Promise.resolve(envelope('delegate_list', { payload: [], count: 0 }))
  ),
  updateAiDelegateCaps: vi.fn(() =>
    Promise.resolve(envelope('delegate_response', { payload: {} }))
  ),
}))
vi.mock('../lib/api/ai-reviews', () => ({
  listPendingAiReviews: vi.fn(() => Promise.resolve({ items: [], count: 0 })),
  submitAiReviewDecision: vi.fn(() =>
    Promise.resolve({ success: true, error_code: null, message: 'recorded', details: {} })
  ),
}))
vi.mock('../lib/api/backtests', () => ({
  cancelBacktest: vi.fn(() => Promise.resolve({ type: 'backtest_run_response', payload: {} })),
  createBacktest: vi.fn(() =>
    Promise.resolve({ type: 'backtest_run_response', payload: { public_id: 'r-new' } })
  ),
  createBacktestComparison: vi.fn(() =>
    Promise.resolve({
      type: 'backtest_comparison_response',
      payload: { public_id: 'cmp-new' },
    })
  ),
  getBacktest: vi.fn(() => Promise.resolve({ type: 'backtest_run_response', payload: {} })),
  getBacktestComparison: vi.fn(() =>
    Promise.resolve({
      type: 'backtest_comparison_detail_response',
      payload: { comparison: {}, run_a: {}, run_b: {} },
    })
  ),
  getBacktestComparisons: vi.fn(() =>
    Promise.resolve({ type: 'backtest_comparison_list', payload: [], count: 0 })
  ),
  getBacktestSignals: vi.fn(() =>
    Promise.resolve({ type: 'backtest_signal_list', payload: [], count: 0 })
  ),
  getBacktestTrades: vi.fn(() =>
    Promise.resolve({ type: 'backtest_trade_list', payload: [], count: 0 })
  ),
  getBacktests: vi.fn(() => Promise.resolve({ type: 'backtest_run_list', payload: [], count: 0 })),
  rerunBacktest: vi.fn(() => Promise.resolve({ type: 'backtest_run_response', payload: {} })),
}))
vi.mock('../lib/api/credentials', () => ({
  createCredential: vi.fn(() =>
    Promise.resolve(
      envelope('credential_response', {
        payload: envelope('credential_summary', {
          wallet_public_id: 'w-1',
          exchange: 'kraken',
          credential_type: 'api_key_secret',
          label: 'main',
        }),
      })
    )
  ),
  getCredentials: vi.fn(() =>
    Promise.resolve(envelope('credential_list_response', { payload: [], count: 0 }))
  ),
  rotateCredential: vi.fn(() =>
    Promise.resolve(
      envelope('credential_response', {
        payload: envelope('credential_summary', {
          wallet_public_id: 'w-1',
          exchange: 'kraken',
          credential_type: 'api_key_secret',
          label: 'rotated',
        }),
      })
    )
  ),
}))
vi.mock('../lib/api/feature-flags', () => ({
  getFeatureFlags: vi.fn(() =>
    Promise.resolve(
      envelope('feature_flags_response', {
        payload: { ai_integration_enabled: true },
      })
    )
  ),
}))
vi.mock('../lib/api/market', () => ({
  getCandles: vi.fn(() => Promise.resolve([])),
  getExchangeInstruments: vi.fn(() =>
    Promise.resolve(envelope('instrument_list', { payload: ['BTC/USD', 'ETH/USD'], count: 2 }))
  ),
  getExchangeInstrumentsDetail: vi.fn(() =>
    Promise.resolve(
      envelope('instrument_detail_list', {
        payload: [
          {
            type: 'instrument_detail',
            sequence_id: 0,
            public_id: 'row-1',
            timestamp: '2026-04-21T00:00:00Z',
            session_id: 'sid',
            instrument_public_id: 'inst-1',
            symbol_public_id: 'sym-1',
            symbol: 'MNQM6-CME',
            exchange: 'kraken_equities',
            can_trade: false,
            can_market_data: true,
            instrument_kind: 'future',
            expiry_at: null,
          },
        ],
        count: 1,
      })
    )
  ),
  getExchanges: vi.fn(() =>
    Promise.resolve(envelope('exchange_list', { payload: ['kraken', 'binance'], count: 2 }))
  ),
}))
vi.mock('../lib/api/orders', () => ({
  cancelOrder: vi.fn(() => Promise.resolve({ type: 'execution_plan_response', payload: {} })),
  createOrder: vi.fn(() => Promise.resolve({ type: 'execution_plan_response', payload: {} })),
  getExecutions: vi.fn(() =>
    Promise.resolve(envelope('execution_list', { payload: [], count: 0 }))
  ),
  getOrders: vi.fn(() => Promise.resolve(envelope('order_list', { payload: [], count: 0 }))),
}))
vi.mock('../lib/api/positions', () => ({
  cancelTrailingStop: vi.fn(() =>
    Promise.resolve({ type: 'execution_plan_response', payload: {} })
  ),
  createBracket: vi.fn(() => Promise.resolve({ type: 'execution_plan_response', payload: {} })),
  createTrailingStop: vi.fn(() =>
    Promise.resolve({ type: 'execution_plan_response', payload: {} })
  ),
  getPositions: vi.fn(() => Promise.resolve(envelope('position_list', { payload: [], count: 0 }))),
  getTrailingStopByCycle: vi.fn(() => Promise.resolve({ type: 'message', payload: 'none' })),
}))
vi.mock('../lib/api/processes', () => ({
  createProcessConfig: vi.fn(() =>
    Promise.resolve(
      envelope('process_create_response', {
        payload: envelope('process_create', {
          status: 'created',
          process: { name: 'test', template: 'test-template' },
        }),
      })
    )
  ),
  getAvailableProcesses: vi.fn(() =>
    Promise.resolve(envelope('available_processes', { payload: [], count: 0 }))
  ),
  getConfiguredProcesses: vi.fn(() =>
    Promise.resolve(envelope('configured_processes', { payload: [], count: 0 }))
  ),
  getProcessRuns: vi.fn(() => Promise.resolve(envelope('process_runs', { payload: [], count: 0 }))),
  getProcessSchema: vi.fn(() =>
    Promise.resolve(
      envelope('process_schema_response', {
        payload: envelope('process_schema', {
          name: 'collector',
          description: '',
          class_path: '',
          method: '',
          default_enabled: true,
          default_mode: 'thread',
          lifecycle: 'long_running',
        }),
      })
    )
  ),
  getProcessSummary: vi.fn(() =>
    Promise.resolve(
      envelope('process_summary_response', {
        payload: envelope('process_summary', {
          feeds: { running: 0, total: 0 },
          strategies: { running: 0, total: 0 },
          executors: { running: 0, total: 0 },
          brokers: { running: 0, total: 0 },
        }),
      })
    )
  ),
  startProcessByName: vi.fn(() =>
    Promise.resolve(
      envelope('process_start_response', {
        payload: envelope('process_start', {
          status: 'success',
          name: 'collector',
          message: 'started',
        }),
      })
    )
  ),
  stopProcessByName: vi.fn(() =>
    Promise.resolve(
      envelope('process_stop_response', {
        payload: envelope('process_stop', {
          status: 'success',
          name: 'collector',
          message: 'stopped',
        }),
      })
    )
  ),
}))
vi.mock('../lib/api/scope-grants', () => ({
  createScopeGrant: vi.fn(() =>
    Promise.resolve(
      envelope('scope_grant_response', {
        payload: envelope('scope_grant_info', {
          operator_public_id: 'op-1',
          wallet_public_id: 'w-1',
          granted_by_user_public_id: 'u-1',
          scope_kind: 'underlying',
          underlying_public_id: 'BTC',
          instrument_public_id: null,
          note: null,
          known_to: '9999-12-31T23:59:59.999999Z',
        }),
      })
    )
  ),
  getScopeGrants: vi.fn(() =>
    Promise.resolve(envelope('scope_grant_list_response', { payload: [], count: 0 }))
  ),
  handoverScopeGrant: vi.fn(() =>
    Promise.resolve(
      envelope('handover_scope_grant_response', {
        payload: {
          closed_grant: envelope('scope_grant_info', {
            operator_public_id: 'op-1',
            wallet_public_id: 'w-1',
            granted_by_user_public_id: 'u-1',
            scope_kind: 'underlying',
            underlying_public_id: 'BTC',
            instrument_public_id: null,
            note: null,
            known_to: '2026-01-01T00:00:00Z',
          }),
          new_grant: envelope('scope_grant_info', {
            operator_public_id: 'op-2',
            wallet_public_id: 'w-1',
            granted_by_user_public_id: 'u-1',
            scope_kind: 'underlying',
            underlying_public_id: 'BTC',
            instrument_public_id: null,
            note: null,
            known_to: '9999-12-31T23:59:59.999999Z',
          }),
        },
      })
    )
  ),
}))
vi.mock('../lib/api/signals', () => ({
  getSignals: vi.fn(() => Promise.resolve(envelope('signal_list', { payload: [], count: 0 }))),
}))
vi.mock('../lib/api/strategies', () => ({
  getStrategies: vi.fn(() =>
    Promise.resolve(
      envelope('strategy_list', {
        payload: [
          envelope('strategy_process', {
            name: 'strategy_test',
            running: false,
            enabled: true,
            mode: 'thread',
          }),
        ],
        count: 1,
      })
    )
  ),
}))
vi.mock('../lib/api/system', () => ({
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
vi.mock('../lib/api/wallets', () => ({
  getOperators: vi.fn(() => Promise.resolve(envelope('operator_list', { payload: [], count: 0 }))),
  getWallets: vi.fn(() => Promise.resolve(envelope('wallet_list', { payload: [], count: 0 }))),
}))
vi.mock('../lib/apiClient', () => ({
  apiClient: {},
  APIError: class APIError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly statusText: string
    ) {
      super(message)
      this.name = 'APIError'
    }
  },
}))
vi.mock('../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'admin' },
  })),
}))
vi.mock('../lib/transforms', () => ({
  safeOrderFromAPI: vi.fn(o => o),
  safeExecutionFromAPI: vi.fn(e => e),
  safeSignalFromAPI: vi.fn(s => s),
  positionFromAPI: vi.fn(p => ({
    publicId: p.public_id,
    timestamp: p.timestamp ? new Date(p.timestamp) : undefined,
    instrument: p.instrument ?? '',
    exchange: p.exchange ?? '',
    quantity: p.quantity ?? 0,
    averagePrice: p.average_price ?? 0,
    unrealizedPnl: p.unrealized_pnl ?? 0,
    realizedPnl: p.realized_pnl ?? 0,
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

const createWrapperWithClient = () => {
  const queryClient = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, wrapper }
}

describe('queries', () => {
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
  describe('useCandles', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useCandles('EUR-USD', 'kraken', '1h'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('does not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useCandles('EUR-USD', 'kraken', '1h', 100, false), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
    })
  })
  describe('useExchanges', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useExchanges(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload).toEqual(['kraken', 'binance'])
    })
  })
  describe('useExchangeInstruments', () => {
    it('returns data when exchange is provided', async () => {
      const { result } = renderHook(() => useExchangeInstruments('kraken'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload).toEqual(['BTC/USD', 'ETH/USD'])
    })
    it('does not fetch when exchange is null', async () => {
      const { result } = renderHook(() => useExchangeInstruments(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
      expect(vi.mocked(getExchangeInstruments)).not.toHaveBeenCalled()
    })
  })
  describe('useExchangeInstrumentsDetail', () => {
    it('returns capability rows when exchange is provided', async () => {
      const { result } = renderHook(() => useExchangeInstrumentsDetail('kraken_equities'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.payload).toHaveLength(1)
      expect(result.current.data?.payload[0]?.can_trade).toBe(false)
    })
    it('does not fetch when exchange is null', async () => {
      const { result } = renderHook(() => useExchangeInstrumentsDetail(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeUndefined()
    })
  })
  describe('useOperators', () => {
    it('returns data when authenticated', async () => {
      vi.mocked(getOperators).mockResolvedValueOnce(
        envelope('operator_list', {
          payload: [{ public_id: 'op-1', label: 'alice' }],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => useOperators(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useWallets', () => {
    it('returns data when authenticated', async () => {
      vi.mocked(getWallets).mockResolvedValueOnce(
        envelope('wallet_list', {
          payload: [{ public_id: 'w-1', label: 'default', is_paper: false }],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => useWallets(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useOrders', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useExecutions', () => {
    it('returns data when authenticated', async () => {
      vi.mocked(getExecutions).mockResolvedValueOnce(
        envelope('execution_list', {
          payload: [null, { public_id: 'exec-1' }],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => useExecutions(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useLatestSignals', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useLatestSignals(10), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('uses default limit of 10', async () => {
      const { result } = renderHook(() => useLatestSignals(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('sorts signals by timestamp and applies limit', async () => {
      vi.mocked(getSignals).mockResolvedValueOnce(
        envelope('signal_list', {
          payload: [
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'buy',
              strength: 0.5,
              reason: 'oldest',
              strategyName: 'test',
              price: 50000,
              firedAt: new Date('2026-01-15T10:00:00Z'),
            },
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'buy',
              strength: 0.6,
              reason: 'newest',
              strategyName: 'test',
              price: 50100,
              firedAt: new Date('2026-01-15T12:00:00Z'),
            },
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'sell',
              strength: 0.4,
              reason: 'middle',
              strategyName: 'test',
              price: 49900,
              firedAt: new Date('2026-01-15T11:00:00Z'),
            },
          ],
          count: 3,
        }) as never
      )
      const { result } = renderHook(() => useLatestSignals(2), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.[0]?.reason).toBe('newest')
      expect(result.current.data?.[1]?.reason).toBe('middle')
    })
    it('handles signals with undefined timestamp in sorting', async () => {
      vi.mocked(getSignals).mockResolvedValueOnce(
        envelope('signal_list', {
          payload: [
            {
              exchange: 'kraken',
              instrument: 'BTC/USD',
              side: 'buy',
              strength: 0.5,
              reason: 'with-timestamp',
              strategyName: 'test',
              price: 50000,
              firedAt: new Date('2026-01-15T10:00:00Z'),
            },
            {
              exchange: 'kraken',
              instrument: 'ETH/USD',
              side: 'sell',
              strength: 0.6,
              reason: 'no-timestamp',
              strategyName: 'test',
              price: 3000,
              firedAt: undefined,
            },
            {
              exchange: 'kraken',
              instrument: 'SOL/USD',
              side: 'buy',
              strength: 0.4,
              reason: 'newer-timestamp',
              strategyName: 'test',
              price: 100,
              firedAt: new Date('2026-01-15T12:00:00Z'),
            },
          ],
          count: 3,
        }) as never
      )
      const { result } = renderHook(() => useLatestSignals(3), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toHaveLength(3)
      expect(result.current.data?.[0]?.reason).toBe('newer-timestamp')
      expect(result.current.data?.[1]?.reason).toBe('with-timestamp')
      expect(result.current.data?.[2]?.reason).toBe('no-timestamp')
    })
  })
  describe('useAvailableProcesses', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useAvailableProcesses(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useConfiguredProcesses', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useConfiguredProcesses(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useProcessSummary', () => {
    it('returns data when authenticated', async () => {
      const { result } = renderHook(() => useProcessSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.payload?.feeds).toEqual({ running: 0, total: 0 })
    })
  })
  describe('useStrategies', () => {
    it('returns strategy list when authenticated', async () => {
      const { result } = renderHook(() => useStrategies(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.payload).toHaveLength(1)
      expect(result.current.data?.payload[0]?.name).toBe('strategy_test')
    })
  })
  describe('useProcessSchema', () => {
    it('returns data when name is provided', async () => {
      const { result } = renderHook(() => useProcessSchema('collector'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
  })
  describe('useProcessRuns', () => {
    it('returns data with default options', async () => {
      const { result } = renderHook(() => useProcessRuns(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('passes options correctly', async () => {
      const options = { name: 'collector', limit: 100 }
      const { result } = renderHook(() => useProcessRuns(options), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
    })
    it('respects enabled option', async () => {
      const options = { enabled: false }
      const { result } = renderHook(() => useProcessRuns(options), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getProcessRuns)).not.toHaveBeenCalled()
    })
  })
  describe('useOrdersGrouped', () => {
    it('groups orders by status', async () => {
      vi.mocked(getOrders).mockResolvedValueOnce(
        envelope('order_list', {
          payload: [
            {
              public_id: '1',
              status: 'NEW',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '2',
              status: 'OPEN',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '3',
              status: 'FILLED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '4',
              status: 'PARTIALLY_FILLED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '5',
              status: 'CANCELLED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
            {
              public_id: '6',
              status: 'REJECTED',
              instrument: 'BTC/USD',
              side: 'buy',
              price: 100,
              quantity: 1,
            },
          ],
          count: 6,
        }) as never
      )
      const { result } = renderHook(() => useOrdersGrouped(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.new).toHaveLength(1)
      expect(result.current.data?.open).toHaveLength(1)
      expect(result.current.data?.filled).toHaveLength(1)
      expect(result.current.data?.partially_filled).toHaveLength(1)
      expect(result.current.data?.cancelled).toHaveLength(1)
      expect(result.current.data?.rejected).toHaveLength(1)
    })
    it('returns null when no orders', async () => {
      vi.mocked(getOrders).mockResolvedValueOnce(null as never)
      const { result } = renderHook(() => useOrdersGrouped(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeNull()
    })
  })
  describe('usePositionsSummary', () => {
    it('calculates summary for all-long positions', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              type: 'position' as const,
              public_id: '1',
              timestamp: new Date().toISOString(),
              instrument: 'BTC/USD',
              exchange: 'kraken' as const,
              quantity: 10,
              average_price: 100,
              unrealized_pnl: 50,
              realized_pnl: 20,
            },
            {
              type: 'position' as const,
              public_id: '2',
              timestamp: new Date().toISOString(),
              instrument: 'ETH/USD',
              exchange: 'kraken' as const,
              quantity: 5,
              average_price: 200,
              unrealized_pnl: -10,
              realized_pnl: 30,
            },
          ],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.count).toBe(2)
      expect(result.current.data?.instruments).toContain('BTC/USD')
      expect(result.current.data?.instruments).toContain('ETH/USD')
      expect(result.current.data?.totalPnL).toBe(90)
      expect(result.current.data?.longCost).toBe(2000)
      expect(result.current.data?.shortCost).toBe(0)
      expect(result.current.data?.totalExposure).toBe(2000)
      expect(result.current.data?.pnlPercent).toBeCloseTo(4.5, 5)
    })
    it('calculates summary for all-short positions (regression: pnlPercent must not be hidden)', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              type: 'position' as const,
              public_id: '1',
              timestamp: new Date().toISOString(),
              instrument: 'BTC/USD',
              exchange: 'kraken' as const,
              quantity: -10,
              average_price: 100,
              unrealized_pnl: 50,
              realized_pnl: 20,
            },
            {
              type: 'position' as const,
              public_id: '2',
              timestamp: new Date().toISOString(),
              instrument: 'ETH/USD',
              exchange: 'kraken' as const,
              quantity: -5,
              average_price: 200,
              unrealized_pnl: 25,
              realized_pnl: 5,
            },
          ],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.count).toBe(2)
      expect(result.current.data?.totalPnL).toBe(100)
      expect(result.current.data?.longCost).toBe(0)
      expect(result.current.data?.shortCost).toBe(2000)
      expect(result.current.data?.totalExposure).toBe(2000)
      expect(result.current.data?.pnlPercent).toBeCloseTo(5.0, 5)
    })
    it('calculates summary for mixed long and short positions', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              type: 'position' as const,
              public_id: '1',
              timestamp: new Date().toISOString(),
              instrument: 'BTC/USD',
              exchange: 'kraken' as const,
              quantity: 10,
              average_price: 100,
              unrealized_pnl: 50,
              realized_pnl: 0,
            },
            {
              type: 'position' as const,
              public_id: '2',
              timestamp: new Date().toISOString(),
              instrument: 'ETH/USD',
              exchange: 'kraken' as const,
              quantity: -5,
              average_price: 200,
              unrealized_pnl: 25,
              realized_pnl: 0,
            },
          ],
          count: 2,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.count).toBe(2)
      expect(result.current.data?.longCost).toBe(1000)
      expect(result.current.data?.shortCost).toBe(1000)
      expect(result.current.data?.totalExposure).toBe(2000)
      expect(result.current.data?.totalPnL).toBe(75)
      expect(result.current.data?.pnlPercent).toBeCloseTo(3.75, 5)
    })
    it('returns null when positions data is unavailable', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(null as never)
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data).toBeNull()
    })
    it('handles zero exposure (flat position) without dividing by zero', async () => {
      vi.mocked(getPositions).mockResolvedValueOnce(
        envelope('position_list', {
          payload: [
            {
              public_id: '1',
              instrument: 'BTC/USD',
              quantity: 0,
              average_price: 0,
              unrealized_pnl: 0,
              realized_pnl: 0,
            },
          ],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => usePositionsSummary(), { wrapper: createWrapper() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.data?.longCost).toBe(0)
      expect(result.current.data?.shortCost).toBe(0)
      expect(result.current.data?.totalExposure).toBe(0)
      expect(result.current.data?.pnlPercent).toBe(0)
    })
  })
  describe('useStartProcessByName', () => {
    it('starts process and invalidates queries', async () => {
      const { result } = renderHook(() => useStartProcessByName(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          name: 'collector',
          mode: 'thread',
          parameters: { key: 'value' },
        })
      })
      expect(vi.mocked(startProcessByName)).toHaveBeenCalledWith('collector', {
        mode: 'thread',
        parameters: { key: 'value' },
      })
    })
    it('uses exponential retryDelay', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useStartProcessByName(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ name: 'collector' })
      })
      const mutation = queryClient.getMutationCache().getAll()[0]

      expect(mutation).toBeDefined()
      const retryDelay = mutation?.options.retryDelay

      expect(retryDelay).toEqual(expect.any(Function))

      if (typeof retryDelay === 'function') {
        expect(retryDelay(0, new Error('test'))).toBe(1000)
        expect(retryDelay(5, new Error('test'))).toBe(30000)
      }
    })
  })
  describe('useStopProcessByName', () => {
    it('stops process and invalidates queries', async () => {
      const { result } = renderHook(() => useStopProcessByName(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ name: 'collector' })
      })
      expect(vi.mocked(stopProcessByName)).toHaveBeenCalledWith('collector')
    })
    it('uses exponential retryDelay', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useStopProcessByName(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ name: 'collector' })
      })
      const mutation = queryClient.getMutationCache().getAll()[0]

      expect(mutation).toBeDefined()
      const retryDelay = mutation?.options.retryDelay

      expect(retryDelay).toEqual(expect.any(Function))

      if (typeof retryDelay === 'function') {
        expect(retryDelay(0, new Error('test'))).toBe(1000)
        expect(retryDelay(5, new Error('test'))).toBe(30000)
      }
    })
  })
  describe('useCreateProcessConfig', () => {
    it('creates process config and invalidates queries', async () => {
      const { result } = renderHook(() => useCreateProcessConfig(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ name: 'new-process', template: 'test-template' })
      })
      expect(vi.mocked(createProcessConfig)).toHaveBeenCalledWith({
        name: 'new-process',
        template: 'test-template',
      })
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
    it('useCandles does not fetch when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => useCandles('BTC/USD', 'kraken'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getCandles)).not.toHaveBeenCalled()
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>)
    })
    it('usePositionsSummary does not fetch when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => usePositionsSummary(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(vi.mocked(getPositions)).not.toHaveBeenCalled()
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>)
    })
  })
  describe('useScopeGrants', () => {
    it('returns data when wallet is provided', async () => {
      const { result } = renderHook(() => useScopeGrants('w-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getScopeGrants)).toHaveBeenCalledWith('w-1')
    })
    it('does not fetch with empty wallet id', async () => {
      const { result } = renderHook(() => useScopeGrants(''), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getScopeGrants)).not.toHaveBeenCalled()
    })
  })
  describe('useCreateScopeGrant', () => {
    it('calls createScopeGrant and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useCreateScopeGrant(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          operator_public_id: 'op-1',
          wallet_public_id: 'w-1',
          scope_kind: 'underlying',
          underlying_public_id: 'BTC',
        })
      })
      expect(vi.mocked(createScopeGrant)).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('useHandoverScopeGrant', () => {
    it('calls handoverScopeGrant and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useHandoverScopeGrant(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          from_grant_public_id: 'sg-1',
          to_operator_public_id: 'op-2',
        })
      })
      expect(vi.mocked(handoverScopeGrant)).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('useCredentials', () => {
    it('returns data when wallet is provided', async () => {
      const { result } = renderHook(() => useCredentials('w-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getCredentials)).toHaveBeenCalledWith('w-1')
    })
    it('does not fetch with empty wallet id', async () => {
      const { result } = renderHook(() => useCredentials(''), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getCredentials)).not.toHaveBeenCalled()
    })
  })
  describe('useCreateCredential', () => {
    it('calls createCredential and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useCreateCredential(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          walletPublicId: 'w-1',
          data: {
            exchange: 'kraken',
            credential_type: 'api_key_secret',
            credential_payload: { api_key: 'k', api_secret: 's' },
          },
        })
      })
      expect(vi.mocked(createCredential)).toHaveBeenCalledWith('w-1', {
        exchange: 'kraken',
        credential_type: 'api_key_secret',
        credential_payload: { api_key: 'k', api_secret: 's' },
      })
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('useRotateCredential', () => {
    it('calls rotateCredential and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useRotateCredential(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          walletPublicId: 'w-1',
          credentialPublicId: 'cred-1',
          data: {
            credential_payload: { api_key: 'new-k', api_secret: 'new-s' },
          },
        })
      })
      expect(vi.mocked(rotateCredential)).toHaveBeenCalledWith('w-1', 'cred-1', {
        credential_payload: { api_key: 'new-k', api_secret: 'new-s' },
      })
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('time-travel polling suppression', () => {
    let appStoreModule: typeof import('../stores/app')

    beforeEach(async () => {
      appStoreModule = await import('../stores/app')
      appStoreModule.useAppStore.setState({ asOf: null, isTimeTraveling: false })
    })
    afterEach(() => {
      appStoreModule.useAppStore.setState({ asOf: null, isTimeTraveling: false })
    })
    it('useConfiguredProcesses has refetchInterval when live', async () => {
      const { result } = renderHook(() => useConfiguredProcesses(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useConfiguredProcesses disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useConfiguredProcesses(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useProcessSummary disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useProcessSummary(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useStrategies disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useStrategies(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
    it('useProcessRuns disables refetchInterval when time-traveling', async () => {
      appStoreModule.useAppStore.setState({ asOf: '2026-01-01T00:00:00Z', isTimeTraveling: true })
      const { result } = renderHook(() => useProcessRuns(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
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
  })

  describe('useCreateOrder', () => {
    it('calls createOrder and invalidates orders', async () => {
      const responseBody = {
        type: 'execution_plan_response' as const,
        sequence_id: 1,
        public_id: 'plan-1',
        timestamp: '2026-04-12T00:00:00Z',
        session_id: 'sess-1',
        payload: {
          type: 'execution_plan' as const,
          sequence_id: 1,
          public_id: 'plan-1',
          timestamp: '2026-04-12T00:00:00Z',
          session_id: 'sess-1',
          plan_type: 'order',
          status: 'armed',
          instrument_public_id: 'inst-1',
          exchange: 'kraken' as const,
          mode: 'paper' as const,
          side: 'buy' as const,
          total_quantity: 1.0,
          filled_quantity: 0,
          created_at: '2026-04-12T00:00:00Z',
          created_via: 'api',
          wallet_public_id: 'w-1',
          operator_public_id: null,
          params: {},
          position_cycle_public_id: null,
          parent_plan_public_id: null,
          last_error: null,
          idempotency_key: null,
        },
      }

      vi.mocked(createOrder).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCreateOrder(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ type: 'create_order_command' })
      })

      expect(createOrder).toHaveBeenCalledWith({
        type: 'create_order_command',
      })
    })
  })

  describe('useCancelOrder', () => {
    it('calls cancelOrder with the client_order_id', async () => {
      const responseBody = {
        type: 'execution_plan_response' as const,
        sequence_id: 2,
        public_id: 'plan-2',
        timestamp: '2026-04-12T00:00:00Z',
        session_id: 'sess-1',
        payload: {
          type: 'execution_plan' as const,
          sequence_id: 2,
          public_id: 'plan-2',
          timestamp: '2026-04-12T00:00:00Z',
          session_id: 'sess-1',
          plan_type: 'order',
          status: 'cancelled',
          instrument_public_id: 'inst-1',
          exchange: 'kraken' as const,
          mode: 'paper' as const,
          side: 'buy' as const,
          total_quantity: 1.0,
          filled_quantity: 0,
          created_at: '2026-04-12T00:00:00Z',
          created_via: 'api',
          wallet_public_id: 'w-1',
          operator_public_id: null,
          params: {},
          position_cycle_public_id: null,
          parent_plan_public_id: null,
          last_error: null,
          idempotency_key: null,
        },
      }

      vi.mocked(cancelOrder).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCancelOrder(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync('cid-42')
      })

      expect(cancelOrder).toHaveBeenCalledWith('cid-42')
    })
  })

  describe('useCreateBracket', () => {
    it('calls createBracket and invalidates positions + orders', async () => {
      const responseBody = {
        type: 'execution_plan_response' as const,
        sequence_id: 1,
        public_id: 'plan-1',
        timestamp: '2026-04-12T00:00:00Z',
        session_id: 'sess-1',
        payload: {
          type: 'execution_plan' as const,
          sequence_id: 1,
          public_id: 'plan-1',
          timestamp: '2026-04-12T00:00:00Z',
          session_id: 'sess-1',
          plan_type: 'bracket',
          status: 'armed',
          instrument_public_id: 'inst-1',
          exchange: 'kraken_futures',
          mode: 'paper',
          side: 'buy',
          total_quantity: 1.0,
          filled_quantity: 0,
          created_at: '2026-04-12T00:00:00Z',
          created_via: 'api',
          wallet_public_id: 'w-1',
          operator_public_id: null,
          params: { sl_price: 48000 },
          position_cycle_public_id: 'cycle-1',
          parent_plan_public_id: null,
          last_error: null,
          idempotency_key: null,
        },
      }

      vi.mocked(createBracket).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCreateBracket(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          position_cycle_public_id: 'cycle-1',
          sl_price: 48000,
        })
      })

      expect(createBracket).toHaveBeenCalledWith({
        position_cycle_public_id: 'cycle-1',
        sl_price: 48000,
      })
    })
  })

  describe('useCreateTrailingStop', () => {
    it('calls createTrailingStop and invalidates queries', async () => {
      const responseBody = {
        type: 'execution_plan_response' as const,
        sequence_id: 1,
        public_id: 'ts-1',
        timestamp: '2026-04-13T00:00:00Z',
        session_id: 'sess-1',
        payload: {
          type: 'execution_plan' as const,
          sequence_id: 1,
          public_id: 'ts-1',
          timestamp: '2026-04-13T00:00:00Z',
          session_id: 'sess-1',
          plan_type: 'trailing_stop',
          status: 'armed',
          instrument_public_id: 'inst-1',
          exchange: 'kraken_futures',
          mode: 'paper',
          side: 'buy',
          total_quantity: 1.0,
          filled_quantity: 0,
          created_at: '2026-04-13T00:00:00Z',
          created_via: 'api',
          wallet_public_id: 'w-1',
          operator_public_id: null,
          params: { trailing_pct: 5 },
          position_cycle_public_id: 'cycle-1',
          parent_plan_public_id: null,
          last_error: null,
          idempotency_key: null,
        },
      }

      vi.mocked(createTrailingStop).mockResolvedValueOnce(responseBody)

      const { result } = renderHook(() => useCreateTrailingStop(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({
          position_cycle_public_id: 'cycle-1',
          trailing_pct: 5,
        })
      })

      expect(createTrailingStop).toHaveBeenCalledWith({
        position_cycle_public_id: 'cycle-1',
        trailing_pct: 5,
      })
    })
  })

  describe('useTrailingStopForCycle', () => {
    it('fetches trailing stop state for a cycle', async () => {
      vi.mocked(getTrailingStopByCycle).mockResolvedValueOnce({
        type: 'message',
        payload: 'none',
      })

      const { result } = renderHook(() => useTrailingStopForCycle('cycle-1'), {
        wrapper: createWrapper(),
      })

      await vi.waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(getTrailingStopByCycle).toHaveBeenCalledWith('cycle-1')
    })

    it('is disabled when cyclePublicId is undefined', () => {
      const { result } = renderHook(() => useTrailingStopForCycle(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useBacktests', () => {
    it('fetches backtest list', async () => {
      const { result } = renderHook(() => useBacktests(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getBacktests).toHaveBeenCalled()
    })
  })

  describe('useBacktestRunsByConfigHash', () => {
    it('is disabled when configHash is null', () => {
      const { result } = renderHook(() => useBacktestRunsByConfigHash(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('fetches by config_hash when provided', async () => {
      const { result } = renderHook(() => useBacktestRunsByConfigHash('cfg-1', 5), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getBacktests).toHaveBeenCalledWith(5, 0, undefined, undefined, 'cfg-1')
    })
  })

  describe('useBacktest', () => {
    it('fetches backtest detail when runId is provided', async () => {
      ;(getBacktest as Mock).mockResolvedValue({
        type: 'backtest_run_response',
        payload: { public_id: 'run-1' },
      })

      const { result } = renderHook(() => useBacktest('run-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getBacktest).toHaveBeenCalledWith('run-1')
    })

    it('is disabled when runId is undefined', () => {
      const { result } = renderHook(() => useBacktest(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useBacktestTrades', () => {
    it('fetches trades when runId is provided', async () => {
      ;(getBacktestTrades as Mock).mockResolvedValue({
        type: 'backtest_trade_list',
        payload: [],
        count: 0,
      })

      const { result } = renderHook(() => useBacktestTrades('run-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getBacktestTrades).toHaveBeenCalledWith('run-1')
    })

    it('is disabled when runId is undefined', () => {
      const { result } = renderHook(() => useBacktestTrades(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useBacktestSignals', () => {
    it('fetches signals when runId is provided', async () => {
      ;(getBacktestSignals as Mock).mockResolvedValue({
        type: 'backtest_signal_list',
        payload: [],
        count: 0,
      })

      const { result } = renderHook(() => useBacktestSignals('run-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getBacktestSignals).toHaveBeenCalledWith('run-1')
    })
  })

  describe('useCreateBacktest', () => {
    it('calls createBacktest and invalidates queries', async () => {
      ;(createBacktest as Mock).mockResolvedValue({
        type: 'backtest_run_response',
        payload: { public_id: 'r-new' },
      })

      const { result } = renderHook(() => useCreateBacktest(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          strategy_class: 'sma',
          instrument_public_id: 'BTC-USD',
          exchange: 'kraken',
          start_date: '2026-01-01',
          end_date: '2026-06-01',
        } as never)
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(createBacktest).toHaveBeenCalled()
    })
  })

  describe('useBacktestComparison*', () => {
    let appStoreModule: typeof import('../stores/app')

    beforeEach(async () => {
      appStoreModule = await import('../stores/app')
      appStoreModule.useAppStore.setState({ currentWalletPublicId: 'wallet-1' })
    })
    afterEach(() => {
      appStoreModule.useAppStore.setState({ currentWalletPublicId: null })
    })

    it('useBacktestComparison fetches when id is provided + scopes key by wallet', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useBacktestComparison('cmp-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getBacktestComparison).toHaveBeenCalledWith('cmp-1')
      expect(
        queryClient.getQueryCache().find({ queryKey: ['backtest-compare', 'wallet-1', 'cmp-1'] })
      ).toBeDefined()
    })

    it('useBacktestComparison is disabled when id is undefined', () => {
      const { result } = renderHook(() => useBacktestComparison(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('useBacktestComparison does NOT retry on 404', async () => {
      const error = new APIError('Comparison not found', 404, 'Not Found')

      ;(getBacktestComparison as Mock).mockRejectedValue(error)
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 3 } } })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)
      const { result } = renderHook(() => useBacktestComparison('cmp-missing'), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect((getBacktestComparison as Mock).mock.calls.length).toBe(1)
    })

    it('useBacktestComparison retries up to 3 times on 500', async () => {
      const error = new APIError('Server error', 500, 'Internal Server Error')

      ;(getBacktestComparison as Mock).mockRejectedValue(error)
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: 3, retryDelay: 0 } },
      })
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)
      const { result } = renderHook(() => useBacktestComparison('cmp-flake'), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 2000 })
      expect((getBacktestComparison as Mock).mock.calls.length).toBe(4)
    })

    it('useBacktestComparisons fetches list with default + custom paging + scoped key', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result: defaultResult } = renderHook(() => useBacktestComparisons(), { wrapper })

      await waitFor(() => expect(defaultResult.current.isSuccess).toBe(true))
      expect(getBacktestComparisons).toHaveBeenCalledWith(20, 0)
      expect(
        queryClient
          .getQueryCache()
          .find({ queryKey: ['backtest-compare', 'list', 'wallet-1', 20, 0] })
      ).toBeDefined()

      const { result: customResult } = renderHook(() => useBacktestComparisons(50, 100), {
        wrapper,
      })

      await waitFor(() => expect(customResult.current.isSuccess).toBe(true))
      expect(getBacktestComparisons).toHaveBeenCalledWith(50, 100)
      expect(
        queryClient
          .getQueryCache()
          .find({ queryKey: ['backtest-compare', 'list', 'wallet-1', 50, 100] })
      ).toBeDefined()
    })

    it('useCreateBacktestComparison passes BacktestCompareBody (not envelope) to apiClient', async () => {
      const { result } = renderHook(() => useCreateBacktestComparison(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate({
          mode: 'auto',
          config_hash: 'cfg-1',
          anchor_run_public_id: 'r1',
        })
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(createBacktestComparison).toHaveBeenCalledWith({
        mode: 'auto',
        config_hash: 'cfg-1',
        anchor_run_public_id: 'r1',
      })
    })

    it('useCreateBacktestComparison invalidates list cache scoped to current wallet on success', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useCreateBacktestComparison(), { wrapper })

      await act(async () => {
        result.current.mutate({
          mode: 'auto',
          config_hash: 'cfg-1',
          anchor_run_public_id: 'r1',
        })
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['backtest-compare', 'list', 'wallet-1'],
      })
    })
  })
  describe('AI integration hooks', () => {
    it('useFeatureFlags returns isEnabled=true when backend says ai_integration_enabled=true', async () => {
      vi.mocked(getFeatureFlags).mockResolvedValueOnce(
        envelope('feature_flags_response', {
          payload: { ai_integration_enabled: true },
        }) as never
      )
      const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isEnabled).toBe(true)
    })
    it('useFeatureFlags returns isEnabled=false on fetch error (fail-closed)', async () => {
      vi.mocked(getFeatureFlags).mockRejectedValueOnce(new Error('server down'))
      const { result } = renderHook(() => useFeatureFlags(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isEnabled).toBe(false)
    })
    it('useAiDelegates returns delegate list', async () => {
      vi.mocked(listAiDelegates).mockResolvedValueOnce(
        envelope('delegate_list', {
          payload: [
            {
              public_id: 'd-1',
              username: 'ai-alpha',
              label: 'Alpha',
              created_by_user_public_id: 'u-1',
              created_at: '2026-04-21T00:00:00Z',
              is_active: true,
              caps: {
                max_open_orders: 10,
                max_daily_notional_usd: 1000,
                max_cancels_per_minute: null,
                max_order_quantity_per_instrument: null,
              },
            },
          ],
          count: 1,
        }) as never
      )
      const { result } = renderHook(() => useAiDelegates(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.count).toBe(1)
      expect(result.current.data?.payload[0]?.label).toBe('Alpha')
    })
    it('useAiDelegate stays disabled when publicId is null', () => {
      const { result } = renderHook(() => useAiDelegate(null), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(getAiDelegate)).not.toHaveBeenCalled()
    })
    it('useAiDelegate fetches detail when publicId provided', async () => {
      vi.mocked(getAiDelegate).mockResolvedValueOnce(
        envelope('delegate_response', {
          payload: {
            public_id: 'd-1',
            username: 'ai-alpha',
            label: 'Alpha',
            created_by_user_public_id: 'u-1',
            created_at: '2026-04-21T00:00:00Z',
            is_active: true,
            caps: {
              max_open_orders: null,
              max_daily_notional_usd: null,
              max_cancels_per_minute: null,
              max_order_quantity_per_instrument: null,
            },
          },
        }) as never
      )
      const { result } = renderHook(() => useAiDelegate('d-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.payload.public_id).toBe('d-1')
      expect(vi.mocked(getAiDelegate)).toHaveBeenCalledWith('d-1')
    })
    it('useCreateAiDelegate invalidates ai-delegates list on success', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      vi.mocked(createAiDelegate).mockResolvedValueOnce(
        envelope('delegate_created_response', { payload: {} }) as never
      )
      const { result } = renderHook(() => useCreateAiDelegate(), { wrapper })

      await act(async () => {
        result.current.mutate({
          label: 'Alpha',
          caps: {
            max_open_orders: null,
            max_daily_notional_usd: null,
            max_cancels_per_minute: null,
            max_order_quantity_per_instrument: null,
          },
          operator_public_id: null,
        })
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates'] })
    })
    it('useUpdateAiDelegateCaps invalidates list + detail on success', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      vi.mocked(updateAiDelegateCaps).mockResolvedValueOnce(
        envelope('delegate_response', { payload: {} }) as never
      )
      const { result } = renderHook(() => useUpdateAiDelegateCaps(), { wrapper })

      await act(async () => {
        result.current.mutate({
          publicId: 'd-1',
          body: {
            caps: {
              max_open_orders: 10,
              max_daily_notional_usd: null,
              max_cancels_per_minute: null,
              max_order_quantity_per_instrument: null,
            },
          },
        })
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates', 'd-1'] })
    })
    it('useDeactivateAiDelegate invalidates list + detail on success', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      vi.mocked(deactivateAiDelegate).mockResolvedValueOnce(
        envelope('delegate_response', { payload: {} }) as never
      )
      const { result } = renderHook(() => useDeactivateAiDelegate(), { wrapper })

      await act(async () => {
        result.current.mutate('d-1')
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-delegates', 'd-1'] })
    })
  })
  describe('AI Reviews hooks', () => {
    it('usePendingAiReviews stays disabled when caller is not an AI delegate', async () => {
      vi.mocked(useAuth).mockReturnValueOnce({
        isAuthenticated: true,
        user: { role: 'operator', public_id: 'user-op-1' },
      } as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listPendingAiReviews)).not.toHaveBeenCalled()
    })
    it('usePendingAiReviews stays disabled when no user is authenticated', () => {
      vi.mocked(useAuth).mockReturnValueOnce({
        isAuthenticated: true,
        user: null,
      } as unknown as ReturnType<typeof useAuth>)
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      expect(result.current.isPending).toBe(true)
      expect(vi.mocked(listPendingAiReviews)).not.toHaveBeenCalled()
    })
    it('usePendingAiReviews fetches when caller is ai_delegate', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      vi.mocked(listPendingAiReviews).mockResolvedValueOnce({
        items: [
          {
            review_public_id: 'r-1',
            selected_delegate_public_id: 'del-1',
            wallet_public_id: 'wal-1',
            dispatch_version: 0,
            status: 'pending',
            deadline: '2026-04-27T10:05:00Z',
            fanout_after: '2026-04-27T10:00:00Z',
          },
        ],
        count: 1,
      })
      const { result } = renderHook(() => usePendingAiReviews(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.count).toBe(1)
      expect(vi.mocked(listPendingAiReviews)).toHaveBeenCalledWith({
        wallet_public_id: undefined,
        limit: undefined,
      })
    })
    it('usePendingAiReviews threads walletPublicId + limit through to apiClient', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      vi.mocked(listPendingAiReviews).mockResolvedValueOnce({ items: [], count: 0 })
      renderHook(() => usePendingAiReviews({ walletPublicId: 'wal-99', limit: 25 }), {
        wrapper: createWrapper(),
      })

      await waitFor(() =>
        expect(vi.mocked(listPendingAiReviews)).toHaveBeenCalledWith({
          wallet_public_id: 'wal-99',
          limit: 25,
        })
      )
    })
    it('useSubmitAiReviewDecision posts decision via apiClient + invalidates pending list on success', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      vi.mocked(submitAiReviewDecision).mockResolvedValueOnce({
        success: true,
        error_code: null,
        message: 'recorded',
        details: {},
      } as never)
      const { queryClient, wrapper } = createWrapperWithClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useSubmitAiReviewDecision(), { wrapper })

      result.current.mutate({
        reviewPublicId: 'rev-9',
        decision: 'approve',
        rationale: 'looks tight',
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(vi.mocked(submitAiReviewDecision)).toHaveBeenCalledWith(
        'rev-9',
        'approve',
        'looks tight'
      )
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ai-reviews', 'pending'] })
    })
    it('useAiReviewActivity returns empty array when cache is empty', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      expect(result.current).toEqual([])
    })
    it('useAiReviewActivity reflects buffer entries written by the dispatcher', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const frame = {
        type: 'ai_review.request',
        sequence_id: 1,
        public_id: 'p-1',
        timestamp: '2026-04-27T10:00:00Z',
        session_id: 's-1',
        review_public_id: 'r-1',
        user_public_id: 'u-1',
        strategy_public_id: 'st-1',
        wallet_public_id: 'w-1',
        instrument_public_id: 'i-1',
        selected_delegate_public_id: 'd-1',
        deadline: '2026-04-27T10:05:00Z',
        signal_envelope: {},
        instrument_metadata: {},
        dispatch_version: 0,
      } as unknown as AiReviewActivityFrame
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(aiReviewActivityQueryKey('user-del-1') as unknown as string[], [
          frame,
        ])
      })
      await waitFor(() => {
        expect(result.current).toHaveLength(1)
      })
      expect(result.current[0]?.review_public_id).toBe('r-1')
    })
    it('useAiReviewActivity ignores unrelated query cache events', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(['some-other-queue'], [{ irrelevant: true }])
      })
      expect(result.current).toEqual([])
    })
    it('useAiReviewActivity falls back to the null user-key when no user is authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as unknown as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const frame = {
        type: 'ai_review.request',
        review_public_id: 'r-orphan',
        dispatch_version: 0,
      } as unknown as AiReviewActivityFrame
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(aiReviewActivityQueryKey(null) as unknown as string[], [frame])
      })
      await waitFor(() => {
        expect(result.current).toHaveLength(1)
      })
      expect(result.current[0]?.review_public_id).toBe('r-orphan')
    })
    it('useAiReviewActivity ignores cache events for a different user public_id', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { role: 'ai_delegate', public_id: 'user-del-1' },
      } as ReturnType<typeof useAuth>)
      const { queryClient, wrapper } = createWrapperWithClient()
      const { result } = renderHook(() => useAiReviewActivity(), { wrapper })

      await act(async () => {
        queryClient.setQueryData(aiReviewActivityQueryKey('user-other') as unknown as string[], [
          { type: 'ai_review.request', review_public_id: 'r-other', dispatch_version: 0 },
        ])
      })
      expect(result.current).toEqual([])
    })
  })
})
