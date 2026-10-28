import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { QueryObserver } from '@tanstack/react-query'
import { useAppStore } from './app'
import { queryClient } from '../lib/queryClient'

describe('returning from historical P&L to Live', () => {
  it.each([
    { name: 'backtests', unscopedKey: ['backtests', 'time-travel-return-regression'] },
    { name: 'other portfolio reads', unscopedKey: ['portfolio', 'accounts', 'return-regression'] },
    { name: 'unscoped comparisons', unscopedKey: ['backtest-compare', 'return-regression'] },
    { name: 'legacy null filters', unscopedKey: ['backtests', null] },
    { name: 'legacy object filters', unscopedKey: ['backtests', { legacyFilter: true }] },
  ])('refreshes Live and $name without refetching historical P&L', async ({ unscopedKey }) => {
    const cut = '2026-10-28T17:33:00Z'
    const historicalKey = ['portfolio', 'pnl', 'timeline', { asOf: cut }] as const
    const liveKey = ['portfolio', 'pnl', 'timeline', { asOf: null }] as const
    const readHistorical = vi.fn(async () => ({ horizon: cut }))
    const readLive = vi.fn(async () => ({ horizon: 'live' }))
    const readUnscoped = vi.fn(async () => ({ runs: [] }))
    const historicalObserver = new QueryObserver(queryClient, {
      queryKey: historicalKey,
      queryFn: readHistorical,
    })
    const unscopedObserver = new QueryObserver(queryClient, {
      queryKey: unscopedKey,
      queryFn: readUnscoped,
    })
    const historicalUnsubscribe = historicalObserver.subscribe(() => undefined)
    const unscopedUnsubscribe = unscopedObserver.subscribe(() => undefined)
    let liveUnsubscribe = (): void => undefined

    try {
      await waitFor(() => expect(historicalObserver.getCurrentResult().isSuccess).toBe(true))
      await waitFor(() => expect(unscopedObserver.getCurrentResult().isSuccess).toBe(true))
      queryClient.setQueryData(liveKey, { horizon: 'cached-live' })
      useAppStore.getState().setAsOf(cut)
      useAppStore.getState().clearAsOf()

      expect(readHistorical).toHaveBeenCalledTimes(1)
      expect(queryClient.getQueryState(historicalKey)?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(liveKey)?.isInvalidated).toBe(true)

      const liveObserver = new QueryObserver(queryClient, {
        queryKey: liveKey,
        queryFn: readLive,
      })

      liveUnsubscribe = liveObserver.subscribe(() => undefined)
      await waitFor(() => expect(liveObserver.getCurrentResult().data).toEqual({ horizon: 'live' }))
      await waitFor(() => expect(readUnscoped).toHaveBeenCalledTimes(2))
      expect(readLive).toHaveBeenCalledTimes(1)
      expect(readHistorical).toHaveBeenCalledTimes(1)
      expect(useAppStore.getState().asOf).toBeNull()
    } finally {
      historicalUnsubscribe()
      unscopedUnsubscribe()
      liveUnsubscribe()
      queryClient.removeQueries({ queryKey: historicalKey, exact: true })
      queryClient.removeQueries({ queryKey: liveKey, exact: true })
      queryClient.removeQueries({ queryKey: unscopedKey, exact: true })
      useAppStore.setState({ asOf: null, isTimeTraveling: false })
    }
  })

  it('invalidates cached Live series before synchronous scope subscribers select it', async () => {
    const cut = '2026-10-28T17:33:00Z'
    const historicalKey: readonly ['portfolio', 'pnl', 'series', { asOf: string | null }] = [
      'portfolio',
      'pnl',
      'series',
      { asOf: cut },
    ]
    const liveKey: typeof historicalKey = ['portfolio', 'pnl', 'series', { asOf: null }]
    const readHistorical = vi.fn(async () => ({ horizon: cut }))
    const readLive = vi.fn(async () => ({ horizon: 'live' }))

    useAppStore.getState().setAsOf(cut)
    queryClient.setQueryData(liveKey, { horizon: 'cached-live' })
    const observer = new QueryObserver(queryClient, {
      queryKey: historicalKey,
      queryFn: readHistorical,
      staleTime: 60_000,
    })
    const unsubscribeObserver = observer.subscribe(() => undefined)
    const unsubscribeStore = useAppStore.subscribe(state => {
      if (state.asOf === null) {
        observer.setOptions({ queryKey: liveKey, queryFn: readLive, staleTime: 60_000 })
      }
    })

    try {
      await waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true))
      useAppStore.getState().clearAsOf()
      await waitFor(() => expect(observer.getCurrentResult().data).toEqual({ horizon: 'live' }))
      expect(readLive).toHaveBeenCalledTimes(1)
      expect(readHistorical).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribeStore()
      unsubscribeObserver()
      queryClient.removeQueries({ queryKey: historicalKey, exact: true })
      queryClient.removeQueries({ queryKey: liveKey, exact: true })
      useAppStore.setState({ asOf: null, isTimeTraveling: false })
    }
  })
})
