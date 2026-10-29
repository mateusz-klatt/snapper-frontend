import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, createElement, StrictMode } from 'react'
import {
  readUrlScope,
  readLocalStorageScope,
  writeUrlScope,
  writeLocalStorageScope,
  useScopePersistence,
} from './useScopePersistence'

vi.mock('./queries/wallets', () => ({
  useWallets: vi.fn(() => ({ data: { payload: [] } })),
  useOperators: vi.fn(() => ({ data: { payload: [] } })),
}))

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    setWalletScope: vi.fn(),
    setOperatorScope: vi.fn(),
    setTimeTravelAsOf: vi.fn(),
  },
}))

vi.mock('../lib/queryClient', () => ({
  queryClient: { cancelQueries: vi.fn(), invalidateQueries: vi.fn(), refetchQueries: vi.fn() },
}))

const refreshToken = vi.hoisted(() => vi.fn<() => Promise<void>>())

vi.mock('../stores/auth', () => ({
  useAuthStore: {
    getState: () => ({ refreshToken }),
  },
}))

import { useWallets, useOperators } from './queries/wallets'
import { useAppStore } from '../stores/app'
import { apiClient } from '../lib/apiClient'

const wrapper = ({ children }: { children: ReactNode }): ReactNode => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('readUrlScope', () => {
  beforeEach(() => {
    globalThis.location.hash = ''
  })

  it('returns null wallet and operator when no hash params', () => {
    globalThis.location.hash = '#market'

    expect(readUrlScope()).toEqual({ wallet: null, operator: null, hasParams: false })
  })

  it('returns null wallet/operator when hash has no query string', () => {
    globalThis.location.hash = ''

    expect(readUrlScope()).toEqual({ wallet: null, operator: null, hasParams: false })
  })

  it('reads wallet param', () => {
    globalThis.location.hash = '#market?wallet=w-1'

    expect(readUrlScope()).toEqual({ wallet: 'w-1', operator: null, hasParams: true })
  })

  it('reads both wallet and operator params', () => {
    globalThis.location.hash = '#market?wallet=w-1&operator=o-1'

    expect(readUrlScope()).toEqual({ wallet: 'w-1', operator: 'o-1', hasParams: true })
  })

  it('treats __all__ sentinel as null wallet (explicit "All wallets")', () => {
    globalThis.location.hash = '#market?wallet=__all__'

    expect(readUrlScope()).toEqual({ wallet: null, operator: null, hasParams: true })
  })

  it('treats __all__ sentinel as null operator', () => {
    globalThis.location.hash = '#market?operator=__all__'

    expect(readUrlScope()).toEqual({ wallet: null, operator: null, hasParams: true })
  })
})

describe('readLocalStorageScope', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('returns null when storage empty', () => {
    expect(readLocalStorageScope()).toEqual({ wallet: null, operator: null })
  })

  it('reads stored wallet and operator', () => {
    globalThis.localStorage.setItem('snapper-current-wallet', 'w-saved')
    globalThis.localStorage.setItem('snapper-current-operator', 'o-saved')

    expect(readLocalStorageScope()).toEqual({ wallet: 'w-saved', operator: 'o-saved' })
  })

  it('treats __all__ sentinel as null', () => {
    globalThis.localStorage.setItem('snapper-current-wallet', '__all__')
    globalThis.localStorage.setItem('snapper-current-operator', '__all__')

    expect(readLocalStorageScope()).toEqual({ wallet: null, operator: null })
  })

  it('returns null when localStorage throws', () => {
    const original = globalThis.localStorage.getItem

    globalThis.localStorage.getItem = vi.fn(() => {
      throw new Error('quota exceeded')
    })

    expect(readLocalStorageScope()).toEqual({ wallet: null, operator: null })

    globalThis.localStorage.getItem = original
  })
})

