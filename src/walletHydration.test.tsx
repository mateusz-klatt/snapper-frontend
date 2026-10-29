import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { useBacktests } from './hooks/queries/backtests'
import { queryKeys } from './hooks/queries/keys'
import { apiClient } from './lib/apiClient'
import { getBacktests } from './lib/api/backtests'
import { queryClient } from './lib/queryClient'
import { useAppStore } from './stores/app'
import { useAuthStore } from './stores/auth'
import { makeListEnvelope, makeUserProfile } from './test/factories'
import { ROLE_PERMISSIONS } from './types/permissions.generated'

vi.mock('./hooks/queries/wallets', () => ({
  useWallets: () => ({ data: { payload: [{ public_id: 'w-main', label: 'Main' }] } }),
  useOperators: () => ({ data: { payload: [] } }),
}))
vi.mock('./hooks/useAppShell', () => ({
  useAppShell: () => ({ isConnected: false, connectionLag: 0, subscribedTopicsCount: 0 }),
}))
vi.mock('./components/AppRoutes', () => ({
  AppRoutes: function ReadProbe() {
    const result = useBacktests()

    return <p>{result.isSuccess ? 'Confirmed empty list' : 'Pending backtest read'}</p>
  },
}))

const HORIZON = '2026-10-28T17:33:00.000Z'
const auditor = (wallet: string | null) =>
  makeUserProfile({
    username: 'auditor',
    role: 'auditor',
    effective_permissions: [...ROLE_PERMISSIONS.auditor],
    active_wallet_public_id: wallet,
  })

beforeEach(() => {
  queryClient.clear()
  localStorage.clear()
  history.replaceState(null, '', '#backtests')
  apiClient.setTimeTravelAsOf(null)
  apiClient.setWalletScope(null)
  apiClient.setOperatorScope(null)
  useAppStore.setState({
    currentWalletPublicId: null,
    currentOperatorPublicId: null,
    asOf: null,
    isTimeTraveling: false,
  })
  useAuthStore.setState({ isAuthenticated: true, user: auditor(null) })
})

afterEach(() => {
  queryClient.clear()
  vi.unstubAllGlobals()
})

it.each(['default', 'url', 'storage', 'matching-error-cache', 'matching-inflight-cache'] as const)(
  'hydrates %s wallet context before the actual Backtests read, despite an earlier refresh',
  async source => {
    let serverWallet: string | null = null
    let finishBackground!: () => void
    const firstRefresh = new Promise<void>(resolve => {
      finishBackground = resolve
    })
    let finishOldRead!: () => void
    const oldRead = new Promise<void>(resolve => {
      finishOldRead = resolve
    })
    let deferOldRead = source === 'matching-inflight-cache'
    const reads: Array<{ status: number; at: string | null; wallet: string | null }> = []
    const refreshBodies: Array<unknown> = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, options: RequestInit = {}): Promise<Response> => {
        const url = new URL(input, 'http://localhost')

        if (url.pathname === '/api/auth/refresh') {
          const envelope = options.body
            ? (JSON.parse(String(options.body)) as {
                payload: { active_wallet_public_id?: string }
              })
            : null

          refreshBodies.push(envelope?.payload ?? null)
          if (envelope === null) await firstRefresh
          else serverWallet = envelope.payload.active_wallet_public_id ?? null

          return Response.json({ payload: { user: auditor(serverWallet) } })
        }

        expect(url.pathname).toBe('/api/backtests')
        const status = serverWallet === null ? 400 : 200

        reads.push({
          status,
          at: url.searchParams.get('as_of'),
          wallet: url.searchParams.get('wallet_public_id'),
        })

        if (deferOldRead) {
          deferOldRead = false
          await oldRead
        }

        return Response.json(
          status === 400
            ? { detail: 'no active wallet selected' }
            : makeListEnvelope('backtest_run_list', []),
          { status }
        )
      })
    )

    if (source === 'storage') localStorage.setItem('snapper-current-wallet', 'w-main')
    if (source === 'url' || source.startsWith('matching-'))
      history.replaceState(null, '', '#backtests?wallet=w-main&as_of=' + HORIZON)
    let earlier: Promise<unknown> | undefined

    if (source.startsWith('matching-')) {
      useAppStore.setState({
        currentWalletPublicId: 'w-main',
        asOf: HORIZON,
        isTimeTraveling: true,
      })
      apiClient.setWalletScope('w-main')
      apiClient.setTimeTravelAsOf(HORIZON)
      const request = queryClient.fetchQuery({
        queryKey: queryKeys.backtestsByStrategyStatus(undefined, undefined, {
          walletPublicId: 'w-main',
          operatorPublicId: null,
          asOf: HORIZON,
        }),
        queryFn: () => getBacktests(50),
        retry: false,
      })

      if (source === 'matching-error-cache')
        await expect(request).rejects.toThrow('no active wallet selected')
      else earlier = request.catch(() => undefined)
    }

    const baselineReads = reads.length
    const background = apiClient.refreshSession()

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )
    await waitFor(() => expect(useAppStore.getState().isWalletSelectionPending()).toBe(true))
    expect(screen.queryByText('Pending backtest read')).not.toBeInTheDocument()
    expect(reads).toHaveLength(baselineReads)
    await act(async () => {
      finishBackground()
      await background
    })

    if (source === 'matching-inflight-cache') {
      await waitFor(() =>
        expect(useAuthStore.getState().user?.active_wallet_public_id).toBe('w-main')
      )
      await act(async () => {
        finishOldRead()
        await earlier
      })
    }

    await waitFor(() => expect(screen.getByText('Confirmed empty list')).toBeInTheDocument())
    expect(refreshBodies).toEqual([null, { active_wallet_public_id: 'w-main' }])
    expect(useAuthStore.getState().user?.active_wallet_public_id).toBe('w-main')
    expect(reads.slice(baselineReads)).toEqual([
      {
        status: 200,
        wallet: 'w-main',
        at: source === 'url' || source.startsWith('matching-') ? HORIZON : null,
      },
    ])
  }
)
