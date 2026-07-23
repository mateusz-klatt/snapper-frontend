import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRoutes } from '../../../components/AppRoutes'
import {
  createBacktestComparison,
  getBacktest,
  getBacktestComparison,
  getBacktests,
} from '../../../lib/api/backtests'
import { apiClient } from '../../../lib/apiClient'
import { APIError } from '../../../lib/api/error'
import { useAppStore } from '../../../stores/app'
import type { BacktestRunData } from '../../../types/api'

vi.mock('../../../lib/api/backtests', () => ({
  getBacktests: vi.fn(),
  getBacktest: vi.fn(),
  getBacktestComparison: vi.fn(),
  createBacktestComparison: vi.fn(),
  cancelBacktest: vi.fn(),
  rerunBacktest: vi.fn(),
}))

vi.mock('../hooks/useBacktestProgressSubscription', () => ({
  useBacktestProgressSubscription: () => null,
}))

vi.mock('../../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { username: 'test', role: 'admin' },
    canAccess: () => true,
    hasPermission: () => true,
  })),
}))

vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn() })),
    remove: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: () => ({ fitContent: vi.fn() }),
  })),
  LineSeries: 'LineSeries',
}))

const RUN_A = '01948f94-1234-7abc-8def-aaaaaaaaaaaa'
const RUN_B = '01948f94-1234-7abc-8def-bbbbbbbbbbbb'
const CONFIG_HASH = 'a'.repeat(64)

const makeRun = (overrides: Partial<BacktestRunData> = {}): BacktestRunData =>
  ({
    type: 'backtest_run',
    sequence_id: 1,
    public_id: RUN_A,
    timestamp: '2026-03-01T00:00:00Z',
    session_id: 's1',
    wallet_public_id: 'wallet-1',
    strategy_name: 'sma',
    strategy_params: {},
    instrument_public_id: 'BTC-USD',
    exchange: 'kraken',
    timeframe: '1m',
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-06-01T00:00:00Z',
    initial_cash: 10000,
    status: 'completed',
    execution_mode: 'direct_db',
    fill_model: 'next_open',
    slippage_bps: 0,
    commission_bps: 0,
    config_hash: CONFIG_HASH,
    ...overrides,
  }) as BacktestRunData

const renderApp = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })

  return render(
    <QueryClientProvider client={qc}>
      <AppRoutes activeTab='backtests' />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(apiClient, 'setWalletScope')
  apiClient.setTimeTravelAsOf(null)
  apiClient.setOperatorScope(null)
  useAppStore.setState({ currentWalletPublicId: 'wallet-1' })
  globalThis.location.hash = '#backtests'
})

afterEach(() => {
  vi.restoreAllMocks()
  useAppStore.setState({ currentWalletPublicId: null })
  apiClient.setWalletScope(null)
  apiClient.setTimeTravelAsOf(null)
  apiClient.setOperatorScope(null)
  globalThis.location.hash = ''
})

describe('Compare flow integration', () => {
  it('list → detail → auto-pair → compare page', async () => {
    const runA = makeRun({ public_id: RUN_A })
    const runB = makeRun({ public_id: RUN_B, timestamp: '2026-02-15T00:00:00Z' })

    ;(getBacktests as ReturnType<typeof vi.fn>).mockImplementation(
      (_l: number, _o: number, _s, _status, hash?: string | null) => {
        if (hash === CONFIG_HASH) {
          return Promise.resolve({ type: 'backtest_run_list', payload: [runA, runB], count: 2 })
        }

        return Promise.resolve({ type: 'backtest_run_list', payload: [runA, runB], count: 2 })
      }
    )
    ;(getBacktest as ReturnType<typeof vi.fn>).mockResolvedValue({
      type: 'backtest_run_response',
      payload: runA,
    })
    ;(createBacktestComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      type: 'backtest_comparison_response',
      payload: { public_id: 'cmp-new' },
    })
    ;(getBacktestComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      type: 'backtest_comparison_detail_response',
      payload: {
        comparison: { public_id: 'cmp-new', pairing_mode: 'auto', config_hash: CONFIG_HASH },
        run_a: runA,
        run_b: runB,
        metrics_diff: [{ name: 'sharpe', run_a: 1, run_b: 1.5, delta: 0.5, pct: 0.5 }],
        equity_overlay: [{ point_time: '2026-01-01T00:00:00Z', equity_a: 100, equity_b: 110 }],
        trades_diff: [],
        signals_diff: [],
      },
    })

    renderApp()

    const anchor = await screen.findByTestId(`open-${RUN_A}`, undefined, { timeout: 5000 })

    expect(anchor.tagName).toBe('A')
    act(() => {
      globalThis.location.hash = `#backtests/${RUN_A}`
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    await waitFor(() => expect(getBacktest).toHaveBeenCalledWith(RUN_A))
    const autoPair = await screen.findByTestId('compare-auto-pair')

    fireEvent.click(autoPair)

    await waitFor(() =>
      expect(createBacktestComparison).toHaveBeenCalledWith({
        mode: 'auto',
        config_hash: CONFIG_HASH,
        anchor_run_public_id: RUN_A,
      })
    )
    expect(globalThis.location.hash).toBe('#backtests/compare/cmp-new')

    act(() => {
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(await screen.findByTestId('compare-page')).toBeDefined()
    expect(await screen.findByTestId('metrics-diff-table')).toBeDefined()
    expect(screen.getByTestId('equity-overlay-chart')).toBeDefined()
    expect(screen.getByTestId('trades-diff-list')).toBeDefined()
    expect(screen.getByTestId('signals-diff-list')).toBeDefined()
  })

  /**
   * Wallet switch re-fires the compare query via the wallet-scoped key.
   *
   * Mechanism: `setCurrentWalletPublicId` updates Zustand state and calls
   * `apiClient.setWalletScope(id)`. `useBacktestComparison` subscribes to
   * `currentWalletPublicId`; when it changes, the queryKey
   * `['backtest-compare', walletId, id]` changes → TanStack Query
   * registers a new query entry and fires it. The singleton
   * `queryClient.invalidate` inside the action is belt-and-suspenders for
   * non-wallet-keyed queries; compare hooks already scope by `walletId`,
   * so the key-change path alone proves wallet isolation. The test uses
   * a fresh `QueryClient` to pin the key-change behaviour
   * deterministically.
   */
  it('wallet switch re-fires compare query via wallet-scoped key + surfaces 404', async () => {
    ;(getBacktestComparison as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        type: 'backtest_comparison_detail_response',
        payload: {
          comparison: { public_id: 'cmp-1', pairing_mode: 'auto', config_hash: null },
          run_a: makeRun({ public_id: RUN_A }),
          run_b: makeRun({ public_id: RUN_B }),
          metrics_diff: [],
          equity_overlay: [],
          trades_diff: [],
          signals_diff: [],
        },
      })
      .mockRejectedValueOnce(new APIError('Comparison not found', 404, 'Not Found'))

    globalThis.location.hash = '#backtests/compare/cmp-1'
    renderApp()

    expect(await screen.findByTestId('compare-pairing-mode')).toBeDefined()
    expect(getBacktestComparison).toHaveBeenCalledTimes(1)

    act(() => {
      useAppStore.getState().setCurrentWalletPublicId('wallet-other')
    })

    await waitFor(() => expect(apiClient.setWalletScope).toHaveBeenCalledWith('wallet-other'))
    await waitFor(() => expect(getBacktestComparison).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Comparison not found in current wallet/i)).toBeDefined()
  })
})
