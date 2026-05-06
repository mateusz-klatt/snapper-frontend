import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useBacktests,
  useBacktestRunsByConfigHash,
  useBacktest,
  useBacktestTrades,
  useBacktestSignals,
  useCreateBacktest,
  useBacktestComparison,
  useBacktestComparisons,
  useCreateBacktestComparison,
} from './backtests'
import { APIError } from '../../lib/api/error'
import {
  createBacktest,
  createBacktestComparison,
  getBacktest,
  getBacktestComparison,
  getBacktestComparisons,
  getBacktestSignals,
  getBacktestTrades,
  getBacktests,
} from '../../lib/api/backtests'

vi.mock('../../lib/api/backtests', () => ({
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

describe('backtests queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    let appStoreModule: typeof import('../../stores/app')

    beforeEach(async () => {
      appStoreModule = await import('../../stores/app')
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
})
