import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { QueryObserver } from '@tanstack/react-query'
import { useAppStore } from './app'
import { useAuthStore } from './auth'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { queryKeys, type BacktestReadScope } from '../hooks/queries/keys'

const cut = '2026-10-28T17:33:00Z'
const initial: BacktestReadScope = {
  asOf: cut,
  operatorPublicId: null,
  walletPublicId: 'wallet-a',
}

const transitions = [
  {
    name: 'return to Live',
    next: { ...initial, asOf: null },
    apply: () => useAppStore.getState().clearAsOf(),
  },
  {
    name: 'wallet setter',
    next: { ...initial, walletPublicId: 'wallet-b' },
    apply: () => useAppStore.getState().setCurrentWalletPublicId('wallet-b'),
  },
  {
    name: 'operator setter',
    next: { ...initial, operatorPublicId: 'operator-b', walletPublicId: null },
    apply: () => useAppStore.getState().setCurrentOperatorPublicId('operator-b'),
  },
  {
    name: 'wallet refresh',
    next: { ...initial, walletPublicId: 'wallet-b' },
    apply: () => useAppStore.getState().selectWalletAndRefresh('wallet-b'),
  },
  {
    name: 'atomic scope refresh',
    next: { asOf: null, operatorPublicId: 'operator-b', walletPublicId: 'wallet-b' },
    apply: () =>
      useAppStore
        .getState()
        .selectScopeAndRefresh({ asOf: null, operator: 'operator-b', wallet: 'wallet-b' }),
  },
  {
    name: 'operator-only URL change',
    next: { ...initial, operatorPublicId: 'operator-b' },
    apply: () =>
      useAppStore
        .getState()
        .selectScopeAndRefresh({ asOf: cut, operator: 'operator-b', wallet: 'wallet-a' }),
  },
  {
    name: 'horizon-only URL change',
    next: { ...initial, asOf: null },
    apply: () =>
      useAppStore
        .getState()
        .selectScopeAndRefresh({ asOf: null, operator: null, wallet: 'wallet-a' }),
  },
]

const transportContext = (): string =>
  JSON.stringify({
    asOf: apiClient.getTimeTravelAsOf(),
    operatorPublicId: apiClient.getOperatorScope(),
    walletPublicId: apiClient.getWalletScope(),
  })

describe.each(['list', 'comparison'] as const)('%s scoped read cache transitions', kind => {
  it.each(transitions)(
    '$name refreshes the selected cache without contaminating the previous key',
    async ({ next, apply }) => {
      const readKey = (scope: BacktestReadScope): readonly unknown[] =>
        kind === 'list'
          ? queryKeys.backtestsByStrategyStatus(undefined, undefined, scope)
          : queryKeys.backtestCompare(scope.walletPublicId, 'comparison-test', scope)
      const oldKey = readKey(initial)
      const nextKey = readKey(next)
      const readOld = vi.fn(async () => ({ context: transportContext() }))
      const readNext = vi.fn(async () => ({ context: transportContext() }))
      const refresh = vi.spyOn(useAuthStore.getState(), 'refreshToken').mockResolvedValue(undefined)

      apiClient.setTimeTravelAsOf(initial.asOf)
      apiClient.setOperatorScope(initial.operatorPublicId)
      apiClient.setWalletScope(initial.walletPublicId)
      useAppStore.setState({
        asOf: initial.asOf,
        isTimeTraveling: true,
        currentOperatorPublicId: initial.operatorPublicId,
        currentWalletPublicId: initial.walletPublicId,
      })
      queryClient.setQueryData(nextKey, { context: 'cached-target' })
      const retained = new QueryObserver(queryClient, {
        queryKey: oldKey,
        queryFn: readOld,
        staleTime: 60_000,
      })
      const changing = new QueryObserver(queryClient, {
        queryKey: oldKey,
        queryFn: readOld,
        staleTime: 60_000,
      })
      const unsubscribeRetained = retained.subscribe(() => undefined)
      const unsubscribeChanging = changing.subscribe(() => undefined)
      const unsubscribeStore = useAppStore.subscribe(state => {
        if (
          state.asOf === next.asOf &&
          state.currentOperatorPublicId === next.operatorPublicId &&
          state.currentWalletPublicId === next.walletPublicId
        ) {
          changing.setOptions({ queryKey: nextKey, queryFn: readNext, staleTime: 60_000 })
        }
      })

      try {
        await waitFor(() => expect(retained.getCurrentResult().isSuccess).toBe(true))
        expect(readOld).toHaveBeenCalledTimes(1)
        await apply()
        await waitFor(() =>
          expect(changing.getCurrentResult().data).toEqual({ context: JSON.stringify(next) })
        )
        expect(readNext).toHaveBeenCalledTimes(1)
        expect(readOld).toHaveBeenCalledTimes(1)
        expect(queryClient.getQueryData(oldKey)).toEqual({ context: JSON.stringify(initial) })
      } finally {
        unsubscribeStore()
        unsubscribeChanging()
        unsubscribeRetained()
        queryClient.removeQueries({ queryKey: oldKey, exact: true })
        queryClient.removeQueries({ queryKey: nextKey, exact: true })
        refresh.mockRestore()
        apiClient.setTimeTravelAsOf(null)
        apiClient.setOperatorScope(null)
        apiClient.setWalletScope(null)
        useAppStore.setState({
          asOf: null,
          isTimeTraveling: false,
          currentOperatorPublicId: null,
          currentWalletPublicId: null,
        })
      }
    }
  )
})
