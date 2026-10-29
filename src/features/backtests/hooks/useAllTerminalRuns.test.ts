import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useAllTerminalRuns } from './useAllTerminalRuns'
import { getBacktests } from '../../../lib/api/backtests'
import { useAppStore } from '../../../stores/app'
import { apiClient } from '../../../lib/apiClient'
import { queryClient as sharedQueryClient } from '../../../lib/queryClient'
import { queryKeys, type BacktestReadScope } from '../../../hooks/queries/keys'
import type { BacktestRunData, BacktestRunListResponse } from '../../../types/api'

vi.mock('../../../lib/api/backtests', () => ({
  getBacktests: vi.fn(),
}))

const makeRun = (publicId: string, ts: string): BacktestRunData => ({
  type: 'backtest_run',
  sequence_id: 1,
  public_id: publicId,
  timestamp: ts,
  session_id: 's1',
  wallet_public_id: 'w-1',
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
})

const scope: BacktestReadScope = {
  asOf: null,
  operatorPublicId: 'operator-1',
  walletPublicId: 'wallet-1',
}
const cut = '2026-10-28T17:33:00Z'
const response = (payload: BacktestRunData[]): BacktestRunListResponse => ({
  type: 'backtest_run_list',
  sequence_id: 1,
  public_id: 'response',
  timestamp: '2026-10-28T22:00:00Z',
  session_id: 'session',
  payload,
  count: payload.length,
})

const renderWithClient = (
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
) => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, wrapper }
}

