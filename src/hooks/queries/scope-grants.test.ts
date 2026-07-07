import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useScopeGrants,
  useAllScopeGrants,
  useCreateScopeGrant,
  useHandoverScopeGrant,
} from './scope-grants'
import { createScopeGrant, getScopeGrants, handoverScopeGrant } from '../../lib/api/scope-grants'

const ENV = {
  seq: 0,
  pid: 'test-pid',
  ts: '2024-01-01T00:00:00Z',
  sid: 'test-sid',
}

function envelope<T extends string>(type: T, extra: Record<string, unknown> = {}) {
  return {
    type,
    sequence_id: ENV.seq,
    public_id: ENV.pid,
    timestamp: ENV.ts,
    session_id: ENV.sid,
    ...extra,
  }
}

vi.mock('../../lib/api/scope-grants', () => ({
  createScopeGrant: vi.fn(() =>
    Promise.resolve(
      envelope('scope_grant_response', {
        payload: envelope('scope_grant_info', {
          operator_public_id: 'op-1',
          wallet_public_id: 'w-1',
          granted_by_user_public_id: 'u-1',
          scope_kind: 'underlying',
          underlying_public_id: 'BTC',
          instrument_public_id: null,
          note: null,
          known_to: '9999-12-31T23:59:59.999999Z',
        }),
      })
    )
  ),
  getScopeGrants: vi.fn(() =>
    Promise.resolve(envelope('scope_grant_list_response', { payload: [], count: 0 }))
  ),
  handoverScopeGrant: vi.fn(() =>
    Promise.resolve(
      envelope('handover_scope_grant_response', {
        payload: {
          closed_grant: envelope('scope_grant_info', {
            operator_public_id: 'op-1',
            wallet_public_id: 'w-1',
            granted_by_user_public_id: 'u-1',
            scope_kind: 'underlying',
            underlying_public_id: 'BTC',
            instrument_public_id: null,
            note: null,
            known_to: '2026-01-01T00:00:00Z',
          }),
          new_grant: envelope('scope_grant_info', {
            operator_public_id: 'op-2',
            wallet_public_id: 'w-1',
            granted_by_user_public_id: 'u-1',
            scope_kind: 'underlying',
            underlying_public_id: 'BTC',
            instrument_public_id: null,
            note: null,
            known_to: '9999-12-31T23:59:59.999999Z',
          }),
        },
      })
    )
  ),
}))
vi.mock('../../stores/auth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { public_id: 'user-default', role: 'admin' },
  })),
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const createWrapperWithClient = () => {
  const queryClient = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, wrapper }
}

describe('scope-grants queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useScopeGrants', () => {
    it('returns data when wallet is provided', async () => {
      const { result } = renderHook(() => useScopeGrants('w-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getScopeGrants)).toHaveBeenCalledWith('w-1')
    })
    it('does not fetch with empty wallet id', async () => {
      const { result } = renderHook(() => useScopeGrants(''), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getScopeGrants)).not.toHaveBeenCalled()
    })
  })
  describe('useAllScopeGrants', () => {
    it('aggregates grants across every wallet id', async () => {
      vi.mocked(getScopeGrants).mockImplementation(
        (walletId: string) =>
          Promise.resolve(
            envelope('scope_grant_list_response', {
              payload: [
                envelope('scope_grant_info', {
                  operator_public_id: 'op-1',
                  wallet_public_id: walletId,
                  granted_by_user_public_id: 'u-1',
                  scope_kind: 'underlying',
                  underlying_public_id: 'BTC',
                  instrument_public_id: null,
                  note: null,
                  known_to: '9999-12-31T23:59:59.999999Z',
                }),
              ],
              count: 1,
            })
          ) as unknown as ReturnType<typeof getScopeGrants>
      )
      const { result } = renderHook(() => useAllScopeGrants(['w-1', 'w-2']), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getScopeGrants)).toHaveBeenCalledWith('w-1')
      expect(vi.mocked(getScopeGrants)).toHaveBeenCalledWith('w-2')
      expect(result.current.grants).toHaveLength(2)
      expect(result.current.grants.map(g => g.wallet_public_id)).toEqual(['w-1', 'w-2'])
      expect(result.current.error).toBeNull()
    })
    it('issues no requests for an empty wallet list', async () => {
      const { result } = renderHook(() => useAllScopeGrants([]), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getScopeGrants)).not.toHaveBeenCalled()
      expect(result.current.grants).toEqual([])
      expect(result.current.error).toBeNull()
    })
    it('surfaces the first query error', async () => {
      vi.mocked(getScopeGrants).mockRejectedValue(new Error('boom'))
      const { result } = renderHook(() => useAllScopeGrants(['w-1']), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.error).not.toBeNull())
      expect(result.current.error?.message).toBe('boom')
    })
  })
  describe('useCreateScopeGrant', () => {
    it('calls createScopeGrant and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useCreateScopeGrant(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          operator_public_id: 'op-1',
          wallet_public_id: 'w-1',
          scope_kind: 'underlying',
          underlying_public_id: 'BTC',
        })
      })
      expect(vi.mocked(createScopeGrant)).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('useHandoverScopeGrant', () => {
    it('calls handoverScopeGrant and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useHandoverScopeGrant(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          from_grant_public_id: 'sg-1',
          to_operator_public_id: 'op-2',
        })
      })
      expect(vi.mocked(handoverScopeGrant)).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })
  })
})