describe('writeUrlScope', () => {
  beforeEach(() => {
    globalThis.location.hash = '#market'
  })

  it('appends wallet param when set, no operator', () => {
    writeUrlScope('w-1', null)

    expect(globalThis.location.hash).toBe('#market?wallet=w-1&operator=__all__')
  })

  it('appends both wallet and operator', () => {
    writeUrlScope('w-1', 'o-1')

    expect(globalThis.location.hash).toBe('#market?wallet=w-1&operator=o-1')
  })

  it('strips params when both null', () => {
    globalThis.location.hash = '#market?wallet=w-1&operator=o-1'
    writeUrlScope(null, null)

    expect(globalThis.location.hash).toBe('#market?wallet=__all__&operator=__all__')
  })

  it('preserves the route portion when overwriting params', () => {
    globalThis.location.hash = '#backtests?wallet=w-1'
    writeUrlScope('w-2', null)

    expect(globalThis.location.hash).toBe('#backtests?wallet=w-2&operator=__all__')
  })

  it('does not call replaceState when hash is unchanged (idempotent)', () => {
    globalThis.location.hash = '#market?wallet=w-1&operator=__all__'
    const replaceSpy = vi.spyOn(globalThis.history, 'replaceState')

    writeUrlScope('w-1', null)

    expect(replaceSpy).not.toHaveBeenCalled()

    replaceSpy.mockRestore()
  })

  it('handles bare # hash with no route segment', () => {
    globalThis.location.hash = ''
    writeUrlScope('w-1', null)

    expect(globalThis.location.hash).toBe('#?wallet=w-1&operator=__all__')
  })
})

describe('writeLocalStorageScope', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('persists wallet and operator', () => {
    writeLocalStorageScope('w-1', 'o-1')

    expect(globalThis.localStorage.getItem('snapper-current-wallet')).toBe('w-1')
    expect(globalThis.localStorage.getItem('snapper-current-operator')).toBe('o-1')
  })

  it('persists explicit All when wallet and operator are null', () => {
    globalThis.localStorage.setItem('snapper-current-wallet', 'w-old')
    globalThis.localStorage.setItem('snapper-current-operator', 'o-old')
    writeLocalStorageScope(null, null)

    expect(globalThis.localStorage.getItem('snapper-current-wallet')).toBe('__all__')
    expect(globalThis.localStorage.getItem('snapper-current-operator')).toBe('__all__')
  })

  it('silently ignores localStorage failure', () => {
    const original = globalThis.localStorage.setItem

    globalThis.localStorage.setItem = vi.fn(() => {
      throw new Error('quota')
    })

    expect(() => writeLocalStorageScope('w-1', null)).not.toThrow()

    globalThis.localStorage.setItem = original
  })
})

describe('useScopePersistence', () => {
  beforeEach(() => {
    globalThis.location.hash = '#market'
    globalThis.localStorage.clear()
    vi.clearAllMocks()
    useAppStore.setState({ currentWalletPublicId: null, currentOperatorPublicId: null })
  })

  it('does nothing when wallets and operators API both empty', () => {
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({ data: { payload: [] } })
    ;(useOperators as ReturnType<typeof vi.fn>).mockReturnValue({ data: { payload: [] } })
    renderHook(() => useScopePersistence(), { wrapper })

    expect(globalThis.location.hash).toMatch(/^#market(?:\?|$)/)
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
  })

  it('auto-picks first wallet when no URL/storage and wallets available', async () => {
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-first' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=w-first'))
    expect(globalThis.localStorage.getItem('snapper-current-wallet')).toBe('w-first')
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-first'))
  })

  it('uses URL wallet over auto-pick when present', async () => {
    globalThis.location.hash = '#market?wallet=w-from-url'
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-first' }, { public_id: 'w-from-url' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-from-url'))
  })

  it('uses localStorage wallet when URL has no params', async () => {
    globalThis.localStorage.setItem('snapper-current-wallet', 'w-from-ls')
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-from-ls' }, { public_id: 'w-other' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-from-ls'))
  })

  it('keeps wallet null when URL wallet ID is invalid (URL had explicit param so no auto-pick)', async () => {
    globalThis.location.hash = '#market?wallet=w-deleted'
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-real' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(globalThis.location.hash).toMatch(/^#market(?:\?|$)/))
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
  })

  it('respects __all__ sentinel — explicit no wallet', async () => {
    globalThis.location.hash = '#market?wallet=__all__'
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-1' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(globalThis.location.hash).toMatch(/^#market(?:\?|$)/))
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
  })

  it('sets operator from URL when valid', async () => {
    globalThis.location.hash = '#market?operator=o-1'
    ;(useOperators as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'o-1' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(useAppStore.getState().currentOperatorPublicId).toBe('o-1'))
  })

  it('skips setOperator when current store value already matches URL', async () => {
    globalThis.location.hash = '#market?operator=o-1'
    useAppStore.setState({ currentOperatorPublicId: 'o-1' })
    ;(useOperators as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'o-1' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(globalThis.location.hash).toContain('operator=o-1'))
    expect(useAppStore.getState().currentOperatorPublicId).toBe('o-1')
  })

  it('skips selectWallet when current store value already matches URL', async () => {
    globalThis.location.hash = '#market?wallet=w-1'
    useAppStore.setState({ currentWalletPublicId: 'w-1' })
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-1' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=w-1'))
    expect(useAppStore.getState().currentWalletPublicId).toBe('w-1')
  })

  it('writes URL + localStorage on resolution', async () => {
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-auto' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() =>
      expect(globalThis.localStorage.getItem('snapper-current-wallet')).toBe('w-auto')
    )
    expect(globalThis.location.hash).toContain('wallet=w-auto')
  })

  it('syncs URL + localStorage when store changes after init', async () => {
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-1' }, { public_id: 'w-2' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=w-1'))
    useAppStore.setState({ currentWalletPublicId: 'w-2' })
    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=w-2'))

    expect(globalThis.localStorage.getItem('snapper-current-wallet')).toBe('w-2')
  })

  it('handles empty wallets when only operators API populated (auto-pick is null)', async () => {
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({ data: { payload: [] } })
    ;(useOperators as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'o-only' }] },
    })
    renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(globalThis.location.hash).toMatch(/^#market(?:\?|$)/))
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
  })

  it('does not write again when no actual scope change', async () => {
    ;(useWallets as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { payload: [{ public_id: 'w-1' }] },
    })
    const { rerender } = renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=w-1'))
    const replaceSpy = vi.spyOn(globalThis.history, 'replaceState')

    rerender()

    expect(replaceSpy).not.toHaveBeenCalled()

    replaceSpy.mockRestore()
  })
})