describe('useAllTerminalRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      asOf: null,
      isTimeTraveling: false,
      currentOperatorPublicId: scope.operatorPublicId,
      currentWalletPublicId: scope.walletPublicId,
    })
    apiClient.setTimeTravelAsOf(null)
    apiClient.setOperatorScope(scope.operatorPublicId)
    apiClient.setWalletScope(scope.walletPublicId)
  })
  afterEach(() => {
    useAppStore.setState({
      asOf: null,
      isTimeTraveling: false,
      currentOperatorPublicId: null,
      currentWalletPublicId: null,
    })
    apiClient.setTimeTravelAsOf(null)
    apiClient.setOperatorScope(null)
    apiClient.setWalletScope(null)
  })

  it('fires three parallel typed queries (completed/failed/cancelled) merged + sorted desc', async () => {
    const mock = getBacktests as ReturnType<typeof vi.fn>

    mock.mockImplementation((_l: number, _o: number, _s, status: string) => {
      if (status === 'completed') {
        return Promise.resolve({
          type: 'backtest_run_list',
          payload: [makeRun('r-completed', '2026-03-01T00:00:00Z')],
          count: 1,
        })
      }

      if (status === 'failed') {
        return Promise.resolve({
          type: 'backtest_run_list',
          payload: [makeRun('r-failed', '2026-03-03T00:00:00Z')],
          count: 1,
        })
      }

      if (status === 'cancelled') {
        return Promise.resolve({
          type: 'backtest_run_list',
          payload: [makeRun('r-cancelled', '2026-03-02T00:00:00Z')],
          count: 1,
        })
      }

      return Promise.resolve({ type: 'backtest_run_list', payload: [], count: 0 })
    })
    const { wrapper } = renderWithClient()
    const { result } = renderHook(() => useAllTerminalRuns({ enabled: true }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mock).toHaveBeenCalledTimes(3)
    expect(mock).toHaveBeenCalledWith(50, 0, undefined, 'completed')
    expect(mock).toHaveBeenCalledWith(50, 0, undefined, 'failed')
    expect(mock).toHaveBeenCalledWith(50, 0, undefined, 'cancelled')
    expect(result.current.data?.map(r => r.public_id)).toEqual([
      'r-failed',
      'r-cancelled',
      'r-completed',
    ])
  })

  it('is idle when enabled is false', () => {
    const { wrapper } = renderWithClient()
    const { result } = renderHook(() => useAllTerminalRuns({ enabled: false }), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getBacktests).not.toHaveBeenCalled()
  })

  it('handles empty payloads gracefully (defensive .payload ?? [])', async () => {
    ;(getBacktests as ReturnType<typeof vi.fn>).mockResolvedValue({
      type: 'backtest_run_list',
      payload: undefined,
      count: 0,
    })
    const { wrapper } = renderWithClient()
    const { result } = renderHook(() => useAllTerminalRuns({ enabled: true }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('scopes the query key by walletId', async () => {
    ;(getBacktests as ReturnType<typeof vi.fn>).mockResolvedValue({
      type: 'backtest_run_list',
      payload: [],
      count: 0,
    })
    const { queryClient, wrapper } = renderWithClient()

    renderHook(() => useAllTerminalRuns({ enabled: true }), { wrapper })
    await waitFor(() =>
      expect(
        queryClient.getQueryCache().find({
          queryKey: queryKeys.backtestsAllTerminal('wallet-1', scope),
        })
      ).toBeDefined()
    )
  })

  it.each([
    { name: 'time', patch: { asOf: cut } },
    { name: 'operator', patch: { currentOperatorPublicId: 'operator-2' } },
    { name: 'wallet', patch: { currentWalletPublicId: 'wallet-2' } },
  ])('refetches all three status slices when $name changes', async ({ patch }) => {
    vi.mocked(getBacktests).mockResolvedValue(response([]))
    const { queryClient, wrapper } = renderWithClient()
    const { result } = renderHook(() => useAllTerminalRuns({ enabled: true }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getBacktests).toHaveBeenCalledTimes(3)

    act(() => useAppStore.setState(patch))

    await waitFor(() => expect(getBacktests).toHaveBeenCalledTimes(6))
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2)
  })

  it('keeps delayed parallel responses isolated from the new historical scope', async () => {
    const pending = new Map<string, (value: BacktestRunListResponse) => void>()
    const acquisitions: { asOf: string | null; status: string | undefined }[] = []

    vi.mocked(getBacktests).mockImplementation((_limit, _offset, _strategy, status) => {
      const asOf = apiClient.getTimeTravelAsOf()

      acquisitions.push({ asOf, status })

      if (asOf === null) {
        return new Promise<BacktestRunListResponse>(resolve => {
          pending.set(status ?? '', resolve)
        })
      }

      return Promise.resolve(response([makeRun(`historical-${status}`, '2026-10-28T17:00:00Z')]))
    })
    const { queryClient, wrapper } = renderWithClient()
    const { result } = renderHook(() => useAllTerminalRuns({ enabled: true }), { wrapper })

    await waitFor(() => expect(pending.size).toBe(3))

    act(() => useAppStore.getState().setAsOf(cut))

    const historicalIds = ['historical-completed', 'historical-failed', 'historical-cancelled']

    await waitFor(() =>
      expect(result.current.data?.map(row => row.public_id)).toEqual(historicalIds)
    )
    await act(async () => {
      for (const [status, resolve] of pending) {
        resolve(response([makeRun(`old-${status}`, '2026-10-28T22:00:00Z')]))
      }

      await Promise.resolve()
    })
    await waitFor(() =>
      expect(
        queryClient.getQueryData<BacktestRunData[]>(
          queryKeys.backtestsAllTerminal('wallet-1', scope)
        )
      ).toHaveLength(3)
    )
    expect(result.current.data?.map(row => row.public_id)).toEqual(historicalIds)
    expect(getBacktests).toHaveBeenCalledTimes(6)
    expect(acquisitions).toEqual([
      ...['completed', 'failed', 'cancelled'].map(status => ({ asOf: null, status })),
      ...['completed', 'failed', 'cancelled'].map(status => ({ asOf: cut, status })),
    ])
  })

  it('does not eagerly refetch the retained old terminal cache in the new wallet context', async () => {
    vi.mocked(getBacktests).mockResolvedValue(
      response([makeRun('original-wallet', '2026-10-28T17:00:00Z')])
    )
    const { wrapper } = renderWithClient(sharedQueryClient)
    const { result, unmount } = renderHook(() => useAllTerminalRuns({ enabled: true }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const oldQuery = sharedQueryClient
      .getQueryCache()
      .findAll({ queryKey: ['backtests', 'all-terminal'] })[0]

    if (oldQuery === undefined) throw new Error('Expected the terminal query to be mounted')
    const oldData = oldQuery.state.data
    const readOld = vi.fn(async () => [makeRun('wrong-wallet', '2026-10-28T22:00:00Z')])
    const retained = new QueryObserver(sharedQueryClient, {
      queryKey: oldQuery.queryKey,
      queryFn: readOld,
      staleTime: Infinity,
    })
    const stopRetained = retained.subscribe(() => undefined)

    try {
      vi.mocked(getBacktests).mockResolvedValue(
        response([makeRun('selected-wallet', '2026-10-28T22:00:00Z')])
      )
      act(() => useAppStore.getState().setCurrentWalletPublicId('wallet-2'))
      await waitFor(() =>
        expect(result.current.data?.every(row => row.public_id === 'selected-wallet')).toBe(true)
      )
      expect(readOld).not.toHaveBeenCalled()
      expect(sharedQueryClient.getQueryData(oldQuery.queryKey)).toEqual(oldData)
    } finally {
      stopRetained()
      unmount()
      sharedQueryClient.removeQueries({ queryKey: ['backtests', 'all-terminal'] })
    }
  })

  it('preserves the old terminal prefix and existing mutation invalidation', async () => {
    const { queryClient } = renderWithClient()
    const liveKey = queryKeys.backtestsAllTerminal('wallet-1', scope)
    const historicalKey = queryKeys.backtestsAllTerminal('wallet-1', { ...scope, asOf: cut })

    queryClient.setQueryData(liveKey, [])
    queryClient.setQueryData(historicalKey, [])
    queryClient.setQueryData(['unrelated'], [])

    await queryClient.invalidateQueries({ queryKey: queryKeys.backtestsAll, refetchType: 'none' })

    expect(queryKeys.backtestsAllTerminal('wallet-1')).toEqual([
      'backtests',
      'all-terminal',
      'wallet-1',
    ])
    expect(liveKey).toEqual(['backtests', 'all-terminal', 'wallet-1', scope])
    expect(queryClient.getQueryState(liveKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(historicalKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['unrelated'])?.isInvalidated).toBe(false)
  })

  it('keeps an explicitly enabled null-wallet read enabled', async () => {
    useAppStore.setState({ currentWalletPublicId: null })
    vi.mocked(getBacktests).mockResolvedValue(response([]))
    const { wrapper } = renderWithClient()
    const { result } = renderHook(() => useAllTerminalRuns({ enabled: true }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getBacktests).toHaveBeenCalledTimes(3)
  })
})
