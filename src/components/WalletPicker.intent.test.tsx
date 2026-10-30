import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WalletPicker } from './WalletPicker'
import { subscribeWalletSelectionIntent, useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'
import { useScopePersistence } from '../hooks/useScopePersistence'
import { useTabRouting } from '../hooks/useHashRouting'
import { makeUserProfile } from '../test/factories'

const catalogs = vi.hoisted(() => ({
  all: {
    payload: [
      { public_id: 'w-main', label: 'Main', is_paper: false },
      { public_id: 'w-paper', label: 'Practice', is_paper: true },
    ],
  },
  operator: { payload: [{ public_id: 'w-other', label: 'Other', is_paper: false }] },
  operators: { payload: [{ public_id: 'o-b' }] },
}))

vi.mock('../hooks/queries/wallets', () => ({
  useWallets: () => {
    const operator = useAppStore(s => s.currentOperatorPublicId)

    return { data: operator === 'o-b' ? catalogs.operator : catalogs.all }
  },
  useOperators: () => ({ data: catalogs.operators }),
}))

const originalRefresh = useAuthStore.getState().refreshToken

const deferred = (): {
  promise: Promise<void>
  resolve: () => void
  reject: (reason: Error) => void
} => {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((accept, refuse) => {
    resolve = accept
    reject = refuse
  })

  return { promise, resolve, reject }
}

const choose = async (user: ReturnType<typeof userEvent.setup>, label: string): Promise<void> => {
  await user.click(screen.getByRole('combobox'))
  await user.click(screen.getByRole('option', { name: label }))
}

function ScopeHost(): React.ReactNode {
  const scope = useScopePersistence()

  return (
    <>
      <WalletPicker />
      <div data-testid='scope-status'>{scope.status}</div>
    </>
  )
}

function NativeNavigationHost(): React.ReactNode {
  const [, navigate] = useTabRouting()

  return (
    <>
      <ScopeHost />
      <button onClick={() => navigate('backtests')}>Backtests tab</button>
      <button onClick={() => navigate('overview')}>Overview tab</button>
      <a href='#positions?wallet=w-main&operator=__all__'>Positions link</a>
      <a href='#positions?wallet=w-main&operator=__all__' onClick={event => event.preventDefault()}>
        Cancelled positions link
      </a>
    </>
  )
}

describe('WalletPicker feedback follows authoritative coordinator intent', () => {
  beforeEach(() => {
    queryClient.clear()
    localStorage.clear()
    globalThis.history.replaceState(null, '', '#positions?wallet=w-main&operator=__all__')
    useAppStore.getState().setCurrentOperatorPublicId(null)
    useAppStore.getState().clearAsOf()
    useAppStore.getState().setCurrentWalletPublicId('w-main')
    useAuthStore.setState({
      isAuthenticated: true,
      user: makeUserProfile({ public_id: 'user-a', username: 'auditor-a' }),
      refreshToken: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(async () => {
    cleanup()
    await useAppStore.getState().waitForWalletSelection()
    useAuthStore.setState({ refreshToken: originalRefresh })
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it.each(['before mount', 'after mount'] as const)(
    'does not restore a provisional choice when an observer registered %s starts newer wallet intent',
    async registration => {
      const pending = deferred()
      const user = userEvent.setup()
      const refresh = vi.fn().mockReturnValueOnce(pending.promise)
      let nested = false
      let newer!: Promise<void>

      useAuthStore.setState({ refreshToken: refresh })
      if (registration === 'after mount') render(<WalletPicker />)
      const unsubscribe = subscribeWalletSelectionIntent(() => {
        if (nested) return

        nested = true
        newer = useAppStore.getState().selectWalletAndRefresh('w-main')
      })

      if (registration === 'before mount') render(<WalletPicker />)

      try {
        await choose(user, 'Practice (paper)')
        expect(refresh).toHaveBeenCalledExactlyOnceWith({ walletId: 'w-main' })
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        await act(async () => {
          pending.resolve()
          await newer
          await useAppStore.getState().waitForWalletSelection()
        })
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
      } finally {
        unsubscribe()
        await act(async () => {
          pending.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it.each(['logout and login', 'different user'] as const)(
    'does not restore obsolete failure feedback when its dispatch observer triggers %s',
    async transition => {
      const pending = deferred()
      const user = userEvent.setup()
      let nested = false

      useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(pending.promise) })
      render(<WalletPicker />)
      const unsubscribe = subscribeWalletSelectionIntent(() => {
        if (nested) return

        nested = true
        if (transition === 'logout and login') {
          useAuthStore.setState({ isAuthenticated: false })
          useAuthStore.setState({ isAuthenticated: true })
        } else
          useAuthStore.setState({
            user: makeUserProfile({ public_id: 'user-b', username: 'auditor-b' }),
          })
      })

      try {
        await choose(user, 'Practice (paper)')
        await act(async () => pending.reject(new TypeError('obsolete dispatch failure')))
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
      } finally {
        unsubscribe()
        await act(async () => {
          pending.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it('retires a previous operator wallet and spinner immediately, before the obsolete refresh settles', async () => {
    const old = deferred()
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(old.promise) })
    render(<WalletPicker />)

    try {
      await choose(user, 'Practice (paper)')
      expect(screen.getByRole('status', { name: 'Loading...' })).toBeInTheDocument()
      act(() => useAppStore.getState().setCurrentOperatorPublicId('o-b'))
      expect(screen.getByRole('combobox')).toHaveTextContent('All wallets')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(useAppStore.getState().currentWalletPublicId).toBeNull()
      await act(async () => old.reject(new TypeError('offline')))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      await act(async () => {
        old.resolve()
        await useAppStore.getState().waitForWalletSelection()
      })
    }
  })

  it.each(['resolve', 'reject'] as const)(
    'retires an obsolete picker when an external intent returns to the same confirmed scope, before the old request will %s',
    async outcome => {
      const old = deferred()
      const latest = deferred()
      const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: refresh })
      const publish = vi.spyOn(apiClient, 'setWalletScope')

      render(<WalletPicker />)

      try {
        await choose(user, 'Practice (paper)')
        let external!: Promise<boolean>

        act(() => {
          external = useAppStore
            .getState()
            .selectScopeAndRefresh({ wallet: 'w-main', operator: null, asOf: null })
        })
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        expect(publish).not.toHaveBeenCalled()
        await act(async () => {
          if (outcome === 'resolve') old.resolve()
          else old.reject(new TypeError('offline'))
        })
        await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(publish).not.toHaveBeenCalled()
        await act(async () => {
          latest.resolve()
          expect(await external).toBe(true)
        })
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(publish).toHaveBeenCalledExactlyOnceWith('w-main')
      } finally {
        await act(async () => {
          old.resolve()
          latest.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it('does not retain the older error after an external same-scope acknowledgement', async () => {
    const old = deferred()
    const latest = deferred()
    const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: refresh })
    render(<WalletPicker />)

    try {
      await choose(user, 'Practice (paper)')
      let external!: Promise<boolean>

      act(() => {
        external = useAppStore
          .getState()
          .selectScopeAndRefresh({ wallet: 'w-main', operator: null, asOf: null })
      })

      await act(async () => old.reject(new TypeError('offline')))
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
      await act(async () => {
        latest.resolve()
        expect(await external).toBe(true)
      })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveTextContent('Main')
    } finally {
      await act(async () => {
        old.resolve()
        latest.resolve()
        await useAppStore.getState().waitForWalletSelection()
      })
    }
  })

  it.each(['resolve', 'reject'] as const)(
    'keeps a valid pending wallet choice across an independent historical-time decision when it will %s',
    async outcome => {
      const pending = deferred()
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(pending.promise) })
      render(<WalletPicker />)

      try {
        await choose(user, 'Practice (paper)')
        act(() => useAppStore.getState().setAsOf('2026-10-28T17:33:00Z'))
        expect(screen.getByRole('combobox')).toHaveTextContent('Practice (paper)')
        expect(screen.getByRole('status')).toBeInTheDocument()
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
        await act(async () => {
          if (outcome === 'resolve') pending.resolve()
          else pending.reject(new TypeError('current failure'))
        })
        await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

        if (outcome === 'reject') {
          await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Error'))
        }

        expect(useAppStore.getState().currentWalletPublicId).toBe(
          outcome === 'resolve' ? 'w-paper' : 'w-main'
        )
        expect(useAppStore.getState().asOf).toBe('2026-10-28T17:33:00Z')
      } finally {
        await act(async () => {
          pending.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it.each(['logout and login', 'different user'] as const)(
    'retires old feedback on %s while the header remains mounted',
    async transition => {
      const old = deferred()
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(old.promise) })
      render(<WalletPicker />)

      try {
        await choose(user, 'Practice (paper)')
        act(() => {
          if (transition === 'logout and login') {
            useAuthStore.setState({ isAuthenticated: false })
            useAuthStore.setState({ isAuthenticated: true })
          } else
            useAuthStore.setState({
              user: makeUserProfile({ public_id: 'user-b', username: 'auditor-b' }),
            })
        })
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        await act(async () => old.reject(new TypeError('offline')))
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      } finally {
        await act(async () => {
          old.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it('keeps a current wallet refresh across same-user token/profile rotation', async () => {
    const pending = deferred()
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(pending.promise) })
    render(<WalletPicker />)

    try {
      await choose(user, 'Practice (paper)')
      act(() =>
        useAuthStore.setState({
          csrfToken: 'rotated',
          user: makeUserProfile({
            public_id: 'user-a',
            username: 'auditor-a',
            active_wallet_public_id: 'w-paper',
          }),
        })
      )
      expect(screen.getByRole('status')).toBeInTheDocument()
      await act(async () => pending.reject(new TypeError('offline')))
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Error'))
      expect(screen.getByRole('combobox')).toHaveTextContent('Main')
    } finally {
      await act(async () => {
        pending.resolve()
        await useAppStore.getState().waitForWalletSelection()
      })
    }
  })

  it('retires a picker through real URL navigation back to the already confirmed wallet', async () => {
    const user = userEvent.setup()

    render(<ScopeHost />)
    await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
    const old = deferred()
    const latest = deferred()
    const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)

    useAuthStore.setState({ refreshToken: refresh })

    try {
      await choose(user, 'Practice (paper)')
      act(() => {
        globalThis.history.pushState(null, '', '#positions?wallet=w-main')
        globalThis.dispatchEvent(new PopStateEvent('popstate'))
      })
      expect(screen.getByRole('combobox')).toHaveTextContent('Main')
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      await act(async () => old.reject(new TypeError('offline')))
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
      await act(async () => latest.resolve())
      await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
    } finally {
      await act(async () => {
        old.resolve()
        latest.resolve()
        await useAppStore.getState().waitForWalletSelection()
      })
    }
  })

  it.each(['resolve', 'reject'] as const)(
    'honours native history returning to the same explicit Main scope before Paper will %s',
    async outcome => {
      const backtests = '#backtests?wallet=w-main&operator=__all__'

      globalThis.history.replaceState(null, '', backtests)
      render(<ScopeHost />)
      await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
      act(() => {
        globalThis.history.pushState(null, '', '#overview?wallet=w-main&operator=__all__')
        globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      const old = deferred()
      const latest = deferred()
      const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
      const publish = vi.spyOn(apiClient, 'setWalletScope')
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: refresh })

      try {
        await choose(user, 'Practice (paper)')
        await waitFor(() =>
          expect(refresh).toHaveBeenCalledExactlyOnceWith({ walletId: 'w-paper' })
        )
        expect(screen.getByRole('status')).toBeInTheDocument()
        act(() => globalThis.history.back())
        await waitFor(() => expect(globalThis.location.hash).toBe(backtests))
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        await act(async () => {
          if (outcome === 'resolve') old.resolve()
          else old.reject(new TypeError('obsolete paper failure'))
        })
        await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
        expect(refresh).toHaveBeenLastCalledWith({ walletId: 'w-main' })
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
        expect(publish).not.toHaveBeenCalledWith('w-paper')
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        await act(async () => latest.resolve())
        await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
        expect(refresh).toHaveBeenCalledTimes(2)
        expect(globalThis.location.hash).toBe(backtests)
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
      } finally {
        await act(async () => {
          old.resolve()
          latest.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it.each(
    (['tab', 'anchor'] as const).flatMap(navigation =>
      (['resolve', 'reject'] as const).map(outcome => ({ navigation, outcome }))
    )
  )(
    'preserves a valid pending Paper choice through native $navigation navigation before it will $outcome',
    async ({ navigation, outcome }) => {
      globalThis.history.replaceState(null, '', '#overview?wallet=w-main&operator=__all__')
      render(<NativeNavigationHost />)
      await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
      const pending = deferred()
      const refresh = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined)
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: refresh })

      try {
        await choose(user, 'Practice (paper)')
        await waitFor(() =>
          expect(refresh).toHaveBeenCalledExactlyOnceWith({ walletId: 'w-paper' })
        )
        const changed = new Promise<void>(resolve => {
          globalThis.addEventListener('hashchange', () => resolve(), { once: true })
        })

        await act(async () => {
          fireEvent.click(
            navigation === 'tab'
              ? screen.getByRole('button', { name: 'Backtests tab' })
              : screen.getByRole('link', { name: 'Positions link' })
          )
          await changed
        })
        expect(screen.getByRole('combobox')).toHaveTextContent('Practice (paper)')
        expect(screen.getByRole('status')).toBeInTheDocument()
        await act(async () => {
          if (outcome === 'resolve') pending.resolve()
          else pending.reject(new TypeError('legitimate paper failure'))
        })
        await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
        expect(refresh).toHaveBeenCalledTimes(1)
        expect(useAppStore.getState().currentWalletPublicId).toBe(
          outcome === 'resolve' ? 'w-paper' : 'w-main'
        )
        if (outcome === 'reject') expect(screen.getByRole('alert')).toHaveTextContent('Error')
        else expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      } finally {
        await act(async () => {
          pending.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it('preserves pending Paper and a newer knowledge time before native tab events arrive', async () => {
    globalThis.history.replaceState(null, '', '#overview?wallet=w-main&operator=__all__')
    render(<NativeNavigationHost />)
    await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
    const pending = deferred()
    const refresh = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined)
    const user = userEvent.setup()
    const asOf = '2026-10-29T17:01:00Z'

    useAuthStore.setState({ refreshToken: refresh })

    try {
      await choose(user, 'Practice (paper)')
      const changed = new Promise<void>(resolve => {
        globalThis.addEventListener('hashchange', () => resolve(), { once: true })
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Backtests tab' }))
        useAppStore.getState().setAsOf(asOf)
        await changed
      })
      expect(screen.getByRole('combobox')).toHaveTextContent('Practice (paper)')
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(useAppStore.getState().asOf).toBe(asOf)
      await act(async () => pending.resolve())
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
      expect(refresh).toHaveBeenCalledExactlyOnceWith({ walletId: 'w-paper' })
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
      expect(useAppStore.getState().asOf).toBe(asOf)
      expect(globalThis.location.hash).toContain('#backtests?wallet=w-paper')
      expect(new URLSearchParams(globalThis.location.hash.split('?')[1]).get('as_of')).toBe(asOf)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      await act(async () => {
        pending.resolve()
        await useAppStore.getState().waitForWalletSelection()
      })
    }
  })

  it.each(['tab', 'anchor'] as const)(
    'honours native Back and Forward through an app-created %s entry while Paper is pending',
    async navigation => {
      globalThis.history.replaceState(null, '', '#overview?wallet=w-main&operator=__all__')
      render(<NativeNavigationHost />)
      await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
      const changed = new Promise<void>(resolve => {
        globalThis.addEventListener('hashchange', () => resolve(), { once: true })
      })

      await act(async () => {
        fireEvent.click(
          navigation === 'tab'
            ? screen.getByRole('button', { name: 'Backtests tab' })
            : screen.getByRole('link', { name: 'Positions link' })
        )
        await changed
      })
      const destination = globalThis.location.hash
      const old = deferred()
      const latest = deferred()
      const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: refresh })

      try {
        await choose(user, 'Practice (paper)')
        act(() => globalThis.history.back())
        await waitFor(() =>
          expect(globalThis.location.hash).toBe('#overview?wallet=w-main&operator=__all__')
        )
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
        act(() => globalThis.history.forward())
        await waitFor(() => expect(globalThis.location.hash).toBe(destination))
        expect(screen.getByRole('combobox')).toHaveTextContent('Main')
        await act(async () => old.resolve())
        await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
        expect(refresh).toHaveBeenLastCalledWith({ walletId: 'w-main' })
        await act(async () => latest.resolve())
        await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
        expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
        expect(refresh).toHaveBeenCalledTimes(2)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      } finally {
        await act(async () => {
          old.resolve()
          latest.resolve()
          await useAppStore.getState().waitForWalletSelection()
        })
      }
    }
  )

  it('honours genuine Back after a cancelled native anchor while Paper is pending', async () => {
    globalThis.history.replaceState(null, '', '#positions?wallet=w-main&operator=__all__')
    globalThis.history.pushState(null, '', '#overview?wallet=w-main&operator=__all__')
    render(<NativeNavigationHost />)
    await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
    const old = deferred()
    const latest = deferred()
    const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: refresh })

    try {
      await choose(user, 'Practice (paper)')
      await act(async () =>
        fireEvent.click(screen.getByRole('link', { name: 'Cancelled positions link' }))
      )
      expect(globalThis.location.hash).toBe('#overview?wallet=w-main&operator=__all__')
      expect(screen.getByRole('combobox')).toHaveTextContent('Practice (paper)')
      act(() => globalThis.history.back())
      await waitFor(() =>
        expect(globalThis.location.hash).toBe('#positions?wallet=w-main&operator=__all__')
      )
      expect(screen.getByRole('combobox')).toHaveTextContent('Main')
      await act(async () => old.reject(new TypeError('obsolete paper failure')))
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
      await act(async () => latest.resolve())
      await waitFor(() => expect(screen.getByTestId('scope-status')).toHaveTextContent('ready'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
    } finally {
      await act(async () => {
        old.resolve()
        latest.resolve()
        await useAppStore.getState().waitForWalletSelection()
      })
    }
  })

  it('preserves the newest own choice and legitimate error after external supersession under StrictMode', async () => {
    const old = deferred()
    const newest = deferred()
    const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(newest.promise)
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: refresh })
    render(
      <StrictMode>
        <WalletPicker />
      </StrictMode>
    )

    try {
      await choose(user, 'Practice (paper)')
      act(() => useAppStore.getState().reserveScopeSelection())
      await choose(user, 'All wallets')
      await act(async () => old.reject(new TypeError('offline')))
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
      expect(screen.getByRole('combobox')).toHaveTextContent('All wallets')
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      await act(async () => newest.reject(new TypeError('current failure')))
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Error'))
      expect(screen.getByRole('combobox')).toHaveTextContent('Main')
    } finally {
      await act(async () => {
        old.resolve()
        newest.resolve()
        await useAppStore.getState().waitForWalletSelection()
      })
    }
  })
})
