import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { QueryObserver } from '@tanstack/react-query'
import { useAppStore } from './app'
import { useAuthStore } from './auth'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { queryKeys, type BacktestReadScope } from '../hooks/queries/keys'

describe('forced refresh of an unchanged read context', () => {
  it('refreshes matching scoped reads and preserves other historical or wallet caches', async () => {
    const scope: BacktestReadScope = {
      asOf: '2026-10-28T17:33:00Z',
      operatorPublicId: 'operator-a',
      walletPublicId: 'wallet-a',
    }
    const matchingKey = queryKeys.backtestsByStrategyStatus(undefined, undefined, scope)
    const otherScopes: readonly unknown[][] = [
      ['portfolio', 'pnl', 'series', { ...scope, asOf: '2026-10-28T16:33:00Z' }],
      ['portfolio', 'pnl', 'series', { ...scope, operatorPublicId: 'operator-b' }],
      ['portfolio', 'pnl', 'series', { ...scope, walletPublicId: 'wallet-b' }],
      ['portfolio', 'pnl', 'legacy'],
      ['portfolio', 'pnl', null],
    ]
    const readMatching = vi.fn(async () => ({ fresh: true }))
    const otherReads = otherScopes.map(key => ({
      key,
      read: vi.fn(async () => ({ historical: true })),
    }))
    const refresh = vi.spyOn(useAuthStore.getState(), 'refreshToken').mockResolvedValue(undefined)

    apiClient.setTimeTravelAsOf(scope.asOf)
    apiClient.setOperatorScope(scope.operatorPublicId)
    apiClient.setWalletScope(scope.walletPublicId)
    useAppStore.setState({
      asOf: scope.asOf,
      isTimeTraveling: true,
      currentOperatorPublicId: scope.operatorPublicId,
      currentWalletPublicId: scope.walletPublicId,
    })
    const matching = new QueryObserver(queryClient, {
      queryKey: matchingKey,
      queryFn: readMatching,
      staleTime: 60_000,
    })
    const others = otherReads.map(
      ({ key, read }) =>
        new QueryObserver(queryClient, {
          queryKey: key,
          queryFn: read,
          staleTime: 60_000,
        })
    )
    const unsubscribe = [
      matching.subscribe(() => undefined),
      ...others.map(observer => observer.subscribe(() => undefined)),
    ]

    try {
      await waitFor(() => expect(matching.getCurrentResult().isSuccess).toBe(true))
      await waitFor(() =>
        expect(others.every(observer => observer.getCurrentResult().isSuccess)).toBe(true)
      )
      expect(readMatching).toHaveBeenCalledTimes(1)
      await useAppStore
        .getState()
        .selectScopeAndRefresh(
          { asOf: scope.asOf, operator: scope.operatorPublicId, wallet: scope.walletPublicId },
          true
        )
      await waitFor(() => expect(readMatching).toHaveBeenCalledTimes(2))
      expect(refresh).toHaveBeenCalledTimes(1)
      otherReads.forEach(({ read }) => expect(read).toHaveBeenCalledTimes(1))
    } finally {
      unsubscribe.forEach(stop => stop())
      queryClient.removeQueries({ queryKey: matchingKey, exact: true })
      otherScopes.forEach(key => queryClient.removeQueries({ queryKey: key, exact: true }))
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
  })
})
