import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { WalletPicker } from './WalletPicker'
import { useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '../lib/apiClient'
import { queryClient } from '../lib/queryClient'

vi.mock('../hooks/queries/wallets', () => ({
  useWallets: () => ({
    data: {
      payload: [
        { public_id: 'w-main', label: 'Main', is_paper: false },
        { public_id: 'w-paper', label: 'Practice', is_paper: true },
      ],
    },
  }),
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

const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string
): Promise<void> => {
  await user.click(screen.getByRole('combobox'))
  await user.click(screen.getByRole('option', { name }))
}

describe('WalletPicker pending intentions through the real select widget', () => {
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
    { initial: 'w-main', label: 'Main', hint: { walletId: 'w-main' } },
    { initial: null, label: 'All wallets', hint: { clear: true } },
  ])(
    'honours returning to $label before the pending paper wallet is acknowledged',
    async ({ initial, label, hint }) => {
      const first = deferred()
      const latest = deferred()
      const refresh = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise)
      const user = userEvent.setup()

      useAppStore.getState().setCurrentWalletPublicId(initial)
      useAuthStore.setState({ refreshToken: refresh })
      const publish = vi.spyOn(apiClient, 'setWalletScope')

      render(<WalletPicker />)

      try {
        await selectOption(user, 'Practice (paper)')
        await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
        expect(useAppStore.getState().currentWalletPublicId).toBe(initial)
        expect(apiClient.getWalletScope()).toBe(initial)
        await selectOption(user, label)
        expect(screen.getByRole('combobox')).toHaveTextContent(label)
        expect(refresh).toHaveBeenCalledTimes(1)
        expect(publish).not.toHaveBeenCalled()

        await act(async () => first.resolve())
        await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
        expect(refresh).toHaveBeenNthCalledWith(1, { walletId: 'w-paper' })
        expect(refresh).toHaveBeenNthCalledWith(2, hint)
        expect(publish).not.toHaveBeenCalled()
        expect(useAppStore.getState().currentWalletPublicId).toBe(initial)
        expect(screen.getByRole('status', { name: 'Loading...' })).toBeInTheDocument()

        await act(async () => latest.resolve())
        await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
        expect(publish).toHaveBeenCalledExactlyOnceWith(initial)
        expect(useAppStore.getState().currentWalletPublicId).toBe(initial)
        expect(screen.getByRole('combobox')).toHaveTextContent(label)
      } finally {
        first.resolve()
        latest.resolve()
      }
    }
  )

  it('honours the keyboard selection of the confirmed wallet while a different wallet is pending', async () => {
    const first = deferred()
    const latest = deferred()
    const refresh = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise)
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: refresh })
    render(<WalletPicker />)

    try {
      await selectOption(user, 'Practice (paper)')
      await user.click(screen.getByRole('combobox'))
      await user.keyboard('{Home}{ArrowDown}{Enter}')
      expect(screen.getByRole('combobox')).toHaveTextContent('Main')
      await act(async () => first.resolve())
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
      expect(refresh).toHaveBeenNthCalledWith(2, { walletId: 'w-main' })
      await act(async () => latest.resolve())
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
    } finally {
      first.resolve()
      latest.resolve()
    }
  })

  it('retains a newer same-wallet intention when the first request completes and skips an obsolete middle choice', async () => {
    const first = deferred()
    const latest = deferred()
    const refresh = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise)
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: refresh })
    const publish = vi.spyOn(apiClient, 'setWalletScope')

    render(<WalletPicker />)

    try {
      await selectOption(user, 'Practice (paper)')
      await selectOption(user, 'Main')
      await selectOption(user, 'Practice (paper)')
      expect(refresh).toHaveBeenCalledTimes(1)
      await act(async () => first.resolve())
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
      expect(refresh.mock.calls).toEqual([[{ walletId: 'w-paper' }], [{ walletId: 'w-paper' }]])
      expect(screen.getByRole('combobox')).toHaveTextContent('Practice (paper)')
      expect(screen.getByRole('status', { name: 'Loading...' })).toBeInTheDocument()
      expect(publish).not.toHaveBeenCalled()
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
      await act(async () => latest.resolve())
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
      expect(publish).toHaveBeenCalledExactlyOnceWith('w-paper')
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    } finally {
      first.resolve()
      latest.resolve()
    }
  })

  it('restores the confirmed selection and reports an ordinary refresh failure without an unhandled rejection', async () => {
    const pending = deferred()
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(pending.promise) })
    const publish = vi.spyOn(apiClient, 'setWalletScope')

    render(<WalletPicker />)
    await selectOption(user, 'Practice (paper)')
    await act(async () => pending.reject(new TypeError('offline')))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Error'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Main')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(useAppStore.getState().currentWalletPublicId).toBe('w-main')
    expect(publish).not.toHaveBeenCalled()
  })

  it('keeps a newer pending choice and suppresses an obsolete failure', async () => {
    const first = deferred()
    const latest = deferred()
    const refresh = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise)
    const user = userEvent.setup()

    useAuthStore.setState({ refreshToken: refresh })
    render(<WalletPicker />)

    try {
      await selectOption(user, 'Practice (paper)')
      await selectOption(user, 'All wallets')
      await act(async () => first.reject(new TypeError('offline')))
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveTextContent('All wallets')
      expect(screen.getByRole('status', { name: 'Loading...' })).toBeInTheDocument()
      await act(async () => latest.resolve())
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
      expect(useAppStore.getState().currentWalletPublicId).toBeNull()
    } finally {
      first.resolve()
      latest.resolve()
    }
  })

  it('clears a previous selection error when a new choice is submitted successfully', async () => {
    const user = userEvent.setup()
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(undefined)

    useAuthStore.setState({ refreshToken: refresh })
    render(<WalletPicker />)
    await selectOption(user, 'Practice (paper)')
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    await selectOption(user, 'All wallets')
    await waitFor(() => expect(useAppStore.getState().currentWalletPublicId).toBeNull())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each(['resolve', 'reject'] as const)(
    'settles safely after unmount when the pending refresh will %s',
    async outcome => {
      const pending = deferred()
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(pending.promise) })
      const { unmount } = render(<WalletPicker />)

      await selectOption(user, 'Practice (paper)')
      unmount()
      await act(async () => {
        if (outcome === 'resolve') pending.resolve()
        else pending.reject(new TypeError('offline'))
        await useAppStore.getState().waitForWalletSelection()
      })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(useAppStore.getState().currentWalletPublicId).toBe(
        outcome === 'resolve' ? 'w-paper' : 'w-main'
      )
    }
  )

  it.each([
    { name: 'wallet', next: { wallet: null, operator: null, asOf: null } },
    { name: 'operator', next: { wallet: 'w-main', operator: 'o-new', asOf: null } },
    {
      name: 'knowledge time',
      next: { wallet: 'w-main', operator: null, asOf: '2026-10-28T17:33:00Z' },
    },
  ])(
    'clears an older picker error when a newer external $name scope is acknowledged',
    async ({ next }) => {
      const old = deferred()
      const latest = deferred()
      const refresh = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
      const user = userEvent.setup()

      useAuthStore.setState({ refreshToken: refresh })
      render(<WalletPicker />)

      try {
        await selectOption(user, 'Practice (paper)')
        const external = useAppStore.getState().selectScopeAndRefresh(next)

        await act(async () => old.reject(new TypeError('offline')))
        await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2))
        await act(async () => {
          latest.resolve()
          expect(await external).toBe(true)
        })
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(useAppStore.getState().currentWalletPublicId).toBe(next.wallet)
        expect(useAppStore.getState().currentOperatorPublicId).toBe(next.operator)
        expect(useAppStore.getState().asOf).toBe(next.asOf)

        act(() => {
          useAppStore.getState().setCurrentOperatorPublicId(null)
          useAppStore.getState().setCurrentWalletPublicId('w-main')
          useAppStore.getState().clearAsOf()
        })
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      } finally {
        old.resolve()
        latest.resolve()
      }
    }
  )

  it.each([
    {
      name: 'wallet',
      initial: 'w-main',
      transition: () => useAppStore.getState().setCurrentWalletPublicId(null),
    },
    {
      name: 'operator',
      initial: null,
      transition: () => useAppStore.getState().setCurrentOperatorPublicId('o-new'),
    },
    {
      name: 'knowledge time',
      initial: 'w-main',
      transition: () => useAppStore.getState().setAsOf('2026-10-28T17:33:00Z'),
    },
    {
      name: 'wallet roundtrip',
      initial: 'w-main',
      transition: () => {
        useAppStore.getState().setCurrentWalletPublicId(null)
        useAppStore.getState().setCurrentWalletPublicId('w-main')
      },
    },
  ])(
    'does not recreate an obsolete picker error after the confirmed external $name scope has changed',
    async ({ initial, transition }) => {
      const pending = deferred()
      const user = userEvent.setup()

      useAppStore.getState().setCurrentWalletPublicId(initial)
      useAuthStore.setState({ refreshToken: vi.fn().mockReturnValueOnce(pending.promise) })
      render(<WalletPicker />)
      await selectOption(user, 'Practice (paper)')
      act(transition)
      await act(async () => {
        pending.reject(new TypeError('offline'))
        await useAppStore.getState().waitForWalletSelection()
      })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    }
  )

  it('retains pending acknowledgement and current-context failure feedback under StrictMode effect replay', async () => {
    const accepted = deferred()
    const rejected = deferred()
    const user = userEvent.setup()
    const refresh = vi
      .fn()
      .mockReturnValueOnce(accepted.promise)
      .mockReturnValueOnce(rejected.promise)

    useAuthStore.setState({ refreshToken: refresh })
    render(
      <StrictMode>
        <WalletPicker />
      </StrictMode>
    )

    try {
      await selectOption(user, 'Practice (paper)')
      expect(screen.getByRole('status')).toBeInTheDocument()
      await act(async () => accepted.resolve())
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
      await selectOption(user, 'Main')
      await act(async () => rejected.reject(new TypeError('offline')))
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Error'))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(useAppStore.getState().currentWalletPublicId).toBe('w-paper')
    } finally {
      accepted.resolve()
      rejected.resolve()
    }
  })
})