describe('URL scope history and global time', () => {
  const accessible = (): void => {
    vi.mocked(useWallets).mockReturnValue({
      data: { payload: [{ public_id: 'w-paper' }, { public_id: 'w-main' }] },
    } as never)
    vi.mocked(useOperators).mockReturnValue({
      data: { payload: [{ public_id: 'o-1' }, { public_id: 'o-2' }] },
    } as never)
  }

  const navigate = (hash: string, type: 'hashchange' | 'popstate' = 'hashchange'): void => {
    act(() => {
      globalThis.history.replaceState(null, '', hash)
      globalThis.dispatchEvent(new Event(type))
    })
  }

  const settlePaper = async (): Promise<void> => {
    globalThis.history.replaceState(null, '', '#positions?wallet=w-paper&operator=o-1')
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
  }

  beforeEach(() => {
    globalThis.history.replaceState(null, '', '#positions')
    globalThis.localStorage.clear()
    useAppStore.setState({
      currentWalletPublicId: null,
      currentOperatorPublicId: null,
      asOf: null,
      isTimeTraveling: false,
    })
    vi.clearAllMocks()
    refreshToken.mockReset().mockResolvedValue(undefined)
    accessible()
  })
  it('explicit All overrides saved IDs and round-trips in URL and storage', async () => {
    localStorage.setItem('snapper-current-wallet', 'w-main')
    localStorage.setItem('snapper-current-operator', 'o-2')
    globalThis.history.replaceState(null, '', '#positions?wallet=__all__&operator=__all__')
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(localStorage.getItem('snapper-current-wallet')).toBe('__all__'))
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
    expect(useAppStore.getState().currentOperatorPublicId).toBeNull()
    expect(globalThis.location.hash).toContain('wallet=__all__')
    expect(localStorage.getItem('snapper-current-operator')).toBe('__all__')
  })
  it.each(['hashchange', 'popstate'] as const)(
    'applies a validated wallet and operator on %s',
    async type => {
      await settlePaper()
      navigate('#positions?wallet=w-main&operator=o-2', type)
      await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
      expect(useAppStore.getState().currentOperatorPublicId).toBe('o-2')
      expect(refreshToken).toHaveBeenLastCalledWith({ walletId: 'w-main' })
    }
  )
  it('does not let an invalid explicit ID select a saved or unauthorized wallet', async () => {
    await settlePaper()
    localStorage.setItem('snapper-current-wallet', 'w-main')
    navigate('#positions?wallet=w-foreign&operator=o-1')
    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=w-paper'))
    expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    expect(refreshToken).toHaveBeenCalledTimes(1)
  })
  it('hydrates explicit ISO knowledge time into global store and the API client', async () => {
    globalThis.history.replaceState(
      null,
      '',
      '#positions?wallet=__all__&operator=__all__&as_of=2026-10-27T18%3A00%3A00%2B01%3A00&keep=yes'
    )
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().asOf).toBe('2026-10-27T17:00:00.000Z'))
    expect(useAppStore.getState().isTimeTraveling).toBe(true)
    expect(apiClient.setTimeTravelAsOf).toHaveBeenLastCalledWith('2026-10-27T17:00:00.000Z')
    expect(new URLSearchParams(globalThis.location.hash.split('?')[1]).get('keep')).toBe('yes')
  })
  it('persists picker knowledge time and removes it when returning to Live', async () => {
    await settlePaper()
    navigate('#positions?wallet=w-paper&operator=o-1&keep=yes')
    act(() => useAppStore.getState().setAsOf('2026-10-27T17:00:00Z'))
    await waitFor(() =>
      expect(new URLSearchParams(globalThis.location.hash.split('?')[1]).get('as_of')).toBe(
        '2026-10-27T17:00:00Z'
      )
    )
    act(() => useAppStore.getState().clearAsOf())
    await waitFor(() =>
      expect(new URLSearchParams(globalThis.location.hash.split('?')[1]).has('as_of')).toBe(false)
    )
    expect(globalThis.location.hash).toContain('keep=yes')
    expect(globalThis.location.hash).toContain('wallet=w-paper')
  })
  it('returns to Live when browser history restores a URL without as_of', async () => {
    await settlePaper()
    act(() => useAppStore.getState().setAsOf('2026-10-27T17:00:00Z'))
    navigate('#positions?wallet=w-paper&operator=o-1', 'popstate')
    await waitFor(() => expect(useAppStore.getState().asOf).toBeNull())
    expect(useAppStore.getState().isTimeTraveling).toBe(false)
    expect(apiClient.setTimeTravelAsOf).toHaveBeenLastCalledWith(null)
  })
  it.each(['invalid', '2026-10-27', '2026-10-27T18:00:00', '2026-02-30T18:00:00Z'])(
    'rejects an invalid or ambiguous knowledge timestamp (%s)',
    async value => {
      await settlePaper()
      act(() => useAppStore.getState().setAsOf('2026-10-27T17:00:00Z'))
      navigate(`#positions?wallet=w-paper&operator=o-1&as_of=${encodeURIComponent(value)}`)
      await waitFor(() =>
        expect(new URLSearchParams(globalThis.location.hash.split('?')[1]).get('as_of')).toBe(
          '2026-10-27T17:00:00Z'
        )
      )
      expect(useAppStore.getState().asOf).toBe('2026-10-27T17:00:00Z')
    }
  )
  it('keeps confirmed scope until wallet token refresh succeeds', async () => {
    await settlePaper()
    let resolve!: () => void

    refreshToken.mockImplementationOnce(
      () =>
        new Promise<void>(done => {
          resolve = done
        })
    )
    navigate('#positions?wallet=w-main&operator=o-2')
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    expect(useAppStore.getState().currentOperatorPublicId).toBe('o-1')
    await act(async () => {
      resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
    expect(useAppStore.getState().currentOperatorPublicId).toBe('o-2')
  })
  it('canonicalizes the URL back to confirmed state when refresh fails', async () => {
    await settlePaper()
    refreshToken.mockRejectedValueOnce(new TypeError('offline'))
    navigate('#positions?wallet=w-main&operator=o-2&keep=yes')
    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=w-paper'))
    expect(globalThis.location.hash).toContain('operator=o-1')
    expect(globalThis.location.hash).toContain('keep=yes')
    expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
  })
})

