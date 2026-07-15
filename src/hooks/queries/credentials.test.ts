import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCredentials, useCreateCredential, useRotateCredential } from './credentials'
import { createCredential, getCredentials, rotateCredential } from '../../lib/api/credentials'

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

vi.mock('../../lib/api/credentials', () => ({
  createCredential: vi.fn(() =>
    Promise.resolve(
      envelope('credential_response', {
        payload: envelope('credential_summary', {
          wallet_public_id: 'w-1',
          exchange: 'kraken',
          credential_type: 'api_key_secret',
          label: 'main',
        }),
      })
    )
  ),
  getCredentials: vi.fn(() =>
    Promise.resolve(envelope('credential_list_response', { payload: [], count: 0 }))
  ),
  rotateCredential: vi.fn(() =>
    Promise.resolve(
      envelope('credential_response', {
        payload: envelope('credential_summary', {
          wallet_public_id: 'w-1',
          exchange: 'kraken',
          credential_type: 'api_key_secret',
          label: 'rotated',
        }),
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

describe('credentials queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCredentials', () => {
    it('returns data when wallet is provided', async () => {
      const { result } = renderHook(() => useCredentials('w-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getCredentials)).toHaveBeenCalledWith('w-1')
    })
    it('does not fetch with empty wallet id', async () => {
      const { result } = renderHook(() => useCredentials(''), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(vi.mocked(getCredentials)).not.toHaveBeenCalled()
    })
  })
  describe('useCreateCredential', () => {
    it('calls createCredential and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useCreateCredential(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          walletPublicId: 'w-1',
          data: {
            exchange: 'kraken',
            credential_type: 'api_key_secret',
            reconciliation_method: 'unclassified',
            credential_payload: { api_key: 'k', api_secret: 's' },
          },
        })
      })
      expect(vi.mocked(createCredential)).toHaveBeenCalledWith('w-1', {
        exchange: 'kraken',
        credential_type: 'api_key_secret',
        reconciliation_method: 'unclassified',
        credential_payload: { api_key: 'k', api_secret: 's' },
      })
      expect(spy).toHaveBeenCalled()
    })
  })
  describe('useRotateCredential', () => {
    it('calls rotateCredential and invalidates cache', async () => {
      const { queryClient, wrapper } = createWrapperWithClient()
      const spy = vi.spyOn(queryClient, 'invalidateQueries')
      const { result } = renderHook(() => useRotateCredential(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          walletPublicId: 'w-1',
          credentialPublicId: 'cred-1',
          data: {
            credential_payload: { api_key: 'new-k', api_secret: 'new-s' },
          },
        })
      })
      expect(vi.mocked(rotateCredential)).toHaveBeenCalledWith('w-1', 'cred-1', {
        credential_payload: { api_key: 'new-k', api_secret: 'new-s' },
      })
      expect(spy).toHaveBeenCalled()
    })
  })
})
