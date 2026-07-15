import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePortfolioAccounts } from './portfolio'
import { getPortfolioAccounts } from '../../lib/api/portfolio'
import type { PortfolioAccountStateListResponse } from '../../types/api'

const listResponse: PortfolioAccountStateListResponse = {
  type: 'portfolio_account_state_list',
  sequence_id: 0,
  public_id: 'p-1',
  timestamp: '2026-07-13T00:00:00Z',
  session_id: 's-1',
  payload: [
    {
      type: 'portfolio_account_state',
      sequence_id: 0,
      public_id: 'acct-1',
      timestamp: '2026-07-13T00:00:00Z',
      session_id: 's-1',
      wallet_public_id: 'w-1',
      exchange: 'kraken',
      mode: 'live',
      sync_status: 'observed',
      effective_status: 'observed',
      is_authoritative: true,
      balance_status: 'observed',
      position_status: 'not_applicable',
      valuation_status: 'native_only',
      reconciliation: {
        method: null,
        evaluation_status: null,
        effective_status: 'incomplete',
        is_authoritative: false,
        evaluated_at: null,
        current_observation_id: null,
        last_full_observation_id: null,
        detail_source_observation_id: null,
        last_full_outcome: null,
        consecutive_full_mismatches: 0,
        anchor_public_id: null,
        venue_account_state_public_id: null,
        venue_account_observation_id: null,
        source_watermark_kind: null,
        source_watermark: null,
        expected: null,
        actual: null,
        difference: null,
        tolerance: null,
        reconciled_at: null,
        authoritative_until: null,
        error: null,
        open_drift_episode: null,
      },
    },
  ],
  count: 1,
}

vi.mock('../../lib/api/portfolio', () => ({
  getPortfolioAccounts: vi.fn(() => Promise.resolve(listResponse)),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true, user: { public_id: 'u-1', role: 'admin' } })),
}))
const control = vi.hoisted(() => ({ asOf: null as string | null }))

vi.mock('../../stores/app', () => ({
  useAppStore: vi.fn(
    (
      selector: (s: {
        asOf: string | null
        currentOperatorPublicId: null
        currentWalletPublicId: null
      }) => unknown
    ) =>
      selector({
        asOf: control.asOf,
        currentOperatorPublicId: null,
        currentWalletPublicId: null,
      })
  ),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('usePortfolioAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    control.asOf = null
  })

  it('returns the account payload for the current scope', async () => {
    const { result } = renderHook(() => usePortfolioAccounts(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getPortfolioAccounts).toHaveBeenCalledTimes(1)
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.wallet_public_id).toBe('w-1')
  })

  it('disables the live poll while time traveling', async () => {
    control.asOf = '2026-07-13T00:00:00Z'
    const { result } = renderHook(() => usePortfolioAccounts(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
  })
})