describe('pending URL selection generations', () => {
  const deferred = (): { promise: Promise<void>; resolve: () => void } => {
    let resolve!: () => void
    const promise = new Promise<void>(done => {
      resolve = done
    })

    return { promise, resolve }
  }

  const navigate = (hash: string): void => {
    act(() => {
      history.replaceState(null, '', hash)
      globalThis.dispatchEvent(new Event('hashchange'))
    })
  }

  beforeEach(() => {
    history.replaceState(null, '', '#positions?wallet=w-paper&operator=o-1')
    localStorage.clear()
    useAppStore.setState({
      currentWalletPublicId: null,
      currentOperatorPublicId: null,
      asOf: null,
      isTimeTraveling: false,
    })
    vi.clearAllMocks()
    refreshToken.mockReset().mockResolvedValue(undefined)
    vi.mocked(useWallets).mockReturnValue({
      data: { payload: [{ public_id: 'w-paper' }, { public_id: 'w-main' }] },
    } as never)
    vi.mocked(useOperators).mockReturnValue({
      data: { payload: [{ public_id: 'o-1' }, { public_id: 'o-2' }] },
    } as never)
  })
  it.each([null, 'w-main'])(
    'waits for a newer picker that supersedes initial hydration from %s',
    async visible => {
      useAppStore.setState({ currentWalletPublicId: visible })
      const initial = deferred()
      const latest = deferred()

      refreshToken
        .mockImplementationOnce(() => initial.promise)
        .mockImplementationOnce(() => latest.promise)
      const { result } = renderHook(() => useScopePersistence(), { wrapper })

      await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(1))
      const selection = useAppStore.getState().selectWalletAndRefresh('w-main')

      await act(async () => initial.resolve())
      await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
      expect(result.current.status).toBe('loading')
      await act(async () => {
        latest.resolve()
        await selection
      })
      await waitFor(() => expect(result.current.status).toBe('ready'))
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
    }
  )
  it('does not reserve or publish a scope after unmount while awaiting a newer picker', async () => {
    const initial = deferred()
    const latest = deferred()

    refreshToken
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => latest.promise)
    const { unmount } = renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(1))
    const selection = useAppStore.getState().selectWalletAndRefresh('w-main')

    await act(async () => initial.resolve())
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    unmount()
    const reserve = vi.spyOn(useAppStore.getState(), 'reserveScopeSelection')

    await act(async () => {
      latest.resolve()
      await selection
    })
    expect(reserve).not.toHaveBeenCalled()
    reserve.mockRestore()
  })
  it('preserves the latest picker queued while superseded bootstrap awaits an older picker', async () => {
    const initial = deferred()
    const middle = deferred()
    const latest = deferred()

    refreshToken
      .mockImplementationOnce(() => initial.promise)
      .mockImplementationOnce(() => middle.promise)
      .mockImplementationOnce(() => latest.promise)
    const { result } = renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(1))
    const firstPicker = useAppStore.getState().selectWalletAndRefresh('w-main')

    await act(async () => initial.resolve())
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    const lastPicker = useAppStore.getState().selectWalletAndRefresh('w-paper')

    await act(async () => {
      middle.resolve()
      await firstPicker
    })
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(3))
    expect(result.current.status).toBe('loading')
    await act(async () => {
      latest.resolve()
      await lastPicker
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
  })
  it('never publishes a stale URL scope, and realigns JWT even when latest URL returns to the visible wallet', async () => {
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
    const old = deferred()
    const newest = deferred()

    refreshToken
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => newest.promise)
    vi.mocked(apiClient.setWalletScope).mockClear()
    vi.mocked(apiClient.setOperatorScope).mockClear()
    vi.mocked(apiClient.setTimeTravelAsOf).mockClear()
    navigate('#positions?wallet=w-main&operator=o-2&as_of=2026-10-26T12%3A00%3A00Z')
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    navigate('#positions?wallet=w-paper&operator=o-1&as_of=2026-10-27T17%3A00%3A00Z')
    expect(refreshToken).toHaveBeenCalledTimes(2)
    await act(async () => {
      old.resolve()
      await old.promise
    })
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(3))
    expect(apiClient.setWalletScope).not.toHaveBeenCalled()
    expect(apiClient.setOperatorScope).not.toHaveBeenCalled()
    expect(apiClient.setTimeTravelAsOf).not.toHaveBeenCalled()
    expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    expect(useAppStore.getState().asOf).toBeNull()
    await act(async () => {
      newest.resolve()
      await newest.promise
    })
    await waitFor(() => expect(useAppStore.getState().asOf).toBe('2026-10-27T17:00:00.000Z'))
    expect(apiClient.setWalletScope).toHaveBeenCalledExactlyOnceWith('w-paper')
    expect(apiClient.setOperatorScope).toHaveBeenCalledExactlyOnceWith('o-1')
    expect(apiClient.setTimeTravelAsOf).toHaveBeenCalledExactlyOnceWith('2026-10-27T17:00:00.000Z')
  })
  it('commits operator, wallet and knowledge time in one store notification', async () => {
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
    const seen: Array<{
      wallet: string | null
      operator: string | null
      asOf: string | null
      historical: boolean
    }> = []
    const unsubscribe = useAppStore.subscribe(state =>
      seen.push({
        wallet: state.currentWalletPublicId,
        operator: state.currentOperatorPublicId,
        asOf: state.asOf,
        historical: state.isTimeTraveling,
      })
    )

    try {
      navigate('#positions?wallet=w-main&operator=o-2&as_of=2026-10-27T17%3A00%3A00Z')
      await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
      expect(seen).toEqual([
        { wallet: 'w-main', operator: 'o-2', asOf: '2026-10-27T17:00:00.000Z', historical: true },
      ])
    } finally {
      unsubscribe()
    }
  })
  it('preserves a newer time-picker decision without replaying the pending URL horizon', async () => {
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
    const pending = deferred()

    refreshToken.mockImplementationOnce(() => pending.promise)
    navigate('#positions?wallet=w-main&operator=o-2&as_of=2026-10-26T12%3A00%3A00Z')
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    act(() => useAppStore.getState().setAsOf('2026-10-27T17:00:00Z'))
    vi.mocked(apiClient.setWalletScope).mockClear()
    vi.mocked(apiClient.setTimeTravelAsOf).mockClear()
    await act(async () => {
      pending.resolve()
      await pending.promise
    })
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(apiClient.setWalletScope).toHaveBeenCalledWith('w-paper'))
    expect(apiClient.setWalletScope).not.toHaveBeenCalledWith('w-main')
    expect(apiClient.setTimeTravelAsOf).not.toHaveBeenCalledWith('2026-10-26T12:00:00.000Z')
    expect(useAppStore.getState().asOf).toBe('2026-10-27T17:00:00Z')
  })
  it('does not publish any client scope after unmount during refresh', async () => {
    const pending = deferred()

    refreshToken.mockImplementationOnce(() => pending.promise)
    const { unmount } = renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(1))
    vi.mocked(apiClient.setWalletScope).mockClear()
    vi.mocked(apiClient.setOperatorScope).mockClear()
    vi.mocked(apiClient.setTimeTravelAsOf).mockClear()
    unmount()
    await act(async () => {
      pending.resolve()
      await pending.promise
    })
    expect(apiClient.setWalletScope).not.toHaveBeenCalled()
    expect(apiClient.setOperatorScope).not.toHaveBeenCalled()
    expect(apiClient.setTimeTravelAsOf).not.toHaveBeenCalled()
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
  })
  it('recovers its subscription after the StrictMode setup-cleanup cycle', async () => {
    const strictWrapper = ({ children }: { children: ReactNode }): ReactNode =>
      createElement(StrictMode, null, createElement(wrapper, { children }))

    renderHook(() => useScopePersistence(), { wrapper: strictWrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
    navigate('#positions?wallet=w-main&operator=o-2&as_of=2026-10-27T17%3A00%3A00Z')
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
    expect(useAppStore.getState().asOf).toBe('2026-10-27T17:00:00.000Z')
  })
  it('does not let a stale wallet-picker response overwrite a newer URL selection', async () => {
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
    const old = deferred()
    const latest = deferred()

    refreshToken
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => latest.promise)
    const selection = useAppStore.getState().selectWalletAndRefresh('w-main')

    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    vi.mocked(apiClient.setWalletScope).mockClear()
    vi.mocked(apiClient.setTimeTravelAsOf).mockClear()
    navigate('#positions?wallet=w-paper&operator=o-1&as_of=2026-10-27T17%3A00%3A00Z')
    await act(async () => {
      old.resolve()
      await old.promise
      await selection
    })
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(3))
    expect(apiClient.setWalletScope).not.toHaveBeenCalled()
    expect(apiClient.setTimeTravelAsOf).not.toHaveBeenCalled()
    await act(async () => {
      latest.resolve()
      await latest.promise
    })
    await waitFor(() => expect(useAppStore.getState().asOf).toBe('2026-10-27T17:00:00.000Z'))
    expect(apiClient.setWalletScope).not.toHaveBeenCalledWith('w-main')
  })
  it('does not replay an older queued URL over a newer wallet-picker decision', async () => {
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
    const old = deferred()

    refreshToken.mockImplementationOnce(() => old.promise)
    navigate('#positions?wallet=w-main&operator=o-2&as_of=2026-10-26T12%3A00%3A00Z')
    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    navigate('#positions?wallet=w-paper&operator=o-1&as_of=2026-10-25T12%3A00%3A00Z')
    const selection = useAppStore.getState().selectWalletAndRefresh('w-main')

    vi.mocked(apiClient.setTimeTravelAsOf).mockClear()
    await act(async () => {
      old.resolve()
      await old.promise
      await selection
    })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
    expect(useAppStore.getState().asOf).toBeNull()
    expect(apiClient.setTimeTravelAsOf).not.toHaveBeenCalledWith('2026-10-25T12:00:00.000Z')
    expect(apiClient.setTimeTravelAsOf).not.toHaveBeenCalledWith('2026-10-26T12:00:00.000Z')
  })
  it('ordinary tab navigation preserves a pending wallet-picker decision', async () => {
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
    const pending = deferred()

    refreshToken.mockImplementationOnce(() => pending.promise)
    const selection = useAppStore.getState().selectWalletAndRefresh('w-main')

    await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
    navigate('#market?wallet=w-paper&operator=o-1')
    await act(async () => {
      pending.resolve()
      await pending.promise
      await selection
    })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
    expect(globalThis.location.hash).toContain('#market?')
    expect(globalThis.location.hash).toContain('wallet=w-main')
    expect(refreshToken).toHaveBeenCalledTimes(2)
  })
  it.each(['wallet', 'operator'] as const)(
    'rejects access revoked during a pending refresh (%s)',
    async field => {
      const { rerender } = renderHook(() => useScopePersistence(), { wrapper })

      await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
      const pending = deferred()

      refreshToken.mockImplementationOnce(() => pending.promise)
      navigate('#positions?wallet=w-main&operator=o-2')
      await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(2))
      if (field === 'wallet')
        vi.mocked(useWallets).mockReturnValue({
          data: { payload: [{ public_id: 'w-paper' }] },
        } as never)
      else
        vi.mocked(useOperators).mockReturnValue({
          data: { payload: [{ public_id: 'o-1' }] },
        } as never)
      rerender()
      vi.mocked(apiClient.setWalletScope).mockClear()
      await act(async () => {
        pending.resolve()
        await pending.promise
      })
      await waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(3))
      expect(apiClient.setWalletScope).not.toHaveBeenCalledWith('w-main')
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    }
  )
  it.each(['wallet', 'operator'] as const)(
    'clears a confirmed selection when its read access disappears (%s)',
    async field => {
      const { rerender } = renderHook(() => useScopePersistence(), { wrapper })

      await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper'))
      if (field === 'wallet')
        vi.mocked(useWallets).mockReturnValue({
          data: { payload: [{ public_id: 'w-main' }] },
        } as never)
      else
        vi.mocked(useOperators).mockReturnValue({
          data: { payload: [{ public_id: 'o-2' }] },
        } as never)
      rerender()
      await waitFor(() =>
        expect(
          field === 'wallet'
            ? useAppStore.getState().currentWalletPublicId
            : useAppStore.getState().currentOperatorPublicId
        ).toBeNull()
      )
      expect(globalThis.location.hash).toContain(`${field}=__all__`)
      expect(refreshToken).toHaveBeenCalledTimes(2)
    }
  )
})

