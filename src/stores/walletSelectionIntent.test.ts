import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getWalletSelectionIntentVersion, subscribeWalletSelectionIntent, useAppStore } from './app'
import { useAuthStore } from './auth'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'

const originalRefresh = useAuthStore.getState().refreshToken

const deferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolve!: () => void
  const promise = new Promise<void>(done => {
    resolve = done
  })

  return { promise, resolve }
}

describe('authoritative wallet selection intent observers', () => {
  beforeEach(() => {
    queryClient.clear()
    useAppStore.getState().setCurrentOperatorPublicId(null)
    useAppStore.getState().clearAsOf()
    useAppStore.getState().setCurrentWalletPublicId('w-main')
    useAuthStore.setState({ refreshToken: vi.fn().mockResolvedValue(undefined) })
  })

  afterEach(async () => {
    await useAppStore.getState().waitForWalletSelection()
    useAuthStore.setState({ refreshToken: originalRefresh })
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it.each([
    { outer: 'operator', newer: 'operator' },
    { outer: 'operator', newer: 'wallet' },
    { outer: 'wallet', newer: 'operator' },
    { outer: 'wallet', newer: 'wallet' },
  ] as const)(
    'keeps the newer synchronous $newer selection when the $outer setter observer reenters',
    ({ outer, newer }) => {
      const publishWallet = vi.spyOn(apiClient, 'setWalletScope')
      const publishOperator = vi.spyOn(apiClient, 'setOperatorScope')
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
      const committed: Array<[string | null, string | null]> = []
      let nested = false
      const unsubscribe = subscribeWalletSelectionIntent(() => {
        if (nested) return

        nested = true
        if (newer === 'operator') useAppStore.getState().setCurrentOperatorPublicId('o-new')
        else useAppStore.getState().setCurrentWalletPublicId('w-new')
      })
      const stopState = useAppStore.subscribe(state => {
        committed.push([state.currentOperatorPublicId, state.currentWalletPublicId])
      })

      try {
        if (outer === 'operator') useAppStore.getState().setCurrentOperatorPublicId('o-old')
        else useAppStore.getState().setCurrentWalletPublicId('w-old')

        const expectedOperator = newer === 'operator' ? 'o-new' : null
        const expectedWallet = newer === 'wallet' ? 'w-new' : null

        expect(committed).toEqual([[expectedOperator, expectedWallet]])
        expect(useAppStore.getState().currentOperatorPublicId).toBe(expectedOperator)
        expect(useAppStore.getState().currentWalletPublicId).toBe(expectedWallet)
        expect(apiClient.getOperatorScope()).toBe(expectedOperator)
        expect(apiClient.getWalletScope()).toBe(expectedWallet)
        expect(publishWallet).toHaveBeenCalledExactlyOnceWith(expectedWallet)
        expect(invalidate).toHaveBeenCalledTimes(2)

        if (newer === 'operator') {
          expect(publishOperator).toHaveBeenCalledExactlyOnceWith(expectedOperator)
        } else expect(publishOperator).not.toHaveBeenCalled()
      } finally {
        unsubscribe()
        stopState()
      }
    }
  )

  it.each([
    { outer: 'operator', newer: 'operator' },
    { outer: 'operator', newer: 'wallet' },
    { outer: 'wallet', newer: 'operator' },
    { outer: 'wallet', newer: 'wallet' },
  ] as const)(
    'keeps a newer $newer selection started by the $outer setter query invalidation',
    ({ outer, newer }) => {
      queryClient.setQueryData(['wallet-intent-reentrant-invalidation'], true)
      const refetch = vi.spyOn(queryClient, 'refetchQueries')
      const committed: Array<[string | null, string | null]> = []
      const beforeNested: Array<[string | null, string | null, string | null, string | null]> = []
      let nested = false
      const unsubscribe = queryClient.getQueryCache().subscribe(event => {
        if (event.type !== 'updated' || event.action.type !== 'invalidate' || nested) return

        nested = true
        beforeNested.push([
          useAppStore.getState().currentOperatorPublicId,
          useAppStore.getState().currentWalletPublicId,
          apiClient.getOperatorScope(),
          apiClient.getWalletScope(),
        ])
        if (newer === 'operator') useAppStore.getState().setCurrentOperatorPublicId('o-new')
        else useAppStore.getState().setCurrentWalletPublicId('w-new')
      })
      const stopState = useAppStore.subscribe(state => {
        committed.push([state.currentOperatorPublicId, state.currentWalletPublicId])
      })

      try {
        if (outer === 'operator') useAppStore.getState().setCurrentOperatorPublicId('o-old')
        else useAppStore.getState().setCurrentWalletPublicId('w-old')

        const expectedOperator = newer === 'operator' ? 'o-new' : null
        const expectedWallet = newer === 'wallet' ? 'w-new' : null

        expect(nested).toBe(true)
        expect(beforeNested).toEqual([[null, 'w-main', null, 'w-main']])
        expect(committed).toEqual([[expectedOperator, expectedWallet]])
        expect(useAppStore.getState().currentOperatorPublicId).toBe(expectedOperator)
        expect(useAppStore.getState().currentWalletPublicId).toBe(expectedWallet)
        expect(apiClient.getOperatorScope()).toBe(expectedOperator)
        expect(apiClient.getWalletScope()).toBe(expectedWallet)
        expect(refetch).toHaveBeenCalledTimes(1)
      } finally {
        unsubscribe()
        stopState()
      }
    }
  )

  it.each(['operator', 'wallet'] as const)(
    'keeps confirmed API and store scope when the %s query invalidation only reserves newer intent',
    setter => {
      queryClient.setQueryData(['wallet-intent-reserved-invalidation'], true)
      const publishWallet = vi.spyOn(apiClient, 'setWalletScope')
      const publishOperator = vi.spyOn(apiClient, 'setOperatorScope')
      const refetch = vi.spyOn(queryClient, 'refetchQueries')
      const publishState = vi.fn()
      let nested = false
      const unsubscribe = queryClient.getQueryCache().subscribe(event => {
        if (event.type !== 'updated' || event.action.type !== 'invalidate' || nested) return

        nested = true
        useAppStore.getState().reserveScopeSelection()
      })
      const stopState = useAppStore.subscribe(publishState)

      try {
        if (setter === 'operator') useAppStore.getState().setCurrentOperatorPublicId('o-old')
        else useAppStore.getState().setCurrentWalletPublicId('w-old')

        expect(nested).toBe(true)
        expect(publishWallet).not.toHaveBeenCalled()
        expect(publishOperator).not.toHaveBeenCalled()
        expect(publishState).not.toHaveBeenCalled()
        expect(refetch).not.toHaveBeenCalled()
        expect(apiClient.getOperatorScope()).toBeNull()
        expect(apiClient.getWalletScope()).toBe('w-main')
        expect(useAppStore.getState().currentOperatorPublicId).toBeNull()
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
      } finally {
        unsubscribe()
        stopState()
      }
    }
  )

  it.each(['operator', 'wallet'] as const)(
    'does not publish an obsolete synchronous %s selection after an observer reserves newer scope',
    setter => {
      const publishWallet = vi.spyOn(apiClient, 'setWalletScope')
      const publishOperator = vi.spyOn(apiClient, 'setOperatorScope')
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
      let nested = false
      const unsubscribe = subscribeWalletSelectionIntent(() => {
        if (nested) return

        nested = true
        useAppStore.getState().reserveScopeSelection()
      })

      try {
        if (setter === 'operator') useAppStore.getState().setCurrentOperatorPublicId('o-old')
        else useAppStore.getState().setCurrentWalletPublicId('w-old')

        expect(publishWallet).not.toHaveBeenCalled()
        expect(publishOperator).not.toHaveBeenCalled()
        expect(invalidate).not.toHaveBeenCalled()
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
        expect(useAppStore.getState().currentOperatorPublicId).toBeNull()
      } finally {
        unsubscribe()
      }
    }
  )

  it('observes all four real coordinator advances but not independent historical-time decisions', async () => {
    const seen: number[] = []
    const initial = getWalletSelectionIntentVersion()
    const pending = deferred()

    useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(pending.promise) })
    const unsubscribe = subscribeWalletSelectionIntent(version => {
      expect(getWalletSelectionIntentVersion()).toBe(version)
      seen.push(version)
    })

    try {
      useAppStore.getState().setCurrentOperatorPublicId('o-new')
      useAppStore.getState().setCurrentWalletPublicId('w-main')
      const selection = useAppStore.getState().selectWalletAndRefresh('w-paper')

      await Promise.resolve()
      useAppStore.getState().reserveScopeSelection()
      useAppStore.getState().setAsOf('2026-10-28T17:33:00Z')
      useAppStore.getState().clearAsOf()
      expect(seen).toEqual([initial + 1, initial + 2, initial + 3, initial + 4])
      pending.resolve()
      await selection
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
    } finally {
      unsubscribe()
      pending.resolve()
    }

    useAppStore.getState().reserveScopeSelection()
    expect(seen).toHaveLength(4)
  })

  it('isolates a throwing self-unsubscribing observer without interrupting the latest acknowledged selection', async () => {
    const pending = deferred()
    const refresh = vi.fn().mockReturnValueOnce(pending.promise)
    const good = vi.fn<(version: number) => void>()
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const stopBad: () => void = subscribeWalletSelectionIntent(() => {
      stopBad()
      throw new Error('observer failure')
    })
    const stopGood = subscribeWalletSelectionIntent(good)

    useAuthStore.setState({ refreshToken: refresh })
    const publish = vi.spyOn(apiClient, 'setWalletScope')

    try {
      const selection = useAppStore.getState().selectWalletAndRefresh('w-paper')

      await Promise.resolve()
      expect(refresh).toHaveBeenCalledExactlyOnceWith({ walletId: 'w-paper' })
      expect(good).toHaveBeenCalledExactlyOnceWith(getWalletSelectionIntentVersion())
      expect(error).toHaveBeenCalledExactlyOnceWith('Wallet selection intent listener failed')
      expect(publish).not.toHaveBeenCalled()
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
      pending.resolve()
      await selection
      expect(publish).toHaveBeenCalledExactlyOnceWith('w-paper')
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    } finally {
      stopBad()
      stopGood()
      pending.resolve()
    }
  })

  it('honours removal during notification without dropping a later active observer or the acknowledgement', async () => {
    const removed = vi.fn<(version: number) => void>()
    const retained = vi.fn<(version: number) => void>()
    const stopFirst = subscribeWalletSelectionIntent(() => stopRemoved())

    const stopRemoved = subscribeWalletSelectionIntent(removed)
    const stopRetained = subscribeWalletSelectionIntent(retained)

    try {
      await useAppStore.getState().selectWalletAndRefresh('w-paper')
      expect(removed).not.toHaveBeenCalled()
      expect(retained).toHaveBeenCalledExactlyOnceWith(getWalletSelectionIntentVersion())
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    } finally {
      stopFirst()
      stopRemoved()
      stopRetained()
    }
  })

  it('cannot publish an older wallet when an observer synchronously reserves a newer authoritative intent', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    let nested = false
    const unsubscribe = subscribeWalletSelectionIntent(() => {
      if (nested) return

      nested = true
      useAppStore.getState().reserveScopeSelection()
    })

    useAuthStore.setState({ refreshToken: refresh })
    const publish = vi.spyOn(apiClient, 'setWalletScope')

    try {
      await useAppStore.getState().selectWalletAndRefresh('w-paper')
      expect(refresh).not.toHaveBeenCalled()
      expect(publish).not.toHaveBeenCalled()
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
    } finally {
      unsubscribe()
    }
  })

  it('cannot accept an older atomic scope when its reservation observer reserves a newer scope', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    let nested = false
    const unsubscribe = subscribeWalletSelectionIntent(() => {
      if (nested) return

      nested = true
      useAppStore.getState().reserveScopeSelection()
    })

    useAuthStore.setState({ refreshToken: refresh })
    const publish = vi.spyOn(apiClient, 'setWalletScope')

    try {
      const accepted = await useAppStore.getState().selectScopeAndRefresh({
        wallet: 'w-old',
        operator: 'o-old',
        asOf: '2026-10-28T17:33:00Z',
      })

      expect(accepted).toBe(false)
      expect(refresh).not.toHaveBeenCalled()
      expect(publish).not.toHaveBeenCalled()
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
      expect(useAppStore.getState().currentOperatorPublicId).toBeNull()
      expect(useAppStore.getState().asOf).toBeNull()
    } finally {
      unsubscribe()
    }
  })

  it('publishes only the newer reentrant atomic selection after its own acknowledgement', async () => {
    const pending = deferred()
    const refresh = vi.fn().mockReturnValueOnce(pending.promise)
    const committed: Array<[string | null, string | null, string | null]> = []
    let nested = false
    let newer!: Promise<boolean>
    const unsubscribe = subscribeWalletSelectionIntent(() => {
      if (nested) return

      nested = true
      newer = useAppStore.getState().selectScopeAndRefresh({
        wallet: 'w-new',
        operator: 'o-new',
        asOf: '2026-10-27T12:00:00Z',
      })
    })
    const stopState = useAppStore.subscribe(state => {
      committed.push([state.currentWalletPublicId, state.currentOperatorPublicId, state.asOf])
    })

    useAuthStore.setState({ refreshToken: refresh })
    const publish = vi.spyOn(apiClient, 'setWalletScope')

    try {
      const older = useAppStore.getState().selectScopeAndRefresh({
        wallet: 'w-old',
        operator: 'o-old',
        asOf: '2026-10-28T17:33:00Z',
      })

      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
      expect(refresh).toHaveBeenCalledExactlyOnceWith({ walletId: 'w-new' })
      expect(committed).toEqual([])
      expect(publish).not.toHaveBeenCalled()
      expect(apiClient.getWalletScope()).toBe('w-main')
      pending.resolve()
      expect(await Promise.all([older, newer])).toEqual([false, true])
      expect(committed).toEqual([['w-new', 'o-new', '2026-10-27T12:00:00Z']])
      expect(publish).toHaveBeenCalledExactlyOnceWith('w-new')
      expect(apiClient.getOperatorScope()).toBe('o-new')
      expect(apiClient.getTimeTravelAsOf()).toBe('2026-10-27T12:00:00Z')
    } finally {
      unsubscribe()
      stopState()
      pending.resolve()
      await useAppStore.getState().waitForWalletSelection()
    }
  })
})
