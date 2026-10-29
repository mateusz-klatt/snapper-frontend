import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useBacktest,
  useBacktestComparison,
  useBacktestComparisons,
  useBacktestRunsByConfigHash,
  useBacktestSignals,
  useBacktestTrades,
  useBacktests,
} from './backtests'
import { queryKeys, type BacktestReadScope } from './keys'
import {
  getBacktest,
  getBacktestComparison,
  getBacktestComparisons,
  getBacktestSignals,
  getBacktestTrades,
  getBacktests,
} from '../../lib/api/backtests'
import { APIError } from '../../lib/api/error'
import { apiClient } from '../../lib/apiClient'
import { useAppStore } from '../../stores/app'
import type { BacktestRunListResponse } from '../../types/api'

vi.mock('../../lib/api/backtests', () => ({
  getBacktests: vi.fn(async () => ({ session_id: 'initial', payload: [], count: 0 })),
  getBacktest: vi.fn(async () => ({ session_id: 'initial', payload: {} })),
  getBacktestTrades: vi.fn(async () => ({ session_id: 'initial', payload: [], count: 0 })),
  getBacktestSignals: vi.fn(async () => ({ session_id: 'initial', payload: [], count: 0 })),
  getBacktestComparison: vi.fn(async () => ({ session_id: 'initial', payload: {} })),
  getBacktestComparisons: vi.fn(async () => ({ session_id: 'initial', payload: [], count: 0 })),
  getBacktestStrategyClasses: vi.fn(),
  createBacktest: vi.fn(),
  createBacktestComparison: vi.fn(),
  cancelBacktest: vi.fn(),
  rerunBacktest: vi.fn(),
}))

const cut = '2026-10-28T17:33:00Z'
const baseScope: BacktestReadScope = {
  asOf: null,
  operatorPublicId: 'operator-a',
  walletPublicId: 'wallet-a',
}

const listResponse = (sessionId: string): BacktestRunListResponse => ({
  type: 'backtest_run_list',
  public_id: `response-${sessionId}`,
  sequence_id: 1,
  session_id: sessionId,
  timestamp: '2026-10-28T22:00:00Z',
  payload: [],
  count: 0,
})

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, wrapper }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getBacktests).mockResolvedValue(listResponse('initial'))
  useAppStore.setState({
    asOf: null,
    isTimeTraveling: false,
    currentOperatorPublicId: 'operator-a',
    currentWalletPublicId: 'wallet-a',
  })
})

afterEach(() => {
  apiClient.setTimeTravelAsOf(null)
  useAppStore.setState({
    asOf: null,
    isTimeTraveling: false,
    currentOperatorPublicId: null,
    currentWalletPublicId: null,
  })
})