describe('scope access hydration', () => {
  beforeEach(() => {
    localStorage.clear()
    history.replaceState(null, '', '#positions')
    useAppStore.setState({
      currentWalletPublicId: null,
      currentOperatorPublicId: null,
      asOf: null,
      isTimeTraveling: false,
    })
    vi.clearAllMocks()
    refreshToken.mockReset().mockResolvedValue(undefined)
    vi.mocked(useWallets).mockReturnValue({ data: { payload: [{ public_id: 'w-main' }] } } as never)
    vi.mocked(useOperators).mockReturnValue({ data: { payload: [] } } as never)
  })
  it('waits for the server refresh even when restored scope already matches the UI', async () => {
    history.replaceState(
      null,
      '',
      '#backtests?wallet=w-main&operator=__all__&as_of=2026-10-28T17%3A33%3A00Z'
    )
    useAppStore.setState({
      currentWalletPublicId: 'w-main',
      asOf: '2026-10-28T17:33:00.000Z',
      isTimeTraveling: true,
    })
    let finish!: () => void

    refreshToken.mockReturnValueOnce(
      new Promise<void>(resolve => {
        finish = resolve
      })
    )
    const { result } = renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(refreshToken).toHaveBeenCalledWith({ walletId: 'w-main' }))
    expect(result.current.status).toBe('loading')
    await act(async () => finish())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(useAppStore.getState().asOf).toBe('2026-10-28T17:33:00.000Z')
  })
  it('reports a failed initial refresh and only becomes ready after an explicit retry', async () => {
    refreshToken.mockRejectedValueOnce(new TypeError('offline'))
    const { result } = renderHook(() => useScopePersistence(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(refreshToken).toHaveBeenLastCalledWith({ clear: true })
  })
  it('does not refresh or expose dependent scope before access-list hydration', () => {
    vi.mocked(useWallets).mockReturnValue({ data: undefined } as never)
    const { result } = renderHook(() => useScopePersistence(), { wrapper })

    act(() => result.current.retry())
    expect(result.current.status).toBe('loading')
    expect(refreshToken).not.toHaveBeenCalled()
  })
  it.each(['wallet', 'operator'] as const)(
    'reports failed %s access-list hydration and retries both catalogs without a token change',
    field => {
      const wallets = vi.fn()
      const operators = vi.fn()

      vi.mocked(useWallets).mockReturnValue({
        data: field === 'wallet' ? undefined : { payload: [{ public_id: 'w-main' }] },
        isError: field === 'wallet',
        refetch: wallets,
      } as never)
      vi.mocked(useOperators).mockReturnValue({
        data: field === 'operator' ? undefined : { payload: [] },
        isError: field === 'operator',
        refetch: operators,
      } as never)
      const { result } = renderHook(() => useScopePersistence(), { wrapper })

      expect(result.current.status).toBe('error')
      act(() => result.current.retry())
      expect(wallets).toHaveBeenCalledOnce()
      expect(operators).toHaveBeenCalledOnce()
      expect(refreshToken).not.toHaveBeenCalled()
    }
  )
  it('saved explicit All does not auto-pick a wallet after reload', async () => {
    localStorage.setItem('snapper-current-wallet', '__all__')
    localStorage.setItem('snapper-current-operator', '__all__')
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=__all__'))
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
  })
  it('invalid explicit URL wallet does not fall back to a saved wallet', async () => {
    localStorage.setItem('snapper-current-wallet', 'w-main')
    history.replaceState(null, '', '#positions?wallet=w-foreign')
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(globalThis.location.hash).toContain('wallet=__all__'))
    expect(useAppStore.getState().currentWalletPublicId).toBeNull()
    expect(refreshToken).toHaveBeenLastCalledWith({ clear: true })
  })
  it.each(['wallet', 'operator'] as const)(
    'waits for loaded access lists before applying latest URL (%s)',
    async field => {
      if (field === 'wallet') vi.mocked(useWallets).mockReturnValue({ data: undefined } as never)
      else vi.mocked(useOperators).mockReturnValue({ data: undefined } as never)
      const { rerender } = renderHook(() => useScopePersistence(), { wrapper })

      act(() => {
        history.replaceState(null, '', '#positions?wallet=w-main&operator=__all__')
        globalThis.dispatchEvent(new Event('hashchange'))
      })
      expect(refreshToken).not.toHaveBeenCalled()
      vi.mocked(useWallets).mockReturnValue({
        data: { payload: [{ public_id: 'w-main' }] },
      } as never)
      vi.mocked(useOperators).mockReturnValue({ data: { payload: [] } } as never)
      rerender()
      await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
    }
  )
  it('unrelated store updates do not rewrite scope history', async () => {
    renderHook(() => useScopePersistence(), { wrapper })
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBe('w-main'))
    const replace = vi.spyOn(history, 'replaceState')

    try {
      act(() => useAppStore.getState().setConnected(true))
      expect(replace).not.toHaveBeenCalled()
    } finally {
      replace.mockRestore()
    }
  })
})