describe('Backtests read scope', () => {
  it('does not reuse an old unscoped list cache for the selected read scope', async () => {
    const { queryClient, wrapper } = setup()

    queryClient.setQueryData(
      queryKeys.backtestsByStrategyStatus(undefined, undefined),
      listResponse('old-unscoped')
    )
    const { result } = renderHook(() => useBacktests(), { wrapper })

    await waitFor(() => expect(result.current.data?.session_id).toBe('initial'))
    expect(getBacktests).toHaveBeenCalledTimes(1)
  })

  it('requests historical list data when the visible time-travel scope changes', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useBacktests(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    vi.mocked(getBacktests).mockResolvedValue(listResponse('historical'))

    act(() => useAppStore.getState().setAsOf(cut))

    await waitFor(() => expect(getBacktests).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.data?.session_id).toBe('historical'))
    expect(apiClient.getTimeTravelAsOf()).toBe(cut)
    expect(getBacktests).toHaveBeenLastCalledWith(50, 0, undefined, undefined)
  })

  const readers = [
    { name: 'list', useRead: () => useBacktests(), read: getBacktests },
    {
      name: 'by config',
      useRead: () => useBacktestRunsByConfigHash('config-a'),
      read: getBacktests,
    },
    { name: 'detail', useRead: () => useBacktest('run-a'), read: getBacktest },
    { name: 'trades', useRead: () => useBacktestTrades('run-a'), read: getBacktestTrades },
    { name: 'signals', useRead: () => useBacktestSignals('run-a'), read: getBacktestSignals },
    {
      name: 'comparison',
      useRead: () => useBacktestComparison('comparison-a'),
      read: getBacktestComparison,
    },
    {
      name: 'comparison list',
      useRead: () => useBacktestComparisons(),
      read: getBacktestComparisons,
    },
  ]
  const changes = [
    { name: 'time', patch: { asOf: cut } },
    { name: 'operator', patch: { currentOperatorPublicId: 'operator-b' } },
    { name: 'wallet', patch: { currentWalletPublicId: 'wallet-b' } },
  ]

  describe.each(readers)('$name', ({ useRead, read }) => {
    it.each(changes)(
      'isolates a changed $name scope even with a fresh cache',
      async ({ patch }) => {
        const { queryClient, wrapper } = setup()
        const { result } = renderHook(() => useRead(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(read).toHaveBeenCalledTimes(1)
        const beforeKey = queryClient.getQueryCache().getAll()[0]?.queryKey

        act(() => useAppStore.setState(patch))

        await waitFor(() => expect(read).toHaveBeenCalledTimes(2))
        expect(queryClient.getQueryCache().getAll()).toHaveLength(2)
        expect(queryClient.getQueryCache().getAll()[1]?.queryKey).not.toEqual(beforeKey)
      }
    )
  })

  it('keeps a delayed old-scope response out of the current historical view', async () => {
    let resolveOld!: (value: BacktestRunListResponse) => void
    const oldResponse = new Promise<BacktestRunListResponse>(resolve => {
      resolveOld = resolve
    })

    vi.mocked(getBacktests)
      .mockReturnValueOnce(oldResponse)
      .mockResolvedValue(listResponse('historical'))
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useBacktests(), { wrapper })

    await waitFor(() => expect(getBacktests).toHaveBeenCalledTimes(1))

    act(() => useAppStore.getState().setAsOf(cut))
    await waitFor(() => expect(result.current.data?.session_id).toBe('historical'))
    await act(async () => {
      resolveOld(listResponse('old-live'))
      await oldResponse
    })

    expect(result.current.data?.session_id).toBe('historical')
    expect(
      queryClient.getQueryData(queryKeys.backtestsByStrategyStatus(undefined, undefined, baseScope))
    ).toEqual(listResponse('old-live'))
    expect(
      queryClient.getQueryData(
        queryKeys.backtestsByStrategyStatus(undefined, undefined, { ...baseScope, asOf: cut })
      )
    ).toEqual(listResponse('historical'))
  })

  it('keeps the existing null-wallet read behavior', async () => {
    useAppStore.setState({ currentWalletPublicId: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useBacktests(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getBacktests).toHaveBeenCalledTimes(1)
  })

  it('preserves a null-wallet endpoint rejection instead of silently disabling the read', async () => {
    const error = new APIError('A single wallet must be selected', 400, 'Bad Request')

    vi.mocked(getBacktests).mockRejectedValueOnce(error)
    useAppStore.setState({ currentWalletPublicId: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useBacktests(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(getBacktests).toHaveBeenCalledTimes(1)
  })
})

describe('Backtests registry prefixes', () => {
  const keys = [
    {
      name: 'list',
      make: (scope?: BacktestReadScope) =>
        queryKeys.backtestsByStrategyStatus('sma', 'completed', scope),
      prefix: ['backtests', 'sma', 'completed'],
      invalidation: queryKeys.backtestsAll,
    },
    {
      name: 'by config',
      make: (scope?: BacktestReadScope) => queryKeys.backtestsByConfigHash('config-a', 20, scope),
      prefix: ['backtests', 'by-hash', 'config-a', 20],
      invalidation: queryKeys.backtestsAll,
    },
    {
      name: 'detail',
      make: (scope?: BacktestReadScope) => queryKeys.backtest('run-a', scope),
      prefix: ['backtests', 'run-a'],
      invalidation: queryKeys.backtestsAll,
    },
    {
      name: 'trades',
      make: (scope?: BacktestReadScope) => queryKeys.backtestTrades('run-a', scope),
      prefix: ['backtests', 'run-a', 'trades'],
      invalidation: queryKeys.backtestsAll,
    },
    {
      name: 'signals',
      make: (scope?: BacktestReadScope) => queryKeys.backtestSignals('run-a', scope),
      prefix: ['backtests', 'run-a', 'signals'],
      invalidation: queryKeys.backtestsAll,
    },
    {
      name: 'comparison',
      make: (scope?: BacktestReadScope) =>
        queryKeys.backtestCompare('wallet-a', 'comparison-a', scope),
      prefix: ['backtest-compare', 'wallet-a', 'comparison-a'],
      invalidation: queryKeys.backtestCompare('wallet-a', 'comparison-a'),
    },
    {
      name: 'comparison list',
      make: (scope?: BacktestReadScope) => queryKeys.backtestCompareList('wallet-a', 20, 0, scope),
      prefix: ['backtest-compare', 'list', 'wallet-a', 20, 0],
      invalidation: queryKeys.backtestCompareListForWallet('wallet-a'),
    },
  ]

  it.each(keys)(
    'preserves the $name prefix and appends the complete read scope',
    ({ make, prefix }) => {
      expect(make()).toEqual(prefix)
      expect(make(baseScope)).toEqual([...prefix, baseScope])
    }
  )

  it.each(keys)(
    'invalidates every derived $name time/operator scope through the existing prefix',
    async ({ make, invalidation }) => {
      const { queryClient } = setup()
      const historical = { ...baseScope, asOf: cut, operatorPublicId: 'operator-b' }

      queryClient.setQueryData(make(baseScope), { view: 'live' })
      queryClient.setQueryData(make(historical), { view: 'historical' })
      queryClient.setQueryData(['unrelated'], { view: 'other' })

      await queryClient.invalidateQueries({ queryKey: invalidation, refetchType: 'none' })

      expect(queryClient.getQueryState(make(baseScope))?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(make(historical))?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(['unrelated'])?.isInvalidated).toBe(false)
    }
  )
})
